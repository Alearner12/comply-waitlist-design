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
}

interface Summary {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
}

interface ScanResult {
    id: string;
    session_id: string;
    website_url: string;
    findings: Finding[];
    summary: Summary;
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

// Generate HTML email report
function generateReportEmail(scan: ScanResult): string {
    const { website_url, findings, summary, scanned_at } = scan;
    const scanDate = new Date(scanned_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const findingsHtml = findings
        .sort((a, b) => {
            const order = { critical: 0, high: 1, medium: 2, low: 3 };
            return order[a.severity] - order[b.severity];
        })
        .map(
            (f) => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; color: white; background-color: ${severityColors[f.severity]};">
                        ${severityLabels[f.severity]}
                    </span>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #1f2937;">${f.check}</strong>
                    <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">${f.message}</p>
                    ${f.details ? `<p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 13px;">${f.details}</p>` : ""}
                </td>
            </tr>
        `
        )
        .join("");

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1f2937; margin-bottom: 8px;">Accessibility Scan Report</h1>
        <p style="color: #6b7280; margin: 0;">Scanned on ${scanDate}</p>
    </div>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Website Scanned:</p>
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">${website_url}</p>
    </div>

    <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 100px; background: #fef2f2; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 28px; font-weight: 700; color: #dc2626;">${summary.critical}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #991b1b;">Critical</p>
        </div>
        <div style="flex: 1; min-width: 100px; background: #fff7ed; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 28px; font-weight: 700; color: #ea580c;">${summary.high}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #9a3412;">High</p>
        </div>
        <div style="flex: 1; min-width: 100px; background: #fefce8; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 28px; font-weight: 700; color: #ca8a04;">${summary.medium}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #854d0e;">Medium</p>
        </div>
        <div style="flex: 1; min-width: 100px; background: #eff6ff; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 28px; font-weight: 700; color: #2563eb;">${summary.low}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #1e40af;">Low</p>
        </div>
    </div>

    ${findings.length > 0
            ? `
    <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 16px;">Issues Found</h2>
    <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
        <tbody>
            ${findingsHtml}
        </tbody>
    </table>
    `
            : `
    <div style="text-align: center; padding: 32px; background: #ecfdf5; border-radius: 8px;">
        <p style="margin: 0; color: #059669; font-size: 18px; font-weight: 600;">No accessibility issues detected!</p>
        <p style="margin: 8px 0 0 0; color: #047857;">Your website passed all our automated checks.</p>
    </div>
    `
        }

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 12px;">What's Next?</h3>
        <p style="color: #6b7280; font-size: 14px;">
            This automated scan covers common accessibility issues, but a comprehensive audit requires manual testing.
            The HHS May 2026 deadline requires full WCAG 2.1 AA compliance for healthcare websites.
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 12px;">
            <strong>Need help fixing these issues?</strong> Reply to this email and we'll be happy to assist.
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
                subject: `Accessibility Report: ${issueText} found on ${website_url}`,
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

    const { summary, website_url } = scan;

    try {
        await fetch(SLACK_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: `New scan report unlocked!\n*Email:* ${email}\n*Website:* ${website_url}\n*Issues:* ${summary.critical} critical, ${summary.high} high, ${summary.medium} medium, ${summary.low} low`,
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
