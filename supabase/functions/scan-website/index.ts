import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const PAGESPEED_API_KEY = Deno.env.get("PAGESPEED_API_KEY");

// WCAG criterion mapping for Lighthouse audits
const WCAG_MAPPING: Record<string, { criterion: string; name: string; level: "A" | "AA" | "AAA"; principle: string }> = {
    "color-contrast": { criterion: "1.4.3", name: "Contrast (Minimum)", level: "AA", principle: "Perceivable" },
    "image-alt": { criterion: "1.1.1", name: "Non-text Content", level: "A", principle: "Perceivable" },
    "link-name": { criterion: "2.4.4", name: "Link Purpose (In Context)", level: "A", principle: "Operable" },
    "button-name": { criterion: "4.1.2", name: "Name, Role, Value", level: "A", principle: "Robust" },
    "input-image-alt": { criterion: "1.1.1", name: "Non-text Content", level: "A", principle: "Perceivable" },
    "label": { criterion: "1.3.1", name: "Info and Relationships", level: "A", principle: "Perceivable" },
    "html-has-lang": { criterion: "3.1.1", name: "Language of Page", level: "A", principle: "Understandable" },
    "html-lang-valid": { criterion: "3.1.1", name: "Language of Page", level: "A", principle: "Understandable" },
    "valid-lang": { criterion: "3.1.2", name: "Language of Parts", level: "AA", principle: "Understandable" },
    "meta-viewport": { criterion: "1.4.4", name: "Resize Text", level: "AA", principle: "Perceivable" },
    "document-title": { criterion: "2.4.2", name: "Page Titled", level: "A", principle: "Operable" },
    "heading-order": { criterion: "1.3.1", name: "Info and Relationships", level: "A", principle: "Perceivable" },
    "bypass": { criterion: "2.4.1", name: "Bypass Blocks", level: "A", principle: "Operable" },
    "frame-title": { criterion: "4.1.2", name: "Name, Role, Value", level: "A", principle: "Robust" },
    "aria-allowed-attr": { criterion: "4.1.2", name: "Name, Role, Value", level: "A", principle: "Robust" },
    "aria-hidden-body": { criterion: "4.1.2", name: "Name, Role, Value", level: "A", principle: "Robust" },
    "aria-hidden-focus": { criterion: "4.1.2", name: "Name, Role, Value", level: "A", principle: "Robust" },
    "aria-required-attr": { criterion: "4.1.2", name: "Name, Role, Value", level: "A", principle: "Robust" },
    "aria-required-children": { criterion: "4.1.2", name: "Name, Role, Value", level: "A", principle: "Robust" },
    "aria-required-parent": { criterion: "4.1.2", name: "Name, Role, Value", level: "A", principle: "Robust" },
    "aria-roles": { criterion: "4.1.2", name: "Name, Role, Value", level: "A", principle: "Robust" },
    "aria-valid-attr-value": { criterion: "4.1.2", name: "Name, Role, Value", level: "A", principle: "Robust" },
    "aria-valid-attr": { criterion: "4.1.2", name: "Name, Role, Value", level: "A", principle: "Robust" },
    "duplicate-id-aria": { criterion: "4.1.1", name: "Parsing", level: "A", principle: "Robust" },
    "form-field-multiple-labels": { criterion: "1.3.1", name: "Info and Relationships", level: "A", principle: "Perceivable" },
    "list": { criterion: "1.3.1", name: "Info and Relationships", level: "A", principle: "Perceivable" },
    "listitem": { criterion: "1.3.1", name: "Info and Relationships", level: "A", principle: "Perceivable" },
    "definition-list": { criterion: "1.3.1", name: "Info and Relationships", level: "A", principle: "Perceivable" },
    "dlitem": { criterion: "1.3.1", name: "Info and Relationships", level: "A", principle: "Perceivable" },
    "tabindex": { criterion: "2.4.3", name: "Focus Order", level: "A", principle: "Operable" },
    "accesskeys": { criterion: "2.4.1", name: "Bypass Blocks", level: "A", principle: "Operable" },
    "focus-traps": { criterion: "2.1.2", name: "No Keyboard Trap", level: "A", principle: "Operable" },
    "focusable-controls": { criterion: "2.1.1", name: "Keyboard", level: "A", principle: "Operable" },
    "interactive-element-affordance": { criterion: "2.4.7", name: "Focus Visible", level: "AA", principle: "Operable" },
    "logical-tab-order": { criterion: "2.4.3", name: "Focus Order", level: "A", principle: "Operable" },
    "managed-focus": { criterion: "2.4.3", name: "Focus Order", level: "A", principle: "Operable" },
    "offscreen-content-hidden": { criterion: "2.4.3", name: "Focus Order", level: "A", principle: "Operable" },
    "use-landmarks": { criterion: "1.3.1", name: "Info and Relationships", level: "A", principle: "Perceivable" },
    "visual-order-follows-dom": { criterion: "1.3.2", name: "Meaningful Sequence", level: "A", principle: "Perceivable" },
    "td-headers-attr": { criterion: "1.3.1", name: "Info and Relationships", level: "A", principle: "Perceivable" },
    "th-has-data-cells": { criterion: "1.3.1", name: "Info and Relationships", level: "A", principle: "Perceivable" },
    "video-caption": { criterion: "1.2.2", name: "Captions (Prerecorded)", level: "A", principle: "Perceivable" },
    "audio-caption": { criterion: "1.2.1", name: "Audio-only and Video-only", level: "A", principle: "Perceivable" },
    "object-alt": { criterion: "1.1.1", name: "Non-text Content", level: "A", principle: "Perceivable" },
    "target-size": { criterion: "2.5.5", name: "Target Size", level: "AAA", principle: "Operable" },
};

