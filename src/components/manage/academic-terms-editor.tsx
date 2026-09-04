"use client";

import { useActionState, useState } from "react";
import { CalendarClock, CheckCircle2, Pencil, Plus, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { AcademicTermActionState } from "@/lib/manage/mutate-academic-term";
import { cn } from "@/lib/utils";
import type { AcademicCalendarEditorOverview, AcademicTermType } from "@/types/database";

type MutationAction = (state: AcademicTermActionState, formData: FormData) => Promise<AcademicTermActionState>;
type EditorTranslations = Dictionary["app"]["structureManagement"]["academic"]["termsEditor"];
type AcademicTerm = AcademicCalendarEditorOverview["academic_terms"][number];
type AcademicYear = AcademicCalendarEditorOverview["academic_years"][number];
type TermStatus = "active" | "inactive" | "archived";

const initialState: AcademicTermActionState = { status: "idle" };
const termTypes: AcademicTermType[] = ["semester", "trimester", "module", "term", "other"];

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

function AcademicTermForm({
  action,
  locale,
  targetUniversityId,
  years,
  typeLabels,
  translations: t,
  term,
}: {
  action: MutationAction;
  locale: Locale;
  targetUniversityId: string;
  years: AcademicYear[];
  typeLabels: Record<string, string>;
  translations: EditorTranslations;
  term?: AcademicTerm;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [academicYearId, setAcademicYearId] = useState(term?.academic_year_id ?? "");
  const [name, setName] = useState(term?.name ?? "");
  const [code, setCode] = useState(term?.code ?? "");
  const [codeEdited, setCodeEdited] = useState(Boolean(term));
  const [termType, setTermType] = useState<AcademicTermType>(term?.term_type ?? "semester");
  const [startDate, setStartDate] = useState(term?.start_date ?? "");
  const [endDate, setEndDate] = useState(term?.end_date ?? "");
  const [status, setStatus] = useState<TermStatus>(term?.status ?? "active");

  const message = state.status === "success"
    ? state.intent === "create" ? t.messages.created : t.messages.updated
    : state.status === "error" && state.reason ? t.messages[state.reason] : null;

  return (
    <form action={formAction} className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
      <input type="hidden" name="intent" value={term ? "update" : "create"} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="target_university_id" value={targetUniversityId} />
      {term ? <input type="hidden" name="term_id" value={term.id} /> : null}

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${term?.id ?? "new"}-year`}>{t.fields.year}</Label>
        <select id={`${term?.id ?? "new"}-year`} name="academic_year_id" value={academicYearId} onChange={(event) => setAcademicYearId(event.target.value)} required className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="" disabled>{t.yearPlaceholder}</option>
          {years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${term?.id ?? "new"}-name`}>{t.fields.name}</Label>
        <Input id={`${term?.id ?? "new"}-name`} name="name" value={name} onChange={(event) => {
          const nextName = event.target.value;
          setName(nextName);
          if (!codeEdited) setCode(generateInternalCode(nextName));
        }} maxLength={200} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${term?.id ?? "new"}-code`}>{t.fields.code}</Label>
        <Input id={`${term?.id ?? "new"}-code`} name="code" value={code} onChange={(event) => {
          setCode(event.target.value.toUpperCase().slice(0, 100));
          setCodeEdited(true);
        }} maxLength={100} />
        <p className="text-xs leading-5 text-slate-500">{t.codeHelper}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${term?.id ?? "new"}-type`}>{t.fields.type}</Label>
        <select id={`${term?.id ?? "new"}-type`} name="term_type" value={termType} onChange={(event) => setTermType(event.target.value as AcademicTermType)} className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          {termTypes.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${term?.id ?? "new"}-status`}>{t.fields.status}</Label>
        <select id={`${term?.id ?? "new"}-status`} name="status" value={status} onChange={(event) => setStatus(event.target.value as TermStatus)} className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="active">{t.statuses.active}</option>
          <option value="inactive">{t.statuses.inactive}</option>
          <option value="archived">{t.statuses.archived}</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${term?.id ?? "new"}-start`}>{t.fields.startDate}</Label>
        <Input id={`${term?.id ?? "new"}-start`} name="start_date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${term?.id ?? "new"}-end`}>{t.fields.endDate}</Label>
        <Input id={`${term?.id ?? "new"}-end`} name="end_date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
      </div>
      <div className="flex items-end justify-end gap-3 sm:col-span-2">
        {message ? <p role="status" className={cn("text-xs", state.status === "success" ? "text-emerald-700" : "text-rose-700")}>{message}</p> : null}
        <button type="submit" disabled={pending} className={cn(buttonVariants(), "brand-gradient min-w-24")}>{pending ? t.saving : t.save}</button>
      </div>
    </form>
  );
}

export function AcademicTermsEditor({
  locale,
  overview,
  typeLabels,
  translations: t,
  action,
}: {
  locale: Locale;
  overview: AcademicCalendarEditorOverview;
  typeLabels: Record<string, string>;
  translations: EditorTranslations;
  action: MutationAction;
}) {
  const university = overview.selected_university;
  const [creating, setCreating] = useState(false);
  if (!university) return null;

  const years = overview.academic_years.filter((year) => year.status !== "archived");
  const yearNames = new Map(overview.academic_years.map((year) => [year.id, year.name]));

  return (
    <Card className="shadow-sm ring-slate-200">
      <CardHeader className="border-b border-slate-100">
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><CalendarClock className="size-5" /></span>
            <div><CardTitle>{t.title}</CardTitle><CardDescription className="mt-1">{t.description}</CardDescription></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCreating((current) => !current)} className={cn(buttonVariants({ variant: creating ? "default" : "outline" }), creating && "brand-gradient")}><Plus className="size-4" />{t.add}</button>
          </div>
          {creating ? <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            {/* Keyed on the row count so a successful create (which adds a row and
                revalidates) remounts the form with blank fields, while a failed
                create (no new row) leaves the user's entered values untouched. */}
            <AcademicTermForm key={overview.academic_terms.length} action={action} locale={locale} targetUniversityId={university.id} years={years} typeLabels={typeLabels} translations={t} />
          </div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {overview.academic_terms.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">{t.empty}</p> : overview.academic_terms.map((term) => (
          <details key={term.id} className="group rounded-xl border border-slate-200 bg-white px-4 open:bg-slate-50/50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-[#06113B]">{term.name}</p><Badge variant="outline">{typeLabels[term.term_type]}</Badge><Badge variant="secondary">{t.statuses[term.status]}</Badge></div>
                <p className="mt-1 text-xs text-slate-500">{term.code} · {yearNames.get(term.academic_year_id) ?? t.yearUnavailable}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700"><Pencil className="size-3.5" />{t.edit}</span>
            </summary>
            <AcademicTermForm action={action} locale={locale} targetUniversityId={university.id} years={years} typeLabels={typeLabels} translations={t} term={term} />
          </details>
        ))}
        <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-xs leading-5 text-amber-900">{t.hierarchyStatusNote}</div>
        <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-emerald-900"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><div><p className="text-sm font-semibold">{t.auditTitle}</p><p className="mt-1 text-xs leading-5 text-emerald-800">{t.auditDescription}</p></div><CheckCircle2 className="ml-auto size-4 shrink-0" /></div>
      </CardContent>
    </Card>
  );
}
