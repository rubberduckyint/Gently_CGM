import { HydrateClient } from "~/trpc/server";
import { ShareDeviceContent } from "./ShareDeviceContent";

export default async function ShareDevicePage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  return (
    <HydrateClient>
      <ShareDeviceContent deviceId={params.id} />
    </HydrateClient>
  );
}
