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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
                    className="w-full max-w-xl bg-background border border-border/80 rounded-xl p-0 gap-0 shadow-lg"
                >
                    {/* Header Container */}
                    <div className="p-5 border-b border-border/40 space-y-2">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-sm font-bold tracking-tight text-foreground">{title}</DialogTitle>
                            {documentationUrl && (
                                <a
                                    href={documentationUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors pr-6"
                                >
                                    Docs
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            )}
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground/60">
                            Configure the settings for this node in your workflow.
                        </DialogDescription>
                        {nodeData.invalid && nodeData.validationMessage && (
                            <div className="mt-2 flex items-center gap-2 rounded-lg bg-destructive/5 p-2.5 text-xs text-destructive border border-destructive/20 font-medium">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>{nodeData.validationMessage}</span>
                            </div>
                        )}
                    </div>

                    {/* Form Content - Scrollable area */}
                    <div className="max-h-[55vh] overflow-y-auto p-5 space-y-4">
                        {children}
                    </div>

                    {error && (
                        <div className="mx-5 mb-4 flex items-center gap-2 rounded-lg bg-destructive/5 p-3 text-xs text-destructive border border-destructive/20 font-medium">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Footer Container */}
                    <div className="p-4 border-t border-border/40 bg-muted/10">
                        <div className="flex items-center justify-end gap-2.5">
                            <Button
                                variant="outline"
                                size="sm"
                                className="px-3.5"
                                onClick={isDirty ? () => setShowDiscardAlert(true) : handleClose}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleSave} size="sm" className="px-3.5" disabled={readOnly}>
                                {readOnly ? "Read Only" : "Save"}
                            </Button>
                        </div>
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
