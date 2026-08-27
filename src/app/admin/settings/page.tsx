import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function AdminSettingsPage() {
  return <div className="mx-auto max-w-4xl"><PageHeading eyebrow="Administrare" title="Setări platformă" description="Configurația de bază a instanței Trainings PRO." /><Card className="shadow-sm ring-slate-200"><CardHeader><CardTitle>Identitatea platformei</CardTitle><CardDescription>Valori definite de ghidul de brand.</CardDescription></CardHeader><CardContent className="space-y-5">{[["Nume platformă", "Trainings PRO"], ["Issuer / parent brand", "NICPMS Academy"], ["Mediu", "Foundation"]].map(([label, value], index) => <div key={label}>{index > 0 && <Separator className="mb-5" />}<div className="flex items-center justify-between gap-4"><span className="text-sm text-slate-500">{label}</span>{label === "Mediu" ? <Badge variant="secondary">{value}</Badge> : <span className="text-sm font-semibold text-[#06113B]">{value}</span>}</div></div>)}</CardContent></Card></div>;
}
