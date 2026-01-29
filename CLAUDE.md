# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Comply is a healthcare compliance SaaS targeting independent practices (dentists, pediatricians) facing the HHS May 2026 accessibility deadline. Currently transitioning from a simple waitlist to a "Value-First Scanner" funnel.

**Domain:** https://getcomply.tech

## Commands

```bash
# Development
npm run dev          # Start dev server on localhost:8080

# Build
npm run build        # Production build
npm run build:dev    # Development mode build
npm run preview      # Preview production build locally

# Testing
npm run test         # Run tests once
npm run test:watch   # Watch mode

# Linting
npm run lint         # ESLint
```

## Architecture

### Frontend (React + Vite)
- **Entry:** `src/main.tsx` → `src/App.tsx` (providers + routing) → `src/pages/Index.tsx`
- **Components:** Landing page sections in `src/components/` (Hero, Features, Mission, FAQ, Footer)
- **UI Library:** shadcn/ui components in `src/components/ui/`
- **Styling:** TailwindCSS with custom design tokens in `tailwind.config.ts`, global styles in `src/index.css`
- **Path alias:** `@/` maps to `src/`

### Backend (Supabase)
- **Client:** `src/lib/supabase.ts` - initialized with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **Database:** PostgreSQL with `waitlist` table (id, email, website_url, created_at)
- **Edge Functions:** Deno-based in `supabase/functions/`
  - `notify-waitlist` - Sends confirmation email (Resend) and Slack alert on signup

### Data Flow (Current Waitlist)
1. `Hero.tsx` form collects email + websiteUrl
2. Calls `addToWaitlist()` in `src/lib/supabase.ts`
3. Inserts to `waitlist` table, then invokes `notify-waitlist` edge function
4. Edge function sends email via Resend API and posts to Slack webhook

## Environment Variables

```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>

# Edge Function secrets (set in Supabase dashboard)
RESEND_API_KEY=<resend-api-key>
SLACK_WEBHOOK_URL=<slack-webhook-url>
```

## Key Files

| File | Purpose |
|------|---------|
| `src/components/Hero.tsx` | Main conversion component (waitlist form) |
| `src/lib/supabase.ts` | Supabase client + `addToWaitlist()` function |
| `supabase/functions/notify-waitlist/index.ts` | Email + Slack notification edge function |
| `src/index.css` | Global styles, CSS variables, custom components |
| `tailwind.config.ts` | Design tokens (colors, fonts, shadows, animations) |
| `FOR_CLAUDE.md` | Project context and pivot strategy |

## Testing

- Framework: Vitest with jsdom environment
- Setup: `src/test/setup.ts` (includes matchMedia mock)
- Pattern: `src/**/*.{test,spec}.{ts,tsx}`
- Globals enabled (no imports needed for describe/it/expect)

## Edge Function Development

Edge functions use Deno runtime. CORS is configured for:
- `https://getcomply.tech`
- `https://certifyada.vercel.app`
- `http://localhost:8081`

Deploy with: `supabase functions deploy <function-name>`
