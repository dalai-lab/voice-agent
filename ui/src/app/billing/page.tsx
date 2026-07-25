"use client";

import {
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    CreditCard,
    ExternalLink,
    RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { createMpsCreditPurchaseUrlApiV1OrganizationsUsageMpsCreditsPurchaseUrlPost, getBillingCreditsApiV1OrganizationsBillingCreditsGet } from "@/client/sdk.gen";
import type { MpsBillingCreditsResponse, MpsCreditLedgerEntryResponse } from "@/client/types.gen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useAppConfig } from "@/context/AppConfigContext";
import { useOrganizationTimezone } from "@/hooks/useOrganizationTimezone";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/dateTime";

const LEDGER_PAGE_SIZE = 50;

const formatCredits = (value: number | null | undefined) => (
    (value ?? 0).toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
    })
);

const formatAmount = (amountMinor?: number | null, currency?: string | null) => {
    if (amountMinor == null) {
        return "-";
    }

    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "USD",
    }).format(amountMinor / 100);
};

const metricLabels: Record<string, string> = {
    voice_minutes: "Voice usage",
    platform_usage: "Platform usage",
};

const formatTitleCase = (value: string | null | undefined) => (
    value ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "-"
);

const getLedgerEntryLabel = (entry: MpsCreditLedgerEntryResponse) => {
    if (entry.metric_code) {
        return metricLabels[entry.metric_code] ?? formatTitleCase(entry.metric_code);
    }

    if (entry.entry_type === "grant") {
        return "Credit grant";
    }

    if (entry.entry_type === "purchase") {
        return "Credit purchase";
    }

    return formatTitleCase(entry.entry_type);
};

const formatBillableQuantity = (entry: MpsCreditLedgerEntryResponse) => {
    if (entry.billable_quantity == null || !entry.quantity_unit) {
        return null;
    }

    const unit = entry.quantity_unit === "minute" ? "min" : entry.quantity_unit;
    return `${formatCredits(entry.billable_quantity)} ${unit}`;
};

const getRunHref = (entry: MpsCreditLedgerEntryResponse) => {
    if (!entry.workflow_id || !entry.workflow_run_id) {
        return null;
    }

    return `/workflow/${entry.workflow_id}/run/${entry.workflow_run_id}`;
};

const getPageFromSearchParams = (
    searchParams: { get: (name: string) => string | null },
) => {
    const pageParam = searchParams.get("page");
    const page = pageParam ? Number.parseInt(pageParam, 10) : 1;
    return Number.isFinite(page) && page > 0 ? page : 1;
};

