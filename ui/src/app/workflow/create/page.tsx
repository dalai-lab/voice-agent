'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createWorkflowFromTemplateApiV1WorkflowCreateTemplatePost } from '@/client/sdk.gen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

export default function CreateWorkflowPage() {
    const router = useRouter();
    const { user, getAccessToken } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [workflowId, setWorkflowId] = useState<string | null>(null);

    const [callType, setCallType] = useState<'inbound' | 'outbound'>('inbound');
    const [useCase, setUseCase] = useState('');
    const [activityDescription, setActivityDescription] = useState('');

    const handleCreateWorkflow = async () => {
        if (!useCase || !activityDescription) {
            setError('Please fill in all fields');
            return;
        }

        if (!user) {
            setError('You must be logged in to create a workflow');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const accessToken = await getAccessToken();

            // Call the API to create workflow from template
            const response = await createWorkflowFromTemplateApiV1WorkflowCreateTemplatePost({
                body: {
                    call_type: callType,
                    use_case: useCase,
                    activity_description: activityDescription,
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (response.data?.id) {
                setWorkflowId(String(response.data.id));
                setShowSuccessModal(true);
            }
        } catch (err) {
            setError('Failed to create workflow. Please try again.');
            logger.error(`Error creating workflow: ${err}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleModalContinue = () => {
        if (!workflowId) return;
        router.push(`/workflow/${workflowId}?onboarding=web_call`);
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center py-12 px-6">
            <div className="w-full max-w-lg space-y-8">
                {/* Header */}
                <div className="space-y-2 text-center sm:text-left">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Voice Agent</h1>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Tell us about your use case and we&apos;ll configure a customized voice agent for you.
                    </p>
                </div>

                {/* Form Body */}
                <div className="space-y-6 bg-card border border-border rounded-xl p-6 shadow-sm">
                    {/* Call Type Selector */}
                    <div className="space-y-2">
                        <Label htmlFor="call-type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Call Type</Label>
                        <Select value={callType} onValueChange={(value) => setCallType(value as 'inbound' | 'outbound')}>
                            <SelectTrigger id="call-type" className="h-9 rounded-lg border-border bg-background text-sm">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                                <SelectItem value="inbound" className="text-xs font-medium">
                                    Inbound (Users call AI)
                                </SelectItem>
                                <SelectItem value="outbound" className="text-xs font-medium">
                                    Outbound (AI calls users)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground/60">
                            Choose whether users will call your AI or your AI will call users.
                        </p>
                    </div>

                    {/* Use Case input */}
                    <div className="space-y-2">
                        <Label htmlFor="use-case" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Use Case</Label>
                        <Input
                            id="use-case"
                            placeholder="e.g., Lead Qualification, HR Screening, Customer Support"
                            value={useCase}
                            onChange={(e) => setUseCase(e.target.value)}
                            className="h-9 rounded-lg border-border bg-background text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground/60">
                            Describe the primary purpose of your voice agent.
                        </p>
                    </div>

                    {/* Activity Description textarea */}
                    <div className="space-y-2">
                        <Label htmlFor="activity-description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Activity Description</Label>
                        <Textarea
                            id="activity-description"
                            placeholder="Describe briefly what your voice agent will do (e.g., Qualify leads for real estate, Screen candidates for roles, Handle customer support). This will be a prompt to an LLM."
                            value={activityDescription}
                            onChange={(e) => setActivityDescription(e.target.value)}
                            className="min-h-[120px] rounded-lg border-border bg-background text-sm leading-relaxed"
                        />
                        <p className="text-[10px] text-muted-foreground/60">
                            This description will be used to generate the initial system prompt for your agent.
                        </p>
                    </div>

                    {error && (
                        <p className="text-xs text-destructive font-semibold">{error}</p>
                    )}

                    {/* Submit CTA */}
                    <div className="pt-2">
                        <Button
                            onClick={handleCreateWorkflow}
                            disabled={isLoading || !useCase || !activityDescription}
                            className="w-full h-9 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs transition-all cursor-pointer"
                        >
                            {isLoading ? 'Creating Agent...' : 'Create Agent'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs">
                    <div className="flex flex-col items-center space-y-4">
                        {/* Animated clean spinner */}
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-cta" />
                        <div className="text-center space-y-1">
                            <h3 className="text-sm font-bold text-foreground">Creating Your Agent</h3>
                            <p className="text-xs text-muted-foreground max-w-xs">
                                Designing and configuring your workspace. Just a moment...
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="sm:max-w-md rounded-xl bg-background border border-border shadow-lg p-6">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            Agent Created Successfully
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="mt-4 space-y-3 text-xs text-muted-foreground leading-relaxed">
                                <p>
                                    A customized voice agent workflow has been successfully generated for your use case with sample nodes.
                                </p>
                                <p>
                                    The agent is pre-set with default settings to communicate in English with a natural voice profile.
                                </p>
                                <p>
                                    Next, you can test the agent in the browser editor and modify prompts to suit your goals.
                                </p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6">
                        <Button
                            onClick={handleModalContinue}
                            className="w-full h-9 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs cursor-pointer"
                        >
                            Open and Test Agent
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
