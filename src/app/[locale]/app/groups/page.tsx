import { redirect } from "next/navigation";

import { PageHeading } from "@/components/page-heading";
import { StudentGroupJoinOverview } from "@/components/manage/student-group-join-overview";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getDashboardContext } from "@/lib/dashboard/get-dashboard-context";
import { getStudentAcademicGroupJoinOverview } from "@/lib/manage/get-student-academic-group-join-overview";
import { mutateStudentAcademicGroupJoinRequestAction } from "./actions";

export default async function StudentGroupsPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const [dictionary, context] = await Promise.all([getDictionary(locale), getDashboardContext()]);
  const t = dictionary.app.groups;

  if (!context.activeProfile) return null;
  // TASK 004.7: this route is student-only. get_student_academic_group_join_
  // overview independently re-enforces the same profile_type check -- this
  // redirect is a route-shell convenience, not the authorization boundary.
  if (context.activeProfile.profile_type !== "student") redirect(`/${locale}/app`);

  const overview = await getStudentAcademicGroupJoinOverview(context.activeProfile.id);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />
      {overview ? (
        <StudentGroupJoinOverview locale={locale} overview={overview} translations={t} action={mutateStudentAcademicGroupJoinRequestAction} />
      ) : (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">{t.unavailable}</div>
      )}
    </div>
  );
}
