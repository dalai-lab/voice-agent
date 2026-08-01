"use client";

import { Zap } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AutomationPage() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 bg-background text-foreground">
            <div className="pb-4 border-b border-border/40">
                <h1 className="text-xl font-bold tracking-tight text-foreground">Automation</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Automate your voice workflows and operational triggers</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Coming Soon</CardTitle>
                    <CardDescription>
                        Automation features are currently under development
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12">
                        <Zap className="w-16 h-16 mx-auto mb-6" />
                        <p className="text-lg mb-4">
                            We&apos;re working on powerful automation features to help you streamline your workflows.
                        </p>
                        <p>
                            Automate repetitive tasks, trigger actions based on events, and create intelligent workflow pipelines.
                        </p>
                        <p className="mt-4">
                            Check back soon for updates!
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
