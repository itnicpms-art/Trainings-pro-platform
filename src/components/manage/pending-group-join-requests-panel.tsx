"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Clock, ShieldCheck, UserCheck, UserX } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { AcademicGroupJoinRequestActionState } from "@/lib/manage/mutate-academic-group-join-request";
import { cn } from "@/lib/utils";
import type { PendingAcademicGroupJoinRequest } from "@/types/database";

type MutationAction = (
  state: AcademicGroupJoinRequestActionState,
  formData: FormData,
) => Promise<AcademicGroupJoinRequestActionState>;
type EditorTranslations = Dictionary["app"]["structureManagement"]["academic"]["joinRequestsEditor"];

const initialState: AcademicGroupJoinRequestActionState = { status: "idle" };

function PendingRequestRow({
  request,
  locale,
  action,
  translations: t,
}: {
  request: PendingAcademicGroupJoinRequest;
  locale: Locale;
  action: MutationAction;
  translations: EditorTranslations;
}) {
  const [approveState, approveFormAction, approvePending] = useActionState(action, initialState);
  const [rejectState, rejectFormAction, rejectPending] = useActionState(action, initialState);
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [decisionNote, setDecisionNote] = useState("");

  const approveMessage = approveState.status === "success"
    ? t.messages.approved
    : approveState.status === "error" && approveState.reason ? t.messages[approveState.reason] : null;
  const rejectMessage = rejectState.status === "success"
    ? t.messages.rejected
    : rejectState.status === "error" && rejectState.reason ? t.messages[rejectState.reason] : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-[#06113B]">{request.student_display_name}</p>
        <span className="text-xs text-slate-500">&rarr; {request.academic_group_name ?? t.groupUnavailable}</span>
      </div>
      {request.student_note ? <p className="mt-1 text-xs italic leading-5 text-slate-500">&ldquo;{request.student_note}&rdquo;</p> : null}
      <p className="mt-1 text-xs text-slate-400">{t.requestedOn} {request.created_at.slice(0, 10)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <form action={approveFormAction}>
          <input type="hidden" name="intent" value="approve" />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="request_id" value={request.id} />
          <button type="submit" disabled={approvePending || rejectPending} className={cn(buttonVariants({ size: "sm" }), "brand-gradient")}><UserCheck className="size-3.5" />{approvePending ? t.approving : t.approve}</button>
        </form>
        {showRejectNote ? (
          <form action={rejectFormAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="intent" value="reject" />
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="request_id" value={request.id} />
            <input
              type="text"
              name="decision_note"
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              placeholder={t.decisionNotePlaceholder}
              maxLength={500}
              className="h-8 w-48 rounded-lg border border-input bg-white px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <button type="submit" disabled={rejectPending || approvePending} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-rose-700 hover:text-rose-800")}><UserX className="size-3.5" />{rejectPending ? t.rejecting : t.confirmReject}</button>
          </form>
        ) : (
          <button type="button" onClick={() => setShowRejectNote(true)} disabled={approvePending} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-rose-700 hover:text-rose-800")}><UserX className="size-3.5" />{t.reject}</button>
        )}
      </div>
      {approveMessage ? <p role="status" className={cn("mt-2 text-xs", approveState.status === "success" ? "text-emerald-700" : "text-rose-700")}>{approveMessage}</p> : null}
      {rejectMessage ? <p role="status" className={cn("mt-2 text-xs", rejectState.status === "success" ? "text-emerald-700" : "text-rose-700")}>{rejectMessage}</p> : null}
    </div>
  );
}

// TASK 004.7: a flat queue of pending join requests for the actor's scope
// (one program for professor/program_coordinator, the whole university for
// university_admin/platform_admin) -- rendered once per page, not nested per
// group, since it is an actionable inbox rather than per-group nominal
// state.
export function PendingGroupJoinRequestsPanel({
  locale,
  requests,
  translations: t,
  action,
}: {
  locale: Locale;
  requests: PendingAcademicGroupJoinRequest[];
  translations: EditorTranslations;
  action: MutationAction;
}) {
  if (requests.length === 0) return null;

  return (
    <Card className="shadow-sm ring-slate-200">
      <CardHeader className="border-b border-slate-100">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Clock className="size-5" /></span>
          <div><CardTitle>{t.title}</CardTitle><CardDescription className="mt-1">{t.description}</CardDescription></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((request) => <PendingRequestRow key={request.id} request={request} locale={locale} action={action} translations={t} />)}
        <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-emerald-900"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><div><p className="text-sm font-semibold">{t.auditTitle}</p><p className="mt-1 text-xs leading-5 text-emerald-800">{t.auditDescription}</p></div><CheckCircle2 className="ml-auto size-4 shrink-0" /></div>
      </CardContent>
    </Card>
  );
}
