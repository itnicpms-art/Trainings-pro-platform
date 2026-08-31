import { LockKeyhole, ServerCog, ShieldCheck } from "lucide-react";

import { AdminSection } from "@/components/admin/admin-console-ui";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";

const icons = [ShieldCheck, ServerCog, LockKeyhole, ShieldCheck, LockKeyhole, ServerCog];

export default async function AdminSecurityPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  const t = dictionary.admin.security;

  return <div className="mx-auto max-w-6xl"><PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} /><AdminSection title={t.title} description={t.description} badge={dictionary.admin.common.readOnly}><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{t.items.map((item, index) => { const Icon = icons[index] ?? ShieldCheck; return <div key={item.title} className="rounded-xl border border-slate-200 p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Icon className="size-5" /></span><div className="mt-4 flex items-center gap-2"><h2 className="font-heading text-sm font-semibold text-[#06113B]">{item.title}</h2><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{dictionary.shell.active}</Badge></div><p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p></div>; })}</div></AdminSection></div>;
}