// Severity mapping based on Lighthouse score impact
function getSeverity(audit: LighthouseAudit): "critical" | "high" | "medium" | "low" {
    // Failed audits with high weight or many items are more severe
    if (audit.score === 0) {
        const itemCount = audit.details?.items?.length || 0;
        if (itemCount > 10) return "critical";
        if (itemCount > 5) return "high";
        return "medium";
    }
    if (audit.score !== null && audit.score < 0.5) return "high";
    if (audit.score !== null && audit.score < 0.9) return "medium";
    return "low";
}

// Types
interface Finding {
    id: string;
    check: string;
    severity: "critical" | "high" | "medium" | "low";
    message: string;
    details?: string;
    count?: number;
    wcagCriterion?: string;
    wcagName?: string;
    wcagLevel?: "A" | "AA" | "AAA";
    wcagPrinciple?: string;
    pageUrl?: string;
    remediation?: string;
    impact?: string;
    elements?: string[];
    managerGuidance?: string;
    developerGuidance?: string;
}

interface PdfCheckResult {
    url: string;
    filename: string;
    isAccessible: boolean;
    hasLangTag: boolean;
    hasMarkInfo: boolean;
    hasTitle: boolean;
    error?: string;
}

interface VendorWarning {
    vendor: string;
    category: string;
    detectedVia: string;
    warning: string;
    action: string;
    vpatTemplateEmail: string;
}

interface Summary {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    accessibilityScore?: number;
}

interface PageResult {
    pageUrl: string;
    pageTitle?: string;
    accessibilityScore: number;
    findings: Finding[];
    summary: Summary;
}

interface ScanResponse {
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

interface LighthouseAudit {
    id: string;
    title: string;
    description: string;
    score: number | null;
    scoreDisplayMode: string;
    details?: {
        items?: Array<{
            node?: {
                selector?: string;
                snippet?: string;
                explanation?: string;
            };
            [key: string]: unknown;
        }>;
        [key: string]: unknown;
    };
}

interface PageSpeedResponse {
    lighthouseResult?: {
        categories?: {
            accessibility?: {
                score: number;
            };
        };
        audits?: Record<string, LighthouseAudit>;
        finalUrl?: string;
    };
    error?: {
        message: string;
    };
}

// CORS headers
const allowedOrigins = [
    "https://getcomply.tech",
    "https://certifyada.vercel.app",
    "http://localhost:8080",
    "http://localhost:8081",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
    return {
        "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
}

// Rate limiting check
async function checkRateLimit(
    supabase: ReturnType<typeof createClient>,
    clientIp: string
): Promise<{ allowed: boolean; remaining: number }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
        .from("scan_results")
        .select("*", { count: "exact", head: true })
        .eq("client_ip", clientIp)
        .gte("created_at", oneHourAgo);

    if (error) {
        console.error("Rate limit check error:", error);
        return { allowed: true, remaining: 5 };
    }

    const scansInLastHour = count || 0;
    const limit = 50; // Increased for testing

    return {
        allowed: scansInLastHour < limit,
        remaining: Math.max(0, limit - scansInLastHour),
    };
}

// Check for cached scan of same URL
async function getCachedScan(
    supabase: ReturnType<typeof createClient>,
    websiteUrl: string
): Promise<{ sessionId: string; summary: Summary; findings: Finding[]; pageResults?: PageResult[] } | null> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from("scan_results")
        .select("session_id, summary, findings, page_results")
        .eq("website_url", websiteUrl)
        .gte("created_at", oneHourAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        return null;
    }

    return {
        sessionId: data.session_id,
        summary: data.summary as Summary,
        findings: data.findings as Finding[],
        pageResults: data.page_results as PageResult[] | undefined,
    };
}

// Normalize URL
function normalizeUrl(url: string): string {
    let normalized = url.trim().toLowerCase();
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
        normalized = "https://" + normalized;
    }
    normalized = normalized.replace(/\/$/, "");
    return normalized;
}

// Extract internal links from HTML for crawling
function extractInternalLinks(html: string, baseUrl: string): string[] {
    const links: Set<string> = new Set();
    const baseUrlObj = new URL(baseUrl);
    const baseDomain = baseUrlObj.hostname;

    // Extract href attributes
    const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
    let match;

    while ((match = hrefRegex.exec(html)) !== null) {
        try {
            const href = match[1];
            // Skip anchors, javascript, mailto, tel
            if (href.startsWith("#") || href.startsWith("javascript:") ||
                href.startsWith("mailto:") || href.startsWith("tel:")) {
                continue;
            }

            // Resolve relative URLs
            const absoluteUrl = new URL(href, baseUrl);

            // Only include same-domain links
            if (absoluteUrl.hostname === baseDomain) {
                // Normalize and add
                const normalized = absoluteUrl.origin + absoluteUrl.pathname.replace(/\/$/, "");
                links.add(normalized);
            }
        } catch {
            // Invalid URL, skip
        }
    }

    return Array.from(links);
}

// Prioritize healthcare-relevant pages
function prioritizePages(links: string[], baseUrl: string): string[] {
    const priorityPatterns = [
        /contact/i,
        /patient/i,
        /appointment/i,
        /schedule/i,
        /new-patient/i,
        /forms/i,
        /about/i,
        /services/i,
        /team/i,
        /staff/i,
        /doctors/i,
        /providers/i,
        /locations/i,
        /insurance/i,
        /billing/i,
        /portal/i,
    ];

    const prioritized: string[] = [];
    const others: string[] = [];

    for (const link of links) {
        if (link === baseUrl) continue; // Skip homepage, we already scan it

        const isPriority = priorityPatterns.some(pattern => pattern.test(link));
        if (isPriority) {
            prioritized.push(link);
        } else {
            others.push(link);
        }
    }

    // Return priority pages first, then others, limited to 3 (+ homepage = 4 total)
    return [...prioritized, ...others].slice(0, 3);
}

