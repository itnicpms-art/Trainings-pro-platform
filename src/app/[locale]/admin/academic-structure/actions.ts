"use server";

import { revalidatePath } from "next/cache";

import { isLocale } from "@/i18n/config";
import { mutateAcademicProgram, type AcademicProgramActionState } from "@/lib/manage/mutate-academic-program";
import { mutateAcademicTerm, type AcademicTermActionState } from "@/lib/manage/mutate-academic-term";
import { mutateAcademicUnit, type AcademicUnitActionState } from "@/lib/manage/mutate-academic-unit";
import { mutateAcademicYear, type AcademicYearActionState } from "@/lib/manage/mutate-academic-year";

export async function mutateAdminAcademicUnitAction(
  _previousState: AcademicUnitActionState,
  formData: FormData,
): Promise<AcademicUnitActionState> {
  const result = await mutateAcademicUnit(formData);
  const locale = formData.get("locale");
  if (result.status === "success" && typeof locale === "string" && isLocale(locale)) {
    revalidatePath(`/${locale}/admin/academic-structure`);
  }
  return result;
}

export async function mutateAdminAcademicProgramAction(
  _previousState: AcademicProgramActionState,
  formData: FormData,
): Promise<AcademicProgramActionState> {
  const result = await mutateAcademicProgram(formData);
  const locale = formData.get("locale");
  if (result.status === "success" && typeof locale === "string" && isLocale(locale)) {
    revalidatePath(`/${locale}/admin/academic-structure`);
  }
  return result;
}

export async function mutateAdminAcademicYearAction(
  _previousState: AcademicYearActionState,
  formData: FormData,
): Promise<AcademicYearActionState> {
  const result = await mutateAcademicYear(formData);
  const locale = formData.get("locale");
  if (result.status === "success" && typeof locale === "string" && isLocale(locale)) {
    revalidatePath(`/${locale}/admin/academic-structure`);
  }
  return result;
}

export async function mutateAdminAcademicTermAction(
  _previousState: AcademicTermActionState,
  formData: FormData,
): Promise<AcademicTermActionState> {
  const result = await mutateAcademicTerm(formData);
  const locale = formData.get("locale");
  if (result.status === "success" && typeof locale === "string" && isLocale(locale)) {
    revalidatePath(`/${locale}/admin/academic-structure`);
  }
  return result;
}
