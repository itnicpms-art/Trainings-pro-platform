import { PageHeading } from "@/components/page-heading";
import { ProfileList } from "@/components/profiles/profile-list";
import { getDictionary, resolveLocale, type LocaleParams } from "@/i18n/get-dictionary";
import { getActiveProfile } from "@/lib/auth/get-active-profile";
import { getUserProfiles } from "@/lib/auth/get-user-profiles";

export default async function ProfilesPage({ params }: { params: LocaleParams }) {
  const locale = await resolveLocale(params);
  const dictionary = await getDictionary(locale);
  const t = dictionary.app.profiles;
  const [profiles, activeProfile] = await Promise.all([getUserProfiles(), getActiveProfile()]);

  return <div className="mx-auto max-w-7xl"><PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} /><ProfileList profiles={profiles} activeProfileId={activeProfile?.id ?? null} translations={t} /></div>;
}
