import { Building2, GraduationCap } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { HomeAcademicContext, HomeTrainingContext } from "@/lib/dashboard/get-home-contexts";
import type { AcademicProgramLevel } from "@/types/database";

type ContextTranslations = Dictionary["app"]["dashboardShell"]["homeContext"];

function ContextField({ label, value, placeholder }: { label: string; value: string | null | undefined; placeholder: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-[#06113B]">{value || placeholder}</dd>
    </div>
  );
}

export function AcademicContextReadout({
  context,
  translations: t,
  placeholder,
}: {
  context: HomeAcademicContext | null;
  translations: ContextTranslations;
  placeholder: string;
}) {
  const programLevel = context?.program_level
    ? t.programLevels[context.program_level as AcademicProgramLevel]
    : null;
  const hasRealContext = Boolean(context?.context_status);

  return (
    <section aria-label={t.academicTitle}>
      <Card className="gap-0 overflow-hidden rounded-2xl border-indigo-100 bg-white py-0 shadow-sm ring-indigo-100/70">
        <CardHeader className="border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50 via-blue-50/70 to-cyan-50/40 px-4 py-3.5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><GraduationCap className="size-4.5" /></div>
            <div>
              <CardTitle className="text-base text-[#06113B]">{t.academicTitle}</CardTitle>
              <CardDescription className="mt-0.5 text-xs">{hasRealContext ? t.academicDescription : t.academicEmpty}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3.5">
          <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <ContextField label={t.fields.university} value={context?.university_name} placeholder={placeholder} />
            <ContextField label={t.fields.faculty} value={context?.faculty_name} placeholder={placeholder} />
            <ContextField label={t.fields.academicProgram} value={context?.academic_program_name} placeholder={placeholder} />
            <ContextField label={t.fields.programLevel} value={programLevel} placeholder={placeholder} />
            <ContextField label={t.fields.academicYear} value={context?.academic_year_name ?? context?.academic_year_code} placeholder={placeholder} />
            <ContextField label={t.fields.semester} value={context?.academic_term_name} placeholder={placeholder} />
            <ContextField label={t.fields.group} value={context?.academic_group_name ?? context?.academic_group_code} placeholder={placeholder} />
          </dl>
        </CardContent>
      </Card>
    </section>
  );
}

export function TrainingContextReadout({
  context,
  translations: t,
  placeholder,
}: {
  context: HomeTrainingContext | null;
  translations: ContextTranslations;
  placeholder: string;
}) {
  const hasTrainingPeriod = Boolean(context?.training_period_id);

  return (
    <section aria-label={t.organizationTitle}>
      <Card className="gap-0 overflow-hidden rounded-2xl border-violet-100 bg-white py-0 shadow-sm ring-violet-100/70">
        <CardHeader className="border-b border-violet-100/80 bg-gradient-to-r from-violet-50 via-indigo-50/70 to-blue-50/40 px-4 py-3.5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Building2 className="size-4.5" /></div>
            <div>
              <CardTitle className="text-base text-[#06113B]">{t.organizationTitle}</CardTitle>
              <CardDescription className="mt-0.5 text-xs">{hasTrainingPeriod ? t.organizationDescription : t.trainingEmpty}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3.5">
          <dl className="grid gap-2 sm:grid-cols-2">
            <ContextField label={t.fields.organization} value={context?.organization_name} placeholder={placeholder} />
            <ContextField label={t.fields.trainingPeriod} value={context?.training_period_name ?? context?.training_period_code} placeholder={placeholder} />
          </dl>
        </CardContent>
      </Card>
    </section>
  );
}
