"use client";

import { useActionState, useState, type FormEvent } from "react";
import { CheckCircle2, Pencil, Plus, ShieldCheck, TriangleAlert, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { AcademicGroupActionState } from "@/lib/manage/mutate-academic-group";
import { cn } from "@/lib/utils";
import type { AcademicGroupsEditorOverview } from "@/types/database";

type MutationAction = (state: AcademicGroupActionState, formData: FormData) => Promise<AcademicGroupActionState>;
type EditorTranslations = Dictionary["app"]["structureManagement"]["academic"]["groupsEditor"];
type AcademicGroup = AcademicGroupsEditorOverview["academic_groups"][number];
type AcademicProgram = AcademicGroupsEditorOverview["academic_programs"][number];
type AcademicYear = AcademicGroupsEditorOverview["academic_years"][number];
type AcademicTerm = AcademicGroupsEditorOverview["academic_terms"][number];
type GroupStatus = "active" | "inactive" | "archived";
type ParentKind = "program" | "year" | "term";
type ParentIssue = { kind: ParentKind; name: string; status: AcademicProgram["status"] };

const initialState: AcademicGroupActionState = { status: "idle" };

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

// UX-only pre-check: names the exact program/year/term blocking activation so
// the user does not have to inspect every section to find it. This never
// replaces backend validation — create_academic_group/update_academic_group
// (migration 011) independently re-check every one of these rules and remain
// the only authority that can actually reject a save.
function findBlockingParents({
  status,
  programId,
  yearId,
  termId,
  allPrograms,
  allYears,
  allTerms,
}: {
  status: GroupStatus;
  programId: string;
  yearId: string;
  termId: string;
  allPrograms: AcademicProgram[];
  allYears: AcademicYear[];
  allTerms: AcademicTerm[];
}): ParentIssue[] {
  if (status !== "active") return [];
  const issues: ParentIssue[] = [];

  const program = allPrograms.find((item) => item.id === programId);
  if (program && program.status !== "active") issues.push({ kind: "program", name: program.name, status: program.status });

  const year = yearId ? allYears.find((item) => item.id === yearId) : undefined;
  if (year && year.status !== "active") issues.push({ kind: "year", name: year.name, status: year.status });

  const term = termId ? allTerms.find((item) => item.id === termId) : undefined;
  if (term && term.status !== "active") issues.push({ kind: "term", name: term.name, status: term.status });

  return issues;
}

function formatBlockedMessage(template: string, name: string, statusLabel: string) {
  return template.replace("{name}", name).replace("{status}", statusLabel);
}

function AcademicGroupForm({
  action,
  locale,
  targetUniversityId,
  programs,
  years,
  terms,
  allPrograms,
  allYears,
  allTerms,
  translations: t,
  group,
}: {
  action: MutationAction;
  locale: Locale;
  targetUniversityId: string;
  programs: AcademicProgram[];
  years: AcademicYear[];
  terms: AcademicTerm[];
  allPrograms: AcademicProgram[];
  allYears: AcademicYear[];
  allTerms: AcademicTerm[];
  translations: EditorTranslations;
  group?: AcademicGroup;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [programId, setProgramId] = useState(group?.academic_program_id ?? "");
  const [yearId, setYearId] = useState(group?.academic_year_id ?? "");
  const [termId, setTermId] = useState(group?.academic_term_id ?? "");
  const [name, setName] = useState(group?.name ?? "");
  const [code, setCode] = useState(group?.code ?? "");
  const [codeEdited, setCodeEdited] = useState(Boolean(group));
  const [description, setDescription] = useState(group?.description ?? "");
  const [status, setStatus] = useState<GroupStatus>(group?.status ?? "active");
  const [attemptedBlockedSubmit, setAttemptedBlockedSubmit] = useState(false);

  const termsForYear = yearId ? terms.filter((term) => term.academic_year_id === yearId) : [];
  const blockingIssues = findBlockingParents({ status, programId, yearId, termId, allPrograms, allYears, allTerms });
  const message = state.status === "success"
    ? state.intent === "create" ? t.messages.created : t.messages.updated
    : state.status === "error" && state.reason ? t.messages[state.reason] : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (blockingIssues.length > 0) {
      event.preventDefault();
      setAttemptedBlockedSubmit(true);
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
      <input type="hidden" name="intent" value={group ? "update" : "create"} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="target_university_id" value={targetUniversityId} />
      {group ? <input type="hidden" name="group_id" value={group.id} /> : null}

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${group?.id ?? "new"}-program`}>{t.fields.program}</Label>
        <select id={`${group?.id ?? "new"}-program`} name="academic_program_id" value={programId} onChange={(event) => setProgramId(event.target.value)} required className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="" disabled>{t.programPlaceholder}</option>
          {programs.map((program) => <option key={program.id} value={program.id}>{program.name} — {t.statuses[program.status]}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${group?.id ?? "new"}-year`}>{t.fields.year}</Label>
        <select id={`${group?.id ?? "new"}-year`} name="academic_year_id" value={yearId} onChange={(event) => {
          setYearId(event.target.value);
          setTermId("");
        }} className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="">{t.yearPlaceholder}</option>
          {years.map((year) => <option key={year.id} value={year.id}>{year.name} — {t.statuses[year.status]}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${group?.id ?? "new"}-term`}>{t.fields.term}</Label>
        <select id={`${group?.id ?? "new"}-term`} name="academic_term_id" value={termId} onChange={(event) => setTermId(event.target.value)} disabled={!yearId} className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50">
          <option value="">{t.termPlaceholder}</option>
          {termsForYear.map((term) => <option key={term.id} value={term.id}>{term.name} — {t.statuses[term.status]}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${group?.id ?? "new"}-name`}>{t.fields.name}</Label>
        <Input id={`${group?.id ?? "new"}-name`} name="name" value={name} onChange={(event) => {
          const nextName = event.target.value;
          setName(nextName);
          if (!codeEdited) setCode(generateInternalCode(nextName));
        }} maxLength={200} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${group?.id ?? "new"}-code`}>{t.fields.code}</Label>
        <Input id={`${group?.id ?? "new"}-code`} name="code" value={code} onChange={(event) => {
          setCode(event.target.value.toUpperCase().slice(0, 100));
          setCodeEdited(true);
        }} maxLength={100} />
        <p className="text-xs leading-5 text-slate-500">{t.codeHelper}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${group?.id ?? "new"}-status`}>{t.fields.status}</Label>
        <select id={`${group?.id ?? "new"}-status`} name="status" value={status} onChange={(event) => setStatus(event.target.value as GroupStatus)} className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="active">{t.statuses.active}</option>
          <option value="inactive">{t.statuses.inactive}</option>
          <option value="archived">{t.statuses.archived}</option>
        </select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${group?.id ?? "new"}-description`}>{t.fields.description}</Label>
        <textarea id={`${group?.id ?? "new"}-description`} name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} className="w-full rounded-lg border border-input bg-white px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
      </div>
      {attemptedBlockedSubmit && blockingIssues.length > 0 ? (
        <div role="alert" className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800">
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">{t.activationBlocked.title}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {blockingIssues.map((issue) => (
                  <li key={issue.kind}>{formatBlockedMessage(t.activationBlocked[issue.kind], issue.name, t.statuses[issue.status])}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex items-end justify-end gap-3 sm:col-span-2">
        {message ? <p role="status" className={cn("text-xs", state.status === "success" ? "text-emerald-700" : "text-rose-700")}>{message}</p> : null}
        <button type="submit" disabled={pending} className={cn(buttonVariants(), "brand-gradient min-w-24")}>{pending ? t.saving : t.save}</button>
      </div>
    </form>
  );
}

export function AcademicGroupsEditor({
  locale,
  overview,
  translations: t,
  action,
}: {
  locale: Locale;
  overview: AcademicGroupsEditorOverview;
  translations: EditorTranslations;
  action: MutationAction;
}) {
  const university = overview.selected_university;
  const [creating, setCreating] = useState(false);
  if (!university) return null;

  const eligiblePrograms = overview.academic_programs.filter((program) => program.status !== "archived");
  const eligibleYears = overview.academic_years.filter((year) => year.status !== "archived");
  const eligibleTerms = overview.academic_terms.filter((term) => term.status !== "archived");
  const programNames = new Map(overview.academic_programs.map((program) => [program.id, program.name]));
  const yearNames = new Map(overview.academic_years.map((year) => [year.id, year.name]));
  const termNames = new Map(overview.academic_terms.map((term) => [term.id, term.name]));

  return (
    <Card className="shadow-sm ring-slate-200">
      <CardHeader className="border-b border-slate-100">
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><UsersRound className="size-5" /></span>
            <div><CardTitle>{t.title}</CardTitle><CardDescription className="mt-1">{t.description}</CardDescription></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCreating((current) => !current)} className={cn(buttonVariants({ variant: creating ? "default" : "outline" }), creating && "brand-gradient")}><Plus className="size-4" />{t.add}</button>
          </div>
          {creating ? <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            {/* Keyed on the row count so a successful create (which adds a row and
                revalidates) remounts the form with blank fields, while a failed
                create (no new row) leaves the user's entered values untouched. */}
            <AcademicGroupForm
              key={overview.academic_groups.length}
              action={action}
              locale={locale}
              targetUniversityId={university.id}
              programs={eligiblePrograms}
              years={eligibleYears}
              terms={eligibleTerms}
              allPrograms={overview.academic_programs}
              allYears={overview.academic_years}
              allTerms={overview.academic_terms}
              translations={t}
            />
          </div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {overview.academic_groups.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">{t.empty}</p> : overview.academic_groups.map((group) => {
          const contextParts = [
            programNames.get(group.academic_program_id) ?? t.programUnavailable,
            group.academic_year_id ? (yearNames.get(group.academic_year_id) ?? t.yearUnavailable) : null,
            group.academic_term_id ? (termNames.get(group.academic_term_id) ?? t.termUnavailable) : null,
          ].filter((part): part is string => Boolean(part));

          return (
            <details key={group.id} className="group rounded-xl border border-slate-200 bg-white px-4 open:bg-slate-50/50">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-[#06113B]">{group.name}</p><Badge variant="secondary">{t.statuses[group.status]}</Badge></div>
                  <p className="mt-1 text-xs text-slate-500">{group.code} · {contextParts.join(" · ")}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700"><Pencil className="size-3.5" />{t.edit}</span>
              </summary>
              <AcademicGroupForm
                action={action}
                locale={locale}
                targetUniversityId={university.id}
                programs={eligiblePrograms}
                years={eligibleYears}
                terms={eligibleTerms}
                allPrograms={overview.academic_programs}
                allYears={overview.academic_years}
                allTerms={overview.academic_terms}
                translations={t}
                group={group}
              />
            </details>
          );
        })}
        <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-xs leading-5 text-amber-900">{t.hierarchyStatusNote}</div>
        <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-emerald-900"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><div><p className="text-sm font-semibold">{t.auditTitle}</p><p className="mt-1 text-xs leading-5 text-emerald-800">{t.auditDescription}</p></div><CheckCircle2 className="ml-auto size-4 shrink-0" /></div>
      </CardContent>
    </Card>
  );
}
