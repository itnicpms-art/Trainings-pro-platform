"use client";

import { useActionState, useState } from "react";
import { CalendarDays, CheckCircle2, Pencil, Plus, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import { cn } from "@/lib/utils";
import type { AcademicCalendarEditorOverview } from "@/types/database";

type ActionState = {
  status: "idle" | "success" | "error";
  intent?: "create" | "update";
  reason?: "invalid" | "duplicate" | "forbidden" | "unavailable";
};

type MutationAction = (state: ActionState, formData: FormData) => Promise<ActionState>;
type EditorTranslations = Dictionary["app"]["structureManagement"]["academic"]["yearsEditor"];
type AcademicYear = AcademicCalendarEditorOverview["academic_years"][number];

const initialState: ActionState = { status: "idle" };

function generateInternalCode(name: string) {
  return name
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function AcademicYearForm({
  action,
  locale,
  targetUniversityId,
  translations: t,
  year,
}: {
  action: MutationAction;
  locale: Locale;
  targetUniversityId: string;
  translations: EditorTranslations;
  year?: AcademicYear;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [name, setName] = useState(year?.name ?? "");
  const [code, setCode] = useState(year?.code ?? "");
  const [codeEdited, setCodeEdited] = useState(Boolean(year));
  const message = state.status === "success"
    ? state.intent === "create" ? t.messages.created : t.messages.updated
    : state.status === "error" && state.reason ? t.messages[state.reason] : null;

  return (
    <form action={formAction} className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
      <input type="hidden" name="intent" value={year ? "update" : "create"} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="target_university_id" value={targetUniversityId} />
      {year ? <input type="hidden" name="year_id" value={year.id} /> : null}

      <div className="space-y-2">
        <Label htmlFor={`${year?.id ?? "new"}-name`}>{t.fields.name}</Label>
        <Input id={`${year?.id ?? "new"}-name`} name="name" value={name} onChange={(event) => {
          const nextName = event.target.value;
          setName(nextName);
          if (!codeEdited) setCode(generateInternalCode(nextName));
        }} maxLength={200} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${year?.id ?? "new"}-code`}>{t.fields.code}</Label>
        <Input id={`${year?.id ?? "new"}-code`} name="code" value={code} onChange={(event) => {
          setCode(event.target.value.toUpperCase().slice(0, 100));
          setCodeEdited(true);
        }} maxLength={100} />
        <p className="text-xs leading-5 text-slate-500">{t.codeHelper}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${year?.id ?? "new"}-start`}>{t.fields.startDate}</Label>
        <Input id={`${year?.id ?? "new"}-start`} name="start_date" type="date" defaultValue={year?.start_date ?? ""} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${year?.id ?? "new"}-end`}>{t.fields.endDate}</Label>
        <Input id={`${year?.id ?? "new"}-end`} name="end_date" type="date" defaultValue={year?.end_date ?? ""} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${year?.id ?? "new"}-status`}>{t.fields.status}</Label>
        <select id={`${year?.id ?? "new"}-status`} name="status" defaultValue={year?.status ?? "active"} className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="active">{t.statuses.active}</option>
          <option value="inactive">{t.statuses.inactive}</option>
          <option value="archived">{t.statuses.archived}</option>
        </select>
      </div>
      <div className="flex items-end justify-end gap-3">
        {message ? <p role="status" className={cn("text-xs", state.status === "success" ? "text-emerald-700" : "text-rose-700")}>{message}</p> : null}
        <button type="submit" disabled={pending} className={cn(buttonVariants(), "brand-gradient min-w-24")}>{pending ? t.saving : t.save}</button>
      </div>
    </form>
  );
}

export function AcademicYearsEditor({
  locale,
  overview,
  translations: t,
  action,
}: {
  locale: Locale;
  overview: AcademicCalendarEditorOverview;
  translations: EditorTranslations;
  action: MutationAction;
}) {
  const university = overview.selected_university;
  const [creating, setCreating] = useState(false);
  if (!university) return null;

  return (
    <Card className="shadow-sm ring-slate-200">
      <CardHeader className="border-b border-slate-100">
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700"><CalendarDays className="size-5" /></span>
            <div><CardTitle>{t.title}</CardTitle><CardDescription className="mt-1">{t.description}</CardDescription></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCreating((current) => !current)} className={cn(buttonVariants({ variant: creating ? "default" : "outline" }), creating && "brand-gradient")}><Plus className="size-4" />{t.add}</button>
          </div>
          {creating ? <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <AcademicYearForm action={action} locale={locale} targetUniversityId={university.id} translations={t} />
          </div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {overview.academic_years.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">{t.empty}</p> : overview.academic_years.map((year) => (
          <details key={year.id} className="group rounded-xl border border-slate-200 bg-white px-4 open:bg-slate-50/50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-[#06113B]">{year.name}</p><Badge variant="secondary">{t.statuses[year.status]}</Badge></div>
                <p className="mt-1 text-xs text-slate-500">{year.code} · {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(year.start_date))} — {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(year.end_date))}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700"><Pencil className="size-3.5" />{t.edit}</span>
            </summary>
            <AcademicYearForm action={action} locale={locale} targetUniversityId={university.id} translations={t} year={year} />
          </details>
        ))}
        <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-xs leading-5 text-amber-900">{t.hierarchyStatusNote}</div>
        <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-emerald-900"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><div><p className="text-sm font-semibold">{t.auditTitle}</p><p className="mt-1 text-xs leading-5 text-emerald-800">{t.auditDescription}</p></div><CheckCircle2 className="ml-auto size-4 shrink-0" /></div>
      </CardContent>
    </Card>
  );
}
