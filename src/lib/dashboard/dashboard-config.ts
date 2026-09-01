import type { UserProfile } from "@/lib/auth/get-user-profiles";

export type DashboardVariant =
  | "individualLearner"
  | "organizationLearner"
  | "academicStudent"
  | "instructorTrainer"
  | "professor"
  | "consultant"
  | "coordinator"
  | "organizationRepresentative"
  | "organizationAdmin"
  | "universityAdmin"
  | "platformAdmin";

export type DashboardModuleKey =
  | "courses"
  | "training"
  | "assignments"
  | "quizzes"
  | "tests"
  | "exams"
  | "projects"
  | "certificates"
  | "credits"
  | "activity"
  | "organizations"
  | "grades"
  | "academicCourses"
  | "taughtCourses"
  | "sessions"
  | "participants"
  | "evaluationAssignments"
  | "evaluationQuizzes"
  | "evaluationTests"
  | "evaluationProjects"
  | "feedback"
  | "groupsPrograms"
  | "academicCalendar"
  | "consultingSessions"
  | "clients"
  | "calendar"
  | "documents"
  | "coordinatedPrograms"
  | "trainers"
  | "groups"
  | "monitoredGroups"
  | "organizationGroups"
  | "reports"
  | "pendingRequests"
  | "representativeStatus"
  | "members"
  | "invitations"
  | "organizationalActivity"
  | "aggregateProgress"
  | "organizationCertificates"
  | "academicStructure"
  | "academicPrograms"
  | "academicYears"
  | "semesters"
  | "students"
  | "professors"
  | "aggregateResults"
  | "platformOverview"
  | "adminAccess"
  | "websiteSettings"
  | "usersProfiles"
  | "rolesPermissions"
  | "security"
  | "audit";

type VariantConfig = {
  modules: DashboardModuleKey[];
  sidebar: DashboardModuleKey[];
  accent: string;
};

export const dashboardVariants: Record<DashboardVariant, VariantConfig> = {
  individualLearner: {
    modules: ["courses", "assignments", "quizzes", "tests", "exams", "projects", "certificates", "credits", "activity"],
    sidebar: ["courses", "calendar", "assignments", "quizzes", "tests", "exams", "projects", "certificates", "credits", "documents"],
    accent: "from-blue-600 via-indigo-600 to-cyan-500",
  },
  organizationLearner: {
    modules: ["training", "assignments", "quizzes", "tests", "exams", "projects", "certificates", "credits", "activity"],
    sidebar: ["training", "calendar", "assignments", "quizzes", "tests", "exams", "projects", "certificates", "credits"],
    accent: "from-violet-600 via-indigo-600 to-blue-500",
  },
  academicStudent: {
    modules: ["academicCourses", "assignments", "quizzes", "tests", "exams", "projects", "credits", "grades", "academicCalendar", "activity"],
    sidebar: ["academicCourses", "academicCalendar", "assignments", "quizzes", "tests", "exams", "projects", "grades", "credits", "documents"],
    accent: "from-emerald-500 via-teal-500 to-cyan-500",
  },
  instructorTrainer: {
    modules: ["taughtCourses", "sessions", "participants", "evaluationAssignments", "evaluationQuizzes", "evaluationTests", "exams", "evaluationProjects", "feedback", "activity"],
    sidebar: ["taughtCourses", "sessions", "participants", "evaluationAssignments", "evaluationQuizzes", "evaluationTests", "exams", "evaluationProjects", "feedback", "documents"],
    accent: "from-orange-500 via-rose-500 to-violet-600",
  },
  professor: {
    modules: ["academicCourses", "groupsPrograms", "evaluationAssignments", "evaluationQuizzes", "evaluationTests", "exams", "evaluationProjects", "grades", "academicCalendar", "activity"],
    sidebar: ["academicCourses", "groupsPrograms", "academicCalendar", "evaluationAssignments", "evaluationQuizzes", "evaluationTests", "exams", "evaluationProjects", "grades"],
    accent: "from-indigo-600 via-blue-600 to-cyan-500",
  },
  consultant: {
    modules: ["consultingSessions", "projects", "clients", "calendar", "feedback", "documents", "activity"],
    sidebar: ["consultingSessions", "calendar", "projects", "clients", "feedback", "documents"],
    accent: "from-emerald-600 via-green-500 to-lime-400",
  },
  coordinator: {
    modules: ["coordinatedPrograms", "courses", "trainers", "monitoredGroups", "assignments", "quizzes", "tests", "exams", "reports", "pendingRequests"],
    sidebar: ["coordinatedPrograms", "courses", "trainers", "monitoredGroups", "assignments", "quizzes", "tests", "exams", "reports", "pendingRequests"],
    accent: "from-violet-600 via-blue-600 to-teal-500",
  },
  organizationRepresentative: {
    modules: ["representativeStatus", "members", "invitations", "training", "monitoredGroups", "reports", "organizationalActivity"],
    sidebar: ["members", "invitations", "training", "monitoredGroups", "reports", "pendingRequests"],
    accent: "from-blue-600 via-indigo-600 to-violet-600",
  },
  organizationAdmin: {
    modules: ["members", "invitations", "training", "organizationGroups", "aggregateProgress", "organizationCertificates", "pendingRequests", "reports"],
    sidebar: ["members", "invitations", "training", "organizationGroups", "aggregateProgress", "organizationCertificates", "reports"],
    accent: "from-sky-600 via-blue-600 to-emerald-500",
  },
  universityAdmin: {
    modules: ["academicStructure", "academicPrograms", "academicYears", "semesters", "groups", "students", "professors", "academicCourses", "aggregateResults", "reports"],
    sidebar: ["academicStructure", "academicPrograms", "academicYears", "semesters", "groups", "students", "professors", "academicCourses", "reports"],
    accent: "from-indigo-600 via-blue-600 to-cyan-500",
  },
  platformAdmin: {
    modules: ["platformOverview", "adminAccess", "websiteSettings", "organizations", "usersProfiles", "rolesPermissions", "security", "audit"],
    sidebar: ["platformOverview", "websiteSettings", "organizations", "usersProfiles", "rolesPermissions", "security", "audit"],
    accent: "from-slate-950 via-indigo-900 to-violet-700",
  },
};

