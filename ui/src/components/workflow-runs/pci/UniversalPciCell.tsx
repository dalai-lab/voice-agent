"use client";

import {
    AlertTriangle,
    Calendar,
    Check,
    CheckCheck,
    Copy,
    Mail,
    Phone,
} from "lucide-react";
import React, { useState } from "react";
import { copyTextToClipboard } from "@/lib/clipboard";

interface UniversalPciCellProps {
    fieldKey: string;
    value: unknown;
    fieldType?: string;
    className?: string;
}

/**
 * Universal, schema-agnostic cell renderer for Post-Call Intelligence fields.
 * Gracefully adapts to any data type (booleans, statuses, dates, phones, arrays, objections, summaries).
 */
export function UniversalPciCell({
    fieldKey,
    value,
    fieldType,
    className = "",
}: UniversalPciCellProps) {
    const [copied, setCopied] = useState(false);

    // Empty state fallback
    if (value === null || value === undefined || value === "") {
        return <span className="text-muted-foreground/40 font-normal text-xs">—</span>;
    }

    const keyLower = fieldKey.toLowerCase();
    const strVal = typeof value === "string" ? value.trim() : String(value);

    // 1. Boolean check (handles native boolean or string boolean representations)
    const isBoolField =
        fieldType === "boolean" ||
        typeof value === "boolean" ||
        keyLower.startsWith("is_") ||
        keyLower.startsWith("has_") ||
        keyLower.endsWith("_scheduled") ||
        keyLower.endsWith("_confirmed");

    if (isBoolField && (typeof value === "boolean" || strVal.toLowerCase() === "true" || strVal.toLowerCase() === "false")) {
        const boolVal = typeof value === "boolean" ? value : strVal.toLowerCase() === "true";
        return boolVal ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                <Check className="h-3 w-3 text-emerald-500 stroke-[2.5]" />
                Yes
            </span>
        ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/40 whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                No
            </span>
        );
    }

    // 2. Objections / Concerns / Risks
    if (keyLower.includes("objection") || keyLower.includes("concern") || keyLower.includes("risk")) {
        const isNone = strVal.toLowerCase() === "none" || strVal.toLowerCase() === "no" || strVal.toLowerCase() === "n/a" || strVal === "-";
        if (isNone) {
            return <span className="text-xs text-muted-foreground/60 font-normal">None</span>;
        }
        return (
            <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 max-w-[200px] truncate"
                title={strVal}
            >
                <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                <span className="truncate">{strVal}</span>
            </span>
        );
    }

    // 3. Status / Category Enums (e.g. lead_status, triage_level, disposition)
    if (keyLower.includes("status") || keyLower.includes("disposition") || keyLower.includes("stage") || keyLower.includes("tier")) {
        const valLower = strVal.toLowerCase();
        let badgeColor = "bg-secondary text-secondary-foreground border-border/60";
        if (valLower.includes("qualif") || valLower.includes("book") || valLower.includes("won") || valLower.includes("pass") || valLower.includes("success")) {
            badgeColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
        } else if (valLower.includes("lost") || valLower.includes("unqual") || valLower.includes("fail") || valLower.includes("reject") || valLower.includes("spam")) {
            badgeColor = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
        } else if (valLower.includes("progress") || valLower.includes("eval") || valLower.includes("follow") || valLower.includes("pend")) {
            badgeColor = "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
        }

        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap shadow-2xs ${badgeColor}`}>
                {strVal.replace(/_/g, " ")}
            </span>
        );
    }

    // 4. Phone Numbers
    if (keyLower.includes("phone") || keyLower.includes("mobile") || keyLower.includes("caller")) {
        const handleCopyPhone = async (e: React.MouseEvent) => {
            e.stopPropagation();
            try {
                await copyTextToClipboard(strVal);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            } catch {
                // fail silent
            }
        };

        return (
            <button
                type="button"
                onClick={handleCopyPhone}
                className="group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium text-foreground bg-muted/40 hover:bg-muted transition-colors border border-border/40 select-all cursor-pointer"
                title="Click to copy phone number"
            >
                <Phone className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="tabular-nums">{strVal}</span>
                {copied ? (
                    <CheckCheck className="h-3 w-3 text-emerald-500 ml-0.5" />
                ) : (
                    <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity ml-0.5" />
                )}
            </button>
        );
    }

    // 5. Email Addresses
    if (keyLower.includes("email")) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-foreground/90 max-w-[180px] truncate" title={strVal}>
                <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{strVal}</span>
            </span>
        );
    }

    // 6. Dates, Timestamps, and Booking Slots
    if (keyLower.includes("slot") || keyLower.includes("date") || keyLower.includes("time") || keyLower.includes("schedule")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium text-foreground/90 bg-muted/30 border border-border/40 whitespace-nowrap" title={strVal}>
                <Calendar className="h-3 w-3 text-sky-500/80 shrink-0" />
                <span className="tabular-nums">{strVal}</span>
            </span>
        );
    }

    // 7. Executive Summary / Long text fields
    if (keyLower.includes("summary") || keyLower.includes("notes") || keyLower.includes("overview") || strVal.length > 50) {
        return (
            <span
                className={`block max-w-[220px] lg:max-w-[280px] truncate text-xs text-foreground/80 hover:text-foreground transition-colors font-normal cursor-help ${className}`}
                title={strVal}
            >
                {strVal}
            </span>
        );
    }

    // 8. Arrays / Lists
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return <span className="text-muted-foreground/40 font-normal text-xs">—</span>;
        }
        return (
            <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
                {value.slice(0, 2).map((item, idx) => (
                    <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border/40 truncate max-w-[90px]">
                        {String(item)}
                    </span>
                ))}
                {value.length > 2 && (
                    <span className="text-[10px] text-muted-foreground font-semibold px-1 py-0.5 rounded bg-muted/50 border border-border/30">
                        +{value.length - 2}
                    </span>
                )}
            </div>
        );
    }

    // 9. Standard / Numeric text
    return (
        <span className={`text-xs font-medium text-foreground/90 max-w-[180px] truncate block ${className}`} title={strVal}>
            {strVal.replace(/_/g, " ")}
        </span>
    );
}

