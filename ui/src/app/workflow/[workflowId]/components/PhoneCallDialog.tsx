"use client";

import 'react-international-phone/style.css';

import { ChevronDown, ChevronRight, Info, Loader2, Phone, Search, Star, Clock, UserPlus, PhoneCall, CheckCircle2, AlertTriangle, PhoneForwarded } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useMemo } from "react";
import { PhoneInput } from 'react-international-phone';

import {
    getPreferencesApiV1OrganizationsPreferencesGet,
    initiateCallApiV1TelephonyInitiateCallPost,
    listPhoneNumbersApiV1OrganizationsTelephonyConfigsConfigIdPhoneNumbersGet,
    listTelephonyConfigurationsApiV1OrganizationsTelephonyConfigsGet,
    savePreferencesApiV1OrganizationsPreferencesPut,
} from '@/client/sdk.gen';
import type {
    OrganizationPreferences,
    PhoneNumberResponse,
    TelephonyConfigurationListItem,
} from '@/client/types.gen';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ContextVarInfo } from './workflow-tester/utils/scanContextVars';
import { ContextVarOverridePanel } from "./workflow-tester/ContextVarOverridePanel";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useUserConfig } from "@/context/UserConfigContext";
import { detailFromError } from "@/lib/apiError";

interface PhoneCallDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workflowId: number;
    user: { id: string; email?: string };
    defaultContextVars?: ContextVarInfo;
}

// Contacts Types
interface Contact {
    id: string;
    name: string;
    number: string;
    isSip: boolean;
    lastCalledAt?: number;
}

const STORAGE_KEY_CONTACTS = 'dograh_phone_contacts';
const STORAGE_KEY_RECENTS = 'dograh_phone_recents';

