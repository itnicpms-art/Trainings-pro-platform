import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";

export default async function MemberSettingsPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  const t = dictionary.app.settings;

  return <div className="mx-auto max-w-4xl"><PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} /><Tabs defaultValue="personal"><TabsList><TabsTrigger value="personal">{t.personalTab}</TabsTrigger><TabsTrigger value="security">{t.securityTab}</TabsTrigger></TabsList><TabsContent value="personal"><Card className="mt-5 shadow-sm ring-slate-200"><CardHeader><CardTitle>{t.basicTitle}</CardTitle><CardDescription>{t.basicDescription}</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="displayName">{t.displayName}</Label><Input id="displayName" defaultValue={t.memberRole} /></div><div className="space-y-2"><Label htmlFor="language">{t.language}</Label><Input id="language" defaultValue={t.languageValue} readOnly /></div><div className="sm:col-span-2"><Button>{t.save}</Button></div></CardContent></Card></TabsContent><TabsContent value="security"><Card className="mt-5 shadow-sm ring-slate-200"><CardHeader><CardTitle>{t.securityTitle}</CardTitle><CardDescription>{t.securityDescription}</CardDescription></CardHeader><CardContent><p className="text-sm text-slate-500">{t.securityDetail}</p></CardContent></Card></TabsContent></Tabs></div>;
}
