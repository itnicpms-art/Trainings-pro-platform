import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import type { Database, TableRow } from "../src/types/database";
import type { OnboardingFlow, PermissionScope, ProfileType } from "../src/types/app";

const QA_EMAIL = "qa@trainings-pro.test";
const TERMS_ACCEPTED_AT = "2026-08-29T00:00:00.000Z";
const TERMS_VERSION = "2026-08-29";

type Client = SupabaseClient<Database>;
type Organization = TableRow<"organizations">;
type OrganizationUnit = TableRow<"organization_units">;
type AcademicProgram = TableRow<"academic_programs">;
type AcademicYear = TableRow<"academic_years">;
type AcademicTerm = TableRow<"academic_terms">;
type AcademicGroup = TableRow<"academic_groups">;
type AcademicProfileContext = TableRow<"academic_profile_contexts">;
type OrganizationTrainingPeriod = TableRow<"organization_training_periods">;
type Profile = TableRow<"profiles">;
type Role = TableRow<"roles">;
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

type QaAcademicStructure = {
  faculty: OrganizationUnit;
  program: AcademicProgram;
  academicYear: AcademicYear;
  academicTerm: AcademicTerm;
  academicGroup: AcademicGroup;
};

type ProfileDefinition = {
  key: string;
  label: string;
  displayName: string;
  profileType: ProfileType;
  roleCode: string;
  organization: "training" | "university" | null;
  scopeType: PermissionScope;
  onboardingFlow: OnboardingFlow;
  isDefault?: boolean;
};

const roleDefinitions: Array<{
  code: string;
  name: string;
  scope: PermissionScope;
  description: string;
}> = [
  { code: "individual_learner", name: "Individual Learner", scope: "own", description: "Profil individual pentru învățare" },
  { code: "organization_learner", name: "Organization Learner", scope: "organization", description: "Cursant validat într-o organizație" },
  { code: "university_student", name: "University Student", scope: "program", description: "Student universitar alocat unui program/group" },
  { code: "instructor", name: "Instructor", scope: "course", description: "Instructor sau trainer" },
  { code: "professor", name: "Professor", scope: "program", description: "Profesor universitar" },
  { code: "consultant", name: "Consultant", scope: "own", description: "Consultant live sau asincron" },
  { code: "program_coordinator", name: "Program Coordinator", scope: "program", description: "Coordonator program academic" },
  { code: "organization_representative", name: "Organization Representative", scope: "organization", description: "Reprezentant aprobat al unei organizații" },
  { code: "organization_admin", name: "Organization Admin", scope: "organization", description: "Administrator organizație" },
  { code: "university_admin", name: "University Admin", scope: "university", description: "Administrator universitate" },
  { code: "platform_admin", name: "Platform Admin", scope: "platform", description: "Administrator platformă" },
];

const profileDefinitions: ProfileDefinition[] = [
  { key: "individualLearner", label: "QA · Individual Learner", displayName: "QA Individual Learner", profileType: "individual_learner", roleCode: "individual_learner", organization: null, scopeType: "own", onboardingFlow: "individual", isDefault: true },
  { key: "organizationLearner", label: "QA · Organization Learner", displayName: "QA Organization Learner", profileType: "organization_learner", roleCode: "organization_learner", organization: "training", scopeType: "organization", onboardingFlow: "invitation" },
  { key: "academicStudent", label: "QA · Academic Student", displayName: "QA Academic Student", profileType: "student", roleCode: "university_student", organization: "university", scopeType: "program", onboardingFlow: "invitation" },
  { key: "instructorTrainer", label: "QA · Instructor Trainer", displayName: "QA Instructor Trainer", profileType: "instructor", roleCode: "instructor", organization: "training", scopeType: "course", onboardingFlow: "invitation" },
  { key: "professor", label: "QA · Professor", displayName: "QA Professor", profileType: "professor", roleCode: "professor", organization: "university", scopeType: "program", onboardingFlow: "invitation" },
  { key: "consultant", label: "QA · Consultant", displayName: "QA Consultant", profileType: "consultant", roleCode: "consultant", organization: null, scopeType: "own", onboardingFlow: "individual" },
  { key: "coordinator", label: "QA · Coordinator", displayName: "QA Coordinator", profileType: "coordinator", roleCode: "program_coordinator", organization: "university", scopeType: "program", onboardingFlow: "invitation" },
  { key: "organizationRepresentative", label: "QA · Organization Representative", displayName: "QA Organization Representative", profileType: "organization_representative", roleCode: "organization_representative", organization: "training", scopeType: "organization", onboardingFlow: "representative" },
  { key: "organizationAdmin", label: "QA · Organization Admin", displayName: "QA Organization Admin", profileType: "organization_admin", roleCode: "organization_admin", organization: "training", scopeType: "organization", onboardingFlow: "invitation" },
  { key: "universityAdmin", label: "QA · University Admin", displayName: "QA University Admin", profileType: "university_admin", roleCode: "university_admin", organization: "university", scopeType: "university", onboardingFlow: "invitation" },
  { key: "platformAdmin", label: "QA · Platform Admin", displayName: "QA Platform Admin", profileType: "platform_admin", roleCode: "platform_admin", organization: null, scopeType: "platform", onboardingFlow: "individual" },
];

