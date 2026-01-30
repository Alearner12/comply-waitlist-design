import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL");

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

interface ScanResult {
    id: string;
    session_id: string;
    website_url: string;
    findings: Finding[];
    summary: Summary;
    page_results?: PageResult[];
    pages_scanned?: number;
    pdf_results?: PdfCheckResult[];
    vendor_warnings?: VendorWarning[];
    email?: string;
    scanned_at: string;
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

// Severity colors for email
const severityColors: Record<string, string> = {
    critical: "#dc2626",
    high: "#ea580c",
    medium: "#ca8a04",
    low: "#2563eb",
};

const severityLabels: Record<string, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
};

const wcagLevelColors: Record<string, string> = {
    A: "#059669",
    AA: "#7c3aed",
    AAA: "#4f46e5",
};

// Get score color
function getScoreColor(score: number): string {
    if (score >= 90) return "#16a34a";
    if (score >= 70) return "#ca8a04";
    if (score >= 50) return "#ea580c";
    return "#dc2626";
}

// Generate HTML email report
function generateReportEmail(scan: ScanResult): string {
    const { website_url, findings, summary, page_results, pages_scanned, pdf_results, vendor_warnings, scanned_at } = scan;
    const scanDate = new Date(scanned_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const avgScore = summary.accessibilityScore || 0;

    // Generate findings HTML with WCAG info and role-specific guidance
    const generateFindingHtml = (f: Finding) => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; color: white; background-color: ${severityColors[f.severity]};">
                    ${severityLabels[f.severity]}
                </span>
                ${f.wcagCriterion ? `
                <br>
                <span style="display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; color: white; background-color: ${wcagLevelColors[f.wcagLevel || "A"]};">
                    ${f.wcagCriterion} ${f.wcagLevel}
                </span>
                ` : ""}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #1f2937;">${f.check}</strong>
                <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">${f.message}</p>
                ${f.impact ? `<p style="margin: 4px 0 0 0; color: #b45309; font-size: 13px;"><strong>Patient impact:</strong> ${f.impact}</p>` : ""}
                ${f.details ? `<p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 13px;">${f.details}</p>` : ""}
                ${f.wcagName ? `<p style="margin: 4px 0 0 0; color: #6366f1; font-size: 12px;">WCAG: ${f.wcagName}</p>` : ""}
                ${f.managerGuidance ? `
                <div style="margin: 8px 0 0 0; padding: 10px; background: #fef3c7; border-radius: 4px; border-left: 3px solid #d97706;">
                    <p style="margin: 0; color: #92400e; font-size: 13px; font-weight: 600;">For Practice Managers:</p>
                    <p style="margin: 4px 0 0 0; color: #78350f; font-size: 13px;">${f.managerGuidance}</p>
                </div>
                ` : ""}
                ${f.developerGuidance ? `
                <div style="margin: 8px 0 0 0; padding: 10px; background: #eff6ff; border-radius: 4px; border-left: 3px solid #2563eb;">
                    <p style="margin: 0; color: #1e40af; font-size: 13px; font-weight: 600;">For Developers:</p>
                    <p style="margin: 4px 0 0 0; color: #1e3a5f; font-size: 13px;">${f.developerGuidance}</p>
                </div>
                ` : ""}
                ${f.remediation && !f.managerGuidance ? `<p style="margin: 8px 0 0 0; padding: 8px; background: #eff6ff; border-radius: 4px; color: #1e40af; font-size: 13px;"><strong>How to fix:</strong> ${f.remediation}</p>` : ""}
            </td>
        </tr>
    `;

    // Generate per-page sections if available
    let pageResultsHtml = "";
    if (page_results && page_results.length > 0) {
        pageResultsHtml = page_results.map(page => {
            const scoreColor = getScoreColor(page.accessibilityScore);
            const pageFindingsHtml = page.findings.length > 0
                ? page.findings.map(generateFindingHtml).join("")
                : `<tr><td colspan="2" style="padding: 16px; text-align: center; color: #059669;">No issues found on this page!</td></tr>`;

            return `
            <div style="margin-bottom: 32px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <div style="padding: 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 48px; height: 48px; border-radius: 50%; border: 3px solid ${scoreColor}; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 16px; font-weight: 700; color: ${scoreColor};">${page.accessibilityScore}</span>
                        </div>
                        <div>
                            <p style="margin: 0; font-weight: 600; color: #1f2937;">${page.pageTitle || "Page"}</p>
                            <p style="margin: 2px 0 0 0; font-size: 12px; color: #6b7280; word-break: break-all;">${page.pageUrl}</p>
                        </div>
                    </div>
                </div>
                ${page.findings.length > 0 ? `
                <table style="width: 100%; border-collapse: collapse;">
                    <tbody>
                        ${pageFindingsHtml}
                    </tbody>
                </table>
                ` : `
                <div style="padding: 24px; text-align: center;">
                    <p style="margin: 0; color: #059669; font-weight: 500;">No accessibility issues detected!</p>
                </div>
                `}
            </div>
            `;
        }).join("");
    }

    // Fallback to flat findings list if no page results
    const flatFindingsHtml = (!page_results || page_results.length === 0) && findings.length > 0
        ? `
        <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 16px;">Issues Found</h2>
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
            <tbody>
                ${findings.sort((a, b) => {
            const order = { critical: 0, high: 1, medium: 2, low: 3 };
            return order[a.severity] - order[b.severity];
        }).map(generateFindingHtml).join("")}
            </tbody>
        </table>
        `
        : "";

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 700px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1f2937; margin-bottom: 8px;">Accessibility Scan Report</h1>
        <p style="color: #6b7280; margin: 0;">Scanned on ${scanDate}</p>
    </div>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Website Scanned:</p>
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">${website_url}</p>
        ${pages_scanned && pages_scanned > 1 ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #6b7280;">${pages_scanned} pages analyzed</p>` : ""}
    </div>

    <!-- Overall Score -->
    <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 100px; height: 100px; border-radius: 50%; border: 6px solid ${getScoreColor(avgScore)}; line-height: 88px; text-align: center;">
            <span style="font-size: 32px; font-weight: 700; color: ${getScoreColor(avgScore)};">${avgScore}</span>
        </div>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">Overall Accessibility Score</p>
    </div>

    <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; justify-content: center;">
        <div style="flex: 1; min-width: 100px; max-width: 120px; background: #fef2f2; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 28px; font-weight: 700; color: #dc2626;">${summary.critical}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #991b1b;">Critical</p>
        </div>
        <div style="flex: 1; min-width: 100px; max-width: 120px; background: #fff7ed; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 28px; font-weight: 700; color: #ea580c;">${summary.high}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #9a3412;">High</p>
        </div>
        <div style="flex: 1; min-width: 100px; max-width: 120px; background: #fefce8; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 28px; font-weight: 700; color: #ca8a04;">${summary.medium}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #854d0e;">Medium</p>
        </div>
        <div style="flex: 1; min-width: 100px; max-width: 120px; background: #eff6ff; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 28px; font-weight: 700; color: #2563eb;">${summary.low}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #1e40af;">Low</p>
        </div>
    </div>

    ${page_results && page_results.length > 0 ? `
    <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 16px;">Results by Page</h2>
    ${pageResultsHtml}
    ` : ""}

    ${flatFindingsHtml}

    ${findings.length === 0 ? `
    <div style="text-align: center; padding: 32px; background: #ecfdf5; border-radius: 8px;">
        <p style="margin: 0; color: #059669; font-size: 18px; font-weight: 600;">No accessibility issues detected!</p>
        <p style="margin: 8px 0 0 0; color: #047857;">Your website passed all our automated checks.</p>
    </div>
    ` : ""}

    <!-- PDF Accessibility Results -->
    ${pdf_results && pdf_results.length > 0 ? `
    <div style="margin-top: 32px; padding: 20px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
        <h3 style="color: #991b1b; font-size: 16px; margin: 0 0 12px 0;">PDF Document Accessibility</h3>
        <p style="color: #7f1d1d; font-size: 14px; margin: 0 0 12px 0;">
            We found <strong>${pdf_results.length} PDF document${pdf_results.length > 1 ? "s" : ""}</strong> on your website.
            ${pdf_results.filter(p => !p.isAccessible).length > 0
                ? `<strong>${pdf_results.filter(p => !p.isAccessible).length}</strong> cannot be read by screen readers.`
                : "All appear to have basic accessibility tags."}
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
                <tr style="background: #fee2e2;">
                    <th style="padding: 8px; text-align: left; color: #991b1b;">Document</th>
                    <th style="padding: 8px; text-align: center; color: #991b1b;">Language Tag</th>
                    <th style="padding: 8px; text-align: center; color: #991b1b;">Tagged PDF</th>
                    <th style="padding: 8px; text-align: center; color: #991b1b;">Status</th>
                </tr>
            </thead>
            <tbody>
                ${pdf_results.map(pdf => `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #fecaca; word-break: break-all;">${pdf.filename}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #fecaca; text-align: center;">${pdf.error ? "?" : pdf.hasLangTag ? "Yes" : "No"}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #fecaca; text-align: center;">${pdf.error ? "?" : pdf.hasMarkInfo ? "Yes" : "No"}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #fecaca; text-align: center;">
                        <span style="color: ${pdf.error ? "#6b7280" : pdf.isAccessible ? "#059669" : "#dc2626"}; font-weight: 600;">
                            ${pdf.error ? "Could not check" : pdf.isAccessible ? "Accessible" : "Not Accessible"}
                        </span>
                    </td>
                </tr>
                `).join("")}
            </tbody>
        </table>
        <div style="margin-top: 12px; padding: 10px; background: #fef3c7; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-size: 13px;">
                <strong>Why this matters:</strong> Patient intake forms, consent documents, and educational materials must be accessible to blind patients.
                Inaccessible PDFs are a common Section 504 violation. Consider converting critical forms to accessible HTML web forms.
            </p>
        </div>
    </div>
    ` : ""}

    <!-- Third-Party Vendor Warnings -->
    ${vendor_warnings && vendor_warnings.length > 0 ? `
    <div style="margin-top: 32px; padding: 20px; background: #fffbeb; border-radius: 8px; border: 1px solid #fde68a;">
        <h3 style="color: #92400e; font-size: 16px; margin: 0 0 8px 0;">Third-Party Vendor Risk Assessment</h3>
        <p style="color: #78350f; font-size: 14px; margin: 0 0 16px 0;">
            Under <strong>Section 504</strong>, your practice is legally responsible for the accessibility of third-party tools used by patients.
            We detected <strong>${vendor_warnings.length} third-party service${vendor_warnings.length > 1 ? "s" : ""}</strong> on your website.
        </p>
        ${vendor_warnings.map(vw => `
        <div style="margin-bottom: 16px; padding: 12px; background: white; border-radius: 6px; border: 1px solid #fde68a;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #92400e; background: #fde68a;">
                    ${vw.category}
                </span>
                <strong style="color: #1f2937;">${vw.vendor}</strong>
            </div>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">${vw.warning}</p>
            <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 13px;"><strong>Action needed:</strong> ${vw.action}</p>
            <details style="margin-top: 8px;">
                <summary style="cursor: pointer; color: #7c3aed; font-size: 13px; font-weight: 500;">Click to view VPAT request email template</summary>
                <pre style="margin: 8px 0 0 0; padding: 12px; background: #f9fafb; border-radius: 4px; font-size: 12px; color: #374151; white-space: pre-wrap; font-family: monospace;">${vw.vpatTemplateEmail}</pre>
            </details>
        </div>
        `).join("")}
    </div>
    ` : ""}

    <!-- WCAG Reference -->
    <div style="margin-top: 32px; padding: 20px; background: #f5f3ff; border-radius: 8px;">
        <h3 style="color: #5b21b6; font-size: 16px; margin: 0 0 12px 0;">Understanding WCAG Levels</h3>
        <ul style="margin: 0; padding: 0 0 0 20px; color: #6b7280; font-size: 14px;">
            <li style="margin-bottom: 8px;"><strong style="color: #059669;">Level A:</strong> Essential accessibility requirements. Must be met for basic accessibility.</li>
            <li style="margin-bottom: 8px;"><strong style="color: #7c3aed;">Level AA:</strong> Addresses the most common barriers. Required by HHS Section 504 and DOJ ADA Title II.</li>
            <li><strong style="color: #4f46e5;">Level AAA:</strong> Highest level of accessibility. Not required but recommended.</li>
        </ul>
    </div>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 12px;">What's Next?</h3>
        <p style="color: #6b7280; font-size: 14px;">
            This report is powered by Google Lighthouse and covers common WCAG 2.1 accessibility issues.
            The <strong>HHS May 2026 deadline</strong> requires full WCAG 2.1 AA compliance for healthcare websites
            receiving federal funds.
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 12px;">
            <strong>Need help fixing these issues?</strong> Reply to this email and we'll be happy to assist.
        </p>
    </div>

    <!-- Important Disclaimer -->
    <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">
            <strong>Important:</strong> Automated tools can detect only 30-40% of WCAG accessibility issues.
            This scan covers common machine-detectable problems but does not constitute a full accessibility audit.
            Manual testing with assistive technologies (screen readers, keyboard-only navigation) and testing with
            users with disabilities is necessary for full WCAG 2.1 AA compliance. This report should not be
            considered legal advice.
        </p>
    </div>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px;">
            Comply - Healthcare Accessibility Compliance<br>
            <a href="https://getcomply.tech" style="color: #6b7280;">getcomply.tech</a>
        </p>
    </div>
</body>
</html>
    `;
}

// Send report via Resend
async function sendReportEmail(email: string, scan: ScanResult): Promise<boolean> {
    if (!RESEND_API_KEY) {
        console.error("RESEND_API_KEY not configured");
        return false;
    }

    const html = generateReportEmail(scan);
    const { summary, website_url } = scan;
    const score = summary.accessibilityScore || 0;
    const issueText = summary.total === 1 ? "1 issue" : `${summary.total} issues`;

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "Comply <hello@getcomply.tech>",
                to: [email],
                subject: `Accessibility Report: Score ${score}/100 - ${issueText} on ${website_url}`,
                html,
            }),
        });

        const data = await response.json();
        console.log("Resend response:", JSON.stringify(data));
        return response.ok;
    } catch (error) {
        console.error("Email send error:", error);
        return false;
    }
}

// Send Slack notification
async function sendSlackNotification(email: string, scan: ScanResult): Promise<void> {
    if (!SLACK_WEBHOOK_URL) {
        return;
    }

    const { summary, website_url, pages_scanned } = scan;
    const score = summary.accessibilityScore || 0;
    const isHotLead = score < 60;
    const header = isHotLead ? "🔥 HOT LEAD 🔥 High Potential Client!" : "New scan report unlocked!";

    try {
        await fetch(SLACK_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: `${header}\n*Email:* ${email}\n*Website:* ${website_url}\n*Score:* ${score}/100\n*Pages:* ${pages_scanned || 1}\n*Issues:* ${summary.critical} critical, ${summary.high} high, ${summary.medium} medium, ${summary.low} low`,
            }),
        });
    } catch (error) {
        console.error("Slack notification error:", error);
    }
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
        const { sessionId, email } = body;

        // Validate inputs
        if (!sessionId || typeof sessionId !== "string") {
            return new Response(
                JSON.stringify({ success: false, error: "Session ID is required" }),
                { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
            );
        }

        if (!email || typeof email !== "string") {
            return new Response(
                JSON.stringify({ success: false, error: "Email is required" }),
                { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return new Response(
                JSON.stringify({ success: false, error: "Invalid email format" }),
                { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
            );
        }

        // Find the scan by session ID
        const { data: scanData, error: fetchError } = await supabase
            .from("scan_results")
            .select("*")
            .eq("session_id", sessionId)
            .single();

        if (fetchError || !scanData) {
            console.error("Fetch error:", fetchError);
            return new Response(
                JSON.stringify({ success: false, error: "Scan not found. Please run a new scan." }),
                { status: 404, headers: { ...headers, "Content-Type": "application/json" } }
            );
        }

        const scan = scanData as ScanResult;

        // Update scan with email
        const { error: updateError } = await supabase
            .from("scan_results")
            .update({
                email,
                email_captured_at: new Date().toISOString(),
            })
            .eq("session_id", sessionId);

        if (updateError) {
            console.error("Update error:", updateError);
        }

        // Also add to waitlist for unified lead tracking
        try {
            await supabase.from("waitlist").upsert(
                {
                    email,
                    website_url: scan.website_url,
                },
                { onConflict: "email" }
            );
        } catch (e) {
            console.error("Waitlist insert error:", e);
        }

        // Send report email
        const emailSent = await sendReportEmail(email, scan);

        // Update report_sent_at if email was sent
        if (emailSent) {
            await supabase
                .from("scan_results")
                .update({ report_sent_at: new Date().toISOString() })
                .eq("session_id", sessionId);
        }

        // Send Slack notification (fire and forget)
        sendSlackNotification(email, scan).catch(console.error);

        console.log(`Report unlocked for ${email} - session ${sessionId}`);

        return new Response(
            JSON.stringify({
                success: true,
                findings: scan.findings,
                summary: scan.summary,
                websiteUrl: scan.website_url,
                pageResults: scan.page_results,
                pdfResults: scan.pdf_results,
                vendorWarnings: scan.vendor_warnings,
                reportSent: emailSent,
            }),
            { headers: { ...headers, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Unlock error:", error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : "Internal server error",
            }),
            { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
        );
    }
});
