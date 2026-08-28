import { Plus, UserRound } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";

export default async function ProfilesPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  const t = dictionary.app.profiles;

  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} action={<Button disabled title={t.futureTitle}><Plus /> {t.newProfile}</Button>} /><Card className="shadow-sm ring-slate-200"><CardContent className="p-0"><Table><TableHeader><TableRow>{t.columns.map((column) => <TableHead key={column}>{column}</TableHead>)}</TableRow></TableHeader><TableBody><TableRow><TableCell><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><UserRound className="size-4" /></div><div><p className="font-medium text-[#06113B]">{t.memberRole}</p><p className="text-xs text-slate-500">{t.defaultProfile}</p></div></div></TableCell><TableCell>{t.individual}</TableCell><TableCell className="text-slate-500">—</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700">{t.active}</Badge></TableCell></TableRow></TableBody></Table></CardContent></Card></div>;
}
