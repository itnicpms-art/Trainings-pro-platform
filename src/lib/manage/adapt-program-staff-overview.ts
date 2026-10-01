import type { AcademicGroupsEditorOverview, ProgramStaffAcademicOverview, StudentGroupMembershipEditorOverview } from "@/types/database";

// TASK 004.6.1: AcademicGroupsEditor/GroupMembershipPanel already implement
// every group/membership capability a professor/program_coordinator needs --
// reusing them here (per the task's own "do not duplicate existing group or
// membership business logic") means reshaping the program-scoped overview
// into the same two university-shaped types those components already
// accept, rather than teaching either component a third overview shape.
// academic_programs/universities are deliberately singleton arrays: a
// staff member's create-group form must only ever offer their one
// authorized program, never a picker across the whole university.
export function adaptProgramStaffOverview(overview: ProgramStaffAcademicOverview): {
  groupsOverview: AcademicGroupsEditorOverview;
  membershipOverview: StudentGroupMembershipEditorOverview;
} | null {
  const program = overview.selected_program;
  const university = overview.selected_university;
  if (!program || !university) return null;

  const groupsOverview: AcademicGroupsEditorOverview = {
    actor_profile_id: overview.actor_profile_id,
    actor_mode: overview.actor_mode,
    selected_university: university,
    universities: [university],
    academic_programs: [{ id: program.id, code: program.code, name: program.name, status: program.status }],
    academic_years: overview.academic_years,
    academic_terms: overview.academic_terms,
    academic_groups: overview.academic_groups,
    group_staff_assignments: overview.group_staff_assignments,
    eligible_professors: overview.eligible_professors,
  };

  const membershipOverview: StudentGroupMembershipEditorOverview = {
    actor_profile_id: overview.actor_profile_id,
    actor_mode: overview.actor_mode,
    selected_university: university,
    universities: [university],
    groups: overview.academic_groups.map((group) => ({
      id: group.id,
      code: group.code,
      name: group.name,
      status: group.status,
      academic_program_id: group.academic_program_id,
    })),
    eligible_students: overview.eligible_students,
    memberships: overview.memberships,
  };

  return { groupsOverview, membershipOverview };
}
