# Project Context: Comply (Micro-SaaS)

**Objective:** We are pivoting from a generic "Waitlist" to a "Value-First Scanner" to generate leads for independent healthcare practices (Dentists, Pediatricians, etc.) who are at risk of lawsuits due to the upcoming **HHS May 2026 Accessibility Deadline**.

## Current Stack
- **Frontend:** React (Vite), TailwindCSS, Lucide Icons, Sonner (for Toasts).
- **Backend:** Supabase (PostgreSQL Database, Edge Functions).
- **Integrations:** Resend (Email), Slack (Notifications).
- **Deployment:** Vercel (Frontend), Supabase (Backend).

## Current State (The "Old" Flow)
Right now, we have a simple "Hero" component that collects an `email` and `websiteUrl` and adds them to a `waitlist` table.

### 1. Database Schema
Table: `waitlist`
- `id` (uuid, PK)
- `created_at` (timestamp)
- `email` (text, unique)
- `website_url` (text)

### 2. Frontend Logic (`src/components/Hero.tsx`)
A simple form that takes Email + URL and calls `addToWaitlist`.

### 3. Backend Logic (`src/lib/supabase.ts` + Edge Function)
- `addToWaitlist` inserts data into Supabase.
- Triggers `notify-waitlist` Edge Function.
- Edge Function (`supabase/functions/notify-waitlist/index.ts`) sends a "Welcome/Spot Reserved" email via Resend and a Slack alert.

## The Goal: The "Scanner" Funnel
We want to replace the current Hero with a 4-step "Scanner" flow to provide instant gratification and increase conversion.

**The Flow:**
1.  **Input:** User enters `websiteUrl` initially (Low friction).
2.  **Animation:** Show a "Scanning..." interface (progress bars, checking SSL, checking Contrast, checking PDFs...).
3.  **The Hook (Result Teaser):** Show a "Risk Detected" screen (e.g., "⚠️ We found 3 critical issues that violate HHS Section 504").
4.  **The Conversion:** User must enter `email` to "Unlock Full Report".

## What We Need (The Task for Claude)
We need to design the backend architecture to support this "Real" (or "Simulated Real") scan.

**Core Questions/Tasks:**
1.  **Backend Scanner Logic:** How do we implement a lightweight scanner in a Supabase Edge Function (Deno) that can actually check a URL for basic things (like missing `alt` tags or SSL) to make the report genuine? OR should we fake it for v1?
    *   *Constraint:* Ensure it runs within Edge Function timeout limits.
2.  **Data Persistence:** How do we store the "Scan Result" temporarily before we have the email?
3.  **Report Generation:** When they unlock the report, can we generate a simple HTML email with the specific "errors" found?

## Reference Code

### Frontend: `src/components/Hero.tsx`
```tsx
import { useState } from "react";
import { toast } from "sonner";
import BlurText from "./BlurText";
import { addToWaitlist } from "../lib/supabase";

const Hero = () => {
  const [email, setEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // ... validation ...
    setIsLoading(true);
    try {
      await addToWaitlist(email, websiteUrl);
      setIsSuccess(true);
      toast.success("Spot reserved! We'll start your scan shortly.");
      // ...
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  // ... JSX for Form ...
};
```

### Backend Bridge: `src/lib/supabase.ts`
```typescript
export async function addToWaitlist(email: string, websiteUrl?: string) {
    const { error } = await supabase
        .from('waitlist')
        .insert([{ email, website_url: websiteUrl }]);

    if (error) { /* handle error */ }

    // Fire and forget notification
    supabase.functions.invoke('notify-waitlist', {
        body: { email, websiteUrl }
    }).catch(err => console.error('Notification failed:', err));

    return true;
}
```

### Edge Function: `supabase/functions/notify-waitlist/index.ts`
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// ... imports ...

serve(async (req) => {
    // ... CORS ...
    const { email, websiteUrl } = await req.json();
    
    // ... validation ...

    // 1. Send Email (Resend)
    // 2. Alert Slack
    
    return new Response(JSON.stringify({ success: true }), { ... });
});
```
