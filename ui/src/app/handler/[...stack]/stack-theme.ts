// Dark & light token overrides for the embedded Stack Auth form so it blends
// seamlessly into the auth card surface. Stack's theme parser does not accept
// OKLCH strings, so hex values are used.

import type { StackTheme } from "@stackframe/stack";
import type { ComponentProps } from "react";

type ThemeConfig = NonNullable<ComponentProps<typeof StackTheme>["theme"]>;

const darkColors = {
  background: "#09090b", // Deep zinc matte background
  foreground: "#f4f4f5", // Zinc-100 crisp text
  card: "#09090b",
  cardForeground: "#f4f4f5",
  popover: "#121215",
  popoverForeground: "#f4f4f5",
  primary: "#fe6905", // Talkar signature orange
  primaryForeground: "#ffffff",
  secondary: "#18181b", // Zinc-900 subtle surfaces
  secondaryForeground: "#f4f4f5",
  muted: "#18181b",
  mutedForeground: "#71717a", // Zinc-500
  accent: "#18181b",
  accentForeground: "#f4f4f5",
  destructive: "#ef4444",
  destructiveForeground: "#fafafa",
  border: "#27272a", // Crisp Zinc-800 hairline border
  input: "#27272a", // Subtle dark border
  ring: "#fe6905",
};

const lightColors = {
  background: "#ffffff",
  foreground: "#09090b",
  card: "#ffffff",
  cardForeground: "#09090b",
  popover: "#ffffff",
  popoverForeground: "#09090b",
  primary: "#fe6905",
  primaryForeground: "#ffffff",
  secondary: "#f4f4f5",
  secondaryForeground: "#09090b",
  muted: "#f4f4f5",
  mutedForeground: "#71717a",
  accent: "#f4f4f5",
  accentForeground: "#09090b",
  destructive: "#ef4444",
  destructiveForeground: "#ffffff",
  border: "#e4e4e7",
  input: "#e4e4e7",
  ring: "#fe6905",
};

export const stackAuthDarkTheme: ThemeConfig = {
  light: lightColors,
  dark: darkColors,
  radius: "0.5rem",
};
