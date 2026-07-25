import { AlertCircle, ExternalLink } from "lucide-react";
import { ReactNode, useCallback, useEffect, useState } from "react";

import { useWorkflowOptional } from "@/app/workflow/[workflowId]/contexts/WorkflowContext";
import { FlowNodeData } from "@/components/flow/types";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface NodeEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nodeData: FlowNodeData;
    title: string;
    children: ReactNode;
    onSave?: () => void;
    error?: string | null;
    isDirty?: boolean;
    documentationUrl?: string;
}

export const NodeEditDialog = ({
    open,
    onOpenChange,
    nodeData,
    title,
    children,
    onSave,
    error,
    isDirty = false,
    documentationUrl,
}: NodeEditDialogProps) => {
    const readOnly = useWorkflowOptional()?.readOnly ?? false;
    const [showDiscardAlert, setShowDiscardAlert] = useState(false);

    const handleClose = () => onOpenChange(false);

    const handleSave = useCallback(() => {
        if (onSave) {
            onSave();
        }
    }, [onSave]);

    // Intercept dialog close attempts when dirty
    const handleOpenChange = useCallback((newOpen: boolean) => {
        // If trying to close and form is dirty, show confirmation
        if (!newOpen && isDirty) {
            setShowDiscardAlert(true);
            return;
        }
        onOpenChange(newOpen);
    }, [isDirty, onOpenChange]);

    // Handle confirmed discard
    const handleConfirmDiscard = useCallback(() => {
        setShowDiscardAlert(false);
        onOpenChange(false);
    }, [onOpenChange]);

    // Handle Cmd+S / Ctrl+S keyboard shortcut to save
    useEffect(() => {
        if (!open || readOnly) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                e.stopImmediatePropagation();
                handleSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [open, readOnly, handleSave]);

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent
                    className="w-[94vw] sm:max-w-5xl h-[88vh] max-h-[900px] bg-background border border-border rounded-xl p-0 gap-0 shadow-lg flex flex-col overflow-hidden"
                >
                    {/* Header Container */}
                    <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between shrink-0">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <DialogTitle className="text-base font-bold tracking-tight text-foreground">{title}</DialogTitle>
                                {isDirty && (
                                    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500 border border-amber-500/20">
                                        Unsaved changes
                                    </span>
                                )}
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Configure the settings and runtime prompts for this node in your workflow.
                            </DialogDescription>
                        </div>

                        <div className="flex items-center gap-4 pr-6">
                            {documentationUrl && (
                                <a
                                    href={documentationUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-semibold text-cta hover:text-cta/80 transition-colors"
                                >
                                    Docs
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Invalid State Alert Banner */}
                    {nodeData.invalid && nodeData.validationMessage && (
                        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20 font-medium shrink-0">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{nodeData.validationMessage}</span>
                        </div>
                    )}

                    {/* Form Content - Spacious Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                        {children}
                    </div>

                    {error && (
                        <div className="mx-6 mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20 font-medium shrink-0">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Footer Container */}
                    <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-end gap-3 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            className="px-4 h-9 text-xs rounded-lg font-medium"
                            onClick={isDirty ? () => setShowDiscardAlert(true) : handleClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            size="sm"
                            className="px-5 h-9 text-xs rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold transition-all cursor-pointer"
                            disabled={readOnly}
                        >
                            {readOnly ? "Read Only" : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Discard changes confirmation dialog */}
            <AlertDialog open={showDiscardAlert} onOpenChange={setShowDiscardAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Discard changes?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have unsaved changes. Are you sure you want to discard them?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep Editing</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDiscard}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Discard
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
