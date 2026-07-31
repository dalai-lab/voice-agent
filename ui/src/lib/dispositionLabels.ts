/**
 * Utility to format raw technical call disposition codes, contact sources,
 * and system status strings into clean, business-friendly human readable labels.
 */

export interface DispositionBadgeConfig {
    label: string;
    variant: 'default' | 'success' | 'warning' | 'destructive' | 'info';
    className: string;
}

const DISPOSITION_MAP: Record<string, { label: string; className: string }> = {
    // Engine / Disconnect Reasons
    'user_hangup': { label: 'Customer Hung Up', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700 font-semibold' },
    'transfer_call': { label: 'Call Transferred', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/80 font-semibold' },
    'xfer': { label: 'Call Transferred', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/80 font-semibold' },
    'call_transferred': { label: 'Call Transferred', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/80 font-semibold' },
    'end_call_tool': { label: 'Completed by Agent', className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800/80 font-semibold' },
    'voicemail_detected': { label: 'Voicemail Reached', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/80 font-semibold' },
    'user_qualified': { label: 'Lead Qualified', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/80 font-semibold' },
    'user_disqualified': { label: 'Not Interested / Unqualified', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800/80 font-semibold' },
    'call_duration_exceeded': { label: 'Max Duration Reached', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/80 font-semibold' },
    'user_idle_max_duration_exceeded': { label: 'Idle Timeout', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/80 font-semibold' },
    'system_cancelled': { label: 'Call Cancelled', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700 font-semibold' },
    'system_connect_error': { label: 'Connection Error', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800/80 font-semibold' },
    'unexpected_error': { label: 'System Error', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800/80 font-semibold' },
    'pipeline_error': { label: 'Audio Engine Error', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800/80 font-semibold' },

    // Carrier / Telephony Statuses
    'completed': { label: 'Call Completed', className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800/80 font-semibold' },
    'initiated': { label: 'Initiating Call', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800/80 font-semibold' },
    'ringing': { label: 'Ringing Phone', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/80 font-semibold' },
    'in-progress': { label: 'Call In Progress', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/80 font-semibold' },
    'answered': { label: 'Call Answered', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/80 font-semibold' },
    'failed': { label: 'Call Failed', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800/80 font-semibold' },
    'busy': { label: 'Line Busy', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/80 font-semibold' },
    'no-answer': { label: 'No Answer', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700 font-semibold' },
    'canceled': { label: 'Call Cancelled', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700 font-semibold' },
    'error': { label: 'System Error', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800/80 font-semibold' },
    'dnc': { label: 'Do Not Call (DNC)', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800/80 font-semibold' },
    'unknown': { label: 'Call Completed', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700 font-semibold' },
};

/**
 * Converts a raw disposition string into a clean business label.
 */
export function formatDispositionLabel(disposition: string | null | undefined): string {
    if (!disposition) return 'Call Completed';

    const normalized = String(disposition).trim().toLowerCase();
    if (DISPOSITION_MAP[normalized]) {
        return DISPOSITION_MAP[normalized].label;
    }

    // Fallback: title case snake_case or kebab-case string
    return String(disposition)
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Returns label + badge CSS styling classes for a disposition.
 */
export function getDispositionBadge(disposition: string | null | undefined) {
    const normalized = String(disposition || '').trim().toLowerCase();
    const label = formatDispositionLabel(disposition);
    const className = DISPOSITION_MAP[normalized]?.className || 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700 font-semibold';

    return { label, className };
}

/**
 * Formats contact phone numbers / origins into business-friendly titles.
 */
export function formatContactOrigin(phoneOrSource: string | null | undefined): string {
    if (!phoneOrSource || phoneOrSource === 'Direct Web' || phoneOrSource === 'web') {
        return 'Web Testing Suite';
    }
    return phoneOrSource;
}
