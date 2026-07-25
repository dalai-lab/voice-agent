import { BrandLogo } from "@/components/BrandLogo";

interface SpinLoaderProps {
    label?: string;
}

export default function SpinLoader({ label }: SpinLoaderProps) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <style>{`
                @keyframes loadingBar {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                .animate-loading-bar {
                    animation: loadingBar 1.5s infinite cubic-bezier(0.4, 0, 0.2, 1);
                }
            `}</style>

            <div className="flex flex-col items-center gap-4">
                <BrandLogo className="animate-pulse" />

                <div className="relative h-[2px] w-24 overflow-hidden rounded-full bg-border/30">
                    <div className="absolute top-0 bottom-0 left-0 w-1/2 rounded-full bg-cta animate-loading-bar" />
                </div>

                {label && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/50">
                        {label}
                    </span>
                )}
            </div>
        </div>
    );
}
