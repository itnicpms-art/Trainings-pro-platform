"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, GraduationCap, ShieldCheck, UserMinus, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { AcademicProgramStaffAssignmentActionState } from "@/lib/manage/mutate-academic-program-staff-assignment";
import { cn } from "@/lib/utils";
import type { AcademicProgramStaffAssignmentsEditorOverview } from "@/types/database";

type MutationAction = (
  state: AcademicProgramStaffAssignmentActionState,
  formData: FormData,
) => Promise<AcademicProgramStaffAssignmentActionState>;
type EditorTranslations = Dictionary["app"]["structureManagement"]["academic"]["programStaffAssignments"];
type Assignment = AcademicProgramStaffAssignmentsEditorOverview["assignments"][number];
type StaffProfile = AcademicProgramStaffAssignmentsEditorOverview["eligible_staff_profiles"][number];
type Program = AcademicProgramStaffAssignmentsEditorOverview["academic_programs"][number];

const initialState: AcademicProgramStaffAssignmentActionState = { status: "idle" };

function GrantAssignmentForm({
  action,
  locale,
  staffProfiles,
  programs,
  translations: t,
}: {
  action: MutationAction;
  locale: Locale;
  staffProfiles: StaffProfile[];
  programs: Program[];
  translations: EditorTranslations;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [profileId, setProfileId] = useState("");
  const [programId, setProgramId] = useState("");
  const [roleCode, setRoleCode] = useState<"professor" | "program_coordinator" | "">("");
  const message = state.status === "success"
    ? t.messages.granted
    : state.status === "error" && state.reason ? t.messages[state.reason] : null;

  return (
    <form action={formAction} className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
      <input type="hidden" name="intent" value="grant" />
      <input type="hidden" name="locale" value={locale} />

      <div className="space-y-2">
        <Label htmlFor="grant-staff-profile">{t.fields.staffProfile}</Label>
        <select id="grant-staff-profile" name="target_profile_id" value={profileId} onChange={(event) => setProfileId(event.target.value)} required className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="" disabled>{t.staffProfilePlaceholder}</option>
          {staffProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="grant-program">{t.fields.program}</Label>
        <select id="grant-program" name="target_academic_program_id" value={programId} onChange={(event) => setProgramId(event.target.value)} required className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="" disabled>{t.programPlaceholder}</option>
          {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="grant-role">{t.fields.role}</Label>
        <select id="grant-role" name="role_code" value={roleCode} onChange={(event) => setRoleCode(event.target.value as "professor" | "program_coordinator")} required className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="" disabled>{t.rolePlaceholder}</option>
          <option value="professor">{t.roles.professor}</option>
          <option value="program_coordinator">{t.roles.program_coordinator}</option>
        </select>
      </div>
      <div className="flex items-end justify-end gap-3 sm:col-span-3">
        {message ? <p role="status" className={cn("text-xs", state.status === "success" ? "text-emerald-700" : "text-rose-700")}>{message}</p> : null}
        <button type="submit" disabled={pending} className={cn(buttonVariants(), "brand-gradient min-w-24")}><UserPlus className="size-4" />{pending ? t.saving : t.grant}</button>
      </div>
    </form>
  );
}

function AssignmentRow({
  assignment,
  programName,
  action,
  locale,
  translations: t,
}: {
  assignment: Assignment;
  programName: string;
  action: MutationAction;
  locale: Locale;
  translations: EditorTranslations;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const message = state.status === "success"
    ? t.messages.revoked
    : state.status === "error" && state.reason ? t.messages[state.reason] : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-[#06113B]">{assignment.target_profile_display_name}</p>
          <Badge variant="secondary">{t.roles[assignment.role_code]}</Badge>
        </div>
        <p className="mt-1 text-xs text-slate-500">{programName} · {t.assignedSince} {assignment.created_at.slice(0, 10)}</p>
        {message ? <p role="status" className={cn("mt-1 text-xs", state.status === "success" ? "text-emerald-700" : "text-rose-700")}>{message}</p> : null}
      </div>
      <form action={formAction}>
        <input type="hidden" name="intent" value="revoke" />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="assignment_id" value={assignment.id} />
        <button type="submit" disabled={pending} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-rose-700 hover:text-rose-800")}><UserMinus className="size-3.5" />{pending ? t.revoking : t.revoke}</button>
      </form>
    </div>
  );
}

export function AcademicProgramStaffEditor({
  locale,
  overview,
  translations: t,
  action,
}: {
  locale: Locale;
  overview: AcademicProgramStaffAssignmentsEditorOverview;
  translations: EditorTranslations;
  action: MutationAction;
}) {
  const university = overview.selected_university;
  if (!university) return null;

  const programNames = new Map(overview.academic_programs.map((program) => [program.id, program.name]));

  return (
    <Card className="shadow-sm ring-slate-200">
      <CardHeader className="border-b border-slate-100">
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><GraduationCap className="size-5" /></span>
            <div><CardTitle>{t.title}</CardTitle><CardDescription className="mt-1">{t.description}</CardDescription></div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <GrantAssignmentForm
              key={overview.assignments.length}
              action={action}
              locale={locale}
              staffProfiles={overview.eligible_staff_profiles}
              programs={overview.academic_programs}
              translations={t}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {overview.assignments.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">{t.empty}</p> : overview.assignments.map((assignment) => (
          <AssignmentRow
            key={assignment.id}
            assignment={assignment}
            programName={programNames.get(assignment.academic_program_id) ?? assignment.academic_program_id}
            action={action}
            locale={locale}
            translations={t}
          />
        ))}
        <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-emerald-900"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><div><p className="text-sm font-semibold">{t.auditTitle}</p><p className="mt-1 text-xs leading-5 text-emerald-800">{t.auditDescription}</p></div><CheckCircle2 className="ml-auto size-4 shrink-0" /></div>
      </CardContent>
    </Card>
  );
}
