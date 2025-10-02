import { notFound } from "next/navigation";

import { AppDownloadCard } from "~/_components/dashboard/AppDownloadCard";
import { DashboardContent } from "~/_components/dashboard/DashboardContent";
import { getSession } from "~/auth/server";
import { HydrateClient } from "~/trpc/server";

export default async function DashboardPage() {
  // Get session on the server
  const session = await getSession();

  if (!session?.user) {
    return notFound();
  }

  return (
    <HydrateClient>
      <div className="mx-auto flex w-full flex-col gap-6">
        <AppDownloadCard />
        <DashboardContent />
      </div>
    </HydrateClient>
  );
}
