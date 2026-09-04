import { Landmark } from "lucide-react";
import { z } from "zod";

import { AdminEmptyState, AdminSection } from "@/components/admin/admin-console-ui";
import { AcademicProgramsEditor } from "@/components/manage/academic-programs-editor";
import { AcademicTermsEditor } from "@/components/manage/academic-terms-editor";
import { AcademicUnitsEditor } from "@/components/manage/academic-units-editor";
import { AcademicYearsEditor } from "@/components/manage/academic-years-editor";
import { PageHeading } from "@/components/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getAdminAcademicCalendarEditor } from "@/lib/admin/get-admin-academic-calendar-editor";
import { getAdminAcademicProgramsEditor } from "@/lib/admin/get-admin-academic-programs-editor";
import { getAdminAcademicUnitsEditor } from "@/lib/admin/get-admin-academic-units-editor";
import { cn } from "@/lib/utils";
import {
  mutateAdminAcademicProgramAction,
  mutateAdminAcademicTermAction,
  mutateAdminAcademicUnitAction,
  mutateAdminAcademicYearAction,
} from "./actions";

type SearchParams = Promise<{ university?: string | string[] }>;

export default async function AdminAcademicStructurePage({ params, searchParams }: { params: LocaleParams; searchParams: SearchParams }) {
  const locale = await resolveLocale(params);
  const query = await searchParams;
  const requestedUniversity = Array.isArray(query.university) ? query.university[0] : query.university;
  const targetUniversityId = z.uuid().safeParse(requestedUniversity).success ? requestedUniversity! : null;
  const [dictionary, overview, programsOverview, calendarOverview] = await Promise.all([
    getDictionary(locale),
    getAdminAcademicUnitsEditor(targetUniversityId),
    getAdminAcademicProgramsEditor(targetUniversityId),
    getAdminAcademicCalendarEditor(targetUniversityId),
  ]);
  const t = dictionary.admin.academicStructure;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-sm leading-6 text-violet-900">{t.universityScopeNote}</div>
      {overview === null ? (
        <AdminEmptyState icon={Landmark} title={t.unavailableTitle} description={t.unavailableDescription} label={dictionary.admin.common.noRecords} />
      ) : (
        <>
          <AdminSection title={t.selectionTitle} description={t.selectionDescription} badge={t.globalAccess}>
            <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1 space-y-2 text-sm font-medium text-[#06113B]">
                <span>{t.universityLabel}</span>
                <select name="university" defaultValue={overview.selected_university?.id ?? ""} required className="h-9 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                  <option value="" disabled>{t.universityPlaceholder}</option>
                  {overview.universities.map((university) => <option key={university.id} value={university.id}>{university.name}</option>)}
                </select>
              </label>
              <button type="submit" className={cn(buttonVariants({ size: "lg" }), "brand-gradient")}>{t.selectUniversity}</button>
            </form>
          </AdminSection>
          {overview.selected_university ? (
            <>
              <AcademicUnitsEditor locale={locale} overview={overview} translations={dictionary.app.structureManagement.academic.editor} action={mutateAdminAcademicUnitAction} />
              {programsOverview?.selected_university ? (
                <AcademicProgramsEditor
                  locale={locale}
                  overview={programsOverview}
                  levelLabels={dictionary.app.structureManagement.common.programLevels}
                  translations={dictionary.app.structureManagement.academic.programsEditor}
                  action={mutateAdminAcademicProgramAction}
                />
              ) : null}
              {calendarOverview?.selected_university ? (
                <>
                  <AcademicYearsEditor
                    locale={locale}
                    overview={calendarOverview}
                    translations={dictionary.app.structureManagement.academic.yearsEditor}
                    action={mutateAdminAcademicYearAction}
                  />
                  <AcademicTermsEditor
                    locale={locale}
                    overview={calendarOverview}
                    typeLabels={dictionary.app.structureManagement.common.termTypes}
                    translations={dictionary.app.structureManagement.academic.termsEditor}
                    action={mutateAdminAcademicTermAction}
                  />
                </>
              ) : null}
            </>
          ) : (
            <AdminEmptyState icon={Landmark} title={t.emptyTitle} description={t.emptyDescription} label={t.selectionRequired} />
          )}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4"><p className="text-sm font-semibold text-blue-900">{t.futureTitle}</p><p className="mt-1 text-xs leading-5 text-blue-700">{t.futureDescription}</p></div>
        </>
      )}
    </div>
  );
}
