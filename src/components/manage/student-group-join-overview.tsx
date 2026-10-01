"use client";

import { useActionState } from "react";
import { CheckCircle2, Clock, GraduationCap, ShieldCheck, Star, UserPlus, UserX, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { AcademicGroupJoinRequestActionState } from "@/lib/manage/mutate-academic-group-join-request";
import { cn } from "@/lib/utils";
import type { StudentAcademicGroupJoinOverview } from "@/types/database";

type MutationAction = (
  state: AcademicGroupJoinRequestActionState,
  formData: FormData,
) => Promise<AcademicGroupJoinRequestActionState>;
type ViewTranslations = Dictionary["app"]["groups"];

const initialState: AcademicGroupJoinRequestActionState = { status: "idle" };

function MembershipRow({ membership, translations: t }: { membership: StudentAcademicGroupJoinOverview["memberships"][number]; translations: ViewTranslations }) {
  const isActive = membership.status === "active";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-[#06113B]">{membership.academic_group_name ?? t.groupUnavailable}</p>
        {membership.is_primary ? <Badge className="bg-amber-100 text-amber-800"><Star className="size-3" />{t.primaryBadge}</Badge> : null}
        <Badge variant={isActive ? "secondary" : "outline"}>{t.membershipStatuses[membership.status as keyof typeof t.membershipStatuses] ?? membership.status}</Badge>
      </div>
      <p className="mt-1 text-xs text-slate-500">{membership.academic_program_name}{membership.started_at ? ` · ${t.since} ${membership.started_at}` : ""}</p>
    </div>
  );
}

function RequestGroupForm({
  group,
  locale,
  action,
  translations: t,
}: {
  group: StudentAcademicGroupJoinOverview["eligible_groups"][number];
  locale: Locale;
  action: MutationAction;
  translations: ViewTranslations;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const message = state.status === "success"
    ? (state.alreadyPending ? t.messages.alreadyPending : t.messages.requested)
    : state.status === "error" && state.reason ? t.messages[state.reason] : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-[#06113B]">{group.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{group.academic_program_name}</p>
        </div>
        <form action={formAction}>
          <input type="hidden" name="intent" value="request" />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="target_academic_group_id" value={group.id} />
          <button type="submit" disabled={pending} className={cn(buttonVariants({ size: "sm" }), "brand-gradient")}><UserPlus className="size-3.5" />{pending ? t.requesting : t.requestJoin}</button>
        </form>
      </div>
      {message ? <p role="status" className={cn("mt-2 text-xs", state.status === "success" ? "text-emerald-700" : "text-rose-700")}>{message}</p> : null}
    </div>
  );
}

function RequestHistoryRow({
  request,
  locale,
  action,
  translations: t,
}: {
  request: StudentAcademicGroupJoinOverview["requests"][number];
  locale: Locale;
  action: MutationAction;
  translations: ViewTranslations;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const message = state.status === "success"
    ? t.messages.cancelled
    : state.status === "error" && state.reason ? t.messages[state.reason] : null;
  const isPending = request.status === "pending";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-[#06113B]">{request.academic_group_name ?? t.groupUnavailable}</p>
        <Badge variant={isPending ? "secondary" : "outline"}>{t.requestStatuses[request.status]}</Badge>
      </div>
      <p className="mt-1 text-xs text-slate-500">{request.academic_program_name} · {t.requestedOn} {request.created_at.slice(0, 10)}</p>
      {request.decision_note ? <p className="mt-1 text-xs italic leading-5 text-slate-500">&ldquo;{request.decision_note}&rdquo;</p> : null}
      {isPending ? (
        <form action={formAction} className="mt-2">
          <input type="hidden" name="intent" value="cancel" />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="request_id" value={request.id} />
          <button type="submit" disabled={pending} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-rose-700 hover:text-rose-800")}><UserX className="size-3.5" />{pending ? t.cancelling : t.cancel}</button>
        </form>
      ) : null}
      {message ? <p role="status" className={cn("mt-2 text-xs", state.status === "success" ? "text-emerald-700" : "text-rose-700")}>{message}</p> : null}
    </div>
  );
}

export function StudentGroupJoinOverview({
  locale,
  overview,
  translations: t,
  action,
}: {
  locale: Locale;
  overview: StudentAcademicGroupJoinOverview;
  translations: ViewTranslations;
  action: MutationAction;
}) {
  const pendingRequests = overview.requests.filter((request) => request.status === "pending");
  const historyRequests = overview.requests.filter((request) => request.status !== "pending");

  return (
    <div className="space-y-4">
      <Card className="shadow-sm ring-slate-200">
        <CardHeader className="border-b border-slate-100">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><UsersRound className="size-5" /></span>
            <div><CardTitle>{t.memberships.title}</CardTitle><CardDescription className="mt-1">{t.memberships.description}</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {overview.memberships.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">{t.memberships.empty}</p>
          ) : overview.memberships.map((membership) => <MembershipRow key={membership.id} membership={membership} translations={t} />)}
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-slate-200">
        <CardHeader className="border-b border-slate-100">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><GraduationCap className="size-5" /></span>
            <div><CardTitle>{t.eligibleGroups.title}</CardTitle><CardDescription className="mt-1">{t.eligibleGroups.description}</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {overview.eligible_groups.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">{t.eligibleGroups.empty}</p>
          ) : overview.eligible_groups.map((group) => <RequestGroupForm key={group.id} group={group} locale={locale} action={action} translations={t} />)}
        </CardContent>
      </Card>

      <Card className="shadow-sm ring-slate-200">
        <CardHeader className="border-b border-slate-100">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Clock className="size-5" /></span>
            <div><CardTitle>{t.requests.title}</CardTitle><CardDescription className="mt-1">{t.requests.description}</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingRequests.length === 0 && historyRequests.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">{t.requests.empty}</p>
          ) : (
            <>
              {pendingRequests.map((request) => <RequestHistoryRow key={request.id} request={request} locale={locale} action={action} translations={t} />)}
              {historyRequests.length > 0 ? (
                <details className="rounded-xl border border-slate-200 bg-white px-3">
                  <summary className="cursor-pointer list-none py-2 text-xs font-semibold text-slate-500 [&::-webkit-details-marker]:hidden">{t.requests.historyTitle} ({historyRequests.length})</summary>
                  <div className="space-y-2 pb-3">
                    {historyRequests.map((request) => <RequestHistoryRow key={request.id} request={request} locale={locale} action={action} translations={t} />)}
                  </div>
                </details>
              ) : null}
            </>
          )}
          <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-emerald-900"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><div><p className="text-sm font-semibold">{t.auditTitle}</p><p className="mt-1 text-xs leading-5 text-emerald-800">{t.auditDescription}</p></div><CheckCircle2 className="ml-auto size-4 shrink-0" /></div>
        </CardContent>
      </Card>
    </div>
  );
}
