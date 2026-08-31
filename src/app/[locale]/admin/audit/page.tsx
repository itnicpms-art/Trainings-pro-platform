import { FileClock } from "lucide-react";

import { AdminEmptyState, AdminSection } from "@/components/admin/admin-console-ui";
import { PageHeading } from "@/components/page-heading";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";

export default async function AdminAuditPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  const t = dictionary.admin.audit;
  return <div className="mx-auto max-w-6xl"><PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} /><AdminSection title={t.title} description={t.description}><div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{t.futureItems.map((item) => <div key={item} className="rounded-xl border border-slate-200 p-3 text-sm font-medium text-[#06113B]">{item}</div>)}</div><AdminEmptyState icon={FileClock} title={t.emptyTitle} description={t.emptyDescription} label={dictionary.admin.common.comingSoon} /></AdminSection></div>;
}
