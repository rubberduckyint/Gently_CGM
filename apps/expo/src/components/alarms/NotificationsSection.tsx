/**
 * NotificationsSection Component
 *
 * Form section for alarm notification settings (push and email notifications).
 * Uses the shared Toggle component for consistent styling and accessibility.
 */

import type { AlarmFormData } from "~/types";
import { Card, SectionHeader, Toggle } from "~/components/ui";
import { colors, spacing } from "~/styles";

interface NotificationsSectionProps {
  formData: AlarmFormData;
  onUpdateFormData: (updates: Partial<AlarmFormData>) => void;
}

export function NotificationsSection({
  formData,
  onUpdateFormData,
}: NotificationsSectionProps) {
  return (
    <Card style={{ marginBottom: spacing[4] }}>
      <SectionHeader
        title="Notifications"
        icon="notifications-outline"
        subtitle="Choose how you want to be notified when this alarm goes off"
      />

      <Toggle
        label="Push Notification"
        value={formData.pushNotification}
        onValueChange={(value) => onUpdateFormData({ pushNotification: value })}
        description="Get alerted on your phone"
        icon="phone-portrait-outline"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.border.light,
        }}
      />

      <Toggle
        label="Email Notification"
        value={formData.emailNotification}
        onValueChange={(value) =>
          onUpdateFormData({ emailNotification: value })
        }
        description="Receive an email alert"
        icon="mail-outline"
      />
    </Card>
  );
}
