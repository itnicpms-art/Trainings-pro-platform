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
  | "exams"
  | "projects"
  | "certificates"
  | "credits"
  | "activity"
  | "organizations"
  | "organization"
  | "academicProgram"
  | "academicYear"
  | "semester"
  | "group"
  | "grades"
  | "academicCourses"
  | "taughtCourses"
  | "sessions"
  | "participants"
  | "evaluationAssignments"
  | "evaluationProjects"
  | "assessmentManagement"
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
  | "evaluations"
  | "reports"
  | "pendingRequests"
  | "representativeStatus"
  | "members"
  | "invitations"
  | "organizationalActivity"
  | "aggregateProgress"
  | "organizationCertificates"
  | "university"
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
    modules: ["courses", "assignments", "quizzes", "exams", "projects", "certificates", "credits", "activity", "organizations"],
    sidebar: ["courses", "calendar", "assignments", "quizzes", "exams", "projects", "certificates", "credits", "documents"],
    accent: "from-blue-600 via-indigo-600 to-cyan-500",
  },
  organizationLearner: {
    modules: ["training", "assignments", "quizzes", "exams", "projects", "certificates", "credits", "organization", "activity"],
    sidebar: ["training", "calendar", "assignments", "quizzes", "exams", "projects", "certificates", "credits", "organization"],
    accent: "from-violet-600 via-indigo-600 to-blue-500",
  },
  academicStudent: {
    modules: ["academicProgram", "academicYear", "semester", "group", "credits", "academicCourses", "assignments", "quizzes", "exams", "projects", "grades", "activity"],
    sidebar: ["academicCourses", "academicCalendar", "assignments", "quizzes", "exams", "projects", "grades", "credits", "documents"],
    accent: "from-emerald-500 via-teal-500 to-cyan-500",
  },
  instructorTrainer: {
    modules: ["taughtCourses", "sessions", "participants", "evaluationAssignments", "evaluationProjects", "assessmentManagement", "feedback", "activity"],
    sidebar: ["taughtCourses", "sessions", "participants", "evaluations", "projects", "feedback", "documents"],
    accent: "from-orange-500 via-rose-500 to-violet-600",
  },
  professor: {
    modules: ["academicCourses", "groupsPrograms", "evaluationAssignments", "evaluationProjects", "exams", "grades", "academicCalendar", "activity"],
    sidebar: ["academicCourses", "groupsPrograms", "academicCalendar", "participants", "evaluations", "projects", "grades", "credits"],
    accent: "from-indigo-600 via-blue-600 to-cyan-500",
  },
  consultant: {
    modules: ["consultingSessions", "projects", "clients", "calendar", "feedback", "documents", "activity"],
    sidebar: ["consultingSessions", "calendar", "projects", "clients", "feedback", "documents"],
    accent: "from-emerald-600 via-green-500 to-lime-400",
  },
  coordinator: {
    modules: ["coordinatedPrograms", "courses", "trainers", "groups", "evaluations", "reports", "pendingRequests"],
    sidebar: ["coordinatedPrograms", "courses", "trainers", "groups", "evaluations", "reports", "pendingRequests"],
    accent: "from-violet-600 via-blue-600 to-teal-500",
  },
  organizationRepresentative: {
    modules: ["organization", "representativeStatus", "members", "invitations", "training", "reports", "organizationalActivity"],
    sidebar: ["organization", "members", "invitations", "training", "reports", "pendingRequests"],
    accent: "from-blue-600 via-indigo-600 to-violet-600",
  },
  organizationAdmin: {
    modules: ["organization", "members", "invitations", "training", "aggregateProgress", "organizationCertificates", "pendingRequests", "reports"],
    sidebar: ["organization", "members", "invitations", "training", "aggregateProgress", "organizationCertificates", "reports"],
    accent: "from-sky-600 via-blue-600 to-emerald-500",
  },
  universityAdmin: {
    modules: ["university", "academicPrograms", "academicYears", "semesters", "groups", "students", "professors", "academicCourses", "aggregateResults", "reports"],
    sidebar: ["university", "academicPrograms", "academicYears", "semesters", "groups", "students", "professors", "academicCourses", "reports"],
    accent: "from-indigo-600 via-blue-600 to-cyan-500",
  },
  platformAdmin: {
    modules: ["platformOverview", "adminAccess", "websiteSettings", "organizations", "usersProfiles", "rolesPermissions", "security", "audit"],
    sidebar: ["platformOverview", "websiteSettings", "organizations", "usersProfiles", "rolesPermissions", "security", "audit"],
    accent: "from-slate-950 via-indigo-900 to-violet-700",
  },
};

export function shouldShowDashboardOrganization(
  variant: DashboardVariant,
  organizationId: string | null,
  organizationCount: number,
) {
  return variant !== "individualLearner" || Boolean(organizationId) || organizationCount > 0;
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
