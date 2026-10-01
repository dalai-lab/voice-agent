import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ContextVarOverridePanelProps {
    vars: Record<string, string>;
    onChange: (vars: Record<string, string>) => void;
    scannedKeys: string[];
    savedKeys: string[];
    disabled?: boolean;
}

export function ContextVarOverridePanel({
    vars,
    onChange,
    scannedKeys,
    savedKeys,
    disabled
}: ContextVarOverridePanelProps) {
    const hasVars = Object.keys(vars).length > 0;
    const [isExpanded, setIsExpanded] = useState(hasVars);

    const handleVarChange = (key: string, val: string) => {
        onChange({ ...vars, [key]: val });
    };

    return (
        <div className="border border-border/70 rounded-lg overflow-hidden flex flex-col bg-card text-sm shadow-sm transition-all min-h-0 max-h-[60vh]">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between w-full p-3 hover:bg-muted/30 transition-colors shrink-0"
                disabled={disabled}
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-semibold text-xs tracking-tight">Test Variables</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 h-4 font-normal">
                        {Object.keys(vars).length}
                    </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground">overrides saved values for this test only</span>
            </button>

            {isExpanded && (
                <div className="p-3 pt-0 flex flex-col min-h-0 border-t border-border/70">
                    {hasVars ? (
                        <div className="space-y-2 pt-2 overflow-y-auto pr-1">
                            {Object.entries(vars).map(([key, value]) => {
                                const isSaved = savedKeys.includes(key);
                                const isScanned = scannedKeys.includes(key) && !isSaved;

                                return (
                                    <div key={key} className="flex flex-col gap-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded text-foreground">{key}</code>
                                            {isSaved && (
                                                <Badge variant="outline" className="text-[9px] px-1 h-3.5 leading-none">
                                                    From settings
                                                </Badge>
                                            )}
                                            {isScanned && (
                                                <Badge variant="outline" className="text-[9px] px-1 h-3.5 leading-none bg-blue-500/10 text-blue-500 border-blue-500/20">
                                                    Not set in settings
                                                </Badge>
                                            )}
                                        </div>
                                        <Input
                                            value={value}
                                            onChange={(e) => handleVarChange(key, e.target.value)}
                                            placeholder={isSaved ? "Override saved value..." : "Set value for this test..."}
                                            className="h-7 text-xs"
                                            disabled={disabled}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground pt-3 text-center">
                            No variables detected. Add them in{" "}
                            <span className="font-medium">Workflow Settings → Template Variables</span>.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
