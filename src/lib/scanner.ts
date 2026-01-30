import { supabase } from './supabase';

// Types
export interface Finding {
    id: string;
    check: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    details?: string;
    count?: number;
    wcagCriterion?: string;
    wcagName?: string;
    wcagLevel?: 'A' | 'AA' | 'AAA';
    wcagPrinciple?: string;
    pageUrl?: string;
    remediation?: string;
    impact?: string;
    elements?: string[];
    managerGuidance?: string;
    developerGuidance?: string;
}

export interface PdfCheckResult {
    url: string;
    filename: string;
    isAccessible: boolean;
    hasLangTag: boolean;
    hasMarkInfo: boolean;
    hasTitle: boolean;
    error?: string;
}

export interface VendorWarning {
    vendor: string;
    category: string;
    detectedVia: string;
    warning: string;
    action: string;
    vpatTemplateEmail: string;
}

export interface Summary {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    accessibilityScore?: number;
}

export interface PageResult {
    pageUrl: string;
    pageTitle?: string;
    accessibilityScore: number;
    findings: Finding[];
    summary: Summary;
}

export interface ScanResult {
    success: boolean;
    sessionId: string;
    summary: Summary;
    teaser: {
        topIssue: string;
        issueCount: number;
        accessibilityScore?: number;
    };
    pagesScanned?: number;
    pageResults?: PageResult[];
    pdfResults?: PdfCheckResult[];
    vendorWarnings?: VendorWarning[];
    error?: string;
    cached?: boolean;
}

export interface UnlockResult {
    success: boolean;
    findings?: Finding[];
    summary?: Summary;
    websiteUrl?: string;
    reportSent?: boolean;
    pageResults?: PageResult[];
    pdfResults?: PdfCheckResult[];
    vendorWarnings?: VendorWarning[];
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
export async function startScan(websiteUrl: string, userId?: string): Promise<ScanResult> {
    const sessionId = resetSession(); // New session for each scan

    const { data, error } = await supabase.functions.invoke('scan-website', {
        body: { websiteUrl, sessionId, userId },
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

// Get WCAG level badge class
export function getWcagLevelClass(level: string): string {
    switch (level) {
        case 'A':
            return 'bg-emerald-100 text-emerald-800';
        case 'AA':
            return 'bg-violet-100 text-violet-800';
        case 'AAA':
            return 'bg-indigo-100 text-indigo-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Get accessibility score color
export function getScoreColor(score: number): string {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
}

export function getScoreRingColor(score: number): string {
    if (score >= 90) return 'border-green-500';
    if (score >= 70) return 'border-yellow-500';
    if (score >= 50) return 'border-orange-500';
    return 'border-red-500';
}

// Generate accessibility statement
export async function generateAccessibilityStatement(
    practiceName: string,
    contactEmail: string,
    contactPhone?: string,
    additionalNotes?: string,
): Promise<{ success: boolean; statement?: string; error?: string }> {
    const sessionId = localStorage.getItem(SESSION_KEY);

    if (!sessionId) {
        return { success: false, error: 'No scan found. Please run a scan first.' };
    }

    const { data, error } = await supabase.functions.invoke('generate-statement', {
        body: { sessionId, practiceName, contactEmail, contactPhone, additionalNotes },
    });

    if (error) {
        console.error('Statement generation error:', error);
        return { success: false, error: error.message || 'Failed to generate statement' };
    }

    return data as { success: boolean; statement?: string; error?: string };
}
