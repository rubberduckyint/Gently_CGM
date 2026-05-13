import { ActivityIndicator, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { colors, typography } from "~/styles";
import { trpc } from "~/utils/api";
import { trendArrow, trendLabel } from "~/utils/glucose-trend";
import type { GlucoseRange, GlucoseUnit } from "~/utils/glucose-units";
import { rangeColor, toMmolL } from "~/utils/glucose-units";
import { relativeTime } from "~/utils/relative-time";

// 60s matches the SRF worker polling cadence — no point polling faster
const POLL_INTERVAL_MS = 60_000;

const RANGE_BG: Record<GlucoseRange, string> = {
  low: "#FDECEA",
  in_range: "#E8F5E9",
  high: "#FFF8E1",
};

const RANGE_FG: Record<GlucoseRange, string> = {
  low: "#B71C1C",
  in_range: "#1B5E20",
  high: "#F57F17",
};

interface Props {
  sourceId: string;
  unit: GlucoseUnit;
}

export function CurrentGlucoseCard({ sourceId, unit }: Props) {
  const q = useQuery({
    queryKey: ["readings", "latest", sourceId],
    queryFn: () => trpc.readings.latest.query({ sourceId }),
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  if (q.isLoading) {
    return (
      <Card>
        <ActivityIndicator />
      </Card>
    );
  }

  if (q.isError) {
    return (
      <Card>
        <Text style={{ color: colors.error[500] }}>Couldn't load reading</Text>
        <Text
          style={{ color: colors.text.tertiary, fontSize: 12, marginTop: 4 }}
        >
          {q.error instanceof Error ? q.error.message : "Unknown error"}
        </Text>
      </Card>
    );
  }

  if (!q.data) {
    return (
      <Card>
        <Text style={typography.h5}>No reading yet</Text>
        <Text style={{ color: colors.text.tertiary, marginTop: 4 }}>
          The first reading will appear within a few minutes after connecting
          your Dexcom source.
        </Text>
      </Card>
    );
  }

  const { value, trend, wallTime } = q.data;
  const range = rangeColor(value);
  const displayValue =
    unit === "mmol_l" ? toMmolL(value).toFixed(1) : String(value);
  const unitLabel = unit === "mmol_l" ? "mmol/L" : "mg/dL";

  return (
    <Card style={{ backgroundColor: RANGE_BG[range] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text
          style={{ fontSize: 56, fontWeight: "700", color: RANGE_FG[range] }}
        >
          {displayValue}
        </Text>
        <View>
          <Text style={{ fontSize: 32, color: RANGE_FG[range] }}>
            {trendArrow(trend)}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: RANGE_FG[range],
              fontWeight: "600",
            }}
          >
            {trendLabel(trend)}
          </Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 12,
        }}
      >
        <Text style={{ color: RANGE_FG[range], fontWeight: "600" }}>
          {unitLabel}
        </Text>
        <Text style={{ color: RANGE_FG[range], fontSize: 12 }}>
          {relativeTime(new Date(wallTime))}
        </Text>
      </View>
    </Card>
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: { backgroundColor?: string };
}) {
  return (
    <View
      style={{
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border.medium,
        ...(style ?? {}),
      }}
    >
      {children}
    </View>
  );
}
