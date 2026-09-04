import { Building2 } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-console-ui";
import { OrganizationsEditor } from "@/components/admin/organizations-editor";
import { PageHeading } from "@/components/page-heading";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getAdminOrganizationsEditor } from "@/lib/admin/get-admin-organizations-editor";
import { mutateAdminOrganizationAction } from "./actions";

export default async function AdminOrganizationsPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const [dictionary, overview] = await Promise.all([getDictionary(locale), getAdminOrganizationsEditor()]);
  const t = dictionary.admin.organizations;
  const common = dictionary.admin.common;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-sm leading-6 text-violet-900">{t.editor.note}</div>
      {overview === null ? (
        <AdminEmptyState icon={Building2} title={common.unavailableTitle} description={common.unavailableDescription} label={common.readOnly} />
      ) : (
        <OrganizationsEditor
          locale={locale}
          overview={overview}
          translations={t.editor}
          statusLabels={common.statuses}
          typeLabels={common.organizationTypes}
          action={mutateAdminOrganizationAction}
        />
      )}
    </div>
  );
}
