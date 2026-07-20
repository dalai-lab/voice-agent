'use client';

import {
    Archive,
    Check,
    Folder as FolderIcon,
    FolderInput,
    Inbox,
    Play,
    Settings,
    MoreHorizontal,
    RotateCcw,
    Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
    moveWorkflowToFolderApiV1WorkflowWorkflowIdFolderPut,
    updateWorkflowStatusApiV1WorkflowWorkflowIdStatusPut,
} from '@/client/sdk.gen';
import type { FolderResponse } from '@/client/types.gen';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Workflow {
    id: number;
    name: string;
    status: string;
    created_at: string;
    total_runs?: number | null;
    folder_id?: number | null;
}

interface WorkflowTableProps {
    workflows: Workflow[];
    showArchived: boolean;
    folders?: FolderResponse[];
    currentFolderId?: number | null;
}

export function WorkflowTable({
    workflows,
    showArchived,
    folders,
    currentFolderId = null,
}: WorkflowTableProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [loadingWorkflowId, setLoadingWorkflowId] = useState<number | null>(null);
    const [movingWorkflowId, setMovingWorkflowId] = useState<number | null>(null);

    const handleEdit = (id: number) => {
        router.push(`/workflow/${id}`);
    };

    const handleArchiveToggle = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'archived' : 'active';
        const action = currentStatus === 'active' ? 'Archive' : 'Restore';

        setLoadingWorkflowId(id);

        try {
            const response = await updateWorkflowStatusApiV1WorkflowWorkflowIdStatusPut({
                path: { workflow_id: id },
                body: { status: newStatus },
            });

            if (response.data) {
                toast.success(`Workflow ${action.toLowerCase()}d successfully`);
                startTransition(() => {
                    router.refresh();
                });
            }
        } catch (error) {
            console.error(`Error ${action.toLowerCase()}ing workflow:`, error);
            toast.error(`Failed to ${action.toLowerCase()} workflow`);
        } finally {
            setLoadingWorkflowId(null);
        }
    };

    const handleMove = async (id: number, folderId: number | null) => {
        setMovingWorkflowId(id);
        try {
            const response = await moveWorkflowToFolderApiV1WorkflowWorkflowIdFolderPut({
                path: { workflow_id: id },
                body: { folder_id: folderId },
            });
            if (response.error) {
                throw new Error('Failed to move agent');
            }
            toast.success(
                folderId === null ? 'Moved to Uncategorized' : 'Agent moved',
            );
            startTransition(() => {
                router.refresh();
            });
        } catch (error) {
            console.error('Error moving workflow:', error);
            toast.error('Failed to move agent');
        } finally {
            setMovingWorkflowId(null);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((workflow) => (
                <Card 
                    key={workflow.id} 
                    className="relative flex flex-col justify-between p-5 border border-border/40 bg-card/40 hover:bg-card/75 transition-all duration-200 group rounded-xl hover:shadow-xs hover:border-border/80"
                >
                    {/* Top Row: Name and Actions */}
                    <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-4">
                            <span className="font-semibold tracking-tight text-foreground text-[15px] group-hover:text-cta transition-colors">
                                {workflow.name}
                            </span>
                            
                            <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        {folders && (
                                            <>
                                                <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Move Location</DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    disabled={currentFolderId === null}
                                                    onClick={() => handleMove(workflow.id, null)}
                                                >
                                                    <Inbox size={14} className="mr-2" />
                                                    Uncategorized
                                                    {currentFolderId === null && <Check size={14} className="ml-auto" />}
                                                </DropdownMenuItem>
                                                {folders.map((folder) => (
                                                    <DropdownMenuItem
                                                        key={folder.id}
                                                        disabled={folder.id === currentFolderId}
                                                        onClick={() => handleMove(workflow.id, folder.id)}
                                                    >
                                                        <FolderIcon size={14} className="mr-2" />
                                                        <span className="truncate">{folder.name}</span>
                                                        {folder.id === currentFolderId && <Check size={14} className="ml-auto" />}
                                                    </DropdownMenuItem>
                                                ))}
                                                <DropdownMenuSeparator />
                                            </>
                                        )}
                                        
                                        <DropdownMenuItem 
                                            onClick={() => handleArchiveToggle(workflow.id, workflow.status)}
                                            className={showArchived ? "" : "text-destructive focus:text-destructive"}
                                        >
                                            {showArchived ? (
                                                <>
                                                    <RotateCcw size={14} className="mr-2" />
                                                    Restore Agent
                                                </>
                                            ) : (
                                                <>
                                                    <Archive size={14} className="mr-2" />
                                                    Archive Agent
                                                </>
                                            )}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>ID: {workflow.id}</span>
                            <span>•</span>
                            <span>
                                {new Date(workflow.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </span>
                        </div>
                    </div>

                    {/* Bottom Row: Stats & Action */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/20">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Total Runs</span>
                            <span className="text-sm font-semibold text-foreground mt-0.5">{workflow.total_runs || 0}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                onClick={() => handleEdit(workflow.id)}
                            >
                                <Settings className="h-3.5 w-3.5" />
                                Configure
                            </Button>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
