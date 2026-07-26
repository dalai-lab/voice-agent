import { cn } from "@/lib/utils";

const LogoMark = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="16" cy="16" r="15" fill="#E11D48" />
    <circle
      cx="16"
      cy="16"
      r="8"
      stroke="#FFFFFF"
      strokeWidth="3.5"
      fill="none"
    />
  </svg>
);

export function BrandLogo({
  className,
  inverse = false,
  mark = false,
  size = "md",
}: {
  className?: string;
  inverse?: boolean;
  mark?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  if (mark) {
    return <LogoMark className={cn("h-7 w-7", className)} />;
  }

  const iconSizes = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-7.5 w-7.5",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={cn("flex items-center gap-2.5 text-left select-none", className)}>
      <LogoMark className={cn("shrink-0", iconSizes[size])} />
      <span
        className={cn(
          "font-extrabold tracking-tight font-sans leading-none",
          textSizes[size],
          inverse ? "text-white" : "text-foreground dark:text-zinc-50"
        )}
      >
        Nova
      </span>
    </div>
  );
}
