"use server";

import { revalidatePath } from "next/cache";

import { isLocale } from "@/i18n/config";
import { mutateAcademicUnit, type AcademicUnitActionState } from "@/lib/manage/mutate-academic-unit";

export async function mutateUniversityAcademicUnitAction(
  _previousState: AcademicUnitActionState,
  formData: FormData,
): Promise<AcademicUnitActionState> {
  const result = await mutateAcademicUnit(formData);
  const locale = formData.get("locale");
  if (result.status === "success" && typeof locale === "string" && isLocale(locale)) {
    revalidatePath(`/${locale}/app/manage/academic`);
  }
  return result;
}
