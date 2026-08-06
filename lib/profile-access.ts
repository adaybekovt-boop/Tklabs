import { getClodexAccessStatus } from "@/lib/account-access";
import type { ClodexAccessStatus } from "@/lib/clodex-access";
import { isClodexEnabled } from "@/lib/feature-flags";
import { isAdminEmail, isPrivilegedAiEmail } from "@/lib/privileged-access";

export type ClodexProfileState = "active" | "inactive" | "disabled" | "unavailable";

export type ProfileAccess = {
  isAdmin: boolean;
  unlimitedAi: boolean;
  clodexEnabled: boolean;
  clodexState: ClodexProfileState;
  accountState: "authenticated" | "unavailable";
  clodex: ClodexAccessStatus | null;
};

export async function getProfileAccess(email: string): Promise<ProfileAccess> {
  const normalizedEmail = email.trim().toLowerCase();
  const isAdmin = isAdminEmail(normalizedEmail);
  const unlimitedAi = isPrivilegedAiEmail(normalizedEmail);
  const clodexEnabled = isClodexEnabled();
  if (!normalizedEmail) return { isAdmin, unlimitedAi, clodexEnabled, clodexState: "unavailable", accountState: "unavailable", clodex: null };
  if (!clodexEnabled) return { isAdmin, unlimitedAi, clodexEnabled, clodexState: "disabled", accountState: "authenticated", clodex: null };

  try {
    const clodex = await getClodexAccessStatus(normalizedEmail);
    return { isAdmin, unlimitedAi, clodexEnabled, clodexState: clodex.active ? "active" : "inactive", accountState: "authenticated", clodex };
  } catch {
    return { isAdmin, unlimitedAi, clodexEnabled, clodexState: "unavailable", accountState: "unavailable", clodex: null };
  }
}
