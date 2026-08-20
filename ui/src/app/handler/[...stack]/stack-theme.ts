// Dark token overrides for the embedded Stack Auth form so it blends into the
// auth card surface (zinc-900 background, zinc-100 foreground, the warm CTA
// accent on the primary button, zinc-800 borders/inputs). Stack's theme parser
// does not accept OKLCH strings, so keep these values in hex.

import type { StackTheme } from "@stackframe/stack";
import type { ComponentProps } from "react";

type ThemeConfig = NonNullable<ComponentProps<typeof StackTheme>["theme"]>;

const colors = {
  background: "#121318", // cohesive dark background for the card/fields
  foreground: "#fafafa",
  card: "#121318",
  cardForeground: "#fafafa",
  popover: "#121318",
  popoverForeground: "#fafafa",
  primary: "#FF5500", // Talkar orange
  primaryForeground: "#ffffff",
  secondary: "#1f2029",
  secondaryForeground: "#fafafa",
  muted: "#1f2029",
  mutedForeground: "#a1a1aa",
  accent: "#FF5500",
  accentForeground: "#ffffff",
  destructive: "#ef4444",
  destructiveForeground: "#fafafa",
  border: "#27272a",
  input: "#1f2029", // dark input background
  ring: "#FF5500",
};

export const stackAuthDarkTheme: ThemeConfig = {
  light: colors,
  dark: colors,
  radius: "0.75rem",
};
