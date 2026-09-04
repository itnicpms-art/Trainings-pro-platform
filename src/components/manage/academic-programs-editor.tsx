"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, GraduationCap, Pencil, Plus, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import { cn } from "@/lib/utils";
import type { AcademicProgramLevel, AcademicProgramsEditorOverview } from "@/types/database";

type ActionState = {
  status: "idle" | "success" | "error";
  intent?: "create" | "update";
  reason?: "invalid" | "duplicate" | "forbidden" | "unavailable";
};

type MutationAction = (state: ActionState, formData: FormData) => Promise<ActionState>;
type EditorTranslations = Dictionary["app"]["structureManagement"]["academic"]["programsEditor"];
type Program = AcademicProgramsEditorOverview["programs"][number];
type Unit = AcademicProgramsEditorOverview["units"][number];

const initialState: ActionState = { status: "idle" };
const programLevels: AcademicProgramLevel[] = ["bachelor", "master", "phd", "postgraduate", "other"];

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

function AcademicProgramForm({
  action,
  locale,
  targetUniversityId,
  units,
  levelLabels,
  translations: t,
  program,
}: {
  action: MutationAction;
  locale: Locale;
  targetUniversityId: string;
  units: Unit[];
  levelLabels: Record<string, string>;
  translations: EditorTranslations;
  program?: Program;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [name, setName] = useState(program?.name ?? "");
  const [code, setCode] = useState(program?.code ?? "");
  const [codeEdited, setCodeEdited] = useState(Boolean(program));
  const message = state.status === "success"
    ? state.intent === "create" ? t.messages.created : t.messages.updated
    : state.status === "error" && state.reason ? t.messages[state.reason] : null;

  return (
    <form action={formAction} className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
      <input type="hidden" name="intent" value={program ? "update" : "create"} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="target_university_id" value={targetUniversityId} />
      {program ? <input type="hidden" name="program_id" value={program.id} /> : null}

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${program?.id ?? "new"}-unit`}>{t.fields.unit}</Label>
        <select id={`${program?.id ?? "new"}-unit`} name="organization_unit_id" defaultValue={program?.organization_unit_id ?? ""} required className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="" disabled>{t.unitPlaceholder}</option>
          {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${program?.id ?? "new"}-name`}>{t.fields.name}</Label>
        <Input id={`${program?.id ?? "new"}-name`} name="name" value={name} onChange={(event) => {
          const nextName = event.target.value;
          setName(nextName);
          if (!codeEdited) setCode(generateInternalCode(nextName));
        }} maxLength={200} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${program?.id ?? "new"}-code`}>{t.fields.code}</Label>
        <Input id={`${program?.id ?? "new"}-code`} name="code" value={code} onChange={(event) => {
          setCode(event.target.value.toUpperCase().slice(0, 100));
          setCodeEdited(true);
        }} maxLength={100} />
        <p className="text-xs leading-5 text-slate-500">{t.codeHelper}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${program?.id ?? "new"}-level`}>{t.fields.level}</Label>
        <select id={`${program?.id ?? "new"}-level`} name="program_level" defaultValue={program?.program_level ?? "bachelor"} className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          {programLevels.map((level) => <option key={level} value={level}>{levelLabels[level]}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${program?.id ?? "new"}-status`}>{t.fields.status}</Label>
        <select id={`${program?.id ?? "new"}-status`} name="status" defaultValue={program?.status ?? "active"} className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="active">{t.statuses.active}</option>
          <option value="inactive">{t.statuses.inactive}</option>
          <option value="archived">{t.statuses.archived}</option>
        </select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${program?.id ?? "new"}-description`}>{t.fields.description}</Label>
        <textarea id={`${program?.id ?? "new"}-description`} name="description" defaultValue={program?.description ?? ""} maxLength={2000} rows={3} className="w-full rounded-lg border border-input bg-white px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
      </div>
      <div className="flex items-end justify-end gap-3 sm:col-span-2">
        {message ? <p role="status" className={cn("text-xs", state.status === "success" ? "text-emerald-700" : "text-rose-700")}>{message}</p> : null}
        <button type="submit" disabled={pending} className={cn(buttonVariants(), "brand-gradient min-w-24")}>{pending ? t.saving : t.save}</button>
      </div>
    </form>
  );
}

export function AcademicProgramsEditor({
  locale,
  overview,
  levelLabels,
  translations: t,
  action,
}: {
  locale: Locale;
  overview: AcademicProgramsEditorOverview;
  levelLabels: Record<string, string>;
  translations: EditorTranslations;
  action: MutationAction;
}) {
  const university = overview.selected_university;
  const [creating, setCreating] = useState(false);
  if (!university) return null;

  const eligibleUnits = overview.units.filter((unit) => unit.status !== "archived");
  const unitNames = new Map(overview.units.map((unit) => [unit.id, unit.name]));

  return (
    <Card className="shadow-sm ring-slate-200">
      <CardHeader className="border-b border-slate-100">
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><GraduationCap className="size-5" /></span>
            <div><CardTitle>{t.title}</CardTitle><CardDescription className="mt-1">{t.description}</CardDescription></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCreating((current) => !current)} className={cn(buttonVariants({ variant: creating ? "default" : "outline" }), creating && "brand-gradient")}><Plus className="size-4" />{t.add}</button>
          </div>
          {creating ? <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <AcademicProgramForm action={action} locale={locale} targetUniversityId={university.id} units={eligibleUnits} levelLabels={levelLabels} translations={t} />
          </div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {overview.programs.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">{t.empty}</p> : overview.programs.map((program) => (
          <details key={program.id} className="group rounded-xl border border-slate-200 bg-white px-4 open:bg-slate-50/50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-[#06113B]">{program.name}</p><Badge variant="outline">{levelLabels[program.program_level]}</Badge><Badge variant="secondary">{t.statuses[program.status]}</Badge></div>
                <p className="mt-1 text-xs text-slate-500">{program.code}{program.organization_unit_id ? ` · ${unitNames.get(program.organization_unit_id) ?? t.unitUnavailable}` : ""}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700"><Pencil className="size-3.5" />{t.edit}</span>
            </summary>
            <AcademicProgramForm action={action} locale={locale} targetUniversityId={university.id} units={eligibleUnits} levelLabels={levelLabels} translations={t} program={program} />
          </details>
        ))}
        <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-xs leading-5 text-amber-900">{t.hierarchyStatusNote}</div>
        <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-emerald-900"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><div><p className="text-sm font-semibold">{t.auditTitle}</p><p className="mt-1 text-xs leading-5 text-emerald-800">{t.auditDescription}</p></div><CheckCircle2 className="ml-auto size-4 shrink-0" /></div>
      </CardContent>
    </Card>
  );
}
