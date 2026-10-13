"use client";

import type { ReactFlowInstance } from "@xyflow/react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Info,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { NodeSpec } from "@/client/types.gen";
import {
  CodeEditorRef,
  CodeEditorSurface,
  formatJsonString,
  ParsedWorkflow,
  validateWorkflowJson,
  ValidationResult,
} from "@/components/code-editor";
import type { FlowEdge, FlowNode } from "@/components/flow/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { copyTextToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

export interface WorkflowCodeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: number | null;
  workflowName: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  rfInstance?: React.RefObject<ReactFlowInstance<FlowNode, FlowEdge> | null> | null;
  isViewingHistoricalVersion?: boolean;
  activeVersionLabel?: string;
  specs?: NodeSpec[];
  onApply: (parsed: ParsedWorkflow, autoLayout: boolean) => Promise<void> | void;
}

type EditorMode = "clean" | "full";

function cleanNodeForExport(node: FlowNode): Record<string, unknown> {
  const { id, type, position } = node;
  const rawData = (node.data || {}) as Record<string, unknown>;
  const cleanData: Record<string, unknown> = {};

  const omittedKeys = new Set([
    "invalid",
    "validationMessage",
    "selected_through_edge",
    "hovered_through_edge",
    "runtime_active",
  ]);

  for (const [key, val] of Object.entries(rawData)) {
    if (!omittedKeys.has(key)) {
      cleanData[key] = val;
    }
  }

  return {
    id,
    type: type || "agentNode",
    position: {
      x: Math.round(position?.x ?? 0),
      y: Math.round(position?.y ?? 0),
    },
    data: cleanData,
  };
}

function cleanEdgeForExport(edge: FlowEdge): Record<string, unknown> {
  const { id, source, target } = edge;
  const rawData = (edge.data || {}) as Record<string, unknown>;
  const cleanData: Record<string, unknown> = {};

  const omittedKeys = new Set(["invalid", "validationMessage"]);
  for (const [key, val] of Object.entries(rawData)) {
    if (!omittedKeys.has(key)) {
      cleanData[key] = val;
    }
  }

  const out: Record<string, unknown> = { id, source, target };
  if (Object.keys(cleanData).length > 0) {
    out.data = cleanData;
  }
  return out;
}

