"use client";

import { useActionState, useState } from "react";
import { Building2, CheckCircle2, Pencil, Plus, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import { cn } from "@/lib/utils";
import type { AcademicUnitsEditorOverview, EditableAcademicUnitType } from "@/types/database";

type ActionState = {
  status: "idle" | "success" | "error";
  intent?: "create" | "update";
  reason?: "invalid" | "duplicate" | "forbidden" | "unavailable";
};

type MutationAction = (state: ActionState, formData: FormData) => Promise<ActionState>;
type EditorTranslations = Dictionary["app"]["structureManagement"]["academic"]["editor"];
type Unit = AcademicUnitsEditorOverview["units"][number];

const initialState: ActionState = { status: "idle" };

function AcademicUnitForm({
  action,
  locale,
  targetUniversityId,
  faculties,
  translations: t,
  unit,
}: {
  action: MutationAction;
  locale: Locale;
  targetUniversityId: string;
  faculties: Unit[];
  translations: EditorTranslations;
  unit?: Unit;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [unitType, setUnitType] = useState<EditableAcademicUnitType>(unit?.unit_type ?? "faculty");
  const isDepartment = unitType === "department";
  const message = state.status === "success"
    ? state.intent === "create" ? t.messages.created : t.messages.updated
    : state.status === "error" && state.reason ? t.messages[state.reason] : null;

  return (
    <form action={formAction} className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
      <input type="hidden" name="intent" value={unit ? "update" : "create"} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="target_university_id" value={targetUniversityId} />
      {unit ? <input type="hidden" name="unit_id" value={unit.id} /> : null}

      <div className="space-y-2">
        <Label htmlFor={`${unit?.id ?? "new"}-unit-type`}>{t.fields.type}</Label>
        <select
          id={`${unit?.id ?? "new"}-unit-type`}
          name="unit_type"
          value={unitType}
          disabled={Boolean(unit)}
          onChange={(event) => setUnitType(event.target.value as EditableAcademicUnitType)}
          className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-slate-50"
        >
          <option value="faculty">{t.types.faculty}</option>
          <option value="department">{t.types.department}</option>
        </select>
        {unit ? <input type="hidden" name="unit_type" value={unit.unit_type} /> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${unit?.id ?? "new"}-parent`}>{t.fields.parentFaculty}</Label>
        <select
          id={`${unit?.id ?? "new"}-parent`}
          name="parent_unit_id"
          defaultValue={unit?.parent_unit_id ?? ""}
          disabled={!isDepartment}
          required={isDepartment}
          className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-slate-50"
        >
          <option value="">{isDepartment ? t.parentPlaceholder : t.parentNotApplicable}</option>
          {faculties.map((faculty) => <option key={faculty.id} value={faculty.id}>{faculty.name}</option>)}
        </select>
        {!isDepartment ? <input type="hidden" name="parent_unit_id" value="" /> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${unit?.id ?? "new"}-code`}>{t.fields.code}</Label>
        <Input id={`${unit?.id ?? "new"}-code`} name="code" defaultValue={unit?.code ?? ""} maxLength={100} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${unit?.id ?? "new"}-name`}>{t.fields.name}</Label>
        <Input id={`${unit?.id ?? "new"}-name`} name="name" defaultValue={unit?.name ?? ""} maxLength={200} required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${unit?.id ?? "new"}-description`}>{t.fields.description}</Label>
        <textarea id={`${unit?.id ?? "new"}-description`} name="description" defaultValue={unit?.description ?? ""} maxLength={2000} rows={3} className="w-full rounded-lg border border-input bg-white px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${unit?.id ?? "new"}-status`}>{t.fields.status}</Label>
        <select id={`${unit?.id ?? "new"}-status`} name="status" defaultValue={unit?.status ?? "active"} className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
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

export function AcademicUnitsEditor({
  locale,
  overview,
  translations: t,
  action,
}: {
  locale: Locale;
  overview: AcademicUnitsEditorOverview;
  translations: EditorTranslations;
  action: MutationAction;
}) {
  const university = overview.selected_university;
  if (!university) return null;

  const faculties = overview.units.filter((unit) => unit.unit_type === "faculty" && unit.status !== "archived");
  const facultyNames = new Map(overview.units.filter((unit) => unit.unit_type === "faculty").map((unit) => [unit.id, unit.name]));

  return (
    <Card className="shadow-sm ring-slate-200">
      <CardHeader className="border-b border-slate-100">
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Building2 className="size-5" /></span>
            <div><CardTitle>{t.title}</CardTitle><CardDescription className="mt-1">{t.description}</CardDescription></div>
          </div>
          <details className="group">
            <summary className={cn(buttonVariants(), "brand-gradient cursor-pointer list-none [&::-webkit-details-marker]:hidden")}><Plus className="size-4" />{t.add}</summary>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <AcademicUnitForm action={action} locale={locale} targetUniversityId={university.id} faculties={faculties} translations={t} />
            </div>
          </details>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {overview.units.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">{t.empty}</p> : overview.units.map((unit) => (
          <details key={unit.id} className="group rounded-xl border border-slate-200 bg-white px-4 open:bg-slate-50/50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-[#06113B]">{unit.name}</p><Badge variant="outline">{t.types[unit.unit_type]}</Badge><Badge variant="secondary">{t.statuses[unit.status]}</Badge></div>
                <p className="mt-1 text-xs text-slate-500">{unit.code}{unit.parent_unit_id ? ` · ${facultyNames.get(unit.parent_unit_id) ?? t.parentUnavailable}` : ""}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700"><Pencil className="size-3.5" />{t.edit}</span>
            </summary>
            <AcademicUnitForm action={action} locale={locale} targetUniversityId={university.id} faculties={faculties} translations={t} unit={unit} />
          </details>
        ))}
        <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-emerald-900"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><div><p className="text-sm font-semibold">{t.auditTitle}</p><p className="mt-1 text-xs leading-5 text-emerald-800">{t.auditDescription}</p></div><CheckCircle2 className="ml-auto size-4 shrink-0" /></div>
      </CardContent>
    </Card>
  );
}
