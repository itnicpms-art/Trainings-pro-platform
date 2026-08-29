"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import type { UserProfile } from "@/lib/auth/get-user-profiles";

export function ProfileList({ profiles, activeProfileId, translations: t }: { profiles: UserProfile[]; activeProfileId: string | null; translations: Dictionary["app"]["profiles"] }) {
  const router = useRouter();
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);

  async function selectProfile(profileId: string) {
    setPendingProfileId(profileId);
    const response = await fetch("/api/auth/active-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    }).catch(() => null);
    setPendingProfileId(null);

    if (!response?.ok) { toast.error(t.selectionFailed); return; }
    toast.success(t.selectionSuccess);
    router.refresh();
  }

  if (!profiles.length) return <Card><CardContent className="p-6 text-sm text-slate-600">{t.noProfiles}</CardContent></Card>;

  return <Card className="overflow-hidden shadow-sm ring-slate-200"><CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow>{t.columns.map((column) => <TableHead key={column}>{column}</TableHead>)}</TableRow></TableHeader><TableBody>{profiles.map((profile) => {
    const selected = profile.id === activeProfileId;
    const pending = profile.id === pendingProfileId;
    return <TableRow key={profile.id}><TableCell><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><UserRound className="size-4" /></div><div><p className="font-medium text-[#06113B]">{profile.display_name}</p>{profile.is_default && <p className="text-xs text-slate-500">{t.defaultProfile}</p>}</div></div></TableCell><TableCell>{t.profileTypes[profile.profile_type]}</TableCell><TableCell className="text-slate-500">{profile.organizationName ?? t.noOrganization}</TableCell><TableCell><Badge className={profile.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}>{t.statuses[profile.status]}</Badge></TableCell><TableCell>{selected ? <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-4" />{t.selected}</span> : <Button size="sm" variant="outline" disabled={profile.status !== "active" || pending} onClick={() => selectProfile(profile.id)}>{pending && <LoaderCircle className="animate-spin" />}{pending ? t.selecting : t.select}</Button>}</TableCell></TableRow>;
  })}</TableBody></Table></CardContent></Card>;
}
