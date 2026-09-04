"use server";

import { revalidatePath } from "next/cache";

import { isLocale } from "@/i18n/config";
import { mutateAdminOrganization, type OrganizationActionState } from "@/lib/admin/mutate-admin-organization";

export async function mutateAdminOrganizationAction(
  _previousState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  const result = await mutateAdminOrganization(formData);
  const locale = formData.get("locale");
  if (result.status === "success" && typeof locale === "string" && isLocale(locale)) {
    revalidatePath(`/${locale}/admin/organizations`);
  }
  return result;
}