export function WorkflowCodeEditorDialog({
  open,
  onOpenChange,
  workflowId,
  workflowName,
  nodes,
  edges,
  rfInstance,
  isViewingHistoricalVersion = false,
  activeVersionLabel,
  specs = [],
  onApply,
}: WorkflowCodeEditorDialogProps) {
  const editorRef = useRef<CodeEditorRef>(null);

  const [mode, setMode] = useState<EditorMode>("clean");
  const [code, setCode] = useState<string>("");
  const [initialCode, setInitialCode] = useState<string>("");
  const [autoLayoutOnApply, setAutoLayoutOnApply] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [showDiscardAlert, setShowDiscardAlert] = useState<boolean>(false);
  const [isIssuesPanelOpen, setIsIssuesPanelOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [restoredFromDraft, setRestoredFromDraft] = useState<boolean>(false);

  const storageKey = workflowId
    ? `workflow_code_draft_${workflowId}`
    : "workflow_code_draft";

  // Helper to serialize workflow based on current mode
  const serializeWorkflow = useCallback(
    (targetMode: EditorMode): string => {
      if (targetMode === "clean") {
        const cleanNodes = nodes.map(cleanNodeForExport);
        const cleanEdges = edges.map(cleanEdgeForExport);
        const obj = { nodes: cleanNodes, edges: cleanEdges };
        return JSON.stringify(obj, null, 2);
      } else {
        const viewport = rfInstance?.current?.getViewport() || {
          x: 0,
          y: 0,
          zoom: 1,
        };
        const exportData = {
          name: workflowName,
          workflow_definition: {
            nodes,
            edges,
            viewport,
          },
        };
        return JSON.stringify(exportData, null, 2);
      }
    },
    [nodes, edges, rfInstance, workflowName]
  );

  // Initialize or re-sync editor content when dialog opens
  useEffect(() => {
    if (!open) return;

    const freshJson = serializeWorkflow(mode);
    setInitialCode(freshJson);

    // Check for draft recovery in sessionStorage
    let recovered = false;
    try {
      const savedDraft = sessionStorage.getItem(storageKey);
      if (savedDraft && savedDraft.trim() && savedDraft !== freshJson) {
        setCode(savedDraft);
        setRestoredFromDraft(true);
        recovered = true;
      }
    } catch {
      // Storage access blocked or unavailable
    }

    if (!recovered) {
      setCode(freshJson);
      setRestoredFromDraft(false);
    }
  }, [open, mode, serializeWorkflow, storageKey]);

  // Handle changes in editor buffer (with draft persistence)
  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      try {
        sessionStorage.setItem(storageKey, newCode);
      } catch {
        // Ignore quota/storage errors
      }
    },
    [storageKey]
  );

  // Validate the current code buffer in real-time
  const validationResult: ValidationResult = useMemo(() => {
    if (!code.trim()) {
      return {
        isValid: false,
        syntaxError: "Code editor is empty",
        issues: [
          {
            severity: "fatal",
            kind: "syntax",
            message: "Workflow definition cannot be empty",
          },
        ],
        parsedWorkflow: null,
      };
    }
    return validateWorkflowJson(code, specs);
  }, [code, specs]);

  const isDirty = useMemo(() => {
    return code !== initialCode && !isViewingHistoricalVersion;
  }, [code, initialCode, isViewingHistoricalVersion]);

  // Mode switcher handler
  const handleModeSwitch = (newMode: EditorMode) => {
    if (newMode === mode) return;

    if (isDirty) {
      toast.info(
        "Switched mode while keeping your unapplied changes. Prettify to reformat if needed."
      );
      setMode(newMode);
      return;
    }

    setMode(newMode);
    const fresh = serializeWorkflow(newMode);
    setCode(fresh);
    setInitialCode(fresh);
  };

  // Close interceptor with dirty guard
  const handleRequestClose = useCallback(
    (targetOpen: boolean) => {
      if (targetOpen) {
        onOpenChange(true);
        return;
      }

      if (isDirty) {
        setShowDiscardAlert(true);
      } else {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          // Ignore
        }
        onOpenChange(false);
      }
    },
    [isDirty, onOpenChange, storageKey]
  );

  const confirmDiscardChanges = useCallback(() => {
    setShowDiscardAlert(false);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
    onOpenChange(false);
  }, [onOpenChange, storageKey]);

  const discardDraft = useCallback(() => {
    const fresh = serializeWorkflow(mode);
    setCode(fresh);
    setInitialCode(fresh);
    setRestoredFromDraft(false);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
    toast.success("Draft discarded. Restored live canvas state.");
  }, [mode, serializeWorkflow, storageKey]);

  // Formatting action
  const handleFormat = useCallback(() => {
    const res = formatJsonString(code);
    if (res.error) {
      toast.error(`Cannot format: ${res.error}`);
    } else if (res.changed) {
      setCode(res.formatted);
      try {
        sessionStorage.setItem(storageKey, res.formatted);
      } catch {
        // Ignore
      }
      toast.success("Formatted JSON");
    } else {
      toast.info("JSON is already formatted");
    }
  }, [code, storageKey]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await copyTextToClipboard(code);
      setCopied(true);
      toast.success("Copied workflow JSON to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [code]);

  // Download workflow as .json file
  const handleDownload = useCallback(() => {
    const filename = `${(workflowName || "workflow").replace(/\s+/g, "_")}.json`;
    const blob = new Blob([code], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  }, [code, workflowName]);

  // Apply Changes action
  const handleApply = useCallback(async () => {
    if (!validationResult.isValid || !validationResult.parsedWorkflow) {
      toast.error("Cannot apply invalid workflow. Fix all errors first.");
      return;
    }
    if (isViewingHistoricalVersion) {
      toast.error("Cannot apply changes to a historical version.");
      return;
    }

    setIsApplying(true);
    try {
      await onApply(validationResult.parsedWorkflow, autoLayoutOnApply);
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // Ignore
      }
      toast.success("Workflow code applied to canvas successfully");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to apply workflow code"
      );
    } finally {
      setIsApplying(false);
    }
  }, [
    validationResult,
    isViewingHistoricalVersion,
    onApply,
    autoLayoutOnApply,
    storageKey,
    onOpenChange,
  ]);

  // Keyboard shortcut listener inside dialog: Cmd+S / Ctrl+S triggers Apply
  const handleDialogKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        e.stopPropagation();
        if (validationResult.isValid && !isViewingHistoricalVersion) {
          handleApply();
        }
      }
    },
    [handleApply, validationResult.isValid, isViewingHistoricalVersion]
  );

  const fatalIssues = useMemo(
    () => validationResult.issues.filter((i) => i.severity === "fatal"),
    [validationResult.issues]
  );
  const warningIssues = useMemo(
    () => validationResult.issues.filter((i) => i.severity === "warning"),
    [validationResult.issues]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleRequestClose}>
        <DialogContent
          className="sm:max-w-6xl max-w-6xl w-[92vw] h-[88vh] max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border-border/80 shadow-2xl"
          onKeyDown={handleDialogKeyDown}
        >
          {/* Header */}
          <DialogHeader className="px-6 py-3.5 border-b border-border/60 flex flex-row items-center justify-between gap-4 bg-muted/20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Wand2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-semibold truncate">
                    Workflow Code Editor
                  </DialogTitle>
                  {isViewingHistoricalVersion ? (
                    <Badge
                      variant="outline"
                      className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 text-[11px] font-medium"
                    >
                      Read-Only ({activeVersionLabel || "Historical"})
                    </Badge>
                  ) : isDirty ? (
                    <Badge
                      variant="outline"
                      className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-[11px] font-medium"
                    >
                      Unapplied Edits
                    </Badge>
                  ) : null}
                </div>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  Direct JSON inspection and editing for nodes, edges, and prompts.
                </DialogDescription>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Clean / Full Mode Toggle */}
              <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/50 text-xs">
                <button
                  type="button"
                  onClick={() => handleModeSwitch("clean")}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer",
                    mode === "clean"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Clean JSON
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch("full")}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer",
                    mode === "full"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Full Graph
                </button>
              </div>

              {/* Format button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
                      onClick={handleFormat}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="hidden sm:inline">Format</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Prettify JSON with 2-space indentation
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Copy button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">Copy</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Copy JSON to clipboard
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Download button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
                      onClick={handleDownload}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Download workflow as JSON file
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </DialogHeader>

          {/* Historical Alert Banner */}
          {isViewingHistoricalVersion && (
            <div className="px-6 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                You are viewing a historical version ({activeVersionLabel || "archived"}).
                Editing is disabled. Return to draft mode to apply changes.
              </span>
            </div>
          )}

          {/* Restored Draft Alert Banner */}
          {restoredFromDraft && (
            <div className="px-6 py-2 bg-blue-500/10 border-b border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>Restored an unapplied draft from your previous session.</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={discardDraft}
                className="h-6 px-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 cursor-pointer"
              >
                Discard Draft
              </Button>
            </div>
          )}

          {/* Editor Body */}
          <div className="flex-1 min-h-0 relative p-4 bg-muted/5 flex flex-col">
            <CodeEditorSurface
              ref={editorRef}
              value={code}
              onChange={handleCodeChange}
              readOnly={isViewingHistoricalVersion}
              height="100%"
              minHeight="100%"
              className="h-full border-border/70 shadow-xs"
            />
          </div>

          {/* Collapsible Error / Diagnostics Panel */}
          {validationResult.issues.length > 0 && (
            <Collapsible
              open={isIssuesPanelOpen}
              onOpenChange={setIsIssuesPanelOpen}
              className="border-t border-border/60 bg-muted/20"
            >
              <div className="px-6 py-2 flex items-center justify-between text-xs">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer font-medium"
                  >
                    {fatalIssues.length > 0 ? (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    )}
                    <span>
                      {fatalIssues.length > 0
                        ? `${fatalIssues.length} Error${fatalIssues.length > 1 ? "s" : ""}`
                        : ""}
                      {fatalIssues.length > 0 && warningIssues.length > 0
                        ? ", "
                        : ""}
                      {warningIssues.length > 0
                        ? `${warningIssues.length} Warning${warningIssues.length > 1 ? "s" : ""}`
                        : ""}
                    </span>
                    {isIssuesPanelOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 ml-1" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5 ml-1" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <span className="text-[11px] text-muted-foreground">
                  Click any issue to jump directly to its line in code
                </span>
              </div>

              <CollapsibleContent>
                <div className="max-h-40 overflow-y-auto px-6 py-2 border-t border-border/40 space-y-1.5 bg-background/50">
                  {validationResult.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        if (issue.line) {
                          editorRef.current?.jumpToLine(
                            issue.line,
                            issue.column || 1
                          );
                        }
                      }}
                      className="flex items-start gap-2.5 p-1.5 rounded hover:bg-muted/60 cursor-pointer text-xs transition-colors"
                    >
                      {issue.severity === "fatal" ? (
                        <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                        <span className="text-foreground font-medium truncate">
                          {issue.message}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {issue.line && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 font-mono"
                            >
                              L:{issue.line} C:{issue.column || 1}
                            </Badge>
                          )}
                          {issue.id && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 font-mono"
                            >
                              {issue.kind}: {issue.id}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Footer */}
          <DialogFooter className="px-6 py-3 border-t border-border/60 flex flex-row items-center justify-between gap-4 bg-muted/10">
            {/* Status indicator */}
            <div className="flex items-center gap-3">
              {validationResult.isValid ? (
                warningIssues.length > 0 ? (
                  <div className="flex items-center gap-1.5 text-xs text-yellow-500 font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Valid with {warningIssues.length} warning(s)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-green-500 font-medium">
                    <CheckCircle className="w-4 h-4" />
                    <span>Valid JSON & Graph Topology</span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    {fatalIssues.length} fatal error
                    {fatalIssues.length > 1 ? "s" : ""} blocking apply
                  </span>
                </div>
              )}

              {/* Auto-layout toggle */}
              {!isViewingHistoricalVersion && (
                <div className="hidden md:flex items-center gap-2 pl-4 border-l border-border/60">
                  <Switch
                    id="code-auto-layout"
                    checked={autoLayoutOnApply}
                    onCheckedChange={setAutoLayoutOnApply}
                    className="scale-75"
                  />
                  <Label
                    htmlFor="code-auto-layout"
                    className="text-xs text-muted-foreground font-normal cursor-pointer select-none"
                  >
                    Auto-layout nodes on apply
                  </Label>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRequestClose(false)}
                className="cursor-pointer"
              >
                {isViewingHistoricalVersion ? "Close" : "Cancel"}
              </Button>

              {!isViewingHistoricalVersion && (
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={!validationResult.isValid || isApplying}
                  className="gap-1.5 cursor-pointer"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Applying...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply Changes</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard confirmation alert dialog */}
      <AlertDialog open={showDiscardAlert} onOpenChange={setShowDiscardAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unapplied code changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have edited the workflow definition in the code editor. If you
              close now without applying, these edits will be discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDiscardChanges}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default WorkflowCodeEditorDialog;
