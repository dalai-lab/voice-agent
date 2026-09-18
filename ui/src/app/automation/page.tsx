"use client";

import { Zap } from 'lucide-react';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrgConfig } from '@/context/OrgConfigContext';

export default function AutomationPage() {
    const router = useRouter();
    const { orgContext } = useOrgConfig();
    const dograhOrgId = orgContext?.organization_id;

    // Redirect Talkar customers away from automation page
    useEffect(() => {
        if (!dograhOrgId) return;
        const isAdminBypass = document.cookie.includes('talkar_admin_bypass=true');
        if (isAdminBypass) return;

        fetch(`/api/talkar/customers/status?dograh_org_id=${dograhOrgId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.status) {
                    router.replace('/overview');
                }
            })
            .catch(() => { /* fail open */ });
    }, [dograhOrgId, router]);

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
