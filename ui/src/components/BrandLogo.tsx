import { cn } from "@/lib/utils";

const LogoMark = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="nova-gradient-mark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e11d48" />
        <stop offset="100%" stopColor="#ff5a79" />
      </linearGradient>
    </defs>
    <circle
      cx="16"
      cy="16"
      r="13"
      stroke="url(#nova-gradient-mark)"
      strokeWidth="2"
      strokeDasharray="4 3"
      className="opacity-40"
    />
    <path
      d="M16 6C16 11.5 11.5 16 6 16C11.5 16 16 20.5 16 26C16 20.5 20.5 16 26 16C20.5 16 16 11.5 16 6Z"
      fill="url(#nova-gradient-mark)"
    />
  </svg>
);

export function BrandLogo({
  className,
  inverse = false,
  mark = false,
}: {
  className?: string;
  inverse?: boolean;
  mark?: boolean;
}) {
  if (mark) {
    return <LogoMark className={cn("h-7 w-7", className)} />;
  }

  return (
    <div className={cn("flex items-center gap-2 text-left", className)}>
      <LogoMark className="h-6 w-6 shrink-0" />
      <span
        className={cn(
          "font-black tracking-widest uppercase text-base",
          inverse ? "text-white" : "text-foreground dark:text-zinc-50"
        )}
      >
        Nova
      </span>
    </div>
  );
}
