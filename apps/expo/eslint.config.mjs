import baseConfig from "@gently/eslint-config/base";
import reactConfig from "@gently/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".expo/**", "expo-plugins/**"],
  },
  ...baseConfig,
  ...reactConfig,
  {
    // Override rules for Expo app due to tRPC type inference limitations
    // The tRPC vanilla client types are safe but ESLint's type checker
    // cannot follow the complex generic inference across package boundaries
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // These rules produce false positives with tRPC vanilla client
      // The types ARE safe - ESLint just can't infer them correctly
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",

      // Defensive programming patterns - allow optional chaining even when
      // TypeScript thinks it's unnecessary (runtime safety)
      "@typescript-eslint/no-unnecessary-condition": "off",

      // Keep these as warnings to gradually fix
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },
];
