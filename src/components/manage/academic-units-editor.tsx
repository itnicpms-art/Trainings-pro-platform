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

function generateInternalCode(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function AcademicUnitForm({
  action,
  locale,
  targetUniversityId,
  faculties,
  translations: t,
  unitType,
  unit,
}: {
  action: MutationAction;
  locale: Locale;
  targetUniversityId: string;
  faculties: Unit[];
  translations: EditorTranslations;
  unitType: EditableAcademicUnitType;
  unit?: Unit;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isDepartment = unitType === "department";
  const [name, setName] = useState(unit?.name ?? "");
  const [code, setCode] = useState(unit?.code ?? "");
  const [codeEdited, setCodeEdited] = useState(Boolean(unit));
  const message = state.status === "success"
    ? state.intent === "create" ? t.messages.created : t.messages.updated
    : state.status === "error" && state.reason ? t.messages[state.reason] : null;

  return (
    <form action={formAction} className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
      <input type="hidden" name="intent" value={unit ? "update" : "create"} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="target_university_id" value={targetUniversityId} />
      <input type="hidden" name="unit_type" value={unitType} />
      {unit ? <input type="hidden" name="unit_id" value={unit.id} /> : null}

      <div className="space-y-2 sm:col-span-2">
        <p className="text-sm font-medium">{t.fields.type}</p>
        <Badge variant="outline">{t.types[unitType]}</Badge>
      </div>

      {isDepartment ? <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${unit?.id ?? "new"}-parent`}>{t.fields.parentFaculty}</Label>
        <select id={`${unit?.id ?? "new"}-parent`} name="parent_unit_id" defaultValue={unit?.parent_unit_id ?? ""} required className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="">{t.parentPlaceholder}</option>
          {faculties.map((faculty) => <option key={faculty.id} value={faculty.id}>{faculty.name}</option>)}
        </select>
      </div> : <input type="hidden" name="parent_unit_id" value="" />}

      <div className="space-y-2">
        <Label htmlFor={`${unit?.id ?? "new"}-name`}>{t.fields.name}</Label>
        <Input id={`${unit?.id ?? "new"}-name`} name="name" value={name} onChange={(event) => {
          const nextName = event.target.value;
          setName(nextName);
          if (!codeEdited) setCode(generateInternalCode(nextName));
        }} maxLength={200} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${unit?.id ?? "new"}-code`}>{t.fields.code}</Label>
        <Input id={`${unit?.id ?? "new"}-code`} name="code" value={code} onChange={(event) => {
          setCode(event.target.value.toUpperCase().slice(0, 100));
          setCodeEdited(true);
        }} maxLength={100} />
        <p className="text-xs leading-5 text-slate-500">{t.codeHelper}</p>
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
  const [createType, setCreateType] = useState<EditableAcademicUnitType | null>(null);
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
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCreateType((current) => current === "faculty" ? null : "faculty")} className={cn(buttonVariants({ variant: createType === "faculty" ? "default" : "outline" }), createType === "faculty" && "brand-gradient")}><Plus className="size-4" />{t.addFaculty}</button>
            <button type="button" onClick={() => setCreateType((current) => current === "department" ? null : "department")} className={cn(buttonVariants({ variant: createType === "department" ? "default" : "outline" }), createType === "department" && "brand-gradient")}><Plus className="size-4" />{t.addDepartment}</button>
          </div>
          {createType ? <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <AcademicUnitForm key={createType} action={action} locale={locale} targetUniversityId={university.id} faculties={faculties} translations={t} unitType={createType} />
          </div> : null}
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
            <AcademicUnitForm action={action} locale={locale} targetUniversityId={university.id} faculties={faculties} translations={t} unitType={unit.unit_type} unit={unit} />
          </details>
        ))}
        <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-xs leading-5 text-amber-900">{t.hierarchyStatusNote}</div>
        <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-emerald-900"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><div><p className="text-sm font-semibold">{t.auditTitle}</p><p className="mt-1 text-xs leading-5 text-emerald-800">{t.auditDescription}</p></div><CheckCircle2 className="ml-auto size-4 shrink-0" /></div>
      </CardContent>
    </Card>
  );
}