const organizationModuleKeys = new Set<DashboardModuleKey>(["organizations"]);

function isPersonalLearnerProfile(profile: UserProfile) {
  return (
    (profile.profile_type === "individual" || profile.profile_type === "individual_learner")
    && !profile.organization_id
    && !profile.university_id
  );
}

function sharesOrganizationContext(profile: UserProfile, activeProfile: UserProfile) {
  return Boolean(activeProfile.organization_id && profile.organization_id === activeProfile.organization_id);
}

function sharesUniversityContext(profile: UserProfile, activeProfile: UserProfile) {
  const universityId = activeProfile.university_id ?? activeProfile.organization_id;
  return Boolean(universityId && (profile.university_id === universityId || profile.organization_id === universityId));
}

function sharesProfessionalContext(profile: UserProfile, activeProfile: UserProfile) {
  if (activeProfile.university_id) return sharesUniversityContext(profile, activeProfile);
  return sharesOrganizationContext(profile, activeProfile);
}

export function isDashboardOrganizationModule(moduleKey: DashboardModuleKey) {
  return organizationModuleKeys.has(moduleKey);
}

export function shouldShowDashboardOrganization(
  variant: DashboardVariant,
  organizationId: string | null,
  universityId: string | null,
) {
  return variant === "platformAdmin" || Boolean(organizationId || universityId);
}

export function getScopedOrganizationCount(
  profiles: UserProfile[],
  activeProfile: UserProfile,
  variant: DashboardVariant,
) {
  const activeProfiles = profiles.filter((profile) => profile.status === "active");
  if (variant === "platformAdmin") {
    return new Set(
      activeProfiles.flatMap((profile) => [profile.organization_id, profile.university_id]).filter((id): id is string => Boolean(id)),
    ).size;
  }

  return shouldShowDashboardOrganization(variant, activeProfile.organization_id, activeProfile.university_id) ? 1 : 0;
}

export function getScopedActiveProfileCount(
  profiles: UserProfile[],
  activeProfile: UserProfile,
  variant: DashboardVariant,
) {
  const activeProfiles = profiles.filter((profile) => profile.status === "active");
  if (variant === "platformAdmin") return activeProfiles.length;

  const scopedProfiles = activeProfiles.filter((profile) => {
    if (profile.id === activeProfile.id) return true;

    switch (variant) {
      case "individualLearner":
        if (activeProfile.organization_id || activeProfile.university_id) {
          return (
            profile.profile_type === "individual"
            || profile.profile_type === "individual_learner"
          ) && sharesProfessionalContext(profile, activeProfile);
        }
        return isPersonalLearnerProfile(profile);
      case "organizationLearner":
        return isPersonalLearnerProfile(profile)
          || (profile.profile_type === "organization_learner" && sharesOrganizationContext(profile, activeProfile));
      case "academicStudent":
        return isPersonalLearnerProfile(profile)
          || (profile.profile_type === "student" && sharesUniversityContext(profile, activeProfile));
      case "consultant":
        return profile.profile_type === "consultant"
          && sharesProfessionalContext(profile, activeProfile);
      case "instructorTrainer":
        return sharesProfessionalContext(profile, activeProfile);
      case "professor":
      case "coordinator":
      case "universityAdmin":
        return sharesUniversityContext(profile, activeProfile);
      case "organizationRepresentative":
      case "organizationAdmin":
        return sharesOrganizationContext(profile, activeProfile);
      default:
        return false;
    }
  });

  return scopedProfiles.length;
}

export function deriveDashboardVariant(
  profile: UserProfile,
  roleCodes: ReadonlySet<string>,
  canAccessPlatformAdmin: boolean,
): DashboardVariant {
  const profileType = profile.profile_type;

  if (canAccessPlatformAdmin || profileType === "platform_admin" || roleCodes.has("platform_admin")) return "platformAdmin";
  if (profileType === "university_admin" || roleCodes.has("university_admin")) return "universityAdmin";
  if (profileType === "organization_admin" || roleCodes.has("organization_admin")) return "organizationAdmin";
  if (profileType === "organization_representative" || roleCodes.has("organization_representative")) return "organizationRepresentative";
  if (profileType === "coordinator" || roleCodes.has("program_coordinator") || roleCodes.has("coordinator")) return "coordinator";
  if (profileType === "professor" || roleCodes.has("professor")) return "professor";
  if (profileType === "instructor" || roleCodes.has("instructor") || roleCodes.has("trainer")) return "instructorTrainer";
  if (profileType === "consultant" || roleCodes.has("consultant")) return "consultant";
  if (profileType === "student" || roleCodes.has("university_student")) return "academicStudent";
  if (profileType === "organization_learner") return "organizationLearner";
  return "individualLearner";
}
