"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Mail } from "lucide-react";

import { Badge } from "~/_components/ui/badge";
import { Card, CardContent } from "~/_components/ui/card";
import { useTRPC } from "~/trpc/react";

export function InvitationsBanner() {
  const trpc = useTRPC();

  const { data: invitations } = useQuery({
    ...trpc.deviceShare.getPendingInvitations.queryOptions(),
  });

  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <a href="/invitations">
      <Card className="border-primary/30 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full">
              <Mail className="text-primary h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Pending Invitations</span>
                <Badge variant="default" className="h-5 px-2 text-xs">
                  {invitations.length}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {invitations.length === 1
                  ? "Someone wants to share a device with you"
                  : `${invitations.length} people want to share devices with you`}
              </p>
            </div>
          </div>
          <ChevronRight className="text-muted-foreground h-5 w-5" />
        </CardContent>
      </Card>
    </a>
  );
}
