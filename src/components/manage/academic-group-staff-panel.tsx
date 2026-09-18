"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, GraduationCap, ShieldCheck, UserMinus, UserPlus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { AcademicGroupStaffAssignmentActionState } from "@/lib/manage/mutate-academic-group-staff-assignment";
import { cn } from "@/lib/utils";
import type { AcademicGroupStaffAssignment, EligibleProfessor } from "@/types/database";

type MutationAction = (
  state: AcademicGroupStaffAssignmentActionState,
  formData: FormData,
) => Promise<AcademicGroupStaffAssignmentActionState>;
type EditorTranslations = Dictionary["app"]["structureManagement"]["academic"]["groupStaffEditor"];

const initialState: AcademicGroupStaffAssignmentActionState = { status: "idle" };

function AssignProfessorForm({
  action,
  locale,
  targetGroupId,
  eligibleProfessors,
  translations: t,
}: {
  action: MutationAction;
  locale: Locale;
  targetGroupId: string;
  eligibleProfessors: EligibleProfessor[];
  translations: EditorTranslations;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [profileId, setProfileId] = useState("");
  const message = state.status === "success"
    ? t.messages.assigned
    : state.status === "error" && state.reason ? t.messages[state.reason] : null;

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-end">
      <input type="hidden" name="intent" value="assign" />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="target_academic_group_id" value={targetGroupId} />
      <div className="flex-1 space-y-2">
        <Label htmlFor={`${targetGroupId}-assign-professor`}>{t.assignProfessor}</Label>
        {eligibleProfessors.length === 0 ? (
          <p className="text-xs text-slate-500">{t.noEligibleProfessors}</p>
        ) : (
          <select
            id={`${targetGroupId}-assign-professor`}
            name="target_profile_id"
            value={profileId}
            onChange={(event) => setProfileId(event.target.value)}
            required
            className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="" disabled>{t.professorPlaceholder}</option>
            {eligibleProfessors.map((professor) => <option key={professor.profile_id} value={professor.profile_id}>{professor.display_name}</option>)}
          </select>
        )}
      </div>
      {message ? <p role="status" className={cn("text-xs", state.status === "success" ? "text-emerald-700" : "text-rose-700")}>{message}</p> : null}
      <button type="submit" disabled={pending || eligibleProfessors.length === 0} className={cn(buttonVariants(), "brand-gradient")}><UserPlus className="size-4" />{pending ? t.assigning : t.assign}</button>
    </form>
  );
}

function AssignmentRow({
  assignment,
  locale,
  action,
  translations: t,
}: {
  assignment: AcademicGroupStaffAssignment;
  locale: Locale;
  action: MutationAction;
  translations: EditorTranslations;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const message = state.status === "success"
    ? t.messages.unassigned
    : state.status === "error" && state.reason ? t.messages[state.reason] : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="min-w-0">
        <p className="font-medium text-[#06113B]">{assignment.staff_display_name}</p>
        {message ? <p role="status" className={cn("mt-1 text-xs", state.status === "success" ? "text-emerald-700" : "text-rose-700")}>{message}</p> : null}
      </div>
      <form action={formAction}>
        <input type="hidden" name="intent" value="unassign" />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="assignment_id" value={assignment.id} />
        <button type="submit" disabled={pending} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-rose-700 hover:text-rose-800")}><UserMinus className="size-3.5" />{pending ? t.unassigning : t.unassign}</button>
      </form>
    </div>
  );
}

// TASK 004.6.2: nominal Professor <-> Academic Group responsibility.
// `action` absent (plain Professor -- resolve_academic_program_editor_mode
// would deny them at the RPC regardless) renders a read-only badge list:
// no assign form, no eligible-professor roster, no unassign buttons. This
// mirrors the existing groupAction={isUniversityAdmin ? ... : undefined}
// pattern already used at the page level for the group-edit form.
export function AcademicGroupStaffPanel({
  locale,
  group,
  assignments,
  eligibleProfessors,
  translations: t,
  action,
}: {
  locale: Locale;
  group: { id: string; academic_program_id: string };
  assignments: AcademicGroupStaffAssignment[];
  eligibleProfessors: EligibleProfessor[];
  translations: EditorTranslations;
  action?: MutationAction;
}) {
  const groupAssignments = assignments.filter((assignment) => assignment.academic_group_id === group.id);
  const assignedProfileIds = new Set(groupAssignments.map((assignment) => assignment.staff_profile_id));
  const assignableProfessors = eligibleProfessors.filter(
    (professor) => professor.academic_program_id === group.academic_program_id && !assignedProfileIds.has(professor.profile_id),
  );

  return (
    <Card className="mt-3 shadow-sm ring-slate-200">
      <CardHeader className="border-b border-slate-100">
        <div className="flex gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><GraduationCap className="size-4" /></span>
          <div><CardTitle>{t.title}</CardTitle><CardDescription className="mt-1">{t.description}</CardDescription></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {action ? (
          <AssignProfessorForm
            key={groupAssignments.length}
            action={action}
            locale={locale}
            targetGroupId={group.id}
            eligibleProfessors={assignableProfessors}
            translations={t}
          />
        ) : null}
        {groupAssignments.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">{t.empty}</p>
        ) : (
          <div className="space-y-2">
            {groupAssignments.map((assignment) => (
              action ? (
                <AssignmentRow key={assignment.id} assignment={assignment} locale={locale} action={action} translations={t} />
              ) : (
                <div key={assignment.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="font-medium text-[#06113B]">{assignment.staff_display_name}</p>
                </div>
              )
            ))}
          </div>
        )}
        {action ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-emerald-900"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><div><p className="text-sm font-semibold">{t.auditTitle}</p><p className="mt-1 text-xs leading-5 text-emerald-800">{t.auditDescription}</p></div><CheckCircle2 className="ml-auto size-4 shrink-0" /></div>
        ) : null}
      </CardContent>
    </Card>
  );
}
