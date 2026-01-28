import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL");

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email } = await req.json();
        console.log(`[DEBUG] Processing sign-up for: ${email}`);

        // Check for missing keys
        const missingKeys = [];
        if (!RESEND_API_KEY) missingKeys.push("RESEND_API_KEY");
        if (!SLACK_WEBHOOK_URL) missingKeys.push("SLACK_WEBHOOK_URL");

        if (missingKeys.length > 0) {
            const errorMsg = `Configuration Error: Missing keys: ${missingKeys.join(", ")}`;
            console.error(`[DEBUG] ${errorMsg}`);
            return new Response(JSON.stringify({ error: errorMsg }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }

        const results = { email };

        // 1. Slack
        try {
            console.log("[DEBUG] Sending to Slack...");
            const slackRes = await fetch(SLACK_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `🚀 *New Waitlist Sign-up!* \n\n📧 Email: \`${email}\`\n🎉 Congrats on the growth!`,
                }),
            });
            results.slack = slackRes.status;
            if (slackRes.status >= 400) {
                const text = await slackRes.text();
                results.slackError = text;
                console.error(`[DEBUG] Slack Failed: ${slackRes.status} - ${text}`);
            } else {
                console.log("[DEBUG] Slack Success");
            }
        } catch (e) {
            results.slackException = e.message;
            console.error(`[DEBUG] Slack Exception: ${e.message}`);
        }

        // 2. Resend
        try {
            console.log("[DEBUG] Sending to Resend...");
            const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: 'Comply <onboarding@resend.dev>',
                    to: [email],
                    subject: 'Welcome to the Comply Waitlist! 🚀',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1>You're on the list!</h1>
                        <p>Hi there,</p>
                        <p>Thanks for joining the waitlist for <strong>Comply</strong>. We're building the best accessibility scanner for the modern web, and we're thrilled to have you along for the ride.</p>
                        <p>We'll keep you posted as soon as we open up access.</p>
                        <br/>
                        <p>Best,</p>
                        <p>The Comply Team</p>
                        </div>
                    `,
                }),
            });
            results.resend = resendRes.status;
            if (resendRes.status >= 400) {
                const data = await resendRes.json();
                results.resendError = data;
                console.error(`[DEBUG] Resend Failed: ${resendRes.status} - ${JSON.stringify(data)}`);
            } else {
                console.log("[DEBUG] Resend Success");
            }
        } catch (e) {
            results.resendException = e.message;
            console.error(`[DEBUG] Resend Exception: ${e.message}`);
        }

        const hasError = (results.slack >= 400) || (results.resend >= 400) || results.slackException || results.resendException;

        return new Response(JSON.stringify(results), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: hasError ? 500 : 200,
        });

    } catch (error) {
        console.error(`[DEBUG] Fatal Error: ${error.message}`);
        return new Response(JSON.stringify({ fatal_error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
