import { Suspense } from 'react';

import { getWorkflowsApiV1WorkflowFetchGet, listFoldersApiV1FolderGet } from '@/client/sdk.gen';
import type { FolderResponse, WorkflowListResponse } from '@/client/types.gen';
import { Card, CardContent } from '@/components/ui/card';
import { CreateWorkflowButton } from "@/components/workflow/CreateWorkflowButton";
import { AgentFolderView } from '@/components/workflow/folders/AgentFolderView';
import { CreateFolderButton } from '@/components/workflow/folders/CreateFolderButton';
import { FolderSection } from '@/components/workflow/folders/FolderSection';
import { UploadWorkflowButton } from '@/components/workflow/UploadWorkflowButton';
import { getServerAccessToken, getServerAuthProvider } from '@/lib/auth/server';
import logger from '@/lib/logger';

import WorkflowLayout from "./WorkflowLayout";

export const dynamic = 'force-dynamic';

// Server component for workflow list
async function WorkflowList() {
    const authProvider = await getServerAuthProvider();
    const accessToken = await getServerAccessToken();

    if (!accessToken) {
        const { redirect } = await import('next/navigation');
        if (authProvider === 'stack') {
            redirect('/');
        } else {
            return (
                <div className="text-sm font-medium text-destructive/80 p-4 border border-destructive/20 rounded-lg bg-destructive/5 font-mono">
                    Authentication required. Please refresh the page.
                </div>
            );
        }
    }

    try {
        const response = await getWorkflowsApiV1WorkflowFetchGet({
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            query: {
                status: 'active,archived'
            }
        });

        const allWorkflowData = response.data ? (Array.isArray(response.data) ? response.data : [response.data]) : [];

        const activeWorkflows = allWorkflowData
            .filter((w: WorkflowListResponse) => w.status === 'active')
            .sort((a: WorkflowListResponse, b: WorkflowListResponse) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const archivedWorkflows = allWorkflowData
            .filter((w: WorkflowListResponse) => w.status === 'archived')
            .sort((a: WorkflowListResponse, b: WorkflowListResponse) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        let folders: FolderResponse[] = [];
        try {
            const foldersResponse = await listFoldersApiV1FolderGet({
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            folders = foldersResponse.data ?? [];
        } catch (folderErr) {
            logger.error(`Error fetching folders: ${folderErr}`);
        }

        return (
            <div className="space-y-8">
                {/* Active Workflows Section */}
                <div className="space-y-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/50">Active Workspace</h2>
                    {activeWorkflows.length > 0 || folders.length > 0 ? (
                        <AgentFolderView workflows={activeWorkflows} folders={folders} />
                    ) : (
                        <Card className="border border-dashed border-border/60 bg-muted/10">
                            <CardContent className="p-12 text-center text-sm text-muted-foreground">
                                No active workflows found. Create your first workflow to get started.
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Archived Section */}
                {archivedWorkflows.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-border/40">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/50">Archive</h2>
                        <FolderSection kind="archived" workflows={archivedWorkflows} />
                    </div>
                )}
            </div>
        );
    } catch (err) {
        logger.error(`Error fetching workflows: ${err}`);
        return (
            <div className="text-sm font-medium text-destructive/80 p-4 border border-destructive/20 rounded-lg bg-destructive/5 font-mono">
                Failed to load Workflows. Please Try Again Later.
            </div>
        );
    }
}

async function PageContent() {
    const workflowList = await WorkflowList();

    return (
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
                    <p className="text-sm text-muted-foreground">Manage and deploy your voice communication workflows</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <UploadWorkflowButton />
                    <CreateFolderButton />
                    <CreateWorkflowButton />
                </div>
            </div>

            {/* List */}
            <div>
                {workflowList}
            </div>
        </div>
    );
}

function WorkflowsLoading() {
    return (
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-border/40">
                <div className="space-y-2">
                    <div className="h-7 w-28 bg-muted rounded-md animate-pulse"></div>
                    <div className="h-4 w-64 bg-muted rounded-md animate-pulse"></div>
                </div>
                <div className="flex gap-2">
                    <div className="h-9 w-40 bg-muted rounded-md animate-pulse"></div>
                    <div className="h-9 w-28 bg-muted rounded-md animate-pulse"></div>
                    <div className="h-9 w-28 bg-muted rounded-md animate-pulse"></div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="h-4 w-32 bg-muted rounded-md animate-pulse"></div>
                <div className="h-40 bg-muted/40 rounded-xl border border-border/40 animate-pulse"></div>
            </div>
        </div>
    );
}

export default function WorkflowPage() {
    return (
        <WorkflowLayout showFeaturesNav={true}>
            <Suspense fallback={<WorkflowsLoading />}>
                <PageContent />
            </Suspense>
        </WorkflowLayout>
    );
}
