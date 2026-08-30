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
type Profile = TableRow<"profiles">;
type Role = TableRow<"roles">;
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

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
  if (process.env.VERCEL_ENV?.toLowerCase() === "production") {
    throw new Error("QA profile seeding is disabled in the production Vercel environment.");
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
    for (const definition of profileDefinitions) {
      const organization = organizationFor(definition, trainingOrganization, universityOrganization);
      const result = await ensureProfile(client, authResult.user.id, definition, organization, existingProfiles);
      const role = roles.get(definition.roleCode);
      if (!role) throw new Error(`Required role is unavailable: ${definition.roleCode}`);
      await normalizeMembership(client, result.profile, organization);
      await normalizeProfileRole(client, result.profile, role, definition.scopeType, scopeIdFor(definition, organization));
      results.push({ key: definition.key, created: result.created });
    }

    console.log(`QA Auth user: ${authResult.created ? "created" : "reused"} (${QA_EMAIL})`);
    for (const result of results) console.log(`QA profile ${result.key}: ${result.created ? "created" : "reused"}`);
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
