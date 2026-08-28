import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";

export default async function AdminSettingsPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  const t = dictionary.admin.settings;
  const values = [[t.platformName, "Trainings PRO"], [t.issuer, "NICPMS Academy"], [t.environment, t.environmentValue]];

  return <div className="mx-auto max-w-4xl"><PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} /><Card className="shadow-sm ring-slate-200"><CardHeader><CardTitle>{t.identityTitle}</CardTitle><CardDescription>{t.identityDescription}</CardDescription></CardHeader><CardContent className="space-y-5">{values.map(([label, value], index) => <div key={label}>{index > 0 && <Separator className="mb-5" />}<div className="flex items-center justify-between gap-4"><span className="text-sm text-slate-500">{label}</span>{label === t.environment ? <Badge variant="secondary">{value}</Badge> : <span className="text-sm font-semibold text-[#06113B]">{value}</span>}</div></div>)}</CardContent></Card></div>;
}
