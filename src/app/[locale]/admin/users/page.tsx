import { UsersRound } from "lucide-react";

import { AdminEmptyState, AdminSection, AdminStatusBadge } from "@/components/admin/admin-console-ui";
import { PageHeading } from "@/components/page-heading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getPlatformAdminProfiles } from "@/lib/admin/get-admin-data";

export default async function AdminUsersPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const [dictionary, profiles] = await Promise.all([getDictionary(locale), getPlatformAdminProfiles()]);
  const t = dictionary.admin.users;
  const common = dictionary.admin.common;
  const profileTypes = dictionary.app.profiles.profileTypes;
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));

  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />{profiles === null ? <AdminEmptyState icon={UsersRound} title={common.unavailableTitle} description={common.unavailableDescription} label={common.readOnly} /> : profiles.length === 0 ? <AdminEmptyState icon={UsersRound} title={t.emptyTitle} description={t.emptyDescription} label={common.noRecords} /> : <AdminSection title={t.listTitle} description={t.listDescription} badge={common.readOnly}><Table><TableHeader><TableRow><TableHead>{common.columns.name}</TableHead><TableHead>{common.columns.type}</TableHead><TableHead>{common.columns.context}</TableHead><TableHead>{common.columns.status}</TableHead><TableHead>{common.columns.created}</TableHead></TableRow></TableHeader><TableBody>{profiles.map((profile) => <TableRow key={profile.id}><TableCell className="font-medium text-[#06113B]">{profile.display_name}</TableCell><TableCell>{profileTypes[profile.profile_type]}</TableCell><TableCell>{profile.organization_name ?? t.noContext}</TableCell><TableCell><AdminStatusBadge value={profile.status} label={common.statuses[profile.status]} /></TableCell><TableCell>{formatDate(profile.created_at)}</TableCell></TableRow>)}</TableBody></Table></AdminSection>}</div>;
}