export default function BillingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const auth = useAuth();
    const { config, loading: configLoading } = useAppConfig();
    const organizationTimezone = useOrganizationTimezone();
    const [credits, setCredits] = useState<MpsBillingCreditsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [currentPage, setCurrentPage] = useState(
        () => getPageFromSearchParams(searchParams),
    );

    const hasAppConfig = !configLoading && config !== null;
    const isOssMode = hasAppConfig && config.deploymentMode === "oss";
    const canPurchaseCredits = hasAppConfig && config.deploymentMode !== "oss";
    const totalQuota = credits?.total_quota ?? 0;
    const remainingCredits = credits?.remaining_credits ?? 0;
    const usedCredits = credits?.total_credits_used ?? 0;
    const usagePercent = totalQuota > 0 ? Math.min(100, Math.round((usedCredits / totalQuota) * 100)) : 0;

    const ledgerEntries = useMemo(() => credits?.ledger_entries ?? [], [credits?.ledger_entries]);
    const ledgerPage = credits?.page ?? currentPage;
    const ledgerTotalCount = credits?.total_count ?? ledgerEntries.length;
    const ledgerTotalPages = credits?.total_pages ?? 0;

    const fetchCredits = useCallback(async (
        page: number,
        { silent = false }: { silent?: boolean } = {},
    ) => {
        if (auth.loading) {
            return;
        }

        if (!auth.isAuthenticated) {
            setLoading(false);
            return;
        }

        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const response = await getBillingCreditsApiV1OrganizationsBillingCreditsGet({
                query: { page, limit: LEDGER_PAGE_SIZE },
            });

            if (response.error) {
                throw new Error("Failed to fetch billing credits");
            }

            setCredits(response.data ?? null);
        } catch (error) {
            console.error("Failed to fetch billing credits:", error);
            toast.error("Failed to fetch billing credits");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [auth.isAuthenticated, auth.loading]);

    useEffect(() => {
        const nextPage = getPageFromSearchParams(searchParams);
        setCurrentPage((previousPage) => (
            previousPage === nextPage ? previousPage : nextPage
        ));
    }, [searchParams]);

    useEffect(() => {
        fetchCredits(currentPage);
    }, [currentPage, fetchCredits]);

    const handleRefresh = () => {
        fetchCredits(currentPage, { silent: true });
    };

    const updateUrlPage = useCallback((page: number) => {
        const newParams = new URLSearchParams(searchParams.toString());
        if (page > 1) {
            newParams.set("page", page.toString());
        } else {
            newParams.delete("page");
        }

        const queryString = newParams.toString();
        router.push(queryString ? `/billing?${queryString}` : "/billing");
    }, [router, searchParams]);

    const handlePageChange = (page: number) => {
        const nextPage = Math.max(1, page);
        setCurrentPage(nextPage);
        updateUrlPage(nextPage);
    };

    const handlePurchaseCredits = async () => {
        if (!canPurchaseCredits) {
            return;
        }

        setPurchasing(true);
        try {
            const response = await createMpsCreditPurchaseUrlApiV1OrganizationsUsageMpsCreditsPurchaseUrlPost();
            const checkoutUrl = response.data?.checkout_url;
            if (!checkoutUrl) {
                throw new Error("Missing checkout URL");
            }
            window.location.href = checkoutUrl;
        } catch (error) {
            console.error("Failed to create credit purchase URL:", error);
            toast.error("Failed to open checkout");
            setPurchasing(false);
        }
    };

    if (loading || configLoading) {
        return (
            <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6 bg-background">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-40 rounded-lg animate-pulse" />
                    <Skeleton className="h-4 w-96 max-w-full rounded-md animate-pulse" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-32 rounded-xl animate-pulse" />
                    <Skeleton className="h-32 rounded-xl animate-pulse" />
                </div>
                <Skeleton className="h-64 rounded-xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6 bg-background text-foreground">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Billing</h1>
                    <p className="text-xs text-muted-foreground">
                        Credits, balance, and account usage for your organization.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-9 rounded-lg text-xs font-semibold" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    {canPurchaseCredits && (
                        <Button onClick={handlePurchaseCredits} className="h-9 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs cursor-pointer" disabled={purchasing}>
                            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                            {purchasing ? "Opening..." : "Add Credits"}
                        </Button>
                    )}
                </div>
            </div>

            {isOssMode && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-amber-900 dark:text-amber-200">
                    <div className="space-y-1 text-xs">
                        <p className="font-bold">Credit purchases are unavailable in OSS mode</p>
                        <p className="leading-relaxed text-muted-foreground">
                            You can&apos;t purchase credits from this self-hosted app. Sign up and
                            purchase credits at{" "}
                            <a
                                href="https://app.dograh.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold underline"
                            >
                                app.dograh.com
                                <ExternalLink className="h-3 w-3 inline ml-0.5" />
                            </a>
                            . Then add the generated service key in{" "}
                            <Link
                                href="/model-configurations"
                                className="font-bold underline"
                            >
                                Model Configurations
                            </Link>
                            . Usage for that service key is visible in app.dograh.com.
                        </p>
                    </div>
                </div>
            )}

            {/* Metrics cards grid */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs flex flex-col justify-between">
                    <div>
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                            {isOssMode ? "Credits remaining" : "Credit balance"}
                        </span>
                        <h3 className="flex items-center gap-2 text-2xl font-bold mt-1 text-foreground">
                            <CircleDollarSign className="h-5 w-5 text-muted-foreground/60" />
                            {formatCredits(remainingCredits)}
                        </h3>
                    </div>
                    <div className="mt-4">
                        <p className="text-[10px] text-muted-foreground/60 font-semibold">1 credit = 1 cent</p>
                    </div>
                </div>

                <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs flex flex-col justify-between">
                    <div>
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Credits used</span>
                        <h3 className="text-2xl font-bold mt-1 text-foreground">{formatCredits(usedCredits)}</h3>
                    </div>
                    <div className="mt-4">
                        <p className="text-[10px] text-muted-foreground/60 font-semibold">
                            {isOssMode ? "Current allocation usage" : "Total ledger debits"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Ledger or Credit Usage section */}
            {!isOssMode ? (
                <div className="space-y-4 pt-2">
                    <div className="border-b border-border/40 pb-2">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Credit Ledger</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Recent grants, purchases, and usage debits</p>
                    </div>

                    {ledgerEntries.length > 0 ? (
                        <div className="space-y-4">
                            {/* Flat Table container */}
                            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs w-full">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 border-b border-border/80">
                                            <TableHead className="font-bold text-xs text-foreground py-3">Date</TableHead>
                                            <TableHead className="font-bold text-xs text-foreground py-3">Activity</TableHead>
                                            <TableHead className="font-bold text-xs text-foreground py-3">Origin</TableHead>
                                            <TableHead className="font-bold text-xs text-foreground py-3">Run</TableHead>
                                            <TableHead className="font-bold text-xs text-foreground py-3 text-right">Delta</TableHead>
                                            <TableHead className="font-bold text-xs text-foreground py-3 text-right">Balance</TableHead>
                                            <TableHead className="font-bold text-xs text-foreground py-3 pr-6 text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ledgerEntries.map((entry) => {
                                            const delta = entry.credits_delta ?? 0;
                                            const runHref = getRunHref(entry);
                                            const billableQuantity = formatBillableQuantity(entry);
                                            return (
                                                <TableRow key={entry.id} className="hover:bg-muted/40 transition-colors border-b border-border/50">
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {formatDateTime(entry.created_at, organizationTimezone)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-xs text-foreground">{getLedgerEntryLabel(entry)}</span>
                                                            {billableQuantity && (
                                                                <span className="text-[10px] text-muted-foreground/60">{billableQuantity}</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {entry.origin ? (
                                                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md border-border/60 bg-muted/40 text-foreground">{formatTitleCase(entry.origin)}</Badge>
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {entry.workflow_run_id ? (
                                                            runHref ? (
                                                                <Link className="font-bold underline hover:text-foreground text-muted-foreground" href={runHref}>
                                                                    #{entry.workflow_run_id}
                                                                </Link>
                                                            ) : (
                                                                <span>#{entry.workflow_run_id}</span>
                                                            )
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </TableCell>
                                                    <TableCell className={`text-xs text-right font-bold ${delta >= 0 ? "text-green-600" : "text-destructive"}`}>
                                                        {delta >= 0 ? "+" : ""}
                                                        {formatCredits(delta)}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-right text-muted-foreground">{formatCredits(entry.balance_after)}</TableCell>
                                                    <TableCell className="text-xs text-right pr-6 font-bold text-foreground">
                                                        {formatAmount(entry.amount_minor, entry.amount_currency)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {ledgerTotalPages > 1 && (
                                <div className="flex items-center justify-between mt-6">
                                    <p className="text-xs text-muted-foreground">
                                        Page {ledgerPage} of {ledgerTotalPages} ({ledgerTotalCount} total entries)
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs font-semibold rounded-lg"
                                            onClick={() => handlePageChange(ledgerPage - 1)}
                                            disabled={ledgerPage <= 1 || loading || refreshing}
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-1" />
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs font-semibold rounded-lg"
                                            onClick={() => handlePageChange(ledgerPage + 1)}
                                            disabled={ledgerPage >= ledgerTotalPages || loading || refreshing}
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center py-16 px-6 max-w-sm mx-auto border border-border bg-card rounded-xl shadow-xs">
                            <p className="text-xs text-muted-foreground">No ledger entries yet</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4 pt-2">
                    <div className="border-b border-border/40 pb-2">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Credit Usage</h2>
                    </div>
                    <div className="border border-border bg-card rounded-xl p-5 shadow-xs space-y-4">
                        <Progress value={usagePercent} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                            <span>{usagePercent}% used</span>
                            <span>{formatCredits(remainingCredits)} of {formatCredits(totalQuota)} remaining</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
