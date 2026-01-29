import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const SLACK_URL = Deno.env.get("SLACK_WEBHOOK_URL");

serve(async (req) => {
    const allowedOrigins = [
        'https://getcomply.tech',
        'https://certifyada.vercel.app',
        'http://localhost:8081'
    ];

    const origin = req.headers.get('origin');
    const headers = {
        'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : 'null',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers });
    }

    try {
        const body = await req.json();
        const { email, websiteUrl } = body;

        console.log("Received data:", { email, websiteUrl }); // Debug log

        if (!email) {
            return new Response(JSON.stringify({ error: 'Email required' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' },
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return new Response(JSON.stringify({ error: 'Invalid email format' }), {
                status: 400,
                headers: { ...headers, 'Content-Type': 'application/json' },
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
                    from: 'Comply <hello@getcomply.tech>',
                    to: [email],
                    subject: 'Your clinic has a reserved spot (May 2026 Deadline)',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #1a1a1a;">Spot Reserved: Comply Early Access</h1>
                            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                                Thanks for joining. Most private practices aren't aware that the May 2026 HHS deadline requires all patient-facing sites to be fully accessible.
                            </p>
                            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                                We are building the tools to automate this transition so you can focus on patients, not lawsuits. I've reserved a spot for your clinic (${websiteUrl || 'your website'}) on our early-access list.
                            </p>
                            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                                We'll be in touch soon with a quick report on what needs to be fixed.
                            </p>
                            <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 30px 0;">
                            <p style="color: #888; font-size: 14px;">
                                - The Comply Team
                            </p>
                        </div>
                    `,
                }),
            });
            const data = await res.json();
            console.log("Resend API Response:", JSON.stringify(data));
            result.emailStatus = res.status;
            result.resendId = data.id;
        } catch (err) {
            result.emailError = err.message;
        }

        // Send to Slack if configured
        if (SLACK_URL) {
            try {
                await fetch(SLACK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: `New signup: ${email} for site: ${websiteUrl || 'N/A'}` }),
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
