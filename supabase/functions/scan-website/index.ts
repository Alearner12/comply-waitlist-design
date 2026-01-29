import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Types
interface Finding {
    id: string;
    check: string;
    severity: "critical" | "high" | "medium" | "low";
    message: string;
    details?: string;
    count?: number;
}

interface Summary {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
}

interface ScanResponse {
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
    const limit = 5;

    return {
        allowed: scansInLastHour < limit,
        remaining: Math.max(0, limit - scansInLastHour),
    };
}

// Check for cached scan of same URL
async function getCachedScan(
    supabase: ReturnType<typeof createClient>,
    websiteUrl: string
): Promise<{ sessionId: string; summary: Summary; findings: Finding[] } | null> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from("scan_results")
        .select("session_id, summary, findings")
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
    };
}

// Normalize URL
function normalizeUrl(url: string): string {
    let normalized = url.trim().toLowerCase();
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
        normalized = "https://" + normalized;
    }
    // Remove trailing slash
    normalized = normalized.replace(/\/$/, "");
    return normalized;
}

// Fetch HTML with timeout
async function fetchHtml(url: string, timeoutMs = 10000): Promise<{ html: string; finalUrl: string; status: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "ComplyBot/1.0 (Accessibility Scanner; +https://getcomply.tech)",
                "Accept": "text/html,application/xhtml+xml",
            },
            redirect: "follow",
        });

        clearTimeout(timeoutId);

        const html = await response.text();
        return {
            html,
            finalUrl: response.url,
            status: response.status,
        };
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Accessibility checks
function runAccessibilityChecks(html: string, finalUrl: string): Finding[] {
    const findings: Finding[] = [];

    // 1. SSL/HTTPS check
    if (!finalUrl.startsWith("https://")) {
        findings.push({
            id: "ssl-missing",
            check: "SSL/HTTPS",
            severity: "critical",
            message: "Website is not using HTTPS",
            details: "Secure connections (HTTPS) are required for healthcare websites to protect patient data.",
        });
    }

    // 2. Missing alt tags on images
    const imgTagRegex = /<img\s+[^>]*>/gi;
    const imgTags = html.match(imgTagRegex) || [];
    const imagesWithoutAlt = imgTags.filter((tag) => {
        const hasAlt = /\salt\s*=\s*["'][^"']+["']/i.test(tag);
        const hasEmptyAlt = /\salt\s*=\s*["']\s*["']/i.test(tag);
        return !hasAlt || hasEmptyAlt;
    });

    if (imagesWithoutAlt.length > 0) {
        findings.push({
            id: "missing-alt",
            check: "Image Alt Text",
            severity: "high",
            message: `${imagesWithoutAlt.length} image(s) missing alt text`,
            details: "Screen readers cannot describe images without alt text, making content inaccessible to visually impaired users.",
            count: imagesWithoutAlt.length,
        });
    }

    // 3. Missing lang attribute
    const hasLang = /<html[^>]*\slang\s*=\s*["'][a-z]{2,}["']/i.test(html);
    if (!hasLang) {
        findings.push({
            id: "missing-lang",
            check: "Language Attribute",
            severity: "medium",
            message: "Missing language attribute on HTML element",
            details: "Screen readers need the lang attribute to pronounce content correctly.",
        });
    }

    // 4. Missing form labels
    const inputRegex = /<input\s+[^>]*type\s*=\s*["'](text|email|tel|password|search|url|number)["'][^>]*>/gi;
    const inputs = html.match(inputRegex) || [];
    const inputsWithoutLabels = inputs.filter((input) => {
        const idMatch = input.match(/\sid\s*=\s*["']([^"']+)["']/i);
        if (!idMatch) return true;
        const labelForRegex = new RegExp(`<label[^>]*\\sfor\\s*=\\s*["']${idMatch[1]}["']`, "i");
        return !labelForRegex.test(html);
    });

    if (inputsWithoutLabels.length > 0) {
        findings.push({
            id: "missing-form-labels",
            check: "Form Labels",
            severity: "high",
            message: `${inputsWithoutLabels.length} form input(s) may be missing labels`,
            details: "Form inputs without associated labels are difficult for screen reader users to understand.",
            count: inputsWithoutLabels.length,
        });
    }

    // 5. PDF links detected
    const pdfRegex = /href\s*=\s*["'][^"']*\.pdf["']/gi;
    const pdfLinks = html.match(pdfRegex) || [];
    if (pdfLinks.length > 0) {
        findings.push({
            id: "pdf-links",
            check: "PDF Documents",
            severity: "medium",
            message: `${pdfLinks.length} PDF document(s) linked`,
            details: "PDFs must be properly tagged for accessibility. Untagged PDFs are inaccessible to screen readers.",
            count: pdfLinks.length,
        });
    }

    // 6. Missing h1
    const hasH1 = /<h1[\s>]/i.test(html);
    if (!hasH1) {
        findings.push({
            id: "missing-h1",
            check: "Page Heading",
            severity: "medium",
            message: "No H1 heading found",
            details: "Pages should have a main heading (H1) to help users understand the page structure.",
        });
    }

    // 7. Missing page title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const hasTitle = titleMatch && titleMatch[1].trim().length > 0;
    if (!hasTitle) {
        findings.push({
            id: "missing-title",
            check: "Page Title",
            severity: "low",
            message: "Missing or empty page title",
            details: "Page titles help users identify the page and are announced by screen readers.",
        });
    }

    // 8. Check for empty links
    const emptyLinkRegex = /<a\s+[^>]*href\s*=\s*["'][^"']+["'][^>]*>\s*<\/a>/gi;
    const emptyLinks = html.match(emptyLinkRegex) || [];
    if (emptyLinks.length > 0) {
        findings.push({
            id: "empty-links",
            check: "Empty Links",
            severity: "high",
            message: `${emptyLinks.length} empty link(s) found`,
            details: "Links without text content are confusing for screen reader users.",
            count: emptyLinks.length,
        });
    }

    return findings;
}

// Calculate summary from findings
function calculateSummary(findings: Finding[]): Summary {
    return {
        total: findings.length,
        critical: findings.filter((f) => f.severity === "critical").length,
        high: findings.filter((f) => f.severity === "high").length,
        medium: findings.filter((f) => f.severity === "medium").length,
        low: findings.filter((f) => f.severity === "low").length,
    };
}

// Get top issue for teaser
function getTopIssue(findings: Finding[]): string {
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...findings].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    return sorted[0]?.message || "No issues found";
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
        const { websiteUrl, sessionId } = body;

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
                },
                cached: true,
            };
            return new Response(JSON.stringify(response), {
                headers: { ...headers, "Content-Type": "application/json" },
            });
        }

        // Fetch and scan
        const startTime = Date.now();
        let html: string;
        let finalUrl: string;
        let httpStatus: number;

        try {
            const result = await fetchHtml(normalizedUrl);
            html = result.html;
            finalUrl = result.finalUrl;
            httpStatus = result.status;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error("Fetch error:", errorMessage);

            // Store failed scan attempt
            await supabase.from("scan_results").insert({
                session_id: sessionId,
                website_url: normalizedUrl,
                client_ip: clientIp,
                http_status: 0,
                scan_duration_ms: Date.now() - startTime,
                findings: [],
                summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
            });

            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Could not fetch website: ${errorMessage.includes("abort") ? "Request timed out" : errorMessage}`,
                }),
                { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
            );
        }

        // Run accessibility checks
        const findings = runAccessibilityChecks(html, finalUrl);
        const summary = calculateSummary(findings);
        const scanDuration = Date.now() - startTime;

        // Store results
        const { error: insertError } = await supabase.from("scan_results").insert({
            session_id: sessionId,
            website_url: normalizedUrl,
            client_ip: clientIp,
            http_status: httpStatus,
            scan_duration_ms: scanDuration,
            findings,
            summary,
        });

        if (insertError) {
            console.error("Insert error:", insertError);
            // If session_id already exists, that's okay - return results anyway
            if (!insertError.message.includes("duplicate")) {
                throw insertError;
            }
        }

        const response: ScanResponse = {
            success: true,
            sessionId,
            summary,
            teaser: {
                topIssue: getTopIssue(findings),
                issueCount: summary.total,
            },
        };

        console.log(`Scan completed for ${normalizedUrl}: ${summary.total} issues found in ${scanDuration}ms`);

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
