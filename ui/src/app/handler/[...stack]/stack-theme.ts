// Dark token overrides for the embedded Stack Auth form so it blends into the
// auth card surface (zinc-900 background, zinc-100 foreground, the warm CTA
// accent on the primary button, zinc-800 borders/inputs). Stack's theme parser
// does not accept OKLCH strings, so keep these values in hex.

import type { StackTheme } from "@stackframe/stack";
import type { ComponentProps } from "react";

type ThemeConfig = NonNullable<ComponentProps<typeof StackTheme>["theme"]>;

export const stackAuthDarkTheme: ThemeConfig = {
  dark: {
    background: "#090a0f",
    foreground: "#fafafa",
    card: "#121318",
    cardForeground: "#fafafa",
    popover: "#121318",
    popoverForeground: "#fafafa",
    primary: "#FF5500",
    primaryForeground: "#ffffff",
    secondary: "#1f2029",
    secondaryForeground: "#fafafa",
    muted: "#1f2029",
    mutedForeground: "#a1a1aa",
    accent: "#1f2029",
    accentForeground: "#fafafa",
    destructive: "#ef4444",
    destructiveForeground: "#fafafa",
    border: "#27272a",
    input: "#27272a",
    ring: "#FF5500",
  },
  radius: "0.75rem",
};
