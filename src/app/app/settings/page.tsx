import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MemberSettingsPage() {
  return <div className="mx-auto max-w-4xl"><PageHeading eyebrow="Cont" title="Setări" description="Preferințele de bază ale contului Trainings PRO." /><Tabs defaultValue="personal"><TabsList><TabsTrigger value="personal">Date personale</TabsTrigger><TabsTrigger value="security">Securitate</TabsTrigger></TabsList><TabsContent value="personal"><Card className="mt-5 shadow-sm ring-slate-200"><CardHeader><CardTitle>Informații de bază</CardTitle><CardDescription>Datele profilului implicit.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="displayName">Nume afișat</Label><Input id="displayName" defaultValue="Individual Member" /></div><div className="space-y-2"><Label htmlFor="language">Limbă</Label><Input id="language" defaultValue="Română" readOnly /></div><div className="sm:col-span-2"><Button>Salvează modificările</Button></div></CardContent></Card></TabsContent><TabsContent value="security"><Card className="mt-5 shadow-sm ring-slate-200"><CardHeader><CardTitle>Securitatea contului</CardTitle><CardDescription>Autentificarea este administrată prin Supabase Auth.</CardDescription></CardHeader><CardContent><p className="text-sm text-slate-500">Schimbarea parolei și metodele suplimentare de autentificare vor folosi fluxurile securizate Supabase.</p></CardContent></Card></TabsContent></Tabs></div>;
}
