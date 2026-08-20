'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PhoneCall, HelpCircle, Sparkles, CheckCircle2, PhoneIncoming, PhoneOutgoing, ArrowRight } from 'lucide-react';

import { createWorkflowFromTemplateApiV1WorkflowCreateTemplatePost } from '@/client/sdk.gen';
import { Button } from '@/components/ui/button';
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
        <div className="flex-1 flex items-center justify-center py-12 px-6 bg-background text-foreground relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-orange-500/[0.02] rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-xl space-y-8 z-10">
                {/* Header */}
                <div className="space-y-3 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-500 text-xs font-semibold uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" /> Configure Voice Agent
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Create New Agent</h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Define your agent's communication direction, key objectives, and steps it should follow during customer calls.
                    </p>
                </div>

                {/* Form Body */}
                <div className="space-y-6 bg-card/60 border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md">
                    {/* Call Type Selector */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="call-type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Direction of Calls</Label>
                            <span className="text-[10px] text-zinc-500">Determines call routing</span>
                        </div>
                        <Select value={callType} onValueChange={(value) => setCallType(value as 'inbound' | 'outbound')}>
                            <SelectTrigger id="call-type" className="h-10 rounded-xl border-border bg-background text-sm focus:ring-orange-500/20 focus:border-orange-500">
                                <SelectValue placeholder="Select direction" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl bg-card border-border">
                                <SelectItem value="inbound" className="text-sm font-medium focus:bg-orange-500/10 focus:text-orange-500">
                                    <div className="flex items-center gap-2 py-0.5">
                                        <PhoneIncoming className="w-4 h-4 text-orange-500" />
                                        <span>Incoming (Customers call the AI)</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="outbound" className="text-sm font-medium focus:bg-orange-500/10 focus:text-orange-500">
                                    <div className="flex items-center gap-2 py-0.5">
                                        <PhoneOutgoing className="w-4 h-4 text-orange-500" />
                                        <span>Outgoing (AI initiates calls to customers)</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Use Case input */}
                    <div className="space-y-2">
                        <Label htmlFor="use-case" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Agent Objective</Label>
                        <Input
                            id="use-case"
                            placeholder="e.g. Booking Reservations, Customer Support, Lead Screening"
                            value={useCase}
                            onChange={(e) => setUseCase(e.target.value)}
                            className="h-10 rounded-xl border-border bg-background text-sm focus:ring-orange-500/20 focus:border-orange-500"
                        />
                        <p className="text-[10px] text-zinc-500 leading-normal">
                            Give your agent a clear, high-level business objective.
                        </p>
                    </div>

                    {/* Activity Description textarea */}
                    <div className="space-y-2">
                        <Label htmlFor="activity-description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detailed Agent Instructions / Script</Label>
                        <Textarea
                            id="activity-description"
                            placeholder="Detail what the agent should talk about. For example:&#10;1. Greet the customer and ask for their reservation date.&#10;2. Check available suites and read options.&#10;3. Collect guest name and send confirmation SMS."
                            value={activityDescription}
                            onChange={(e) => setActivityDescription(e.target.value)}
                            className="min-h-[140px] rounded-xl border-border bg-background text-sm leading-relaxed focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                        />
                        <p className="text-[10px] text-zinc-500 leading-normal">
                            Our platform uses these steps to configure the voice agent's conversational guide.
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
                            className="w-full h-11 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-95 text-white shadow-md shadow-orange-500/10 font-bold text-xs transition-all cursor-pointer"
                        >
                            {isLoading ? 'Configuring Agent...' : 'Generate Voice Agent'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center space-y-4">
                        {/* Animated clean spinner */}
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/5 border-t-orange-500" />
                        <div className="text-center space-y-1">
                            <h3 className="text-sm font-bold text-foreground">Generating Your Agent</h3>
                            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                                Designing and configuring your customized workspace setup...
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6">
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground border-b border-border/60 pb-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            Agent Created Successfully
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                                <p>
                                    A customized voice agent has been generated based on your business instructions.
                                </p>
                                <p>
                                    The agent is configured to speak in English with a natural voice profile.
                                </p>
                                <p>
                                    Next, you can test call the agent in the browser editor and refine its instructions.
                                </p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6">
                        <Button
                            onClick={handleModalContinue}
                            className="w-full h-10 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-95 text-white font-bold text-xs cursor-pointer shadow-md shadow-orange-500/10 flex items-center justify-center gap-1.5"
                        >
                            Open and Test Agent
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