// Fetch HTML for link extraction
async function fetchHtml(url: string, timeoutMs = 8000): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "ComplyBot/2.0 (Accessibility Scanner; +https://getcomply.tech)",
                "Accept": "text/html,application/xhtml+xml",
            },
            redirect: "follow",
        });

        clearTimeout(timeoutId);
        return await response.text();
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Extract PDF links from HTML
function extractPdfLinks(html: string, baseUrl: string): string[] {
    const pdfLinks: Set<string> = new Set();
    const hrefRegex = /href\s*=\s*["']([^"']*\.pdf[^"']*)["']/gi;
    let match;

    while ((match = hrefRegex.exec(html)) !== null) {
        try {
            const href = match[1];
            const absoluteUrl = new URL(href, baseUrl).toString();
            pdfLinks.add(absoluteUrl);
        } catch {
            // Invalid URL, skip
        }
    }

    return Array.from(pdfLinks);
}

// Check a PDF for accessibility tags (/Lang, /MarkInfo, /Title)
async function checkPdfAccessibility(pdfUrl: string, timeoutMs = 6000): Promise<PdfCheckResult> {
    const filename = decodeURIComponent(pdfUrl.split("/").pop()?.split("?")[0] || "document.pdf");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        // Fetch only the first ~32KB of the PDF to check for tags in the header
        const response = await fetch(pdfUrl, {
            signal: controller.signal,
            headers: {
                "User-Agent": "ComplyBot/2.0 (Accessibility Scanner; +https://getcomply.tech)",
                "Range": "bytes=0-32768",
            },
        });
        clearTimeout(timeoutId);

        if (!response.ok && response.status !== 206) {
            return { url: pdfUrl, filename, isAccessible: false, hasLangTag: false, hasMarkInfo: false, hasTitle: false, error: `HTTP ${response.status}` };
        }

        const buffer = await response.arrayBuffer();
        const text = new TextDecoder("latin1").decode(buffer);

        const hasLangTag = /\/Lang\s*\(/.test(text) || /\/Lang\s*</.test(text);
        const hasMarkInfo = /\/MarkInfo\s*<</.test(text) || /\/Marked\s+true/i.test(text);
        const hasTitle = /\/Title\s*\(/.test(text) || /\/Title\s*</.test(text);

        return {
            url: pdfUrl,
            filename,
            isAccessible: hasLangTag && hasMarkInfo,
            hasLangTag,
            hasMarkInfo,
            hasTitle,
        };
    } catch (error) {
        clearTimeout(timeoutId);
        return {
            url: pdfUrl,
            filename,
            isAccessible: false,
            hasLangTag: false,
            hasMarkInfo: false,
            hasTitle: false,
            error: error instanceof Error ? error.message : "Failed to fetch PDF",
        };
    }
}

// Check multiple PDFs (limit concurrency)
async function checkPdfsOnPage(html: string, baseUrl: string): Promise<PdfCheckResult[]> {
    const pdfLinks = extractPdfLinks(html, baseUrl);
    if (pdfLinks.length === 0) return [];

    // Limit to first 10 PDFs to avoid timeout
    const toCheck = pdfLinks.slice(0, 10);
    const results = await Promise.all(toCheck.map(url => checkPdfAccessibility(url)));
    return results;
}

// Known healthcare third-party vendors
const HEALTHCARE_VENDORS: Array<{ name: string; category: string; patterns: RegExp[] }> = [
    { name: "Zocdoc", category: "Patient Scheduling", patterns: [/zocdoc\.com/i, /zocdoc/i] },
    { name: "Doxy.me", category: "Telehealth", patterns: [/doxy\.me/i] },
    { name: "PatientPop", category: "Practice Marketing", patterns: [/patientpop\.com/i, /patientpop/i] },
    { name: "WebPT", category: "EMR/Practice Management", patterns: [/webpt\.com/i] },
    { name: "Solutionreach", category: "Patient Communication", patterns: [/solutionreach\.com/i] },
    { name: "Kareo", category: "Practice Management", patterns: [/kareo\.com/i] },
    { name: "Dentrix Ascend", category: "Dental Practice Management", patterns: [/dentrix/i, /dentrixascend/i] },
    { name: "NexHealth", category: "Patient Scheduling", patterns: [/nexhealth\.com/i, /nexhealth/i] },
    { name: "SimplePractice", category: "Practice Management", patterns: [/simplepractice\.com/i] },
    { name: "Klara", category: "Patient Communication", patterns: [/klara\.com/i, /klaraconnect/i] },
    { name: "Phreesia", category: "Patient Intake", patterns: [/phreesia\.com/i] },
    { name: "Yext", category: "Online Listings", patterns: [/yext\.com/i, /yextpages/i] },
    { name: "Lighthouse 360", category: "Patient Communication", patterns: [/lh360\.com/i, /lighthouse360/i] },
    { name: "RevenueWell", category: "Patient Communication", patterns: [/revenuewell\.com/i] },
    { name: "Weave", category: "Patient Communication", patterns: [/getweave\.com/i, /weaveconnect/i] },
    { name: "Healow", category: "Patient Portal", patterns: [/healow\.com/i] },
    { name: "MyChart", category: "Patient Portal", patterns: [/mychart/i] },
    { name: "Athenahealth", category: "Patient Portal", patterns: [/athenahealth\.com/i, /athenanet/i] },
    { name: "eClinicalWorks", category: "EHR Portal", patterns: [/eclinicalworks\.com/i, /eclinicalweb/i] },
    { name: "Demandforce", category: "Patient Communication", patterns: [/demandforce\.com/i] },
];

// Detect third-party healthcare vendors in HTML
function detectVendors(html: string): VendorWarning[] {
    const warnings: VendorWarning[] = [];
    const detected = new Set<string>();

    // Check iframes
    const iframeRegex = /(<iframe[^>]*src\s*=\s*["'])([^"']+)(["'][^>]*>)/gi;
    let match;
    while ((match = iframeRegex.exec(html)) !== null) {
        const src = match[2];
        for (const vendor of HEALTHCARE_VENDORS) {
            if (!detected.has(vendor.name) && vendor.patterns.some(p => p.test(src))) {
                detected.add(vendor.name);
                warnings.push(createVendorWarning(vendor.name, vendor.category, `iframe src: ${src}`));
            }
        }
    }

    // Check script tags
    const scriptRegex = /(<script[^>]*src\s*=\s*["'])([^"']+)(["'][^>]*>)/gi;
    while ((match = scriptRegex.exec(html)) !== null) {
        const src = match[2];
        for (const vendor of HEALTHCARE_VENDORS) {
            if (!detected.has(vendor.name) && vendor.patterns.some(p => p.test(src))) {
                detected.add(vendor.name);
                warnings.push(createVendorWarning(vendor.name, vendor.category, `script src: ${src}`));
            }
        }
    }

    // Check link/anchor references (for widgets, portals, etc.)
    const linkRegex = /href\s*=\s*["']([^"']+)["']/gi;
    while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1];
        for (const vendor of HEALTHCARE_VENDORS) {
            if (!detected.has(vendor.name) && vendor.patterns.some(p => p.test(href))) {
                detected.add(vendor.name);
                warnings.push(createVendorWarning(vendor.name, vendor.category, `link: ${href}`));
            }
        }
    }

    return warnings;
}

