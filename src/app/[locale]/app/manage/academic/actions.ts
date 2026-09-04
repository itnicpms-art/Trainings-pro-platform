"use server";

import { revalidatePath } from "next/cache";

import { isLocale } from "@/i18n/config";
import { mutateAcademicGroup, type AcademicGroupActionState } from "@/lib/manage/mutate-academic-group";
import { mutateAcademicProgram, type AcademicProgramActionState } from "@/lib/manage/mutate-academic-program";
import { mutateAcademicTerm, type AcademicTermActionState } from "@/lib/manage/mutate-academic-term";
import { mutateAcademicUnit, type AcademicUnitActionState } from "@/lib/manage/mutate-academic-unit";
import { mutateAcademicYear, type AcademicYearActionState } from "@/lib/manage/mutate-academic-year";
import { mutateStudentGroupMembership, type StudentGroupMembershipActionState } from "@/lib/manage/mutate-student-group-membership";

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

export async function mutateUniversityAcademicProgramAction(
  _previousState: AcademicProgramActionState,
  formData: FormData,
): Promise<AcademicProgramActionState> {
  const result = await mutateAcademicProgram(formData);
  const locale = formData.get("locale");
  if (result.status === "success" && typeof locale === "string" && isLocale(locale)) {
    revalidatePath(`/${locale}/app/manage/academic`);
  }
  return result;
}

export async function mutateUniversityAcademicYearAction(
  _previousState: AcademicYearActionState,
  formData: FormData,
): Promise<AcademicYearActionState> {
  const result = await mutateAcademicYear(formData);
  const locale = formData.get("locale");
  if (result.status === "success" && typeof locale === "string" && isLocale(locale)) {
    revalidatePath(`/${locale}/app/manage/academic`);
  }
  return result;
}

export async function mutateUniversityAcademicTermAction(
  _previousState: AcademicTermActionState,
  formData: FormData,
): Promise<AcademicTermActionState> {
  const result = await mutateAcademicTerm(formData);
  const locale = formData.get("locale");
  if (result.status === "success" && typeof locale === "string" && isLocale(locale)) {
    revalidatePath(`/${locale}/app/manage/academic`);
  }
  return result;
}

export async function mutateUniversityAcademicGroupAction(
  _previousState: AcademicGroupActionState,
  formData: FormData,
): Promise<AcademicGroupActionState> {
  const result = await mutateAcademicGroup(formData);
  const locale = formData.get("locale");
  if (result.status === "success" && typeof locale === "string" && isLocale(locale)) {
    revalidatePath(`/${locale}/app/manage/academic`);
  }
  return result;
}

export async function mutateUniversityStudentGroupMembershipAction(
  _previousState: StudentGroupMembershipActionState,
  formData: FormData,
): Promise<StudentGroupMembershipActionState> {
  const result = await mutateStudentGroupMembership(formData);
  const locale = formData.get("locale");
  if (result.status === "success" && typeof locale === "string" && isLocale(locale)) {
    revalidatePath(`/${locale}/app/manage/academic`);
  }
  return result;
}
