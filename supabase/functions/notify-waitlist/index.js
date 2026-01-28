import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const SLACK_URL = Deno.env.get("SLACK_WEBHOOK_URL");

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        });
    }

    try {
        const body = await req.json();
        const email = body.email;

        if (!email) {
            return new Response(JSON.stringify({ error: 'Email required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        const result = { email };

        // Send email via Resend
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_KEY}`,
                },
                body: JSON.stringify({
                    from: 'Comply <onboarding@resend.dev>',
                    to: [email],
                    subject: 'Welcome to Comply Waitlist!',
                    html: '<h1>Thanks for joining!</h1><p>We will notify you when we launch.</p>',
                }),
            });
            result.emailStatus = res.status;
        } catch (err) {
            result.emailError = err.message;
        }

        // Send to Slack if configured
        if (SLACK_URL) {
            try {
                await fetch(SLACK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: `New signup: ${email}` }),
                });
            } catch (err) {
                result.slackError = err.message;
            }
        }

        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
});
