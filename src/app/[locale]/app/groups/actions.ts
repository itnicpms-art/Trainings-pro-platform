"use server";

import { revalidatePath } from "next/cache";

import { isLocale } from "@/i18n/config";
import {
  mutateAcademicGroupJoinRequest,
  type AcademicGroupJoinRequestActionState,
} from "@/lib/manage/mutate-academic-group-join-request";

export async function mutateStudentAcademicGroupJoinRequestAction(
  _previousState: AcademicGroupJoinRequestActionState,
  formData: FormData,
): Promise<AcademicGroupJoinRequestActionState> {
  const result = await mutateAcademicGroupJoinRequest(formData);
  const locale = formData.get("locale");
  if (result.status === "success" && typeof locale === "string" && isLocale(locale)) {
    revalidatePath(`/${locale}/app/groups`);
  }
  return result;
}
