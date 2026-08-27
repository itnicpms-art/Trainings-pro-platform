import { Plus, UserRound } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ProfilesPage() {
  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow="Cont" title="Profilele mele" description="Un user poate avea mai multe identități contextuale. Profilurile suplimentare vor fi conectate prin fluxurile dedicate din fazele următoare." action={<Button disabled title="Disponibil într-o etapă viitoare"><Plus /> Profil nou</Button>} /><Card className="shadow-sm ring-slate-200"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Profil</TableHead><TableHead>Tip</TableHead><TableHead>Organizație</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><UserRound className="size-4" /></div><div><p className="font-medium text-[#06113B]">Individual Member</p><p className="text-xs text-slate-500">Profil implicit</p></div></div></TableCell><TableCell>Individual</TableCell><TableCell className="text-slate-500">—</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700">Activ</Badge></TableCell></TableRow></TableBody></Table></CardContent></Card></div>;
}