function createVendorWarning(vendorName: string, category: string, detectedVia: string): VendorWarning {
    return {
        vendor: vendorName,
        category,
        detectedVia,
        warning: `We detected ${vendorName} (${category}) on your website. Under Section 504, your practice is legally responsible for the accessibility of third-party tools used by patients. If ${vendorName} is not accessible, your practice could face complaints or lawsuits.`,
        action: `Request a VPAT (Voluntary Product Accessibility Template) or ACR (Accessibility Conformance Report) from ${vendorName} to verify their accessibility compliance.`,
        vpatTemplateEmail: `Subject: Accessibility Conformance Report Request - Section 504 Compliance\n\nDear ${vendorName} Team,\n\nOur healthcare practice is required to comply with the updated HHS Section 504 rule, which mandates WCAG 2.1 AA accessibility for all web content and third-party tools used by patients.\n\nAs we use ${vendorName} on our website/patient-facing systems, we need to verify that your product meets these accessibility requirements.\n\nCould you please provide:\n1. Your current VPAT or Accessibility Conformance Report (ACR)\n2. A statement on your WCAG 2.1 AA conformance level\n3. Your accessibility roadmap for any known gaps\n\nThe HHS compliance deadline is May 2026, so we need this documentation as part of our compliance planning.\n\nThank you for your prompt attention to this matter.\n\nBest regards,\n[Your Name]\n[Practice Name]`,
    };
}

