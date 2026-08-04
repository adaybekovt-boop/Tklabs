import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ProfilePage } from "@/components/site/ProfilePage";

export default async function ProfileRoute() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/profile");

  const email = session.user?.email ?? "";
  return (
    <ProfilePage
      account={{
        name: session.user?.name ?? email.split("@")[0] ?? "Account",
        email,
        image: session.user?.image ?? null,
      }}
    />
  );
}
