import { HydrateClient } from "~/trpc/server";
import { DeviceCard } from "./DeviceCard";

export default async function DevicePage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  return (
    <HydrateClient>
      <DeviceCard deviceId={params.id} />
    </HydrateClient>
  );
}