// Call PageSpeed Insights API
async function runPageSpeedAudit(url: string): Promise<{ score: number; findings: Finding[]; title?: string }> {
    const apiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    apiUrl.searchParams.set("url", url);
    apiUrl.searchParams.set("category", "accessibility");
    apiUrl.searchParams.set("strategy", "desktop");

    if (PAGESPEED_API_KEY) {
        apiUrl.searchParams.set("key", PAGESPEED_API_KEY);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
        const response = await fetch(apiUrl.toString(), {
            headers: {
                "Accept": "application/json",
            },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("PageSpeed API error:", errorText);
            throw new Error(`PageSpeed API error: ${response.status}`);
        }

        // Return response object to be processed below (this split is awkward, better to return data)
        // Actually I need to include the data parsing in this block or simply fall through.
        // The original code has data parsing AFTER the check.

        const data: PageSpeedResponse = await response.json();
        return processLighthouseData(data, url);

    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

function processLighthouseData(data: PageSpeedResponse, url: string): { score: number; findings: Finding[]; title?: string } {

    // Data is passed in as argument


    if (data.error) {
        throw new Error(data.error.message);
    }

    const lighthouseResult = data.lighthouseResult;
    if (!lighthouseResult) {
        throw new Error("No Lighthouse result returned");
    }

    const accessibilityScore = Math.round((lighthouseResult.categories?.accessibility?.score || 0) * 100);
    const audits = lighthouseResult.audits || {};
    const findings: Finding[] = [];

    // Process failed audits
    for (const [auditId, audit] of Object.entries(audits)) {
        // Skip passed audits, not applicable, or informative
        if (audit.score === 1 || audit.score === null || audit.scoreDisplayMode === "notApplicable" || audit.scoreDisplayMode === "informative") {
            continue;
        }

        const wcagInfo = WCAG_MAPPING[auditId];
        const itemCount = audit.details?.items?.length || 0;

        // Extract element snippets for context
        const elements = audit.details?.items?.slice(0, 5).map(item =>
            item.node?.snippet || item.node?.selector || ""
        ).filter(Boolean) as string[];

        const finding: Finding = {
            id: auditId,
            check: audit.title,
            severity: getSeverity(audit),
            message: audit.description.split(".")[0] + ".", // First sentence
            details: itemCount > 0 ? `${itemCount} element${itemCount > 1 ? "s" : ""} affected` : undefined,
            count: itemCount || undefined,
            pageUrl: url,
            elements: elements.length > 0 ? elements : undefined,
        };

        if (wcagInfo) {
            finding.wcagCriterion = wcagInfo.criterion;
            finding.wcagName = wcagInfo.name;
            finding.wcagLevel = wcagInfo.level;
            finding.wcagPrinciple = wcagInfo.principle;
        }

        // Add remediation hints based on audit type
        finding.remediation = getRemediation(auditId);

        // Add user-centric impact explanation
        finding.impact = getImpact(auditId);

        // Add role-specific guidance
        finding.managerGuidance = getManagerGuidance(auditId);
        finding.developerGuidance = getDeveloperGuidance(auditId);

        findings.push(finding);
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return {
        score: accessibilityScore,
        findings,
        title: lighthouseResult.finalUrl,
    };
}

// Get user-centric impact explanation
function getImpact(auditId: string): string {
    const impacts: Record<string, string> = {
        "color-contrast": "Users with low vision may struggle to read this text, causing eye strain or making content invisible.",
        "image-alt": "Blind users rely on screen readers to describe images. Without alt text, they miss out on visual content.",
        "link-name": "Users using voice commands or screen readers won't know where this link goes (e.g., 'click here' is confusing).",
        "button-name": "Users accessing your site with a keyboard or screen reader won't know what this button does.",
        "label": "Screen reader users won't know what information to enter into this form field.",
        "html-has-lang": "Translation tools and screen readers won't know which language/accent to use for your content.",
        "html-lang-valid": "Browsers and translation tools may fail to render the text correctly.",
        "document-title": "Users with cognitive disabilities or screen readers rely on the title to know where they are.",
        "heading-order": "Users who navigate by headings (like skimming a book) will be confused by the illogical structure.",
        "bypass": "Keyboard users effectively have to hit 'Tab' dozens of times just to reach the main content on every page.",
        "frame-title": "Screen reader users won't know what content is inside these embedded frames.",
        "meta-viewport": "Users with low vision won't be able to pinch-to-zoom to read small text.",
        "aria-allowed-attr": "Assistive technologies may behave unpredictably or crash if invalid code is used.",
        "aria-hidden-body": "This effectively makes the entire page invisible to screen readers.",
        "aria-hidden-focus": "Keyboard users can tab to this element, but screen readers will ignore it, creating a confusing 'ghost' element.",
        "aria-required-attr": "Screen readers won't have enough information to announce this element correctly.",
        "aria-required-children": "This interactive element is broken for screen reader users because it's missing required parts.",
        "aria-required-parent": "This element is orphaned and won't work correctly with assistive technologies.",
        "aria-roles": "Screen readers will be confused about what this element actually is (e.g., a button vs. a link).",
        "aria-valid-attr-value": "Invalid values can cause screen readers to stop speaking or announce incorrect information.",
        "aria-valid-attr": "The browser doesn't understand this attribute, so it does nothing for accessibility.",
        "tabindex": "This breaks the natural flow of keyboard navigation, making the page hard or impossible to use.",
        "duplicate-id-aria": "This confuses assistive technologies, potentially linking the wrong label to the wrong input.",
        "video-caption": "Users who are deaf or in noisy environments can't understand the video content.",
        "td-headers-attr": "Screen reader users won't understand how data cells relate to table headers.",
        "th-has-data-cells": "Screen reader users can't navigate the data table effectively.",
    };

    return impacts[auditId] || "This issue prevents some users with disabilities from accessing or understanding your content.";
}

// Get remediation suggestions
function getRemediation(auditId: string): string {
    const remediations: Record<string, string> = {
        "color-contrast": "Increase the contrast ratio between text and background colors to at least 4.5:1 for normal text.",
        "image-alt": "Add descriptive alt text to images that convey meaning. Use empty alt=\"\" for decorative images.",
        "link-name": "Ensure all links have discernible text that describes their destination or purpose.",
        "button-name": "Add text content or aria-label to buttons so screen readers can announce their purpose.",
        "label": "Associate form inputs with labels using the 'for' attribute or by wrapping inputs in label elements.",
        "html-has-lang": "Add a lang attribute to the <html> element (e.g., lang=\"en\").",
        "html-lang-valid": "Use a valid BCP 47 language code in the lang attribute.",
        "document-title": "Add a descriptive <title> element to the page that summarizes its content.",
        "heading-order": "Structure headings in a logical order (h1, then h2, then h3, etc.) without skipping levels.",
        "bypass": "Add a 'Skip to main content' link at the beginning of the page.",
        "frame-title": "Add title attributes to iframe elements that describe their content.",
        "meta-viewport": "Remove user-scalable=no from the viewport meta tag to allow zooming.",
        "aria-allowed-attr": "Only use ARIA attributes that are valid for the element's role.",
        "aria-hidden-body": "Remove aria-hidden from the body element or its ancestors.",
        "aria-hidden-focus": "Ensure elements with aria-hidden=\"true\" don't contain focusable elements.",
        "aria-required-attr": "Add all required ARIA attributes for the element's role.",
        "aria-required-children": "Ensure ARIA parent roles contain their required child roles.",
        "aria-required-parent": "Ensure ARIA child roles are contained within required parent roles.",
        "aria-roles": "Use valid ARIA role values.",
        "aria-valid-attr-value": "Use valid values for ARIA attributes.",
        "aria-valid-attr": "Use valid ARIA attribute names.",
        "tabindex": "Avoid using tabindex values greater than 0.",
        "duplicate-id-aria": "Ensure all IDs used in ARIA attributes are unique.",
        "video-caption": "Add captions to video elements for deaf or hard-of-hearing users.",
        "td-headers-attr": "Ensure table cells reference valid header cells using the headers attribute.",
        "th-has-data-cells": "Ensure table header cells are associated with data cells.",
    };

    return remediations[auditId] || "Review the element and ensure it meets WCAG accessibility guidelines.";
}

// Get role-specific guidance for practice managers (non-technical)
function getManagerGuidance(auditId: string): string {
    const guidance: Record<string, string> = {
        "color-contrast": "Tell your web person: 'Our text colors are too light. Please use darker text or lighter backgrounds so all patients can read our website, especially those with vision problems.'",
        "image-alt": "Tell your web person: 'Please add descriptions to our images. Blind patients using screen readers need to know what our photos show. Each image should have a short description.'",
        "link-name": "Tell your web person: 'Links that just say \"click here\" or \"read more\" are confusing. Please rename them to say where they go, like \"View Our Services\" or \"Download Patient Forms.\"'",
        "button-name": "Tell your web person: 'Our buttons need labels. Patients using voice commands or screen readers can't tell what our buttons do. Please add clear text to each button.'",
        "label": "Tell your web person: 'Our contact/appointment forms are missing labels. Patients with disabilities won't know which field is for their name, email, etc. Please add labels to each form field.'",
        "html-has-lang": "Tell your web person: 'Please add a language tag to our website. This helps translation tools and screen readers work correctly for patients who use them.'",
        "document-title": "Tell your web person: 'Each page needs a clear title that appears in the browser tab. This helps patients with multiple tabs know which one is our site.'",
        "heading-order": "Tell your web person: 'Our page headings are out of order. Patients who navigate by headings will get confused. Please use H1 for the main title, then H2 for sections, then H3 for subsections.'",
        "bypass": "Tell your web person: 'Please add a \"Skip to main content\" link at the top of each page. Keyboard-only patients currently have to tab through the entire menu on every page.'",
        "meta-viewport": "Tell your web person: 'Patients with low vision can't zoom in on our website. Please enable pinch-to-zoom so they can enlarge text.'",
        "video-caption": "Tell your web person: 'Our videos need captions. Deaf patients and those in waiting rooms without sound can't understand them otherwise.'",
    };

    return guidance[auditId] || "Contact your web developer and share this accessibility report. Ask them to fix this issue to ensure all patients can use your website.";
}

// Get developer-specific technical guidance
function getDeveloperGuidance(auditId: string): string {
    const guidance: Record<string, string> = {
        "color-contrast": "Check contrast ratios using Chrome DevTools or WebAIM contrast checker. Normal text needs 4.5:1, large text (18pt+) needs 3:1. Update CSS color values for affected elements.",
        "image-alt": "Add alt attributes to all <img> elements. Descriptive images need meaningful alt text. Decorative images should have alt=\"\". Background images conveying info need text alternatives.",
        "link-name": "Add descriptive text content to <a> elements. If using images as links, add alt text. For icon-only links, add aria-label or visually-hidden text.",
        "button-name": "Add text content, aria-label, or aria-labelledby to <button> elements. Icon-only buttons need aria-label describing their action.",
        "label": "Add <label for=\"inputId\"> elements or wrap inputs in <label>. For complex cases, use aria-labelledby. Placeholders are not substitutes for labels.",
        "html-has-lang": "Add lang attribute to <html> element: <html lang=\"en\">. Use appropriate BCP 47 code for your content language.",
        "html-lang-valid": "Use valid BCP 47 language codes (en, en-US, es, fr, etc.). Check https://www.w3.org/International/questions/qa-html-language-declarations",
        "document-title": "Add unique, descriptive <title> in <head>. Format: 'Page Name | Practice Name'. Avoid keyword stuffing.",
        "heading-order": "Ensure heading hierarchy is sequential: h1 → h2 → h3. Don't skip levels. Use CSS for visual styling instead of incorrect heading levels.",
        "bypass": "Add <a href=\"#main\" class=\"skip-link\">Skip to main content</a> as first focusable element. Style to be visible on focus. Main content needs id=\"main\".",
        "frame-title": "Add title attribute to all <iframe> elements describing their content, e.g., <iframe title=\"Appointment booking widget\" src=\"...\">",
        "meta-viewport": "Change <meta name=\"viewport\" content=\"...\"> to allow scaling. Remove user-scalable=no and maximum-scale=1.0. Use: width=device-width, initial-scale=1",
        "aria-hidden-body": "Remove aria-hidden=\"true\" from <body> or any ancestor elements. Check for modals or overlays that may set this incorrectly.",
        "aria-hidden-focus": "Either remove focusable elements from aria-hidden regions, add tabindex=\"-1\", or remove aria-hidden from the container.",
        "video-caption": "Add <track kind=\"captions\" src=\"captions.vtt\" srclang=\"en\"> to <video> elements. Use WebVTT format. Consider auto-captioning services for new content.",
    };

    return guidance[auditId] || "Review WCAG 2.1 guidelines for this specific criterion. Test with screen readers (NVDA, VoiceOver) and keyboard-only navigation.";
}

// Calculate summary from findings
function calculateSummary(findings: Finding[], accessibilityScore?: number): Summary {
    return {
        total: findings.length,
        critical: findings.filter((f) => f.severity === "critical").length,
        high: findings.filter((f) => f.severity === "high").length,
        medium: findings.filter((f) => f.severity === "medium").length,
        low: findings.filter((f) => f.severity === "low").length,
        accessibilityScore,
    };
}

// Get top issue for teaser
function getTopIssue(findings: Finding[]): string {
    if (findings.length === 0) return "No issues found";
    return findings[0]?.message || "Accessibility issues detected";
}

// Main handler
serve(async (req) => {
    const origin = req.headers.get("origin");
    const headers = getCorsHeaders(origin);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...headers, "Content-Type": "application/json" },
        });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    try {
        const body = await req.json();
        const { websiteUrl, sessionId, userId } = body;

        // Validate inputs
        if (!websiteUrl || typeof websiteUrl !== "string") {
            return new Response(
                JSON.stringify({ success: false, error: "Website URL is required" }),
                { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
            );
        }

        if (!sessionId || typeof sessionId !== "string") {
            return new Response(
                JSON.stringify({ success: false, error: "Session ID is required" }),
                { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
            );
        }

        const normalizedUrl = normalizeUrl(websiteUrl);

        // Basic URL validation
        try {
            new URL(normalizedUrl);
        } catch {
            return new Response(
                JSON.stringify({ success: false, error: "Invalid URL format" }),
                { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
            );
        }

        // Get client IP for rate limiting
        const clientIp =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            "unknown";

        // Check rate limit
        const rateLimit = await checkRateLimit(supabase, clientIp);
        if (!rateLimit.allowed) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Rate limit exceeded. Please try again later.",
                    retryAfter: 3600,
                }),
                { status: 429, headers: { ...headers, "Content-Type": "application/json" } }
            );
        }

        // Check for cached scan of same URL
        const cached = await getCachedScan(supabase, normalizedUrl);
        if (cached) {
            const response: ScanResponse = {
                success: true,
                sessionId: cached.sessionId,
                summary: cached.summary,
                teaser: {
                    topIssue: getTopIssue(cached.findings),
                    issueCount: cached.summary.total,
                    accessibilityScore: cached.summary.accessibilityScore,
                },
                pagesScanned: cached.pageResults?.length || 1,
                cached: true,
            };
            return new Response(JSON.stringify(response), {
                headers: { ...headers, "Content-Type": "application/json" },
            });
        }

        const startTime = Date.now();
        const pageResults: PageResult[] = [];
        const allFindings: Finding[] = [];
        let totalScore = 0;
        let pdfResults: PdfCheckResult[] = [];
        let vendorWarnings: VendorWarning[] = [];

        // Step 1: Scan homepage with PageSpeed Insights
        console.log(`Scanning homepage: ${normalizedUrl}`);

        try {
            const homepageResult = await runPageSpeedAudit(normalizedUrl);

            pageResults.push({
                pageUrl: normalizedUrl,
                pageTitle: "Homepage",
                accessibilityScore: homepageResult.score,
                findings: homepageResult.findings,
                summary: calculateSummary(homepageResult.findings, homepageResult.score),
            });

            allFindings.push(...homepageResult.findings);
            totalScore = homepageResult.score;

            // Step 2: Extract internal links and crawl additional pages
            try {
                const html = await fetchHtml(normalizedUrl);
                const internalLinks = extractInternalLinks(html, normalizedUrl);
                const pagesToScan = prioritizePages(internalLinks, normalizedUrl);

                console.log(`Found ${internalLinks.length} internal links, scanning ${pagesToScan.length} priority pages`);

                // Step 2b: Check PDFs on homepage
                try {
                    console.log("Checking PDFs for accessibility...");
                    pdfResults = await checkPdfsOnPage(html, normalizedUrl);
                    const inaccessiblePdfs = pdfResults.filter(p => !p.isAccessible && !p.error);
                    if (inaccessiblePdfs.length > 0) {
                        console.log(`Found ${inaccessiblePdfs.length} inaccessible PDFs`);
                        // Add a finding for inaccessible PDFs
                        const pdfFinding: Finding = {
                            id: "pdf-accessibility",
                            check: "Inaccessible PDF Documents",
                            severity: inaccessiblePdfs.length >= 3 ? "critical" : "high",
                            message: `${inaccessiblePdfs.length} PDF form${inaccessiblePdfs.length > 1 ? "s" : ""} found that blind patients cannot fill out or read with screen readers.`,
                            details: `PDFs missing accessibility tags: ${inaccessiblePdfs.map(p => p.filename).join(", ")}`,
                            count: inaccessiblePdfs.length,
                            wcagCriterion: "1.1.1",
                            wcagName: "Non-text Content",
                            wcagLevel: "A",
                            wcagPrinciple: "Perceivable",
                            pageUrl: normalizedUrl,
                            remediation: "PDF documents must be properly tagged for accessibility. Use Adobe Acrobat Pro to add tags, or recreate PDFs from source documents with accessibility features enabled.",
                            impact: "Blind patients and those using screen readers cannot access information in your intake forms, consent documents, or patient education materials. This may prevent them from receiving care.",
                            managerGuidance: "Tell your web person: 'Our PDF forms are not accessible to blind patients. We need these forms recreated with accessibility tags, or we need to offer accessible alternatives like online forms.'",
                            developerGuidance: "Use Adobe Acrobat Pro's Accessibility Checker, or tools like PDF Accessibility Checker (PAC 3). Add /Lang, /MarkInfo, heading structure, and alt text for images. Consider converting to accessible HTML forms.",
                            elements: inaccessiblePdfs.slice(0, 5).map(p => p.url),
                        };
                        allFindings.unshift(pdfFinding); // Add at the top since PDFs are critical for healthcare
                    }
                } catch (pdfError) {
                    console.error("Error checking PDFs:", pdfError);
                }

                // Step 2c: Detect third-party vendors
                try {
                    console.log("Detecting third-party vendors...");
                    vendorWarnings = detectVendors(html);
                    if (vendorWarnings.length > 0) {
                        console.log(`Detected ${vendorWarnings.length} third-party vendors: ${vendorWarnings.map(v => v.vendor).join(", ")}`);
                    }
                } catch (vendorError) {
                    console.error("Error detecting vendors:", vendorError);
                }

                // Check if we have enough time left for sub-pages
                const elapsed = Date.now() - startTime;
                if (elapsed > 20000) { // If homepage took > 20s, skip sub-pages
                    console.log("Homepage scan took too long, skipping sub-pages to avoid timeout");
                } else {
                    // Scan additional pages (limit to 2 max to save time/memory)
                    const limit = 2;
                    let scannedCount = 0;

                    for (const pageUrl of pagesToScan) {
                        if (scannedCount >= limit) break;

                        // Check time again before each scan
                        if (Date.now() - startTime > 45000) {
                            console.log("Approaching timeout, stopping scan");
                            break;
                        }

                        try {
                            console.log(`Scanning page: ${pageUrl}`);
                            const pageResult = await runPageSpeedAudit(pageUrl);

                            // Extract page name from URL
                            const pageName = new URL(pageUrl).pathname.split("/").filter(Boolean).pop() || "Page";

                            pageResults.push({
                                pageUrl,
                                pageTitle: pageName.charAt(0).toUpperCase() + pageName.slice(1).replace(/-/g, " "),
                                accessibilityScore: pageResult.score,
                                findings: pageResult.findings,
                                summary: calculateSummary(pageResult.findings, pageResult.score),
                            });

                            allFindings.push(...pageResult.findings);
                            totalScore += pageResult.score;
                            scannedCount++;
                        } catch (pageError) {
                            console.error(`Error scanning ${pageUrl}:`, pageError);
                        }
                    }
                }
            } catch (crawlError) {
                console.error("Error crawling for additional pages:", crawlError);
                // Continue with just homepage results
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error("PageSpeed API error:", errorMessage);

            // Store failed scan attempt
            await supabase.from("scan_results").insert({
                session_id: sessionId,
                website_url: normalizedUrl,
                client_ip: clientIp,
                http_status: 0,
                scan_duration_ms: Date.now() - startTime,
                findings: [],
                summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
                scanner_version: "3.0-psi",
            });

            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Could not scan website: ${errorMessage}`,
                }),
                { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
            );
        }

        // Calculate overall summary
        const avgScore = pageResults.length > 0 ? Math.round(totalScore / pageResults.length) : 0;
        const overallSummary = calculateSummary(allFindings, avgScore);
        const scanDuration = Date.now() - startTime;

        // Deduplicate findings by id+pageUrl for storage (keep all for detail, but summary should reflect unique issues)
        const uniqueIssueTypes = new Set(allFindings.map(f => f.id));

        // Store results
        const { error: insertError, data: insertedScan } = await supabase.from("scan_results").insert({
            session_id: sessionId,
            website_url: normalizedUrl,
            client_ip: clientIp,
            http_status: 200,
            scan_duration_ms: scanDuration,
            findings: allFindings,
            summary: overallSummary,
            page_results: pageResults,
            pages_scanned: pageResults.length,
            pdf_results: pdfResults.length > 0 ? pdfResults : null,
            vendor_warnings: vendorWarnings.length > 0 ? vendorWarnings : null,
            scanner_version: "3.0-psi",
            accessibility_score: avgScore,
            user_id: userId || null,
        }).select("id").single();

        if (insertError) {
            console.error("Insert error:", insertError);
            if (!insertError.message.includes("duplicate")) {
                throw insertError;
            }
        }

        // If user is logged in, create compliance_log entries for each finding
        if (userId && insertedScan?.id && allFindings.length > 0) {
            try {
                const complianceEntries = allFindings.map(f => ({
                    user_id: userId,
                    scan_result_id: insertedScan.id,
                    website_url: normalizedUrl,
                    finding_id: f.id,
                    finding_check: f.check,
                    severity: f.severity,
                    wcag_criterion: f.wcagCriterion || null,
                    status: "found",
                }));

                await supabase.from("compliance_log").insert(complianceEntries);

                // Update monitored_sites if this site is being monitored
                await supabase.from("monitored_sites")
                    .update({
                        last_scan_id: insertedScan.id,
                        previous_score: supabase.rpc ? undefined : undefined, // Can't easily get previous in one call
                        last_score: avgScore,
                    })
                    .eq("user_id", userId)
                    .eq("website_url", normalizedUrl);

                // Update compliance_badge last_score and last_scan_date
                await supabase.from("compliance_badges")
                    .update({
                        last_score: avgScore,
                        last_scan_date: new Date().toISOString(),
                    })
                    .eq("user_id", userId)
                    .eq("website_url", normalizedUrl);
            } catch (complianceError) {
                console.error("Error creating compliance entries:", complianceError);
                // Don't fail the scan if compliance logging fails
            }
        }

        const response: ScanResponse = {
            success: true,
            sessionId,
            summary: overallSummary,
            teaser: {
                topIssue: getTopIssue(allFindings),
                issueCount: uniqueIssueTypes.size,
                accessibilityScore: avgScore,
            },
            pagesScanned: pageResults.length,
            pageResults,
            pdfResults: pdfResults.length > 0 ? pdfResults : undefined,
            vendorWarnings: vendorWarnings.length > 0 ? vendorWarnings : undefined,
        };

        console.log(`Scan completed for ${normalizedUrl}: ${allFindings.length} issues found across ${pageResults.length} pages in ${scanDuration}ms (avg score: ${avgScore}), ${pdfResults.length} PDFs checked, ${vendorWarnings.length} vendors detected`);

        return new Response(JSON.stringify(response), {
            headers: { ...headers, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Scan error:", error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : "Internal server error",
            }),
            { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
        );
    }
});
