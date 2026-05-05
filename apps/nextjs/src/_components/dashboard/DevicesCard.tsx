"use client";

import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "~/_components/ui/avatar";
import { Card, CardContent } from "~/_components/ui/card";

// Device type from the API
interface Device {
  id: string;
  title: string;
  description: string | null;
}

export function DevicesCard({ devices }: { devices: Device[] }) {
  const t = useTranslations();

  if (devices.length === 0) return null;

  return (
    <>
      <div className="mt-2">
        <h2 className="text-lg font-semibold">{t("dashboard.yourDevices")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("dashboard.deviceDescription")}
        </p>
      </div>
      <Card className="-mt-2 w-full rounded-lg p-0 shadow">
        <CardContent className="p-0">
          <ul className="divide-y">
            {devices.map((device) => (
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
                </a>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
