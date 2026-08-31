import { Globe2 } from "lucide-react";

import { AdminEmptyState, AdminSection } from "@/components/admin/admin-console-ui";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";

export default async function AdminWebsitePage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  const t = dictionary.admin.website;
  const pending = dictionary.admin.common.comingSoon;
  return <div className="mx-auto max-w-6xl"><PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} /><AdminSection title={t.title} description={t.description}><div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{t.sections.map((section) => <div key={section} className="rounded-xl border border-slate-200 p-3"><p className="text-sm font-semibold text-[#06113B]">{section}</p><Badge variant="secondary" className="mt-3">{pending}</Badge></div>)}</div><AdminEmptyState icon={Globe2} title={t.emptyTitle} description={t.emptyDescription} label={pending} /></AdminSection></div>;
}