export const PhoneCallDialog = ({
    open,
    onOpenChange,
    workflowId,
    user,
    defaultContextVars,
}: PhoneCallDialogProps) => {
    const router = useRouter();
    const { refreshConfig } = useUserConfig();
    const [preferences, setPreferences] = useState<OrganizationPreferences>({});
    const [preferencesLoaded, setPreferencesLoaded] = useState(false);
    
    // Call Setup State
    const [phoneNumber, setPhoneNumber] = useState("");
    const [sipMode, setSipMode] = useState(false);
    const [phoneChanged, setPhoneChanged] = useState(false);
    
    // Telephony Config State
    const [checkingConfig, setCheckingConfig] = useState(false);
    const [needsConfiguration, setNeedsConfiguration] = useState<boolean | null>(null);
    const [telephonyConfigs, setTelephonyConfigs] = useState<TelephonyConfigurationListItem[]>([]);
    const [selectedConfigId, setSelectedConfigId] = useState<string>("");
    const [fromPhoneNumbers, setFromPhoneNumbers] = useState<PhoneNumberResponse[]>([]);
    const [selectedFromPhoneNumberId, setSelectedFromPhoneNumberId] = useState<string>("");
    const [loadingPhoneNumbers, setLoadingPhoneNumbers] = useState(false);
    
    // Call Execution State
    const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'success' | 'error'>('idle');
    const [callError, setCallError] = useState<string | null>(null);
    const [callSuccessMsg, setCallSuccessMsg] = useState<string | null>(null);

    // Contacts State
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [recentCalls, setRecentCalls] = useState<Contact[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    
    const [contactNameInput, setContactNameInput] = useState("");
    const [isSavingContact, setIsSavingContact] = useState(false);

    const [callVars, setCallVars] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open && defaultContextVars) {
            setCallVars(defaultContextVars.mergedVars);
        }
    }, [open, defaultContextVars]);

    // Load Contacts from localStorage
    useEffect(() => {
        if (open) {
            try {
                const storedContacts = localStorage.getItem(STORAGE_KEY_CONTACTS);
                if (storedContacts) {
                    setContacts(JSON.parse(storedContacts));
                }
                const storedRecents = localStorage.getItem(STORAGE_KEY_RECENTS);
                if (storedRecents) {
                    setRecentCalls(JSON.parse(storedRecents));
                }
            } catch (e) {
                console.error("Failed to parse contacts from localStorage", e);
            }
        }
    }, [open]);

    const saveToRecents = (number: string, isSip: boolean) => {
        try {
            const existingContact = contacts.find(c => c.number === number);
            const name = existingContact ? existingContact.name : 'Unknown';
            const newRecent: Contact = {
                id: Date.now().toString(),
                name,
                number,
                isSip,
                lastCalledAt: Date.now()
            };
            setRecentCalls(prev => {
                const filtered = prev.filter(c => c.number !== number);
                const updated = [newRecent, ...filtered].slice(0, 10); // Keep last 10
                localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(updated));
                return updated;
            });
        } catch (e) {
            console.error("Failed to save recent call", e);
        }
    };

    const handleSaveContact = () => {
        if (!contactNameInput.trim() || !phoneNumber.trim()) return;
        try {
            const newContact: Contact = {
                id: Date.now().toString(),
                name: contactNameInput.trim(),
                number: phoneNumber,
                isSip: sipMode,
            };
            setContacts(prev => {
                // If number already exists, update name
                const filtered = prev.filter(c => c.number !== phoneNumber);
                const updated = [newContact, ...filtered];
                localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(updated));
                return updated;
            });
            setIsSavingContact(false);
            setContactNameInput("");
        } catch (e) {
            console.error("Failed to save contact", e);
        }
    };

    const selectContact = (contact: Contact) => {
        setPhoneNumber(contact.number);
        setSipMode(contact.isSip);
        setPhoneChanged(contact.number !== (preferences.test_phone_number || ""));
        setCallStatus('idle');
    };

    const fetchPreferences = useCallback(async () => {
        const result =
            await getPreferencesApiV1OrganizationsPreferencesGet();
        if (result.error) {
            throw new Error(detailFromError(result.error, "Failed to load phone preferences"));
        }
        return result.data || {};
    }, []);

    const applyPreferences = useCallback((nextPreferences: OrganizationPreferences) => {
        const saved = nextPreferences.test_phone_number || "";
        setPreferences(nextPreferences);
        setPhoneNumber(prev => {
            if (!prev) {
                setSipMode(/^(PJSIP|SIP)\//i.test(saved));
                return saved;
            }
            return prev;
        });
        setPhoneChanged(false);
    }, []);

    // Check telephony configuration when dialog opens
    useEffect(() => {
        const checkConfig = async () => {
            if (!open) return;

            setCheckingConfig(true);
            try {
                const configResponse = await listTelephonyConfigurationsApiV1OrganizationsTelephonyConfigsGet({});

                const configurations = configResponse.data?.configurations ?? [];
                if (configResponse.error || configurations.length === 0) {
                    setNeedsConfiguration(true);
                    setTelephonyConfigs([]);
                    setSelectedConfigId("");
                } else {
                    setNeedsConfiguration(false);
                    setTelephonyConfigs(configurations);
                    const defaultConfig =
                        configurations.find((c) => c.is_default_outbound) ?? configurations[0];
                    setSelectedConfigId(String(defaultConfig.id));
                }
            } catch (err) {
                console.error("Failed to check telephony config:", err);
                setNeedsConfiguration(false);
                setTelephonyConfigs([]);
                setSelectedConfigId("");
            } finally {
                setCheckingConfig(false);
            }
        };

        checkConfig();
    }, [open]);

    // Load organization-scoped call preferences when dialog opens.
    useEffect(() => {
        if (!open) return;

        let cancelled = false;
        setPreferencesLoaded(false);

        const loadPreferences = async () => {
            try {
                const nextPreferences = await fetchPreferences();
                if (cancelled) return;
                applyPreferences(nextPreferences);
                setPreferencesLoaded(true);
            } catch (err) {
                if (cancelled) return;
                applyPreferences({});
                setPreferencesLoaded(false);
                setCallError(err instanceof Error ? err.message : "Failed to load phone preferences");
            }
        };

        loadPreferences();
        return () => {
            cancelled = true;
        };
    }, [applyPreferences, fetchPreferences, open]);

    // Reset state when dialog closes
    useEffect(() => {
        if (!open) {
            setCallStatus('idle');
            setCallError(null);
            setCallSuccessMsg(null);
            setNeedsConfiguration(null);
            setTelephonyConfigs([]);
            setSelectedConfigId("");
            setFromPhoneNumbers([]);
            setSelectedFromPhoneNumberId("");
            setPhoneNumber("");
            setSearchQuery("");
            setIsSavingContact(false);
        }
    }, [open]);

    // Fetch phone numbers whenever the selected telephony configuration changes.
    useEffect(() => {
        if (!open || !selectedConfigId) {
            setFromPhoneNumbers([]);
            setSelectedFromPhoneNumberId("");
            return;
        }

        let cancelled = false;
        const fetchPhoneNumbers = async () => {
            setLoadingPhoneNumbers(true);
            try {
                const response = await listPhoneNumbersApiV1OrganizationsTelephonyConfigsConfigIdPhoneNumbersGet({
                    path: { config_id: Number(selectedConfigId) },
                });
                if (cancelled) return;

                const all = response.data?.phone_numbers ?? [];
                const active = all.filter((p) => p.is_active);
                setFromPhoneNumbers(active);
                const defaultPhone = active.find((p) => p.is_default_caller_id) ?? active[0];
                setSelectedFromPhoneNumberId(defaultPhone ? String(defaultPhone.id) : "");
            } catch (err) {
                if (cancelled) return;
                console.error("Failed to load phone numbers for config:", err);
                setFromPhoneNumbers([]);
                setSelectedFromPhoneNumberId("");
            } finally {
                if (!cancelled) setLoadingPhoneNumbers(false);
            }
        };

        fetchPhoneNumbers();
        return () => {
            cancelled = true;
        };
    }, [open, selectedConfigId]);

    const handlePhoneInputChange = (formattedValue: string) => {
        setPhoneNumber(formattedValue);
        setPhoneChanged(formattedValue !== (preferences.test_phone_number || ""));
        if (callStatus !== 'idle') setCallStatus('idle');
        setIsSavingContact(false);
    };

    const handleConfigureContinue = () => {
        onOpenChange(false);
        router.push('/telephony-configurations');
    };

    const savePhoneNumberPreference = async () => {
        const currentPreferences = preferencesLoaded ? preferences : await fetchPreferences();
        const result =
            await savePreferencesApiV1OrganizationsPreferencesPut({
                body: {
                    ...currentPreferences,
                    test_phone_number: phoneNumber || null,
                },
            });

        if (result.error) {
            throw new Error(detailFromError(result.error, "Failed to save phone preferences"));
        }
        if (!result.data) {
            throw new Error("Failed to save phone preferences");
        }

        setPreferences(result.data);
        setPreferencesLoaded(true);
        setPhoneChanged(false);
        await refreshConfig();
    };

    const handleStartCall = async () => {
        setCallStatus('calling');
        setCallError(null);
        setCallSuccessMsg(null);
        try {
            if (!user) return;

            if (phoneChanged) {
                await savePhoneNumberPreference();
            }

            const response = await initiateCallApiV1TelephonyInitiateCallPost({
                body: {
                    workflow_id: workflowId,
                    phone_number: phoneNumber,
                    telephony_configuration_id: selectedConfigId ? Number(selectedConfigId) : null,
                    from_phone_number_id: selectedFromPhoneNumberId ? Number(selectedFromPhoneNumberId) : null,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    context_variables: Object.keys(callVars).length > 0 ? callVars : undefined,
                } as any,
            });

            if (response.error) {
                let errMsg = "Failed to initiate call";
                if (typeof response.error === "string") {
                    errMsg = response.error;
                } else if (response.error && typeof response.error === "object") {
                    errMsg = (response.error as unknown as { detail: string }).detail || JSON.stringify(response.error);
                }
                setCallError(errMsg);
                setCallStatus('error');
            } else {
                const msg = response.data && (response.data as unknown as { message: string }).message || "Call initiated successfully!";
                setCallSuccessMsg(typeof msg === "string" ? msg : JSON.stringify(msg));
                setCallStatus('success');
                saveToRecents(phoneNumber, sipMode);
            }
        } catch (err: unknown) {
            setCallError(err instanceof Error ? err.message : "Failed to initiate call");
            setCallStatus('error');
        }
    };

    // Filtered Contacts
    const filteredContacts = useMemo(() => {
        if (!searchQuery) return contacts;
        const q = searchQuery.toLowerCase();
        return contacts.filter(c => c.name.toLowerCase().includes(q) || c.number.toLowerCase().includes(q));
    }, [contacts, searchQuery]);

    const isCurrentNumberKnown = contacts.some(c => c.number === phoneNumber);

    const renderLoading = () => (
        <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm font-medium">Checking configurations...</p>
        </div>
    );

    const renderConfigurationNeeded = () => (
        <div className="flex flex-col items-center justify-center py-20 min-h-[400px] text-center px-6">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Telephony Not Configured</h2>
            <p className="text-muted-foreground mb-8 max-w-sm">
                Set up a telephony provider (like Twilio or Vonage) before making calls.
            </p>
            <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Do it Later
                </Button>
                <Button onClick={handleConfigureContinue}>
                    Configure Telephony
                </Button>
            </div>
        </div>
    );

    const renderCallStatus = () => (
        <div className="flex flex-col items-center justify-center h-full py-10 animation-in fade-in zoom-in-95 duration-300 min-h-[500px]">
            {callStatus === 'calling' && (
                <>
                    <div className="relative mb-6 mt-10">
                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                        <div className="relative bg-primary text-primary-foreground h-16 w-16 rounded-full flex items-center justify-center shadow-lg">
                            <PhoneForwarded className="h-7 w-7 animate-pulse" />
                        </div>
                    </div>
                    <h3 className="text-xl font-semibold">Calling...</h3>
                    <p className="text-muted-foreground mt-2 font-mono text-sm">{phoneNumber}</p>
                </>
            )}
            
            {callStatus === 'success' && (
                <>
                    <div className="bg-green-500 text-white h-16 w-16 rounded-full flex items-center justify-center shadow-lg mb-6 mt-10">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-green-600 dark:text-green-500">Ringing...</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm text-center text-sm">
                        {callSuccessMsg}
                    </p>
                    <p className="font-mono text-xs mt-4 bg-muted px-3 py-1.5 rounded-md text-muted-foreground border border-border/50">{phoneNumber}</p>
                    <div className="flex gap-3 mt-8">
                        <Button variant="outline" onClick={() => setCallStatus('idle')}>
                            Make another call
                        </Button>
                        <Button onClick={() => onOpenChange(false)}>
                            Done
                        </Button>
                    </div>
                </>
            )}

            {callStatus === 'error' && (
                <>
                    <div className="bg-destructive/10 text-destructive h-16 w-16 rounded-full flex items-center justify-center mb-6 mt-10">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-destructive">Call failed</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm text-center text-sm">
                        {callError}
                    </p>
                    <div className="flex gap-3 mt-8">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => setCallStatus('idle')}>
                            Try Again
                        </Button>
                    </div>
                </>
            )}
        </div>
    );

    const renderPhoneCallForm = () => (
        <div className="flex flex-col md:flex-row flex-1 min-h-0">
            {/* LEFT SIDEBAR: CONTACTS */}
            <div className="w-full md:w-[320px] border-r border-border/60 bg-muted/20 flex flex-col shrink-0">
                <div className="p-4 border-b border-border/60">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-foreground">
                        <UserPlus className="h-4 w-4" />
                        Contacts
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input 
                            placeholder="Search contacts..." 
                            className="pl-8 h-8 text-xs bg-background shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-4">
                    {/* Recent Calls */}
                    {!searchQuery && recentCalls.length > 0 && (
                        <div>
                            <div className="px-2 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mt-2">
                                <Clock className="h-3 w-3" /> Recent
                            </div>
                            <div className="space-y-1">
                                {recentCalls.slice(0, 3).map((contact) => (
                                    <button 
                                        key={contact.id} 
                                        onClick={() => selectContact(contact)}
                                        className="w-full text-left px-2 py-2 rounded-md hover:bg-muted/60 transition-colors flex flex-col gap-0.5 group"
                                    >
                                        <div className="text-xs font-medium group-hover:text-primary transition-colors">{contact.name}</div>
                                        <div className="text-[10px] text-muted-foreground font-mono">{contact.number}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Saved Contacts */}
                    <div>
                        <div className="px-2 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mt-2">
                            <Star className="h-3 w-3" /> Saved
                        </div>
                        {filteredContacts.length > 0 ? (
                            <div className="space-y-1">
                                {filteredContacts.map((contact) => (
                                    <button 
                                        key={contact.id} 
                                        onClick={() => selectContact(contact)}
                                        className="w-full text-left px-2 py-2 rounded-md hover:bg-muted/60 transition-colors flex flex-col gap-0.5 group"
                                    >
                                        <div className="text-xs font-medium group-hover:text-primary transition-colors">{contact.name}</div>
                                        <div className="text-[10px] text-muted-foreground font-mono flex justify-between items-center">
                                            {contact.number}
                                            {contact.isSip && <Badge variant="secondary" className="text-[8px] h-3 px-1 font-normal">SIP</Badge>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center px-4 py-8 text-xs text-muted-foreground bg-background/50 rounded-lg mx-2 mt-2 border border-dashed border-border/60">
                                {searchQuery ? "No contacts found." : "No saved contacts yet."}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT MAIN PANEL: CALL SETUP */}
            <div className="flex-1 flex flex-col relative bg-background">
                {callStatus !== 'idle' ? (
                    renderCallStatus()
                ) : (
                    <>
                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="mb-6">
                                <h2 className="flex items-center gap-2 text-xl font-semibold mb-1">
                                    <PhoneCall className="h-5 w-5 text-primary" />
                                    Test via Phone
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Call this workflow directly to test latency and voice quality.
                                </p>
                            </div>

                            <div className="space-y-6">
                                {/* Number Input Area */}
                                <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/50 shadow-sm">
                                    <Label className="text-sm font-semibold flex items-center justify-between">
                                        Destination Number
                                        {phoneNumber && !isCurrentNumberKnown && (
                                            <button 
                                                type="button"
                                                onClick={() => setIsSavingContact(!isSavingContact)}
                                                className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1"
                                            >
                                                <Star className="h-3 w-3" /> Save to contacts
                                            </button>
                                        )}
                                    </Label>
                                    
                                    <div className="flex flex-col gap-2">
                                        {sipMode ? (
                                            <Input
                                                value={phoneNumber}
                                                onChange={(e) => handlePhoneInputChange(e.target.value)}
                                                placeholder="PJSIP/1234 or SIP/1234"
                                                className="bg-background text-base h-11 shadow-sm"
                                            />
                                        ) : (
                                            <PhoneInput
                                                defaultCountry="in"
                                                value={phoneNumber}
                                                onChange={handlePhoneInputChange}
                                                inputClassName="!bg-background !text-foreground !text-base !h-11 !w-full shadow-sm !border-border"
                                                countrySelectorStyleProps={{ buttonClassName: "!bg-background !h-11 shadow-sm !border-border" }}
                                            />
                                        )}
                                        <div className="flex items-center justify-start">
                                            <button
                                                type="button"
                                                className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
                                                onClick={() => { setSipMode(!sipMode); setPhoneNumber(""); setPhoneChanged(true); }}
                                            >
                                                {sipMode ? "Use phone number instead" : "Use SIP endpoint instead"}
                                            </button>
                                        </div>

                                        {isSavingContact && (
                                            <div className="flex gap-2 items-center mt-2 p-2 bg-background rounded-md border border-border/60 animation-in slide-in-from-top-2">
                                                <Input 
                                                    placeholder="Enter contact name..." 
                                                    value={contactNameInput}
                                                    onChange={(e) => setContactNameInput(e.target.value)}
                                                    className="h-8 text-xs bg-background"
                                                />
                                                <Button size="sm" className="h-8 text-xs shrink-0" onClick={handleSaveContact} disabled={!contactNameInput.trim()}>
                                                    Save
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Telephony Config */}
                                <div className="grid grid-cols-2 gap-4">
                                    {telephonyConfigs.length > 0 && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="telephony-config" className="text-xs text-muted-foreground font-medium">Telephony Config</Label>
                                            <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                                                <SelectTrigger id="telephony-config" className="w-full h-9 text-xs bg-background">
                                                    <SelectValue placeholder="Select a configuration" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {telephonyConfigs.map((config) => (
                                                        <SelectItem key={config.id} value={String(config.id)} className="text-xs">
                                                            {config.name} ({config.provider})
                                                            {config.is_default_outbound ? " - default" : ""}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    {selectedConfigId && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="from-phone-number" className="text-xs text-muted-foreground font-medium">Caller ID</Label>
                                            {loadingPhoneNumbers ? (
                                                <div className="flex items-center text-xs text-muted-foreground h-9 border rounded-md px-3 bg-muted/30">
                                                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                                    Loading...
                                                </div>
                                            ) : fromPhoneNumbers.length > 0 ? (
                                                <Select
                                                    value={selectedFromPhoneNumberId}
                                                    onValueChange={setSelectedFromPhoneNumberId}
                                                >
                                                    <SelectTrigger id="from-phone-number" className="w-full h-9 text-xs bg-background">
                                                        <SelectValue placeholder="Select a phone number" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {fromPhoneNumbers.map((phone) => (
                                                            <SelectItem key={phone.id} value={String(phone.id)} className="text-xs">
                                                                {phone.label ? `${phone.label} - ${phone.address}` : phone.address}
                                                                {phone.is_default_caller_id ? " - default" : ""}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="flex items-center text-xs text-muted-foreground h-9 border border-dashed rounded-md px-3 bg-muted/10">
                                                    Provider auto-selects ID
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Context Variables Readonly Display */}
                                {defaultContextVars && (defaultContextVars.scannedKeys.length > 0 || defaultContextVars.savedKeys.length > 0) && (
                                    <div className="mt-6">
                                        <ContextVarOverridePanel 
                                            vars={callVars}
                                            onChange={setCallVars}
                                            scannedKeys={defaultContextVars.scannedKeys}
                                            savedKeys={defaultContextVars.savedKeys}
                                            disabled={false}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-border/60 bg-muted/10 flex items-center justify-between shrink-0">
                            <DialogClose asChild>
                                <Button variant="ghost" className="hover:bg-muted/50">Cancel</Button>
                            </DialogClose>
                            <Button
                                onClick={handleStartCall}
                                disabled={!phoneNumber || !selectedConfigId}
                                className="min-w-[140px] shadow-md shadow-primary/20"
                            >
                                <Phone className="h-4 w-4 mr-2" />
                                Start Call
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[90vw] sm:max-w-[1000px] md:max-w-[1200px] h-[90vh] p-0 overflow-hidden gap-0 rounded-xl flex flex-col [&>button]:hidden">
                <DialogTitle className="sr-only">Phone Call Test</DialogTitle>
                {checkingConfig || needsConfiguration === null
                    ? renderLoading()
                    : needsConfiguration
                        ? renderConfigurationNeeded()
                        : renderPhoneCallForm()
                }
            </DialogContent>
        </Dialog>
    );
};
