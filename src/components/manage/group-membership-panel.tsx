"use client";

import { useActionState, useState } from "react";
import { ArrowRightLeft, CheckCircle2, ShieldCheck, Star, UserPlus, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { StudentGroupMembershipActionState } from "@/lib/manage/mutate-student-group-membership";
import { cn } from "@/lib/utils";
import type { StudentGroupMembershipEditorOverview } from "@/types/database";

type MutationAction = (state: StudentGroupMembershipActionState, formData: FormData) => Promise<StudentGroupMembershipActionState>;
type EditorTranslations = Dictionary["app"]["structureManagement"]["academic"]["membershipEditor"];
type Membership = StudentGroupMembershipEditorOverview["memberships"][number];
type Group = StudentGroupMembershipEditorOverview["groups"][number];
type EligibleStudent = StudentGroupMembershipEditorOverview["eligible_students"][number];

const initialState: StudentGroupMembershipActionState = { status: "idle" };

function AddStudentForm({
  action,
  locale,
  targetUniversityId,
  targetGroupId,
  eligibleStudents,
  translations: t,
}: {
  action: MutationAction;
  locale: Locale;
  targetUniversityId: string;
  targetGroupId: string;
  eligibleStudents: EligibleStudent[];
  translations: EditorTranslations;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [studentId, setStudentId] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const message = state.status === "success"
    ? t.messages.added
    : state.status === "error" && state.reason ? t.messages[state.reason] : null;

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-end">
      <input type="hidden" name="intent" value="add" />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="target_university_id" value={targetUniversityId} />
      <input type="hidden" name="target_group_id" value={targetGroupId} />
      <input type="hidden" name="is_primary" value={isPrimary ? "true" : "false"} />
      <div className="flex-1 space-y-2">
        <Label htmlFor={`${targetGroupId}-add-student`}>{t.addStudent}</Label>
        {eligibleStudents.length === 0 ? (
          <p className="text-xs text-slate-500">{t.noEligibleStudents}</p>
        ) : (
          <select id={`${targetGroupId}-add-student`} name="student_profile_id" value={studentId} onChange={(event) => setStudentId(event.target.value)} required className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
            <option value="" disabled>{t.studentPlaceholder}</option>
            {eligibleStudents.map((student) => <option key={student.id} value={student.id}>{student.display_name}</option>)}
          </select>
        )}
      </div>
      <label className="flex items-center gap-2 text-xs font-medium text-[#06113B]">
        <input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} className="size-4 rounded border-input" />
        {t.primaryLabel}
      </label>
      {message ? <p role="status" className={cn("text-xs", state.status === "success" ? "text-emerald-700" : "text-rose-700")}>{message}</p> : null}
      <button type="submit" disabled={pending || eligibleStudents.length === 0} className={cn(buttonVariants(), "brand-gradient")}><UserPlus className="size-4" />{pending ? t.saving : t.save}</button>
    </form>
  );
}

