import { BaseEdge, type Edge, EdgeLabelRenderer, type EdgeProps, getSmoothStepPath, useReactFlow } from '@xyflow/react';
import { AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { useWorkflow, useWorkflowOptional } from "@/app/workflow/[workflowId]/contexts/WorkflowContext";
import { useWorkflowStore } from "@/app/workflow/[workflowId]/stores/workflowStore";
import { StaticTextWarning, TextOrAudioInput } from "@/components/flow/TextOrAudioInput";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { cn } from "@/lib/utils";

import { FlowEdge, FlowEdgeData, FlowNode } from '../types';
type CustomEdge = Edge<{ value: number }, 'custom'>;


interface EdgeDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data?: FlowEdgeData;
    onSave: (value: FlowEdgeData) => void;
}

const EdgeDetailsDialog = ({ open, onOpenChange, data, onSave }: EdgeDetailsDialogProps) => {
    const readOnly = useWorkflowOptional()?.readOnly ?? false;
    const { recordings } = useWorkflow();
    const [condition, setCondition] = useState(data?.condition ?? '');
    const [label, setLabel] = useState(data?.label ?? '');
    const [transitionSpeech, setTransitionSpeech] = useState(data?.transition_speech ?? '');
    const [transitionSpeechType, setTransitionSpeechType] = useState<'text' | 'audio'>(data?.transition_speech_type ?? 'text');
    const [transitionSpeechRecordingId, setTransitionSpeechRecordingId] = useState(data?.transition_speech_recording_id ?? '');

    // Update form state when data changes (e.g., from undo/redo)
    useEffect(() => {
        if (open) {
            setCondition(data?.condition ?? '');
            setLabel(data?.label ?? '');
            setTransitionSpeech(data?.transition_speech ?? '');
            setTransitionSpeechType(data?.transition_speech_type ?? 'text');
            setTransitionSpeechRecordingId(data?.transition_speech_recording_id ?? '');
        }
    }, [data, open]);

    const handleSave = useCallback(() => {
        onSave({
            condition,
            label,
            transition_speech: transitionSpeechType === 'text' ? (transitionSpeech || undefined) : undefined,
            transition_speech_type: transitionSpeechType,
            transition_speech_recording_id: transitionSpeechType === 'audio' ? (transitionSpeechRecordingId || undefined) : undefined,
        });
        onOpenChange(false);
    }, [condition, label, transitionSpeech, transitionSpeechType, transitionSpeechRecordingId, onSave, onOpenChange]);

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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-6">
                <DialogHeader className="border-b border-border pb-4">
                    <DialogTitle className="text-lg font-bold">Edit Condition</DialogTitle>
                    {data?.invalid && data.validationMessage && (
                        <div className="mt-2 flex items-center gap-2 rounded-md bg-red-50 p-2.5 text-xs text-red-500 border border-red-200">
                            <AlertCircle className="h-4 w-4" />
                            <span>{data.validationMessage}</span>
                        </div>
                    )}
                </DialogHeader>

                <div className="py-4 overflow-y-auto no-scrollbar flex-1">
                    <div className="grid grid-cols-12 gap-6 w-full">
                        {/* Main Controls (Left Column) */}
                        <div className="col-span-12 md:col-span-7 lg:col-span-8 flex flex-col gap-5">
                            {/* Condition Card */}
                            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col gap-2">
                                <Label className="font-bold text-sm">Condition</Label>
                                <Label className="text-xs text-muted-foreground">
                                    Describe a condition that will be evaluated to determine if this pathway should be taken
                                </Label>
                                <Textarea
                                    value={condition}
                                    onChange={(e) => setCondition(e.target.value)}
                                    className="min-h-[110px] font-mono text-xs leading-relaxed resize-y mt-2"
                                />
                            </div>

                            {/* Transition Speech Card */}
                            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col gap-2">
                                <Label className="font-bold text-sm">Transition Speech</Label>
                                <Label className="text-xs text-muted-foreground">
                                    Optional text or audio played right before transitioning to the next step
                                </Label>
                                <div className="mt-2">
                                    <TextOrAudioInput
                                        type={transitionSpeechType}
                                        onTypeChange={setTransitionSpeechType}
                                        recordingId={transitionSpeechRecordingId}
                                        onRecordingIdChange={setTransitionSpeechRecordingId}
                                        recordings={recordings ?? []}
                                    >
                                        <>
                                            <StaticTextWarning />
                                            <Textarea
                                                value={transitionSpeech}
                                                placeholder="e.g. Let me transfer you to our billing department..."
                                                onChange={(e) => setTransitionSpeech(e.target.value)}
                                                className="min-h-[90px] font-mono text-xs leading-relaxed resize-y mt-2"
                                            />
                                        </>
                                    </TextOrAudioInput>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Configuration (Right Column) */}
                        <div className="col-span-12 md:col-span-5 lg:col-span-4 flex flex-col gap-5">
                            <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-5.5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2.5">
                                    Parameters
                                </h4>
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                        <Label className="font-semibold text-xs text-foreground">Condition Label</Label>
                                        <Label className="text-[10px] text-muted-foreground leading-normal">
                                            Enter a short label to help identify this pathway in logs
                                        </Label>
                                        <Input
                                            type="text"
                                            value={label}
                                            maxLength={64}
                                            onChange={(e) => setLabel(e.target.value)}
                                            className="mt-1"
                                        />
                                        <div className="text-[10px] text-muted-foreground text-right mt-1 font-mono">
                                            {label.length}/64 characters
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t border-border pt-4 mt-2">
                    <div className="flex items-center gap-2 justify-end w-full">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={readOnly}>
                            {readOnly ? "Read Only" : "Save"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

interface CustomEdgeProps extends EdgeProps {
    data: FlowEdgeData;
}

export default function CustomEdge(props: CustomEdgeProps) {
    const { id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style, selected } = props;

    const { getEdges, setNodes } = useReactFlow<FlowNode, FlowEdge>();
    const { saveWorkflow } = useWorkflow();
    const updateEdge = useWorkflowStore((state) => state.updateEdge);
    const deleteEdge = useWorkflowStore((state) => state.deleteEdge);
    const [open, setOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const parallel = getEdges().filter(
        (e) =>
            (e.source === source && e.target === target) ||
            (e.source === target && e.target === source)
    );

    // 2) if there are two, sort by id and pick an index
    let offsetX = 0;
    let offsetY = 0;
    if (parallel.length > 1) {
        const sorted = parallel.slice().sort((a, b) => a.id.localeCompare(b.id));
        const idx = sorted.findIndex((e) => e.id === id);

        // first edge (idx 0) moves right & down;
        // second edge (idx 1) moves left & up
        if (idx === 0) {
            offsetX = 100;
            offsetY = 0;
        } else {
            offsetX = 0;
            offsetY = -50;
        }
    }

    // Check if this is a self-loop (source and target are the same node)
    const isSelfLoop = source === target;

    // 3) draw the edge path + get label coords
    // Use custom arc path for self-loops, smoothstep for regular edges
    let edgePath: string;
    let labelX: number;
    let labelY: number;

    if (isSelfLoop) {
        // Create a loop arc that goes out and around the node
        const loopRadius = 50;
        const loopOffsetX = 80;
        // Arc path: start from source, curve out and back to target
        edgePath = `M ${sourceX} ${sourceY}
                    C ${sourceX + loopOffsetX} ${sourceY - loopRadius},
                      ${targetX + loopOffsetX} ${targetY + loopRadius},
                      ${targetX} ${targetY}`;
        labelX = sourceX + loopOffsetX;
        labelY = sourceY;
    } else {
        // Use smoothstep path for orthogonal/elbow edges
        // borderRadius: 8 gives slightly rounded corners for a clean look
        // offset: 20 provides spacing before the first bend
        const [path, lx, ly] = getSmoothStepPath({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition,
            borderRadius: 8,
            offset: 20,
        });
        edgePath = path;
        labelX = lx;
        labelY = ly;
    }

    // Update connected nodes when edge is selected or hovered
    useEffect(() => {
        setNodes((nodes) => {
            return nodes.map((node) => {
                if (node.id === source || node.id === target) {
                    // Update both properties based on edge state
                    const shouldSelectThroughEdge = selected || false;
                    const shouldHoverThroughEdge = isHovered || false;

                    // Only update if state actually changed
                    if (
                        node.data.selected_through_edge !== shouldSelectThroughEdge ||
                        node.data.hovered_through_edge !== shouldHoverThroughEdge
                    ) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                selected_through_edge: shouldSelectThroughEdge,
                                hovered_through_edge: shouldHoverThroughEdge
                            }
                        };
                    }
                }
                return node;
            });
        });
    }, [selected, isHovered, source, target, setNodes]);

    const handleSaveEdgeData = useCallback(async (updatedData: FlowEdgeData) => {
        // Use the workflow store's updateEdge method to properly track history
        updateEdge(id, { data: updatedData });
        await saveWorkflow();
    }, [id, updateEdge, saveWorkflow]);

    const handleDeleteEdge = useCallback(() => {
        deleteEdge(id);
    }, [id, deleteEdge]);

    return (
        <>
            <g
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onDoubleClick={() => setOpen(true)}
            >
                <BaseEdge
                    id={id}
                    path={edgePath}
                    style={{
                        ...style,
                        stroke: selected
                            ? 'var(--cta)'  // brand crimson when selected
                            : isHovered
                                ? 'var(--cta)'  // brand crimson when hovered
                                : data?.invalid ? '#EF4444' : 'var(--muted-foreground)',
                        strokeWidth: selected ? 4 : isHovered ? 3.5 : 2.5,
                        filter: selected
                            ? 'drop-shadow(0 0 6px var(--ring))'
                            : 'none',
                        transition: 'stroke 0.2s ease, stroke-width 0.2s ease, filter 0.2s ease',
                    }}
                    interactionWidth={20}
                />
            </g>
            {/* Always show label, expand on select/hover */}
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        pointerEvents: 'all',
                        transformOrigin: 'center',
                        transform: `translate(-50%, -50%) translate(${labelX + offsetX}px, ${labelY + offsetY}px)`,
                        zIndex: 1000,
                    }}
                    className="nodrag nopan"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onDoubleClick={() => setOpen(true)}
                >
                    {/* Show full EdgeLabel when selected or hovered, otherwise show simple label */}
                    {(selected || isHovered) ? (
                        <div className={cn(
                            "flex flex-col gap-2 bg-card rounded-lg border min-w-[220px]",
                            "animate-in fade-in zoom-in duration-200",
                            data?.invalid
                                ? "border-destructive/50 shadow-md bg-destructive/[0.02]"
                                : selected
                                    ? "border-cta/50 ring-2 ring-cta/15 shadow-md"
                                    : "border-border shadow-md"
                        )}>
                            {/* Header with label */}
                            <div className={cn(
                                "flex items-center justify-between px-3 py-1.5 border-b text-[10px]",
                                data?.invalid ? "bg-destructive/10 border-destructive/30" : "bg-muted/50 border-border"
                            )}>
                                <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                                    Condition
                                </span>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 p-0 hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                                        onClick={handleDeleteEdge}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 p-0 hover:bg-muted text-muted-foreground"
                                        onClick={() => setOpen(true)}
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                            {/* Content */}
                            <div className="px-3 pb-3 pt-1">
                                <div className="text-xs font-semibold text-card-foreground break-words leading-relaxed">
                                    {data?.label || data?.condition || 'Click to set condition'}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Simple label shown by default - theme-aware flat rounded card */
                        <div className={cn(
                            "px-3.5 py-1.5 rounded-lg text-xs font-extrabold border shadow-xs transition-all duration-200 select-none",
                            data?.invalid
                                ? "bg-destructive/15 border-destructive/35 text-destructive"
                                : "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/80 dark:border-amber-800/60 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60"
                        )}>
                            {data?.label || data?.condition || 'No condition'}
                        </div>
                    )}
                </div>
            </EdgeLabelRenderer>
            <EdgeDetailsDialog
                open={open}
                onOpenChange={setOpen}
                data={data}
                onSave={handleSaveEdgeData}
            />
        </>
    );
}
