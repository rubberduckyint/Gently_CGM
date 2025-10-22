/**
 * YearOfBirthModal Component
 *
 * Collects user's year of birth on first signup to personalize their experience.
 * Shows before the help/onboarding modal.
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { buttons, cards, colors, inputs, spacing, typography } from "~/styles";

interface YearOfBirthModalProps {
  visible: boolean;
  onComplete: (yearOfBirth: number) => void;
  isLoading?: boolean;
}

export function YearOfBirthModal({
  visible,
  onComplete,
  isLoading = false,
}: YearOfBirthModalProps) {
  const currentYear = new Date().getFullYear();

  const [yearOfBirth, setYearOfBirth] = useState("");

  const handleSubmit = () => {
    const year = parseInt(yearOfBirth);

    // Validation
    if (isNaN(year)) {
      Alert.alert("Invalid Year", "Please enter a valid year");
      return;
    }

    const minYear = 1900;
    const maxYear = currentYear;

    if (year < minYear || year > maxYear) {
      Alert.alert(
        "Invalid Year",
        `Please enter a year between ${minYear} and ${maxYear}`,
      );
      return;
    }

    onComplete(year);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={() => {
        // Prevent closing - user must submit
      }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: spacing[4],
          }}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                cards.base,
                {
                  width: "100%",
                  maxWidth: 400,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 24,
                },
              ]}
            >
              {/* Content */}
              <View
                style={{
                  paddingHorizontal: spacing[6],
                  paddingTop: spacing[6],
                  paddingBottom: spacing[6],
                }}
              >
                {/* Icon */}
                <View
                  style={{
                    alignItems: "center",
                    marginBottom: spacing[4],
                  }}
                >
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: `${colors.primary[500]}20`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={40}
                      color={colors.primary[500]}
                    />
                  </View>
                </View>

                {/* Title */}
                <Text
                  style={[
                    typography.h4,
                    {
                      color: colors.text.primary,
                      marginBottom: spacing[3],
                      textAlign: "center",
                    },
                  ]}
                >
                  Help Us Personalize Your Experience
                </Text>

                {/* Description */}
                <Text
                  style={[
                    typography.body,
                    {
                      color: colors.text.secondary,
                      marginBottom: spacing[5],
                      textAlign: "center",
                      lineHeight: 24,
                    },
                  ]}
                >
                  We use your year of birth to tailor the app to your needs and
                  provide age-appropriate features and recommendations.
                </Text>

                {/* Input - Centered and compact for 4 digits */}
                <View
                  style={{
                    alignItems: "center",
                    marginBottom: spacing[2],
                  }}
                >
                  <Text
                    style={[
                      inputs.label,
                      { marginBottom: spacing[2], textAlign: "center" },
                    ]}
                  >
                    Year of Birth
                  </Text>
                  <TextInput
                    style={[
                      inputs.base,
                      {
                        width: 120,
                        textAlign: "center",
                        fontSize: 20,
                        fontWeight: "600",
                        letterSpacing: 2,
                      },
                    ]}
                    value={yearOfBirth}
                    onChangeText={setYearOfBirth}
                    placeholder="YYYY"
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholderTextColor={colors.text.tertiary}
                    editable={!isLoading}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: colors.text.tertiary,
                        marginTop: spacing[2],
                        textAlign: "center",
                      },
                    ]}
                  >
                    This information is private and helps us serve you better
                  </Text>
                </View>

                {/* Action Button */}
                <View
                  style={{
                    marginTop: spacing[5],
                  }}
                >
                  <Pressable
                    style={[buttons.base, buttons.large, buttons.primary]}
                    onPress={handleSubmit}
                    disabled={isLoading || yearOfBirth.length !== 4}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={colors.text.inverse} />
                    ) : (
                      <Text
                        style={[
                          typography.label,
                          { color: colors.text.inverse },
                        ]}
                      >
                        Continue
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
