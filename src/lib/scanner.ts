import { supabase } from './supabase';

// Types
export interface Finding {
    id: string;
    check: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    details?: string;
    count?: number;
}

export interface Summary {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
}

export interface ScanResult {
    success: boolean;
    sessionId: string;
    summary: Summary;
    teaser: {
        topIssue: string;
        issueCount: number;
    };
    error?: string;
    cached?: boolean;
}

export interface UnlockResult {
    success: boolean;
    findings?: Finding[];
    summary?: Summary;
    websiteUrl?: string;
    reportSent?: boolean;
    error?: string;
}

// Session ID management
const SESSION_KEY = 'comply_scanner_session';

export function getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
}

export function resetSession(): string {
    const sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
    return sessionId;
}

// Start a website scan
export async function startScan(websiteUrl: string): Promise<ScanResult> {
    const sessionId = resetSession(); // New session for each scan

    const { data, error } = await supabase.functions.invoke('scan-website', {
        body: { websiteUrl, sessionId },
    });

    if (error) {
        console.error('Scan error:', error);
        return {
            success: false,
            sessionId,
            summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
            teaser: { topIssue: '', issueCount: 0 },
            error: error.message || 'Failed to scan website',
        };
    }

    return data as ScanResult;
}

// Unlock report with email
export async function unlockReport(email: string): Promise<UnlockResult> {
    const sessionId = localStorage.getItem(SESSION_KEY);

    if (!sessionId) {
        return {
            success: false,
            error: 'No scan found. Please run a scan first.',
        };
    }

    const { data, error } = await supabase.functions.invoke('unlock-report', {
        body: { sessionId, email },
    });

    if (error) {
        console.error('Unlock error:', error);
        return {
            success: false,
            error: error.message || 'Failed to unlock report',
        };
    }

    return data as UnlockResult;
}

// Get severity color for UI
export function getSeverityColor(severity: Finding['severity']): string {
    switch (severity) {
        case 'critical':
            return '#dc2626';
        case 'high':
            return '#ea580c';
        case 'medium':
            return '#ca8a04';
        case 'low':
            return '#2563eb';
        default:
            return '#6b7280';
    }
}

// Get severity background color for UI
export function getSeverityBgColor(severity: Finding['severity']): string {
    switch (severity) {
        case 'critical':
            return 'bg-red-100 text-red-800';
        case 'high':
            return 'bg-orange-100 text-orange-800';
        case 'medium':
            return 'bg-yellow-100 text-yellow-800';
        case 'low':
            return 'bg-blue-100 text-blue-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}
