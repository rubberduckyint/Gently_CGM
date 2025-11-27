import { HydrateClient } from "~/trpc/server";
import { InvitationsContent } from "./InvitationsContent";

export default function InvitationsPage() {
  return (
    <HydrateClient>
      <InvitationsContent />
    </HydrateClient>
  );
}
