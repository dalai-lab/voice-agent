"use client";

import { ExternalLink, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
    createToolApiV1ToolsPost,
    deleteToolApiV1ToolsToolUuidDelete,
    listToolsApiV1ToolsGet,
    unarchiveToolApiV1ToolsToolUuidUnarchivePost,
} from "@/client/sdk.gen";
import type { CreateToolRequest, ToolResponse } from "@/client/types.gen";
import { CredentialSelector } from "@/components/http";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { detailFromError } from "@/lib/apiError";
import { useAuth } from "@/lib/auth";

import {
    createMcpDefinition,
    createToolDefinition,
    getCategoryConfig,
    MCP_URL_PATTERN,
    renderToolIcon,
    TOOL_CATEGORIES,
    type ToolCategory,
} from "./config";

export default function ToolsPage() {
    const { user, getAccessToken, redirectToLogin, loading } = useAuth();
    const router = useRouter();

    const [tools, setTools] = useState<ToolResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newToolName, setNewToolName] = useState("");
    const [newToolDescription, setNewToolDescription] = useState("");
    const [newToolCategory, setNewToolCategory] = useState<ToolCategory>("http_api");
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);

    // MCP-specific create dialog state
    const [mcpUrl, setMcpUrl] = useState("");
    const [mcpCredentialUuid, setMcpCredentialUuid] = useState("");
    const [mcpToolsFilter, setMcpToolsFilter] = useState("");

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            redirectToLogin();
        }
    }, [loading, user, redirectToLogin]);

    const fetchTools = useCallback(async () => {
        if (loading || !user) return;

        try {
            setIsLoading(true);
            setError(null);
            const accessToken = await getAccessToken();

            const response = await listToolsApiV1ToolsGet({
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                query: {
                    status: "active,archived",
                },
            });

            if (response.data) {
                setTools(response.data);
            }
        } catch (err) {
            setError("Failed to fetch tools");
            console.error("Error fetching tools:", err);
        } finally {
            setIsLoading(false);
        }
    }, [loading, user, getAccessToken]);

    useEffect(() => {
        fetchTools();
    }, [fetchTools]);

    const handleCreateTool = async () => {
        if (!newToolName.trim()) {
            setCreateError("Please enter a name for the tool");
            return;
        }

        if (newToolCategory === "mcp" && !mcpUrl.trim()) {
            setCreateError("Please enter the MCP server URL");
            return;
        }

        if (newToolCategory === "mcp" && !MCP_URL_PATTERN.test(mcpUrl.trim())) {
            setCreateError("MCP server URL must start with http:// or https://");
            return;
        }

        try {
            setIsCreating(true);
            setCreateError(null);
            const accessToken = await getAccessToken();

            const categoryConfig = getCategoryConfig(newToolCategory);

            const definition = newToolCategory === "mcp"
                ? createMcpDefinition(mcpUrl, mcpCredentialUuid, mcpToolsFilter)
                : createToolDefinition(newToolCategory);

            const requestBody: CreateToolRequest = {
                name: newToolName,
                description: newToolDescription || undefined,
                category: newToolCategory as any,
                icon: categoryConfig?.iconName || "globe",
                icon_color: categoryConfig?.iconColor || "#3B82F6",
                definition,
            };

            const response = await createToolApiV1ToolsPost({
                body: requestBody,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (response.error) {
                setCreateError(detailFromError(response.error, "Failed to create tool"));
                return;
            }

            if (response.data) {
                setIsCreateDialogOpen(false);
                setNewToolName("");
                setNewToolDescription("");
                setNewToolCategory("http_api");
                setMcpUrl("");
                setMcpCredentialUuid("");
                setMcpToolsFilter("");
                // Navigate to the new tool's detail page
                router.push(`/tools/${response.data.tool_uuid}`);
            }
        } catch (err: unknown) {
            let errorMessage = "Failed to create tool";
            if (err && typeof err === "object") {
                const errObj = err as Record<string, unknown>;
                // Handle API client error response
                if (errObj.error && typeof errObj.error === "object") {
                    const errorData = errObj.error as Record<string, unknown>;
                    if (typeof errorData.detail === "string") {
                        errorMessage = errorData.detail;
                    }
                }
                // Handle standard Error objects
                else if (errObj.message && typeof errObj.message === "string") {
                    errorMessage = errObj.message;
                }
            }
            setCreateError(errorMessage);
            console.error("Error creating tool:", err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteTool = async (toolUuid: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to archive this tool?")) return;

        try {
            setError(null);
            const accessToken = await getAccessToken();

            await deleteToolApiV1ToolsToolUuidDelete({
                path: {
                    tool_uuid: toolUuid,
                },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            fetchTools();
        } catch (err) {
            setError("Failed to archive tool");
            console.error("Error archiving tool:", err);
        }
    };

    const handleUnarchiveTool = async (toolUuid: string, e: React.MouseEvent) => {
        e.stopPropagation();

        try {
            setError(null);
            const accessToken = await getAccessToken();

            await unarchiveToolApiV1ToolsToolUuidUnarchivePost({
                path: {
                    tool_uuid: toolUuid,
                },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            fetchTools();
        } catch (err) {
            setError("Failed to unarchive tool");
            console.error("Error unarchiving tool:", err);
        }
    };

    const filteredTools = tools.filter(
        (tool) =>
            tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeTools = filteredTools.filter((tool) => tool.status === "active");
    const archivedTools = filteredTools.filter((tool) => tool.status === "archived");

    const getCategoryBadge = (category: string) => {
        switch (category) {
            case "http_api":
                return <Badge variant="default">HTTP API</Badge>;
            case "end_call":
                return <Badge variant="destructive">End Call</Badge>;
            case "calculator":
                return <Badge variant="secondary">Calculator</Badge>;
            case "native":
                return <Badge variant="secondary">Native</Badge>;
            case "integration":
                return <Badge variant="outline">Integration</Badge>;
            case "mcp":
                return <Badge variant="outline">MCP</Badge>;
            default:
                return <Badge variant="outline">{category}</Badge>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return <Badge className="bg-green-500">Active</Badge>;
            case "draft":
                return <Badge variant="secondary">Draft</Badge>;
            case "archived":
                return <Badge variant="destructive">Archived</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (loading || !user) {
        return (
            <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6 bg-background">
                <div className="space-y-4">
                    <Skeleton className="h-10 w-64 rounded-lg" />
                    <Skeleton className="h-48 w-full rounded-xl animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 bg-background text-foreground">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/40">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">Tools</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Manage reusable tools that can be used across your workflows.{" "}
                        <a href="https://docs.dograh.com/voice-agent/tools/introduction" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline font-semibold text-foreground">
                            Learn more <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="h-9 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-xs font-semibold text-xs cursor-pointer">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create Tool
                </Button>
            </div>

            {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-semibold">
                    {error}
                </div>
            )}

            {/* Flat Search & List Container */}
            <div className="space-y-5">
                {/* Search Row */}
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                        placeholder="Search tools..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 rounded-lg border-border bg-background text-xs"
                    />
                </div>

                {/* List Body */}
                {isLoading ? (
                    <div className="grid gap-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />
                        ))}
                    </div>
                ) : activeTools.length === 0 && archivedTools.length === 0 ? (
                    <div className="flex items-center justify-center w-full py-12">
                        <div className="flex flex-col items-center justify-center text-center py-16 px-6 max-w-sm w-full border border-border bg-card rounded-xl shadow-xs">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/30 text-muted-foreground mb-4">
                                <Plus className="h-6 w-6" />
                            </div>
                            <h3 className="text-xs font-bold text-foreground tracking-tight mb-2 uppercase">No tools found</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                                {searchQuery ? "No tools match your search criteria." : "Create your first tool to get started."}
                            </p>
                            {!searchQuery && (
                                <Button onClick={() => setIsCreateDialogOpen(true)} className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs cursor-pointer">
                                    Create Your First Tool
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Active Tools Section */}
                        {activeTools.length > 0 && (
                            <div className="grid gap-3">
                                {activeTools.map((tool) => (
                                    <div
                                        key={tool.tool_uuid}
                                        className="flex items-center justify-between p-4 border border-border bg-card hover:bg-card/90 transition-all rounded-xl shadow-xs cursor-pointer group"
                                        onClick={() => router.push(`/tools/${tool.tool_uuid}`)}
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div
                                                className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-white"
                                                style={{
                                                    backgroundColor:
                                                        tool.icon_color || getCategoryConfig(tool.category as ToolCategory)?.iconColor || "#3B82F6",
                                                }}
                                            >
                                                {renderToolIcon(tool.category)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-sm text-foreground group-hover:text-cta transition-colors truncate">
                                                        {tool.name}
                                                    </span>
                                                    <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md border-border/60 bg-muted/40">
                                                        {tool.category === "http_api" ? "HTTP API" : tool.category}
                                                    </Badge>
                                                </div>
                                                {tool.description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-lg">
                                                        {tool.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => handleDeleteTool(tool.tool_uuid, e)}
                                            className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Archived Tools Section */}
                        {archivedTools.length > 0 && (
                            <div className="space-y-3 border-t border-border pt-6">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 pl-1">
                                    Archived Tools
                                </h3>
                                <div className="grid gap-3">
                                    {archivedTools.map((tool) => (
                                        <div
                                            key={tool.tool_uuid}
                                            className="flex items-center justify-between p-4 border border-border bg-card/65 hover:bg-card/80 transition-all rounded-xl shadow-xs cursor-pointer opacity-70 group"
                                            onClick={() => router.push(`/tools/${tool.tool_uuid}`)}
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div
                                                    className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-white/90"
                                                    style={{
                                                        backgroundColor:
                                                            tool.icon_color || getCategoryConfig(tool.category as ToolCategory)?.iconColor || "#3B82F6",
                                                    }}
                                                >
                                                    {renderToolIcon(tool.category)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-sm text-foreground truncate">
                                                            {tool.name}
                                                        </span>
                                                        <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md border-border/60 bg-muted/40">
                                                            {tool.category === "http_api" ? "HTTP API" : tool.category}
                                                        </Badge>
                                                        <Badge variant="destructive" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md">
                                                            Archived
                                                        </Badge>
                                                    </div>
                                                    {tool.description && (
                                                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-lg">
                                                            {tool.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => handleUnarchiveTool(tool.tool_uuid, e)}
                                                className="h-8 w-8 rounded-lg text-foreground hover:bg-muted"
                                                title="Restore tool"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Tool Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (open) {
                    setCreateError(null);
                } else {
                    setMcpUrl("");
                    setMcpCredentialUuid("");
                    setMcpToolsFilter("");
                }
            }}>
                <DialogContent className="max-w-md rounded-xl bg-background border border-border shadow-lg p-6">
                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-base font-bold text-foreground">Create New Tool</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Create a new tool that can be used in your workflows.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-foreground">Tool Type</Label>
                            <Select
                                value={newToolCategory}
                                onValueChange={(v) => {
                                    const category = v as ToolCategory;
                                    setNewToolCategory(category);
                                    setCreateError(null);
                                    const categoryConfig = getCategoryConfig(category);
                                    if (categoryConfig?.autoFill) {
                                        setNewToolName(categoryConfig.autoFill.name);
                                        setNewToolDescription(categoryConfig.autoFill.description);
                                    }
                                }}
                            >
                                <SelectTrigger className="h-9 rounded-lg border-border bg-background text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg text-xs">
                                    {TOOL_CATEGORIES.map((category) => (
                                        <SelectItem
                                            key={category.value}
                                            value={category.value}
                                            disabled={category.disabled}
                                            className="text-xs"
                                        >
                                            {category.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground/60 leading-normal">
                                {getCategoryConfig(newToolCategory)?.description}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-bold text-foreground">Tool Name</Label>
                            <Input
                                id="name"
                                value={newToolName}
                                onChange={(e) => setNewToolName(e.target.value)}
                                placeholder="e.g., Book Appointment, Check Inventory"
                                className="h-9 rounded-lg border-border bg-background text-xs"
                            />
                            <p className="text-[10px] text-muted-foreground/60 leading-normal">
                                Use a descriptive name, like &quot;Get Weather using API&quot; for a tool that fetches weather.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-xs font-bold text-foreground">Description (Optional)</Label>
                            <Input
                                id="description"
                                value={newToolDescription}
                                onChange={(e) => setNewToolDescription(e.target.value)}
                                placeholder="What does this tool do?"
                                className="h-9 rounded-lg border-border bg-background text-xs"
                            />
                            <p className="text-[10px] text-muted-foreground/60 leading-normal">
                                Provide a description which makes it easy for the agent to understand what this tool does.
                            </p>
                        </div>

                        {newToolCategory === "mcp" && (
                            <div className="space-y-4 pt-2 border-t border-border">
                                <div className="space-y-2">
                                    <Label htmlFor="mcp-url" className="text-xs font-bold text-foreground">MCP Server URL</Label>
                                    <Input
                                        id="mcp-url"
                                        value={mcpUrl}
                                        onChange={(e) => setMcpUrl(e.target.value)}
                                        placeholder="https://your-mcp-server.example.com/mcp"
                                        className="h-9 rounded-lg border-border bg-background text-xs"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-foreground">Transport</Label>
                                    <Input
                                        value="Streamable HTTP"
                                        disabled
                                        readOnly
                                        className="h-9 rounded-lg border-border bg-background text-xs"
                                    />
                                </div>
                                <CredentialSelector
                                    value={mcpCredentialUuid}
                                    onChange={setMcpCredentialUuid}
                                    label="Credential (Optional)"
                                    description="Select a credential for authenticating with the MCP server, or leave empty for no auth."
                                />
                                <div className="space-y-2">
                                    <Label htmlFor="mcp-tools-filter" className="text-xs font-bold text-foreground">Tools Filter (Optional)</Label>
                                    <Input
                                        id="mcp-tools-filter"
                                        value={mcpToolsFilter}
                                        onChange={(e) => setMcpToolsFilter(e.target.value)}
                                        placeholder="e.g., tool_one, tool_two"
                                        className="h-9 rounded-lg border-border bg-background text-xs"
                                    />
                                    <p className="text-[10px] text-muted-foreground/60 leading-normal">
                                        Comma-separated list of tool names to allow. Leave empty to expose all tools from the server.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    {createError && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs font-semibold">
                            {createError}
                        </div>
                    )}
                    <DialogFooter className="mt-6 gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateDialogOpen(false)}
                            className="h-9 px-4 rounded-lg text-xs font-semibold"
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleCreateTool} disabled={isCreating} className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs cursor-pointer">
                            {isCreating ? "Creating..." : "Create Tool"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
