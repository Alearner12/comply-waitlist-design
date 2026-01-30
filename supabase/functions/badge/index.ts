import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "image/svg+xml",
  "Cache-Control": "public, max-age=3600",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(generateErrorBadge("Invalid token"), {
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: badge, error } = await supabase
      .from("compliance_badges")
      .select("*")
      .eq("badge_token", token)
      .eq("is_active", true)
      .single();

    if (error || !badge) {
      return new Response(generateErrorBadge("Badge not found"), {
        headers: corsHeaders,
      });
    }

    const svg = generateBadge(badge.last_score, badge.last_scan_date);
    return new Response(svg, { headers: corsHeaders });
  } catch (err) {
    console.error("Badge error:", err);
    return new Response(generateErrorBadge("Error"), {
      headers: corsHeaders,
    });
  }
});

function generateBadge(score: number | null, scanDate: string | null): string {
  const dateStr = scanDate
    ? new Date(scanDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not scanned";

  let color = "#6b7280"; // gray
  if (score !== null) {
    if (score >= 90) color = "#16a34a"; // green
    else if (score >= 70) color = "#ca8a04"; // yellow
    else color = "#dc2626"; // red
  }

  const displayScore = score ?? "?";

  return `<svg width="200" height="36" viewBox="0 0 200 36" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="36" rx="4" fill="#f8f9fa" stroke="#e5e7eb"/>
  <rect width="36" height="36" rx="4" fill="${color}"/>
  <text x="18" y="22" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="system-ui, sans-serif">${displayScore}</text>
  <text x="44" y="15" fill="#111827" font-size="10" font-weight="600" font-family="system-ui, sans-serif">Accessibility Monitored</text>
  <text x="44" y="27" fill="#6b7280" font-size="9" font-family="system-ui, sans-serif">by Comply · ${dateStr}</text>
</svg>`;
}

function generateErrorBadge(message: string): string {
  return `<svg width="200" height="36" viewBox="0 0 200 36" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="36" rx="4" fill="#f3f4f6" stroke="#e5e7eb"/>
  <text x="100" y="22" text-anchor="middle" fill="#6b7280" font-size="10" font-family="system-ui, sans-serif">${message}</text>
</svg>`;
}