function MembershipRow({
  membership,
  locale,
  moveTargets,
  action,
  translations: t,
}: {
  membership: Membership;
  locale: Locale;
  moveTargets: Group[];
  action: MutationAction;
  translations: EditorTranslations;
}) {
  const [moveState, moveFormAction, movePending] = useActionState(action, initialState);
  const [endState, endFormAction, endPending] = useActionState(action, initialState);
  const [primaryState, primaryFormAction, primaryPending] = useActionState(action, initialState);
  const [targetGroupId, setTargetGroupId] = useState("");
  const isActive = membership.status === "active";

  const moveMessage = moveState.status === "success"
    ? t.messages.moved
    : moveState.status === "error" && moveState.reason ? t.messages[moveState.reason] : null;
  const endMessage = endState.status === "success"
    ? t.messages.ended
    : endState.status === "error" && endState.reason ? t.messages[endState.reason] : null;
  const primaryMessage = primaryState.status === "success"
    ? t.messages.primaryChanged
    : primaryState.status === "error" && primaryState.reason ? t.messages[primaryState.reason] : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-[#06113B]">{membership.student_display_name}</p>
        {membership.is_primary ? <Badge className="bg-amber-100 text-amber-800"><Star className="size-3" />{t.primaryBadge}</Badge> : null}
        <Badge variant={isActive ? "secondary" : "outline"}>{t.statuses[membership.status as keyof typeof t.statuses] ?? membership.status}</Badge>
        {membership.started_at ? <span className="text-xs text-slate-500">{t.since} {membership.started_at}</span> : null}
      </div>
      {isActive ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!membership.is_primary ? (
            <form action={primaryFormAction} className="contents">
              <input type="hidden" name="intent" value="setPrimary" />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="membership_id" value={membership.id} />
              <button type="submit" disabled={primaryPending} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}><Star className="size-3.5" />{primaryPending ? t.settingPrimary : t.setPrimary}</button>
            </form>
          ) : null}
          {moveTargets.length > 0 ? (
            <form action={moveFormAction} className="flex items-center gap-2">
              <input type="hidden" name="intent" value="move" />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="membership_id" value={membership.id} />
              <select name="target_group_id" value={targetGroupId} onChange={(event) => setTargetGroupId(event.target.value)} required className="h-8 rounded-lg border border-input bg-white px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                <option value="" disabled>{t.movePlaceholder}</option>
                {moveTargets.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
              <button type="submit" disabled={movePending || !targetGroupId} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}><ArrowRightLeft className="size-3.5" />{movePending ? t.moving : t.move}</button>
            </form>
          ) : (
            <p className="text-xs text-slate-500">{t.noMoveTargets}</p>
          )}
          <form action={endFormAction} className="contents">
            <input type="hidden" name="intent" value="end" />
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="membership_id" value={membership.id} />
            <button type="submit" disabled={endPending} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-rose-700 hover:text-rose-800")}>{endPending ? t.ending : t.end}</button>
          </form>
        </div>
      ) : null}
      {moveMessage ? <p role="status" className={cn("mt-2 text-xs", moveState.status === "success" ? "text-emerald-700" : "text-rose-700")}>{moveMessage}</p> : null}
      {endMessage ? <p role="status" className={cn("mt-2 text-xs", endState.status === "success" ? "text-emerald-700" : "text-rose-700")}>{endMessage}</p> : null}
      {primaryMessage ? <p role="status" className={cn("mt-2 text-xs", primaryState.status === "success" ? "text-emerald-700" : "text-rose-700")}>{primaryMessage}</p> : null}
    </div>
  );
}

export function GroupMembershipPanel({
  locale,
  targetUniversityId,
  group,
  allGroups,
  eligibleStudents,
  memberships,
  translations: t,
  action,
}: {
  locale: Locale;
  targetUniversityId: string;
  group: Group;
  allGroups: Group[];
  eligibleStudents: EligibleStudent[];
  memberships: Membership[];
  translations: EditorTranslations;
  action: MutationAction;
}) {
  const groupMemberships = memberships
    .filter((membership) => membership.academic_group_id === group.id)
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "active" ? -1 : 1));
  const moveTargets = allGroups.filter((candidate) => candidate.academic_program_id === group.academic_program_id && candidate.id !== group.id && candidate.status !== "archived");

  return (
    <Card className="mt-3 shadow-sm ring-slate-200">
      <CardHeader className="border-b border-slate-100">
        <div className="flex gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><UsersRound className="size-4" /></span>
          <div><CardTitle>{t.title}</CardTitle><CardDescription className="mt-1">{t.description}</CardDescription></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <AddStudentForm action={action} locale={locale} targetUniversityId={targetUniversityId} targetGroupId={group.id} eligibleStudents={eligibleStudents} translations={t} />
        {groupMemberships.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">{t.empty}</p>
        ) : (
          <div className="space-y-2">
            {groupMemberships.map((membership) => (
              <MembershipRow key={membership.id} membership={membership} locale={locale} moveTargets={moveTargets} action={action} translations={t} />
            ))}
          </div>
        )}
        <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-xs leading-5 text-amber-900">{t.hierarchyNote}</div>
        <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-emerald-900"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><div><p className="text-sm font-semibold">{t.auditTitle}</p><p className="mt-1 text-xs leading-5 text-emerald-800">{t.auditDescription}</p></div><CheckCircle2 className="ml-auto size-4 shrink-0" /></div>
      </CardContent>
    </Card>
  );
}
