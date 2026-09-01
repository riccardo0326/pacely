import { GearManager } from "@/components/profile/gear-manager";
import { ProfileForm } from "@/components/profile/profile-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/require-user";
import { getProfile } from "@/server/actions/profile";

export default async function ProfilePage() {
  await requireUser();
  const profile = await getProfile();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <PageHeader
        title="Profilo"
        description={`${profile.name}. Dati fisiologici e attrezzatura usati nella generazione dei programmi.`}
      />
      <ProfileForm profile={profile} />
      <GearManager gear={profile.gear} />
    </main>
  );
}
