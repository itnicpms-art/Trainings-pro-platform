import { cookies } from "next/headers";

import { activeProfileCookieName } from "@/lib/auth/constants";
import { getUserProfiles, type UserProfile } from "@/lib/auth/get-user-profiles";

export async function getActiveProfile(): Promise<UserProfile | null> {
  const [cookieStore, profiles] = await Promise.all([cookies(), getUserProfiles()]);
  const eligibleProfiles = profiles.filter((profile) => profile.status === "active");
  const requestedProfileId = cookieStore.get(activeProfileCookieName)?.value;

  if (requestedProfileId) {
    const requestedProfile = eligibleProfiles.find((profile) => profile.id === requestedProfileId);
    if (requestedProfile) return requestedProfile;
  }

  return eligibleProfiles.find((profile) => profile.is_default) ?? eligibleProfiles[0] ?? null;
}
