"use client";

import { Eye, Pencil, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "~/_components/ui/avatar";
import { Badge } from "~/_components/ui/badge";
import { Card, CardContent } from "~/_components/ui/card";

// Device type that includes share info from the API
interface DeviceWithShareInfo {
  id: string;
  title: string;
  description: string | null;
  isOwned: boolean;
  isShared: boolean;
  shareInfo: {
    shareId: string;
    permission: "READ" | "WRITE";
    ownerName: string;
    ownerEmail: string;
  } | null;
  _count: {
    alarms: number;
  };
}

export function DevicesCard({ devices }: { devices: DeviceWithShareInfo[] }) {
  const t = useTranslations();

  // Separate owned and shared devices
  const ownedDevices = devices.filter((d) => d.isOwned);
  const sharedDevices = devices.filter((d) => d.isShared);

  if (devices.length === 0) return null;

  return (
    <>
      {/* Owned Devices Section */}
      {ownedDevices.length > 0 && (
        <>
          <div className="mt-2">
            <h2 className="text-lg font-semibold">
              {t("dashboard.yourDevices")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("dashboard.deviceDescription")}
            </p>
          </div>
          <Card className="-mt-2 w-full rounded-lg p-0 shadow">
            <CardContent className="p-0">
              <ul className="divide-y">
                {ownedDevices.map((device) => (
                  <li key={device.id}>
                    <a
                      href={`/devices/${device.id}`}
                      className="hover:bg-muted/50 flex items-center justify-between gap-4 rounded-lg px-2 py-4 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={undefined} alt={device.title} />
                          <AvatarFallback className="bg-muted text-foreground">
                            {device.title.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-base font-semibold">
                            {device.title}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {device.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex min-w-[120px] flex-col items-end">
                        <Badge variant="outline" className="mb-1">
                          {device._count.alarms}{" "}
                          {device._count.alarms === 1
                            ? t("devices.alarm")
                            : t("devices.alarms")}
                        </Badge>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {/* Shared Devices Section */}
      {sharedDevices.length > 0 && (
        <>
          <div className="mt-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5 text-purple-600" />
              Shared With You
            </h2>
            <p className="text-muted-foreground text-sm">
              Devices that others have shared with you
            </p>
          </div>
          <Card className="-mt-2 w-full rounded-lg border-purple-200 p-0 shadow">
            <CardContent className="p-0">
              <ul className="divide-y">
                {sharedDevices.map((device) => (
                  <li key={device.id}>
                    <a
                      href={`/devices/${device.id}`}
                      className="hover:bg-muted/50 relative flex items-center justify-between gap-4 rounded-lg px-2 py-4 transition-colors"
                    >
                      {/* Purple accent bar */}
                      <div className="absolute top-0 left-0 h-full w-1 rounded-l-lg bg-purple-500" />

                      <div className="flex items-center gap-4 pl-2">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={undefined} alt={device.title} />
                          <AvatarFallback className="bg-purple-100 text-purple-700">
                            {device.title.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-semibold">
                              {device.title}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                device.shareInfo?.permission === "WRITE"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-purple-100 text-purple-700"
                              }`}
                            >
                              {device.shareInfo?.permission === "WRITE" ? (
                                <span className="flex items-center gap-1">
                                  <Pencil className="h-3 w-3" />
                                  Write
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  Read
                                </span>
                              )}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground text-sm">
                            Shared by {device.shareInfo?.ownerEmail}
                          </div>
                        </div>
                      </div>
                      <div className="flex min-w-[120px] flex-col items-end">
                        <Badge variant="outline" className="mb-1">
                          {device._count.alarms}{" "}
                          {device._count.alarms === 1
                            ? t("devices.alarm")
                            : t("devices.alarms")}
                        </Badge>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
