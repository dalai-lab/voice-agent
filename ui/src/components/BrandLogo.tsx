import { cn } from "@/lib/utils";

// Reusable Dograh wordmark. Theme-aware by default: the dark logo shows on light
// surfaces and the light/cream logo shows on dark. Pass `inverse` to force the
// light logo on an always-dark surface (e.g. the auth brand panel). Pass `mark`
// to render the square logo mark instead of the full wordmark (e.g. the app
// sidebar header). Height is controlled by the caller via className (e.g.
// "h-7"); width stays auto so each lockup keeps its aspect ratio.
export function BrandLogo({
  className,
  inverse = false,
  mark = false,
}: {
  className?: string;
  inverse?: boolean;
  mark?: boolean;
}) {
  return (
    <span
      className={cn(
        "font-bold tracking-tight text-lg",
        inverse ? "text-white" : "text-foreground dark:text-zinc-50",
        className
      )}
    >
      Nova
    </span>
  );
}
