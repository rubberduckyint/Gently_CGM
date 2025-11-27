import * as React from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface AlarmNotificationEmailProps {
  alarmTitle: string;
  alarmDescription?: string;
  deviceName: string;
  triggeredAt: string;
  productName?: string;
}

export default function AlarmNotificationEmail({
  alarmTitle,
  alarmDescription,
  deviceName,
  triggeredAt,
  productName = "Gently",
}: AlarmNotificationEmailProps) {
  const title = "⏰ Alarm Triggered";
  const description = `Your alarm "${alarmTitle}" has been triggered on your ${productName} device.`;

  return (
    <Html>
      <Head />
      <Preview>
        {title} - {alarmTitle}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={section}>
            <Text style={heading}>{title}</Text>
            <Text style={text}>{description}</Text>

            <Section style={alarmCard}>
              <Text style={alarmTitle_style}>{alarmTitle}</Text>
              {alarmDescription && (
                <Text style={alarmDescriptionStyle}>{alarmDescription}</Text>
              )}
              <Text style={metaText}>
                <strong>Device:</strong> {deviceName}
              </Text>
              <Text style={metaText}>
                <strong>Triggered at:</strong> {triggeredAt}
              </Text>
            </Section>

            <Text style={text}>
              This notification was sent because you enabled email notifications
              for this alarm in your {productName} app.
            </Text>

            <Hr style={hr} />

            <Text style={disclaimer}>
              To stop receiving these notifications, disable email notifications
              for this alarm in the {productName} app settings.
            </Text>

            <Text style={footer}>
              {productName} - Your personal vibration and light notification
              device
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const section = {
  padding: "0 48px",
};

const heading = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "40px 0 20px",
  textAlign: "center" as const,
};

const text = {
  fontSize: "16px",
  color: "#374151",
  lineHeight: "24px",
  margin: "16px 0",
};

const alarmCard = {
  backgroundColor: "#fef3c7",
  borderRadius: "12px",
  padding: "24px",
  margin: "24px 0",
  border: "2px solid #f59e0b",
};

const alarmTitle_style = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#92400e",
  margin: "0 0 8px 0",
};

const alarmDescriptionStyle = {
  fontSize: "14px",
  color: "#78350f",
  margin: "0 0 16px 0",
  lineHeight: "20px",
};

const metaText = {
  fontSize: "14px",
  color: "#78350f",
  margin: "4px 0",
};

const hr = {
  borderColor: "#e6e6e6",
  margin: "32px 0",
};

const disclaimer = {
  fontSize: "12px",
  color: "#9ca3af",
  lineHeight: "18px",
  margin: "16px 0",
};

const footer = {
  fontSize: "12px",
  color: "#6b7280",
  lineHeight: "18px",
  margin: "24px 0 0",
  textAlign: "center" as const,
};
