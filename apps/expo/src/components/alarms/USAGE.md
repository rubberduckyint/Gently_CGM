# AlarmForm Component Usage Guide

## Overview

The `AlarmForm` component is a unified, reusable form for creating and editing alarms. It encapsulates all form state management, validation, and UI sections.

## Features

✅ **Retrigger Settings**: Now includes retrigger delay and timeout options
✅ **Unified Component**: Same form for both add and edit operations
✅ **Built-in Validation**: Automatic form validation with error messages
✅ **Loading States**: Built-in loading/disabled states
✅ **Customizable**: Configurable save button text and callbacks

## Usage

### Basic Example (Add Alarm)

```tsx
import type { AlarmFormData } from "~/components/alarms";
import { AlarmForm } from "~/components/alarms";

const getDefaultFormData = (): AlarmFormData => {
  const defaultStart = new Date(Date.now() + 300000); // 5 minutes from now

  return {
    title: "",
    description: "",
    startDate: defaultStart,
    repeat: false,
    repeatType: "days",
    repeatEvery: 1,
    daysOfWeek: [],
    ends: "never",
    endsOnDate: undefined,
    endsAfter: undefined,
    severityLevel: "INFORMATIONAL",
    ledPattern: "BLINK_SLOW",
    ledColor: "BLUE",
    vibrationPattern: "QUICK",
    vibrationIntensity: "MEDIUM",
    snoozePeriod: 5,
    snoozeTimeout: 15,
    retriggerDelay: 1, // ← New field
    retriggerTimeout: 5, // ← New field
  };
};

export default function AddAlarmPage() {
  const router = useRouter();
  const [formData] = useState(getDefaultFormData());

  const createMutation = useMutation({
    mutationFn: async (data: AlarmFormData) => {
      // Your create logic here
      return await trpc.alarm.create.mutate(data);
    },
    onSuccess: () => {
      Alert.alert("Success", "Alarm created!");
      router.back();
    },
  });

  return (
    <SafeAreaView style={containers.safeArea}>
      <Header title="Add New Alarm" showBackButton />

      <AlarmForm
        initialData={formData}
        onSave={(data) => createMutation.mutate(data)}
        onCancel={() => router.back()}
        saveButtonText="Create Alarm"
        isLoading={createMutation.isPending}
      />
    </SafeAreaView>
  );
}
```

### Edit Example

```tsx
export default function EditAlarmPage() {
  const { alarmId } = useLocalSearchParams();
  const router = useRouter();

  const { data: alarm, isLoading } = useQuery({
    queryKey: ["alarm", alarmId],
    queryFn: () => trpc.alarm.getById.query({ id: alarmId }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: AlarmFormData) => {
      return await trpc.alarm.update.mutate({ id: alarmId, ...data });
    },
    onSuccess: () => {
      Alert.alert("Success", "Alarm updated!");
      router.back();
    },
  });

  if (isLoading || !alarm) {
    return <ActivityIndicator />;
  }

  return (
    <SafeAreaView style={containers.safeArea}>
      <Header title="Edit Alarm" showBackButton />

      <AlarmForm
        initialData={convertAlarmToFormData(alarm)}
        onSave={(data) => updateMutation.mutate(data)}
        onCancel={() => router.back()}
        saveButtonText="Update Alarm"
        isLoading={updateMutation.isPending}
      />
    </SafeAreaView>
  );
}
```

## Props

| Prop             | Type                            | Required | Default        | Description              |
| ---------------- | ------------------------------- | -------- | -------------- | ------------------------ |
| `initialData`    | `AlarmFormData`                 | ✅       | -              | Initial form values      |
| `onSave`         | `(data: AlarmFormData) => void` | ✅       | -              | Called when user saves   |
| `onCancel`       | `() => void`                    | ✅       | -              | Called when user cancels |
| `saveButtonText` | `string`                        | ❌       | `"Save Alarm"` | Custom save button text  |
| `isLoading`      | `boolean`                       | ❌       | `false`        | Shows loading state      |

## New Fields in AlarmFormData

### Retrigger Delay

- **Type**: `number` (minutes)
- **Range**: 0-60 minutes
- **Default**: `1`
- **Description**: Wait time before alarm can retrigger. Set to 0 to disable retriggering.

### Retrigger Timeout

- **Type**: `number` (minutes)
- **Range**: 0-120 minutes
- **Default**: `5`
- **Description**: How long retriggering is available after the alarm first triggered.

## Benefits of Refactored Form

1. **Code Reuse**: One component for both add and edit operations
2. **Consistency**: Identical UI/UX across all alarm forms
3. **Maintainability**: Update form in one place
4. **Testing**: Single component to test
5. **Less Boilerplate**: Pages are now much simpler

## Migration from Old Pattern

### Before (add.tsx)

```tsx
// 500+ lines of form logic, state, and UI
const [formData, setFormData] = useState(...)
const [showStartDatePicker, setShowStartDatePicker] = useState(false)
// ... lots of state management
<BasicInfoSection ... />
<ScheduleSection ... />
<AdvancedSection ... />
// ... button handling
```

### After (add.tsx)

```tsx
// ~100 lines, focused on data flow
<AlarmForm
  initialData={getDefaultFormData()}
  onSave={handleSave}
  onCancel={handleCancel}
  isLoading={mutation.isPending}
/>
```

## Complete Field Reference

```typescript
interface AlarmFormData {
  // Basic Info
  title: string;
  description: string;

  // Schedule
  startDate: Date;
  repeat: boolean;
  repeatType: "minutes" | "hours" | "days" | "weeks";
  repeatEvery: number;
  daysOfWeek: number[];
  ends: "never" | "on" | "after";
  endsOnDate?: Date;
  endsAfter?: number;

  // Advanced Settings
  severityLevel: "CRITICAL" | "WARNING" | "INFORMATIONAL";
  ledPattern: "SOLID" | "BLINK_SLOW" | "BLINK_FAST" | "PULSE" | "STROBE";
  ledColor: "RED" | "GREEN" | "BLUE" | "YELLOW" | "MAGENTA" | "CYAN" | "WHITE";
  vibrationPattern: "QUICK" | "HEARTBEAT" | "RAPID" | "SYMPHONY";
  vibrationIntensity: "LOW" | "MEDIUM" | "HIGH";

  // Snooze (hidden for CRITICAL severity)
  snoozePeriod: number; // 1-60 minutes
  snoozeTimeout: number; // 1-120 minutes

  // Retrigger (NEW!)
  retriggerDelay: number; // 0-60 minutes (0 = disabled)
  retriggerTimeout: number; // 0-120 minutes
}
```
