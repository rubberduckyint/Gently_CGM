# Responsive Design Guide

## Overview

The Gently app uses a responsive design system that adapts to:

- **Screen sizes**: Small phones, tablets, etc.
- **Font scaling**: User's accessibility settings (text magnification)
- **Device pixel ratio**: Retina displays and high-DPI screens

## The `useResponsive` Hook

Import and use the hook in any component:

```tsx
import { useResponsive } from "~/hooks/useResponsive";

const MyComponent = () => {
  const { getIconSize, getSpacing, isLargeText } = useResponsive();

  // Use responsive values
  const iconSize = getIconSize(24); // Base size 24, scales with font size
  const padding = getSpacing(16); // Base spacing 16, scales slightly

  return (
    <View style={{ padding }}>
      <Ionicons size={iconSize} />
    </View>
  );
};
```

## Key Functions

### `getIconSize(baseSize)`

Scales icons based on user's font scale settings. Icons scale at 50% of the font scale rate to avoid being too large.

```tsx
// Example: User has 1.5x font scale
const iconSize = getIconSize(24); // Returns ~30 (24 * 1.25)
```

### `getSpacing(baseSpacing)`

Increases spacing slightly when large text is enabled for better readability.

```tsx
const padding = getSpacing(16); // Returns 17.6 when font scale > 1.2
```

### `getFontSize(baseSize, maxScale)`

Caps extremely large font sizes to prevent UI breaking. Default max is 1.5x.

```tsx
const fontSize = getFontSize(16, 1.3); // Won't exceed 16 * 1.3 = 20.8
```

## Screen Size Checks

```tsx
const { isSmall, isMedium, isLarge, isLargeText } = useResponsive();

if (isSmall) {
  // Show compact layout for small phones
}

if (isLargeText) {
  // Adjust layout for accessibility
}
```

## Best Practices

### ✅ DO:

- Use `getIconSize()` for all icon sizes
- Use `flexShrink: 1` and `flex: 1` for flexible layouts
- Add `numberOfLines` to prevent text overflow
- Use `flexWrap: "wrap"` for content that might overflow
- Add `paddingHorizontal` to screen sections for edge spacing
- Use `minWidth: 0` on flex containers to allow proper shrinking

### ❌ DON'T:

- Use fixed pixel widths/heights unless absolutely necessary
- Assume text will fit in one line
- Use absolute positioning without checking screen size
- Ignore `fontScale` - React Native automatically scales text

## Common Patterns

### Responsive Avatar/Icon Container

```tsx
const avatarSize = getIconSize(48);

<View
  style={{
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    flexShrink: 0, // Don't shrink
  }}
>
  <Ionicons size={getIconSize(24)} />
</View>;
```

### Flexible Text Container

```tsx
<View style={{ flex: 1, minWidth: 0 }}>
  <Text numberOfLines={1} style={typography.subtitle}>
    Long device name that might overflow
  </Text>
</View>
```

### Wrapping Row Layout

```tsx
<View
  style={{
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  }}
>
  <Text>Battery: 75%</Text>
  <Text> • 3.7V</Text>
</View>
```

### Responsive Padding

```tsx
<View
  style={{
    paddingHorizontal: spacing[4], // Keeps content from edges
    paddingVertical: getSpacing(spacing[6]), // Scales with font
  }}
>
  {/* Content */}
</View>
```

## Typography

Your typography system already handles font scaling automatically. React Native respects the user's font scale settings by default for all `<Text>` components.

No need to manually apply `getFontSize()` unless you want to cap extremely large sizes:

```tsx
// Normal usage (auto-scales):
<Text style={typography.h2}>Title</Text>

// Capped scaling (if needed):
<Text style={[typography.h2, { fontSize: getFontSize(30, 1.3) }]}>
  Title
</Text>
```

## Testing Accessibility

### iOS Simulator:

1. Settings → Accessibility → Display & Text Size → Larger Text
2. Drag slider to test different font scales

### Android Emulator:

1. Settings → Accessibility → Font size
2. Settings → Display → Display size

### Code Testing:

```tsx
// Check current font scale
const { fontScale } = useResponsive();
console.log("Font scale:", fontScale); // 1.0 = normal, 1.5 = 150%
```

## Migration Checklist

When updating existing components:

- [ ] Replace hard-coded icon sizes with `getIconSize()`
- [ ] Add `flexShrink: 1` to text containers
- [ ] Add `numberOfLines` to text that might overflow
- [ ] Replace fixed width/height with flex-based layouts
- [ ] Add `flexWrap: "wrap"` to horizontal layouts
- [ ] Add `paddingHorizontal` to prevent edge overflow
- [ ] Test with iOS accessibility "Larger Text" at maximum