function loadLocalEnvironment(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function assertSafeEnvironment(): void {
  const productionMarkers = [process.env.VERCEL_ENV, process.env.NODE_ENV]
    .map((value) => value?.trim().toLowerCase())
    .filter(Boolean);
  if (productionMarkers.includes("production")) {
    throw new Error("QA profile seeding is disabled in production environments.");
  }
}

function throwDatabaseError(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "unknown database error"}`);
}

async function findAuthUser(client: Client): Promise<User | null> {
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throwDatabaseError("Unable to list Auth users", error);
    const match = data.users.find((user) => user.email?.toLowerCase() === QA_EMAIL);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
}

async function ensureAuthUser(client: Client, password: string): Promise<{ user: User; created: boolean }> {
  const existing = await findAuthUser(client);
  const userMetadata = {
    first_name: "QA",
    last_name: "Trainings PRO",
    display_name: "QA Trainings PRO",
    preferred_locale: "ro",
    onboarding_flow: "individual",
    terms_accepted: true,
    terms_accepted_at: TERMS_ACCEPTED_AT,
    terms_version: TERMS_VERSION,
  };

  if (existing) {
    const { data, error } = await client.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { ...existing.user_metadata, ...userMetadata },
    });
    if (error) throwDatabaseError("Unable to update the QA Auth user", error);
    return { user: data.user, created: false };
  }

  const { data, error } = await client.auth.admin.createUser({
    email: QA_EMAIL,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });
  if (error) throwDatabaseError("Unable to create the QA Auth user", error);
  return { user: data.user, created: true };
}

async function ensureOrganization(
  client: Client,
  values: Database["public"]["Tables"]["organizations"]["Insert"],
): Promise<Organization> {
  const { data, error } = await client.from("organizations").upsert(values, { onConflict: "slug" }).select("*").single();
  if (error) throwDatabaseError(`Unable to ensure organization ${values.slug}`, error);
  return data;
}

async function ensureAcademicStructure(client: Client, university: Organization): Promise<QaAcademicStructure> {
  const { data: faculty, error: facultyError } = await client
    .from("organization_units")
    .upsert({
      organization_id: university.id,
      parent_unit_id: null,
      unit_type: "faculty",
      code: "MED",
      name: "Faculty of Medicine",
      description: "QA-only faculty for academic context testing",
      status: "active",
    }, { onConflict: "organization_id,code" })
    .select("*")
    .single();
  if (facultyError) throwDatabaseError("Unable to ensure the QA Faculty of Medicine", facultyError);

  const { data: program, error: programError } = await client
    .from("academic_programs")
    .upsert({
      organization_id: university.id,
      organization_unit_id: faculty.id,
      code: "GMED",
      name: "General Medicine",
      description: "QA-only academic program for context testing",
      program_level: "bachelor",
      standard_duration_years: 6,
      status: "active",
    }, { onConflict: "organization_id,code" })
    .select("*")
    .single();
  if (programError) throwDatabaseError("Unable to ensure the QA General Medicine program", programError);

  const { error: academicYearNormalizationError } = await client
    .from("academic_years")
    .update({ is_current: false })
    .eq("organization_id", university.id)
    .eq("is_current", true)
    .neq("code", "2026-2027");
  if (academicYearNormalizationError) throwDatabaseError("Unable to normalize QA current academic years", academicYearNormalizationError);

  const { data: academicYear, error: academicYearError } = await client
    .from("academic_years")
    .upsert({
      organization_id: university.id,
      code: "2026-2027",
      name: "2026–2027",
      start_date: "2026-10-01",
      end_date: "2027-07-31",
      is_current: true,
      status: "active",
    }, { onConflict: "organization_id,code" })
    .select("*")
    .single();
  if (academicYearError) throwDatabaseError("Unable to ensure QA academic year 2026-2027", academicYearError);

  const { data: academicTerm, error: academicTermError } = await client
    .from("academic_terms")
    .upsert({
      organization_id: university.id,
      academic_year_id: academicYear.id,
      code: "S1",
      name: "Semester 1",
      term_type: "semester",
      term_number: 1,
      start_date: "2026-10-01",
      end_date: "2027-02-28",
      status: "active",
    }, { onConflict: "academic_year_id,code" })
    .select("*")
    .single();
  if (academicTermError) throwDatabaseError("Unable to ensure QA Semester 1", academicTermError);

  const { data: academicGroup, error: academicGroupError } = await client
    .from("academic_groups")
    .upsert({
      organization_id: university.id,
      academic_program_id: program.id,
      academic_year_id: academicYear.id,
      academic_term_id: academicTerm.id,
      code: "101",
      name: "Group 101",
      description: "QA-only academic group for context testing",
      status: "active",
    }, { onConflict: "organization_id,code" })
    .select("*")
    .single();
  if (academicGroupError) throwDatabaseError("Unable to ensure QA Group 101", academicGroupError);

  return { faculty, program, academicYear, academicTerm, academicGroup };
}

async function ensureTrainingPeriod(client: Client, organization: Organization): Promise<OrganizationTrainingPeriod> {
  const { error: normalizationError } = await client
    .from("organization_training_periods")
    .update({ is_current: false })
    .eq("organization_id", organization.id)
    .eq("is_current", true)
    .neq("code", "QA-TRAINING-2026");
  if (normalizationError) throwDatabaseError("Unable to normalize QA current training periods", normalizationError);

  const { data, error } = await client
    .from("organization_training_periods")
    .upsert({
      organization_id: organization.id,
      code: "QA-TRAINING-2026",
      name: "QA Training Period 2026",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      is_current: true,
      status: "active",
    }, { onConflict: "organization_id,code" })
    .select("*")
    .single();
  if (error) throwDatabaseError("Unable to ensure QA Training Period 2026", error);
  return data;
}

async function ensureAcademicProfileContext(
  client: Client,
  profile: Profile,
  university: Organization,
  structure: QaAcademicStructure,
  includeGroup: boolean,
): Promise<"created" | "updated"> {
  const { data: existingContexts, error: lookupError } = await client
    .from("academic_profile_contexts")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: true });
  if (lookupError) throwDatabaseError(`Unable to load academic contexts for ${profile.label}`, lookupError);

  const existingPrimary = existingContexts.find((context: AcademicProfileContext) => context.status === "active" && context.is_primary);
  const matchingContext = existingContexts.find((context: AcademicProfileContext) => (
    context.organization_id === university.id
    && context.academic_program_id === structure.program.id
    && context.academic_year_id === structure.academicYear.id
    && context.academic_term_id === structure.academicTerm.id
    && context.academic_group_id === (includeGroup ? structure.academicGroup.id : null)
  ));
  const target = existingPrimary ?? matchingContext ?? existingContexts[0] ?? null;
  const values: Database["public"]["Tables"]["academic_profile_contexts"]["Update"] = {
    organization_id: university.id,
    organization_unit_id: structure.faculty.id,
    academic_program_id: structure.program.id,
    academic_year_id: structure.academicYear.id,
    academic_term_id: structure.academicTerm.id,
    academic_group_id: includeGroup ? structure.academicGroup.id : null,
    status: "active",
    is_primary: true,
    started_at: "2026-10-01",
    ended_at: null,
  };

  if (target) {
    const { error } = await client
      .from("academic_profile_contexts")
      .update(values)
      .eq("id", target.id);
    if (error) throwDatabaseError(`Unable to update academic context for ${profile.label}`, error);

    const { error: normalizationError } = await client
      .from("academic_profile_contexts")
      .update({ is_primary: false })
      .eq("profile_id", profile.id)
      .eq("is_primary", true)
      .neq("id", target.id);
    if (normalizationError) throwDatabaseError(`Unable to normalize academic contexts for ${profile.label}`, normalizationError);
    return "updated";
  }

  const { error } = await client.from("academic_profile_contexts").insert({
    ...values,
    profile_id: profile.id,
    organization_id: university.id,
  });
  if (error) throwDatabaseError(`Unable to create academic context for ${profile.label}`, error);
  return "created";
}

async function verifyQaContextSeed(
  client: Client,
  profilesByKey: Map<string, Profile>,
  university: Organization,
  structure: QaAcademicStructure,
  academicContextDefinitions: Array<{ key: string; includeGroup: boolean }>,
  trainingOrganization: Organization,
  trainingPeriod: OrganizationTrainingPeriod,
): Promise<void> {
  for (const definition of academicContextDefinitions) {
    const profile = profilesByKey.get(definition.key);
    if (!profile) throw new Error(`Required QA profile is unavailable during verification: ${definition.key}`);

    const { data: contexts, error } = await client
      .from("academic_profile_contexts")
      .select("organization_id,organization_unit_id,academic_program_id,academic_year_id,academic_term_id,academic_group_id,status,is_primary")
      .eq("profile_id", profile.id)
      .eq("status", "active")
      .eq("is_primary", true);
    if (error) throwDatabaseError(`Unable to verify academic context for ${profile.label}`, error);

    const expectedGroupId = definition.includeGroup ? structure.academicGroup.id : null;
    const expectedContexts = contexts.filter((context) => (
      context.organization_id === university.id
      && context.organization_unit_id === structure.faculty.id
      && context.academic_program_id === structure.program.id
      && context.academic_year_id === structure.academicYear.id
      && context.academic_term_id === structure.academicTerm.id
      && context.academic_group_id === expectedGroupId
    ));
    if (contexts.length !== 1 || expectedContexts.length !== 1) {
      throw new Error(`Academic context verification failed for ${definition.key}`);
    }
  }

  const { data: trainingPeriods, error: trainingPeriodError } = await client
    .from("organization_training_periods")
    .select("id,is_current,status")
    .eq("organization_id", trainingOrganization.id)
    .eq("code", "QA-TRAINING-2026");
  if (trainingPeriodError) throwDatabaseError("Unable to verify QA Training Period 2026", trainingPeriodError);
  if (
    trainingPeriods.length !== 1
    || trainingPeriods[0].id !== trainingPeriod.id
    || !trainingPeriods[0].is_current
    || trainingPeriods[0].status !== "active"
  ) {
    throw new Error("QA Training Period 2026 verification failed");
  }
}

async function ensureRoles(client: Client): Promise<Map<string, Role>> {
  const { error: upsertError } = await client
    .from("roles")
    .upsert(roleDefinitions, { onConflict: "code", ignoreDuplicates: true });
  if (upsertError) throwDatabaseError("Unable to ensure required roles", upsertError);

  const { data, error } = await client.from("roles").select("*").in("code", roleDefinitions.map(({ code }) => code));
  if (error) throwDatabaseError("Unable to load required roles", error);
  const roles = new Map(data.map((role) => [role.code, role]));
  for (const definition of roleDefinitions) {
    if (!roles.has(definition.code)) throw new Error(`Required role is unavailable: ${definition.code}`);
  }
  return roles;
}

async function ensureAdminAccess(client: Client, platformAdminRole: Role): Promise<void> {
  const { error: permissionUpsertError } = await client.from("permissions").upsert(
    { code: "admin.access", resource: "admin", action: "access", description: "Acces admin" },
    { onConflict: "code", ignoreDuplicates: true },
  );
  if (permissionUpsertError) throwDatabaseError("Unable to ensure admin.access", permissionUpsertError);

  const { data: permission, error: permissionError } = await client
    .from("permissions")
    .select("*")
    .eq("code", "admin.access")
    .single();
  if (permissionError) throwDatabaseError("Unable to load admin.access", permissionError);

  const { error } = await client.from("role_permissions").upsert(
    { role_id: platformAdminRole.id, permission_id: permission.id, allowed: true, approval_required: false },
    { onConflict: "role_id,permission_id" },
  );
  if (error) throwDatabaseError("Unable to grant admin.access to platform_admin", error);
}

async function loadUserProfiles(client: Client, userId: string): Promise<Profile[]> {
  const { data, error } = await client.from("profiles").select("*").eq("user_id", userId);
  if (error) throwDatabaseError("Unable to load QA profiles", error);
  return data;
}

function profileValues(
  definition: ProfileDefinition,
  organization: Organization | null,
): ProfileUpdate {
  return {
    profile_type: definition.profileType,
    display_name: definition.displayName,
    first_name: "QA",
    last_name: "Trainings PRO",
    label: definition.label,
    organization_id: organization?.id ?? null,
    university_id: definition.organization === "university" ? organization?.id ?? null : null,
    academic_program_id: null,
    group_id: null,
    preferred_locale: "ro",
    onboarding_flow: definition.onboardingFlow,
    terms_accepted_at: TERMS_ACCEPTED_AT,
    terms_version: TERMS_VERSION,
    is_default: definition.isDefault ?? false,
    status: "active",
  };
}

async function ensureProfile(
  client: Client,
  userId: string,
  definition: ProfileDefinition,
  organization: Organization | null,
  existingProfiles: Profile[],
): Promise<{ profile: Profile; created: boolean }> {
  let existing = existingProfiles.find((profile) => profile.label === definition.label);
  if (definition.isDefault && !existing) {
    existing = existingProfiles.find((profile) => profile.is_default)
      ?? existingProfiles.find((profile) => profile.profile_type === "individual_learner");
  }
  const values = profileValues(definition, organization);

  if (existing) {
    if (definition.isDefault) {
      const { error: defaultError } = await client
        .from("profiles")
        .update({ is_default: false })
        .eq("user_id", userId)
        .eq("is_default", true)
        .neq("id", existing.id);
      if (defaultError) throwDatabaseError("Unable to normalize the QA default profile", defaultError);
    }
    const { data, error } = await client.from("profiles").update(values).eq("id", existing.id).select("*").single();
    if (error) throwDatabaseError(`Unable to update profile ${definition.key}`, error);
    return { profile: data, created: false };
  }

  const insert: ProfileInsert = {
    ...values,
    user_id: userId,
    profile_type: definition.profileType,
    display_name: definition.displayName,
  };
  const { data, error } = await client.from("profiles").insert(insert).select("*").single();
  if (error) throwDatabaseError(`Unable to create profile ${definition.key}`, error);
  existingProfiles.push(data);
  return { profile: data, created: true };
}

async function normalizeMembership(client: Client, profile: Profile, organization: Organization | null): Promise<void> {
  let cleanup = client.from("organization_members").delete().eq("profile_id", profile.id);
  if (organization) cleanup = cleanup.neq("organization_id", organization.id);
  const { error: cleanupError } = await cleanup;
  if (cleanupError) throwDatabaseError(`Unable to normalize memberships for ${profile.label}`, cleanupError);
  if (!organization) return;

  const { error } = await client.from("organization_members").upsert(
    { organization_id: organization.id, profile_id: profile.id, status: "active" },
    { onConflict: "organization_id,profile_id" },
  );
  if (error) throwDatabaseError(`Unable to ensure membership for ${profile.label}`, error);
}

async function normalizeProfileRole(
  client: Client,
  profile: Profile,
  role: Role,
  scopeType: PermissionScope,
  scopeId: string | null,
): Promise<void> {
  const { error: cleanupError } = await client.from("profile_roles").delete().eq("profile_id", profile.id);
  if (cleanupError) throwDatabaseError(`Unable to normalize roles for ${profile.label}`, cleanupError);
  const { error } = await client.from("profile_roles").insert({
    profile_id: profile.id,
    role_id: role.id,
    scope_type: scopeType,
    scope_id: scopeId,
  });
  if (error) throwDatabaseError(`Unable to assign role for ${profile.label}`, error);
}

function organizationFor(
  definition: ProfileDefinition,
  trainingOrganization: Organization,
  universityOrganization: Organization,
): Organization | null {
  if (definition.organization === "training") return trainingOrganization;
  if (definition.organization === "university") return universityOrganization;
  return null;
}

function scopeIdFor(definition: ProfileDefinition, organization: Organization | null): string | null {
  if (definition.scopeType === "organization" || definition.scopeType === "university") return organization?.id ?? null;
  return null;
}

function redact(message: string, secrets: string[]): string {
  return secrets.reduce((safe, secret) => (secret ? safe.split(secret).join("[redacted]") : safe), message);
}

async function main(): Promise<void> {
  assertSafeEnvironment();
  loadLocalEnvironment();
  assertSafeEnvironment();
  const supabaseUrl = requireEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  const password = requireEnvironment("QA_SEED_PASSWORD");
  const secrets = [supabaseUrl, serviceRoleKey, password];

  try {
    const client = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const authResult = await ensureAuthUser(client, password);
    const trainingOrganization = await ensureOrganization(client, {
      name: "QA Training Organization",
      slug: "qa-training-organization",
      type: "training_provider",
      description: "Local and staging QA organization",
      status: "active",
    });
    const universityOrganization = await ensureOrganization(client, {
      name: "QA University Organization",
      slug: "qa-university-organization",
      type: "university",
      description: "Local and staging QA university",
      status: "active",
    });
    const roles = await ensureRoles(client);
    const platformAdminRole = roles.get("platform_admin");
    if (!platformAdminRole) throw new Error("Required role is unavailable: platform_admin");
    await ensureAdminAccess(client, platformAdminRole);

    const existingProfiles = await loadUserProfiles(client, authResult.user.id);
    const results: Array<{ key: string; created: boolean }> = [];
    const profilesByKey = new Map<string, Profile>();
    for (const definition of profileDefinitions) {
      const organization = organizationFor(definition, trainingOrganization, universityOrganization);
      const result = await ensureProfile(client, authResult.user.id, definition, organization, existingProfiles);
      const role = roles.get(definition.roleCode);
      if (!role) throw new Error(`Required role is unavailable: ${definition.roleCode}`);
      await normalizeMembership(client, result.profile, organization);
      await normalizeProfileRole(client, result.profile, role, definition.scopeType, scopeIdFor(definition, organization));
      profilesByKey.set(definition.key, result.profile);
      results.push({ key: definition.key, created: result.created });
    }

    const academicStructure = await ensureAcademicStructure(client, universityOrganization);
    const trainingPeriod = await ensureTrainingPeriod(client, trainingOrganization);
    const academicContextDefinitions: Array<{ key: string; includeGroup: boolean }> = [
      { key: "academicStudent", includeGroup: true },
      { key: "professor", includeGroup: false },
      { key: "coordinator", includeGroup: false },
      { key: "universityAdmin", includeGroup: false },
    ];
    const academicContextResults: Array<{ key: string; result: "created" | "updated" }> = [];
    for (const definition of academicContextDefinitions) {
      const profile = profilesByKey.get(definition.key);
      if (!profile) throw new Error(`Required QA profile is unavailable: ${definition.key}`);
      const result = await ensureAcademicProfileContext(
        client,
        profile,
        universityOrganization,
        academicStructure,
        definition.includeGroup,
      );
      academicContextResults.push({ key: definition.key, result });
    }
    await verifyQaContextSeed(
      client,
      profilesByKey,
      universityOrganization,
      academicStructure,
      academicContextDefinitions,
      trainingOrganization,
      trainingPeriod,
    );

    console.log(`QA Auth user: ${authResult.created ? "created" : "reused"} (${QA_EMAIL})`);
    for (const result of results) console.log(`QA profile ${result.key}: ${result.created ? "created" : "reused"}`);
    console.log(`QA academic structure: ensured (${academicStructure.program.code}, ${academicStructure.academicYear.code}, ${academicStructure.academicGroup.code})`);
    for (const context of academicContextResults) console.log(`QA academic context ${context.key}: ${context.result}`);
    console.log(`QA training period: ensured (${trainingPeriod.code})`);
    console.log("QA context idempotency checks: passed.");
    console.log("QA profile seed completed successfully.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(redact(message, secrets));
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`QA profile seed failed: ${message}`);
  process.exitCode = 1;
});
