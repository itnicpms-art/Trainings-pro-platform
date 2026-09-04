"use client";

import { useActionState, useState } from "react";
import { Building2, CheckCircle2, Pencil, Plus, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ro";
import { cn } from "@/lib/utils";
import type { OrganizationType } from "@/types/app";
import type { PlatformAdminOrganizationsEditorOverview } from "@/types/database";

type ActionState = {
  status: "idle" | "success" | "error";
  intent?: "create" | "update";
  reason?: "invalid" | "duplicate" | "forbidden" | "unavailable";
};

type MutationAction = (state: ActionState, formData: FormData) => Promise<ActionState>;
type EditorTranslations = Dictionary["admin"]["organizations"]["editor"];
type Organization = PlatformAdminOrganizationsEditorOverview["organizations"][number];

const initialState: ActionState = { status: "idle" };
const organizationTypes: OrganizationType[] = ["university", "company", "training_provider", "partner"];
const organizationStatuses = ["active", "inactive", "suspended", "archived"] as const;

function generateSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}

function OrganizationForm({
  action,
  locale,
  translations: t,
  statusLabels,
  typeLabels,
  organization,
}: {
  action: MutationAction;
  locale: Locale;
  translations: EditorTranslations;
  statusLabels: Record<string, string>;
  typeLabels: Record<string, string>;
  organization?: Organization;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [name, setName] = useState(organization?.name ?? "");
  const [slug, setSlug] = useState(organization?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(organization));
  const message = state.status === "success"
    ? state.intent === "create" ? t.messages.created : t.messages.updated
    : state.status === "error" && state.reason ? t.messages[state.reason] : null;

  return (
    <form action={formAction} className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
      <input type="hidden" name="intent" value={organization ? "update" : "create"} />
      <input type="hidden" name="locale" value={locale} />
      {organization ? <input type="hidden" name="organization_id" value={organization.id} /> : null}

      <div className="space-y-2">
        <Label htmlFor={`${organization?.id ?? "new"}-type`}>{t.fields.type}</Label>
        <select id={`${organization?.id ?? "new"}-type`} name="org_type" defaultValue={organization?.type ?? "university"} className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          {organizationTypes.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${organization?.id ?? "new"}-status`}>{t.fields.status}</Label>
        <select id={`${organization?.id ?? "new"}-status`} name="status" defaultValue={organization?.status ?? "active"} className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          {organizationStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${organization?.id ?? "new"}-name`}>{t.fields.name}</Label>
        <Input id={`${organization?.id ?? "new"}-name`} name="name" value={name} onChange={(event) => {
          const nextName = event.target.value;
          setName(nextName);
          if (!slugEdited) setSlug(generateSlug(nextName));
        }} maxLength={200} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${organization?.id ?? "new"}-slug`}>{t.fields.slug}</Label>
        <Input id={`${organization?.id ?? "new"}-slug`} name="slug" value={slug} onChange={(event) => {
          setSlug(generateSlug(event.target.value));
          setSlugEdited(true);
        }} maxLength={160} />
        <p className="text-xs leading-5 text-slate-500">{t.slugHelper}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${organization?.id ?? "new"}-website`}>{t.fields.website}</Label>
        <Input id={`${organization?.id ?? "new"}-website`} name="website" type="url" defaultValue={organization?.website ?? ""} maxLength={2000} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${organization?.id ?? "new"}-logo`}>{t.fields.logoUrl}</Label>
        <Input id={`${organization?.id ?? "new"}-logo`} name="logo_url" type="url" defaultValue={organization?.logo_url ?? ""} maxLength={2000} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${organization?.id ?? "new"}-description`}>{t.fields.description}</Label>
        <textarea id={`${organization?.id ?? "new"}-description`} name="description" defaultValue={organization?.description ?? ""} maxLength={2000} rows={3} className="w-full rounded-lg border border-input bg-white px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
      </div>
      <div className="flex items-end justify-end gap-3 sm:col-span-2">
        {message ? <p role="status" className={cn("text-xs", state.status === "success" ? "text-emerald-700" : "text-rose-700")}>{message}</p> : null}
        <button type="submit" disabled={pending} className={cn(buttonVariants(), "brand-gradient min-w-24")}>{pending ? t.saving : t.save}</button>
      </div>
    </form>
  );
}

export function OrganizationsEditor({
  locale,
  overview,
  translations: t,
  statusLabels,
  typeLabels,
  action,
}: {
  locale: Locale;
  overview: PlatformAdminOrganizationsEditorOverview;
  translations: EditorTranslations;
  statusLabels: Record<string, string>;
  typeLabels: Record<string, string>;
  action: MutationAction;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <Card className="shadow-sm ring-slate-200">
      <CardHeader className="border-b border-slate-100">
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Building2 className="size-5" /></span>
            <div><CardTitle>{t.listTitle}</CardTitle><CardDescription className="mt-1">{t.listDescription}</CardDescription></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCreating((current) => !current)} className={cn(buttonVariants({ variant: creating ? "default" : "outline" }), creating && "brand-gradient")}><Plus className="size-4" />{t.add}</button>
          </div>
          {creating ? <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <OrganizationForm action={action} locale={locale} translations={t} statusLabels={statusLabels} typeLabels={typeLabels} />
          </div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {overview.organizations.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">{t.empty}</p> : overview.organizations.map((organization) => (
          <details key={organization.id} className="group rounded-xl border border-slate-200 bg-white px-4 open:bg-slate-50/50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-[#06113B]">{organization.name}</p><Badge variant="outline">{typeLabels[organization.type]}</Badge><Badge variant="secondary">{statusLabels[organization.status]}</Badge></div>
                <p className="mt-1 text-xs text-slate-500">{organization.slug}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700"><Pencil className="size-3.5" />{t.edit}</span>
            </summary>
            <OrganizationForm action={action} locale={locale} translations={t} statusLabels={statusLabels} typeLabels={typeLabels} organization={organization} />
          </details>
        ))}
        <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-emerald-900"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><div><p className="text-sm font-semibold">{t.auditTitle}</p><p className="mt-1 text-xs leading-5 text-emerald-800">{t.auditDescription}</p></div><CheckCircle2 className="ml-auto size-4 shrink-0" /></div>
      </CardContent>
    </Card>
  );
}
