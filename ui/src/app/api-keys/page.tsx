"use client";

import { Copy, Eye, EyeOff, Key, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
    archiveApiKeyApiV1UserApiKeysApiKeyIdDelete,
    archiveServiceKeyApiV1UserServiceKeysServiceKeyIdDelete,
    createApiKeyApiV1UserApiKeysPost,
    createServiceKeyApiV1UserServiceKeysPost,
    getApiKeysApiV1UserApiKeysGet,
    getServiceKeysApiV1UserServiceKeysGet,
    reactivateApiKeyApiV1UserApiKeysApiKeyIdReactivatePut
} from '@/client/sdk.gen';
import type { ApiKeyResponse, CreateApiKeyResponse, CreateServiceKeyResponse,ServiceKeyResponse } from '@/client/types.gen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppConfig } from '@/context/AppConfigContext';
import { useOrganizationTimezone } from '@/hooks/useOrganizationTimezone';
import { useAuth } from '@/lib/auth';
import { copyTextToClipboard } from '@/lib/clipboard';
import { formatDateTime } from '@/lib/dateTime';
import logger from '@/lib/logger';

export default function APIKeysPage() {
    const { user, getAccessToken, redirectToLogin, loading } = useAuth();
    const { config } = useAppConfig();
    const organizationTimezone = useOrganizationTimezone();
    const isOSS = config?.deploymentMode === 'oss';

    logger.debug('[APIKeysPage] Component render', {
        loading,
        hasUser: !!user,
        userId: user?.id,
        timestamp: new Date().toISOString()
    });

    const [apiKeys, setApiKeys] = useState<ApiKeyResponse[]>([]);
    const [serviceKeys, setServiceKeys] = useState<ServiceKeyResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isServiceKeysLoading, setIsServiceKeysLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);
    const [showServiceArchived, setShowServiceArchived] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isCreateServiceDialogOpen, setIsCreateServiceDialogOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newServiceKeyName, setNewServiceKeyName] = useState('');
    const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(null);
    const [createdServiceKey, setCreatedServiceKey] = useState<CreateServiceKeyResponse | null>(null);
    const [showCreatedKeyDialog, setShowCreatedKeyDialog] = useState(false);
    const [showCreatedServiceKeyDialog, setShowCreatedServiceKeyDialog] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            redirectToLogin();
        }
    }, [loading, user, redirectToLogin]);

    const fetchApiKeys = useCallback(async () => {
        logger.debug('[APIKeysPage] fetchApiKeys called', {
            loading,
            hasUser: !!user,
            userId: user?.id
        });

        // Follow the pattern from UserConfigContext - check both loading and user
        if (loading || !user) {
            logger.debug('[APIKeysPage] fetchApiKeys - skipping due to loading or no user');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            logger.debug('[APIKeysPage] fetchApiKeys - calling getAccessToken...');
            const accessToken = await getAccessToken();
            logger.debug('[APIKeysPage] fetchApiKeys - got access token');

            const response = await getApiKeysApiV1UserApiKeysGet({
                query: {

                        include_archived: showArchived

                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            if (response.data) {
                setApiKeys(response.data);
            }
        } catch (err) {
            setError('Failed to fetch API keys');
            console.error('Error fetching API keys:', err);
        } finally {
            setIsLoading(false);
        }
    }, [loading, user, getAccessToken, showArchived]);

    const fetchServiceKeys = useCallback(async () => {
        logger.debug('[APIKeysPage] fetchServiceKeys called', {
            loading,
            hasUser: !!user,
            userId: user?.id
        });

        // Follow the pattern from UserConfigContext - check both loading and user
        if (loading || !user) {
            logger.debug('[APIKeysPage] fetchServiceKeys - skipping due to loading or no user');
            return;
        }

        try {
            setIsServiceKeysLoading(true);
            setError(null);
            logger.debug('[APIKeysPage] fetchServiceKeys - calling getAccessToken...');
            const accessToken = await getAccessToken();
            logger.debug('[APIKeysPage] fetchServiceKeys - got access token');

            const response = await getServiceKeysApiV1UserServiceKeysGet({
                query: {
                    include_archived: showServiceArchived
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            if (response.data) {
                setServiceKeys(response.data);
            }
        } catch (err) {
            setError('Failed to fetch service keys');
            console.error('Error fetching service keys:', err);
        } finally {
            setIsServiceKeysLoading(false);
        }
    }, [loading, user, getAccessToken, showServiceArchived]);

    useEffect(() => {
        logger.debug('[APIKeysPage] useEffect for fetchApiKeys triggered');
        fetchApiKeys();
    }, [fetchApiKeys]);

    useEffect(() => {
        logger.debug('[APIKeysPage] useEffect for fetchServiceKeys triggered');
        fetchServiceKeys();
    }, [fetchServiceKeys]);

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) {
            setError('Please enter a name for the API key');
            return;
        }

        try {
            setError(null);
            const accessToken = await getAccessToken();

            const response = await createApiKeyApiV1UserApiKeysPost({
                body: {
                    name: newKeyName
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            if (response.data) {
                setCreatedKey(response.data);
                setIsCreateDialogOpen(false);
                setShowCreatedKeyDialog(true);
                setNewKeyName('');
                fetchApiKeys();
            }
        } catch (err) {
            setError('Failed to create API key');
            console.error('Error creating API key:', err);
        }
    };

    const handleCreateServiceKey = async () => {
        if (!newServiceKeyName.trim()) {
            setError('Please enter a name for the service key');
            return;
        }

        try {
            setError(null);
            const accessToken = await getAccessToken();

            const response = await createServiceKeyApiV1UserServiceKeysPost({
                body: {
                    name: newServiceKeyName,
                    expires_in_days: 90
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            if (response.data) {
                setCreatedServiceKey(response.data);
                setIsCreateServiceDialogOpen(false);
                setShowCreatedServiceKeyDialog(true);
                setNewServiceKeyName('');
                fetchServiceKeys();
            }
        } catch (err) {
            setError('Failed to create service key');
            console.error('Error creating service key:', err);
        }
    };

    const handleArchiveKey = async (keyId: number) => {
        try {
            setError(null);
            const accessToken = await getAccessToken();

            await archiveApiKeyApiV1UserApiKeysApiKeyIdDelete({
                path: {
                    api_key_id: keyId
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            fetchApiKeys();
        } catch (err) {
            setError('Failed to archive API key');
            console.error('Error archiving API key:', err);
        }
    };

    const handleArchiveServiceKey = async (keyId: string) => {
        try {
            setError(null);
            const accessToken = await getAccessToken();

            await archiveServiceKeyApiV1UserServiceKeysServiceKeyIdDelete({
                path: {
                    service_key_id: keyId
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            fetchServiceKeys();
        } catch (err) {
            setError('Failed to archive service key');
            console.error('Error archiving service key:', err);
        }
    };

    const handleReactivateKey = async (keyId: number) => {
        try {
            setError(null);
            const accessToken = await getAccessToken();

            await reactivateApiKeyApiV1UserApiKeysApiKeyIdReactivatePut({
                path: {

                        api_key_id: keyId

                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            fetchApiKeys();
        } catch (err) {
            setError('Failed to reactivate API key');
            console.error('Error reactivating API key:', err);
        }
    };


    const copyToClipboard = async (text: string) => {
        try {
            await copyTextToClipboard(text);
            toast.success('Key copied to clipboard');
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            toast.error('Failed to copy key');
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        return formatDateTime(dateString, organizationTimezone);
    };

    // Don't render content until auth is loaded
    if (loading || !user) {
        return (
            <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6 bg-background">
                <div className="space-y-4">
                    <Skeleton className="h-10 w-64 rounded-lg" />
                    <Skeleton className="h-48 w-full rounded-xl animate-pulse" />
                </div>
            </div>
        );
    }

    // In OSS mode, check if there's already an active service key
    const activeServiceKeys = serviceKeys.filter(key => !key.archived_at);
    const canCreateServiceKey = !isOSS || activeServiceKeys.length === 0;
    const showServiceKeyArchiveControls = !isOSS;

    return (
        <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6 bg-background text-foreground">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Developer Portal</h1>
                    <p className="text-xs text-muted-foreground">Manage your API keys to access Dograh services programmatically</p>
                </div>
            </div>

            {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-semibold">
                    {error}
                </div>
            )}

            {/* API Keys Workspace Section */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
                    <div className="space-y-0.5">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">API Keys</h2>
                        <p className="text-xs text-muted-foreground">Create and manage API keys for your organization</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            className="h-8 text-xs font-semibold rounded-lg"
                            onClick={() => setShowArchived(!showArchived)}
                        >
                            {showArchived ? <Eye className="w-3.5 h-3.5 mr-1.5" /> : <EyeOff className="w-3.5 h-3.5 mr-1.5" />}
                            {showArchived ? 'Hide' : 'Show'} Archived
                        </Button>
                        <Button
                            onClick={() => setIsCreateDialogOpen(true)}
                            className="h-8 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Create Key
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid gap-3">
                        {[1, 2].map((i) => (
                            <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />
                        ))}
                    </div>
                ) : apiKeys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-12 px-6 max-w-sm mx-auto border border-border bg-card rounded-xl shadow-xs">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/30 text-muted-foreground mb-4">
                            <Key className="h-5 w-5" />
                        </div>
                        <h3 className="text-xs font-bold text-foreground tracking-tight mb-2 uppercase">No API keys found</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-6">Create an API key to configure programmatic access.</p>
                        <Button onClick={() => setIsCreateDialogOpen(true)} className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs cursor-pointer">
                            Create Your First API Key
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {apiKeys.map((key) => (
                            <div
                                key={key.id}
                                className={`flex items-center justify-between p-4 border border-border rounded-xl shadow-xs hover:bg-card/90 transition-all ${
                                    key.archived_at ? 'bg-muted/40 opacity-70' : 'bg-card'
                                }`}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <span className="font-bold text-sm text-foreground">{key.name}</span>
                                        {key.archived_at ? (
                                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md border-border/60 bg-muted/40">Archived</Badge>
                                        ) : key.is_active ? (
                                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
                                        ) : (
                                            <Badge variant="destructive" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md">Inactive</Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                        <span className="font-mono bg-muted/40 border border-border/60 px-1.5 py-0.5 rounded text-[10px] text-foreground">{key.key_prefix}...</span>
                                        <span className="text-[10px] text-muted-foreground/60 font-semibold">
                                            (Full key hidden for security)
                                        </span>
                                    </div>
                                    <div className="mt-2 text-[10px] text-muted-foreground/60 flex items-center gap-1">
                                        <span>Created: {formatDate(key.created_at)}</span>
                                        <span>•</span>
                                        <span>Last used: {formatDate(key.last_used_at ?? null)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    {key.archived_at ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs font-semibold rounded-lg"
                                            onClick={() => handleReactivateKey(key.id)}
                                        >
                                            <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                            Reactivate
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleArchiveKey(key.id)}
                                            className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Dograh Service Keys Section */}
            <div className="space-y-4 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
                    <div className="space-y-0.5">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Dograh Service Keys</h2>
                        <p className="text-xs text-muted-foreground">Manage service keys for accessing Dograh AI services (LLM, TTS, STT)</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {showServiceKeyArchiveControls && (
                            <Button
                                variant="outline"
                                className="h-8 text-xs font-semibold rounded-lg"
                                onClick={() => setShowServiceArchived(!showServiceArchived)}
                            >
                                {showServiceArchived ? <Eye className="w-3.5 h-3.5 mr-1.5" /> : <EyeOff className="w-3.5 h-3.5 mr-1.5" />}
                                {showServiceArchived ? 'Hide' : 'Show'} Archived
                            </Button>
                        )}
                        {canCreateServiceKey ? (
                            <Button
                                onClick={() => setIsCreateServiceDialogOpen(true)}
                                className="h-8 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Create Service Key
                            </Button>
                        ) : (
                            <span className="text-[10px] text-muted-foreground/60 leading-normal">
                                To generate additional service keys, <a href="https://app.dograh.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline font-bold">Sign up on app.dograh.com</a>
                            </span>
                        )}
                    </div>
                </div>

                {isServiceKeysLoading ? (
                    <div className="grid gap-3">
                        {[1, 2].map((i) => (
                            <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />
                        ))}
                    </div>
                ) : serviceKeys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-12 px-6 max-w-sm mx-auto border border-border bg-card rounded-xl shadow-xs">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/30 text-muted-foreground mb-4">
                            <Key className="h-5 w-5" />
                        </div>
                        <h3 className="text-xs font-bold text-foreground tracking-tight mb-2 uppercase">No service keys found</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-6">Create a service key to authenticate AI model connections.</p>
                        {canCreateServiceKey && (
                            <Button onClick={() => setIsCreateServiceDialogOpen(true)} className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs cursor-pointer">
                                Create Your First Service Key
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {serviceKeys.map((key) => (
                            <div
                                key={key.id}
                                className={`flex items-center justify-between p-4 border border-border rounded-xl shadow-xs hover:bg-card/90 transition-all ${
                                    key.archived_at ? 'bg-muted/40 opacity-70' : 'bg-card'
                                }`}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <span className="font-bold text-sm text-foreground">{key.name}</span>
                                        {key.archived_at ? (
                                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md border-border/60 bg-muted/40">Archived</Badge>
                                        ) : key.is_active ? (
                                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
                                        ) : (
                                            <Badge variant="destructive" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md">Inactive</Badge>
                                        )}
                                        {key.expires_at && new Date(key.expires_at) > new Date() && (
                                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md border-border/60 bg-muted/40">
                                                Expires: {formatDate(key.expires_at)}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                        <span className="font-mono bg-muted/40 border border-border/60 px-1.5 py-0.5 rounded text-[10px] text-foreground">{key.key_prefix}...</span>
                                        <span className="text-[10px] text-muted-foreground/60 font-semibold">
                                            (Full key hidden for security)
                                        </span>
                                    </div>
                                    <div className="mt-2 text-[10px] text-muted-foreground/60 flex items-center gap-1">
                                        <span>Created: {formatDate(key.created_at)}</span>
                                        <span>•</span>
                                        <span>Last used: {formatDate(key.last_used_at ?? null)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    {!key.archived_at && showServiceKeyArchiveControls && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleArchiveServiceKey(String(key.id))}
                                            className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Warning Banner */}
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-amber-900 dark:text-amber-200">
                <div className="space-y-1 text-xs">
                    <p className="font-bold">Important Security Notice</p>
                    <p className="leading-relaxed text-muted-foreground">
                        Keep your API keys secure. Never share them publicly or commit them to version control.
                        API keys provide full access to your organization&apos;s resources.
                    </p>
                </div>
            </div>

            {/* Create API Key Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-w-md rounded-xl bg-background border border-border shadow-lg p-6">
                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-base font-bold text-foreground">Create New API Key</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Enter a descriptive name for your API key to help you identify it later.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-3">
                        <Label htmlFor="name" className="text-xs font-bold text-foreground">Key Name</Label>
                        <Input
                            id="name"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="e.g., Production Server, Development Environment"
                            className="h-9 rounded-lg border-border bg-background text-xs"
                        />
                    </div>
                    <DialogFooter className="mt-4 gap-3">
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="h-9 px-4 rounded-lg text-xs font-semibold">
                            Cancel
                        </Button>
                        <Button onClick={handleCreateKey} className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs cursor-pointer">
                            Create Key
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Show Created Key Dialog */}
            <Dialog open={showCreatedKeyDialog} onOpenChange={setShowCreatedKeyDialog}>
                <DialogContent className="max-w-md rounded-xl bg-background border border-border shadow-lg p-6">
                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-base font-bold text-foreground">API Key Created Successfully</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Make sure to copy your API key now. You won&apos;t be able to see it again!
                        </DialogDescription>
                    </DialogHeader>
                    {createdKey && (
                        <div className="space-y-4 py-2">
                            <div className="p-4 bg-muted rounded-lg space-y-2 border border-border/50">
                                <p className="text-xs font-bold text-foreground">Your API Key:</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-2 bg-background rounded text-xs font-mono break-all border border-border/40">
                                        {createdKey.api_key}
                                    </code>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 rounded-lg"
                                        onClick={() => copyToClipboard(createdKey.api_key)}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-900 dark:text-amber-200">
                                <p className="leading-relaxed">
                                    Store this key securely. It will only be shown once and cannot be retrieved later.
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="mt-4">
                        <Button onClick={() => {
                            setShowCreatedKeyDialog(false);
                            setCreatedKey(null);
                        }} className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs w-full cursor-pointer">
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Service Key Dialog */}
            <Dialog open={isCreateServiceDialogOpen} onOpenChange={setIsCreateServiceDialogOpen}>
                <DialogContent className="max-w-md rounded-xl bg-background border border-border shadow-lg p-6">
                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-base font-bold text-foreground">Create New Service Key</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Create a service key to access Dograh AI services (LLM, TTS, STT)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-3">
                        <Label htmlFor="service-name" className="text-xs font-bold text-foreground">Service Key Name</Label>
                        <Input
                            id="service-name"
                            value={newServiceKeyName}
                            onChange={(e) => setNewServiceKeyName(e.target.value)}
                            placeholder="e.g., Production AI Services, Development LLM Access"
                            className="h-9 rounded-lg border-border bg-background text-xs"
                        />
                    </div>
                    <DialogFooter className="mt-4 gap-3">
                        <Button variant="outline" onClick={() => setIsCreateServiceDialogOpen(false)} className="h-9 px-4 rounded-lg text-xs font-semibold">
                            Cancel
                        </Button>
                        <Button onClick={handleCreateServiceKey} className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs cursor-pointer">
                            Create Service Key
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Show Created Service Key Dialog */}
            <Dialog open={showCreatedServiceKeyDialog} onOpenChange={setShowCreatedServiceKeyDialog}>
                <DialogContent className="max-w-md rounded-xl bg-background border border-border shadow-lg p-6">
                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-base font-bold text-foreground">Service Key Created Successfully</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Make sure to copy your service key now. You won&apos;t be able to see it again!
                        </DialogDescription>
                    </DialogHeader>
                    {createdServiceKey && (
                        <div className="space-y-4 py-2">
                            <div className="p-4 bg-muted rounded-lg space-y-2 border border-border/50">
                                <p className="text-xs font-bold text-foreground">Your Service Key:</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-2 bg-background rounded text-xs font-mono break-all border border-border/40">
                                        {createdServiceKey.service_key}
                                    </code>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 rounded-lg"
                                        onClick={() => copyToClipboard(createdServiceKey.service_key)}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-900 dark:text-blue-200">
                                <p className="leading-relaxed">
                                    This key provides access to Dograh AI services including LLM, Text-to-Speech, and Speech-to-Text.
                                    {createdServiceKey.expires_at && (
                                        <span className="block mt-1">
                                            Expires on: {formatDate(createdServiceKey.expires_at)}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-900 dark:text-amber-200">
                                <p className="leading-relaxed">
                                    Store this key securely. It will only be shown once and cannot be retrieved later.
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="mt-4">
                        <Button onClick={() => {
                            setShowCreatedServiceKeyDialog(false);
                            setCreatedServiceKey(null);
                        }} className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs w-full cursor-pointer">
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
