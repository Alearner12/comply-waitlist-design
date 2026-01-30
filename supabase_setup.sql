-- Create the waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    website_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone (anon) to insert their email
CREATE POLICY "Allow public insert"
ON public.waitlist
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy: Allow only service_role (backend/admin) to view emails
-- This prevents public users from reading the list of emails
CREATE POLICY "Allow service_role select"
ON public.waitlist
FOR SELECT
TO service_role
USING (true);

-- Optional: Comments for documentation
COMMENT ON TABLE public.waitlist IS 'Stores emails from the landing page waitlist.';

-- ============================================
-- Scanner Backend: scan_results table
-- ============================================

-- Create the scan_results table
CREATE TABLE IF NOT EXISTS public.scan_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    website_url TEXT NOT NULL,

    -- Scan metadata
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    scan_duration_ms INTEGER,
    http_status INTEGER,

    -- Results (JSONB for flexibility)
    findings JSONB NOT NULL DEFAULT '[]',
    summary JSONB NOT NULL DEFAULT '{}',

    -- Email capture (null until unlock)
    email TEXT,
    email_captured_at TIMESTAMPTZ,
    report_sent_at TIMESTAMPTZ,

    -- Rate limiting
    client_ip TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scan_results_session_id ON public.scan_results(session_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_client_ip ON public.scan_results(client_ip, created_at);
CREATE INDEX IF NOT EXISTS idx_scan_results_website_url ON public.scan_results(website_url, created_at);

-- Enable Row Level Security
ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for anonymous access (scanner is public)
CREATE POLICY "scan_results_allow_insert" ON public.scan_results
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "scan_results_allow_update" ON public.scan_results
    FOR UPDATE TO anon
    USING (true);

CREATE POLICY "scan_results_allow_select" ON public.scan_results
    FOR SELECT TO anon
    USING (true);

-- Service role has full access
CREATE POLICY "scan_results_service_role" ON public.scan_results
    FOR ALL TO service_role
    USING (true);

-- Grant permissions to anon role
GRANT SELECT, INSERT, UPDATE ON public.scan_results TO anon;

COMMENT ON TABLE public.scan_results IS 'Stores website accessibility scan results for the scanner funnel.';

-- ============================================
-- Tier 2: User Accounts + Dashboard
-- ============================================

-- Add user_id and extended fields to scan_results
ALTER TABLE public.scan_results ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.scan_results ADD COLUMN IF NOT EXISTS pdf_results JSONB;
ALTER TABLE public.scan_results ADD COLUMN IF NOT EXISTS vendor_warnings JSONB;
ALTER TABLE public.scan_results ADD COLUMN IF NOT EXISTS page_results JSONB;
ALTER TABLE public.scan_results ADD COLUMN IF NOT EXISTS pages_scanned INTEGER;
ALTER TABLE public.scan_results ADD COLUMN IF NOT EXISTS scanner_version TEXT;
ALTER TABLE public.scan_results ADD COLUMN IF NOT EXISTS accessibility_score INTEGER;

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_scan_results_user_id ON public.scan_results(user_id, created_at DESC);

-- Update RLS: authenticated users can see their own scans
CREATE POLICY "scan_results_user_select" ON public.scan_results
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "scan_results_user_update" ON public.scan_results
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- Compliance Log: Track issue lifecycle
-- ============================================

CREATE TABLE IF NOT EXISTS public.compliance_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scan_result_id UUID REFERENCES public.scan_results(id) ON DELETE SET NULL,
    website_url TEXT NOT NULL,
    finding_id TEXT NOT NULL,
    finding_check TEXT NOT NULL,
    severity TEXT NOT NULL,
    wcag_criterion TEXT,
    status TEXT NOT NULL DEFAULT 'found',  -- found | acknowledged | in_progress | fixed | wont_fix
    status_changed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_log_user ON public.compliance_log(user_id, website_url);
CREATE INDEX IF NOT EXISTS idx_compliance_log_status ON public.compliance_log(user_id, status);

ALTER TABLE public.compliance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_log_user_all" ON public.compliance_log
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_log TO authenticated;

COMMENT ON TABLE public.compliance_log IS 'Tracks the lifecycle of accessibility findings (found → acknowledged → fixed).';

-- ============================================
-- Monitored Sites: Auto-scan scheduling
-- ============================================

CREATE TABLE IF NOT EXISTS public.monitored_sites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    website_url TEXT NOT NULL,
    scan_frequency TEXT NOT NULL DEFAULT 'weekly', -- weekly | daily | monthly
    last_scan_id UUID REFERENCES public.scan_results(id) ON DELETE SET NULL,
    last_score INTEGER,
    previous_score INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, website_url)
);

CREATE INDEX IF NOT EXISTS idx_monitored_sites_user ON public.monitored_sites(user_id, is_active);

ALTER TABLE public.monitored_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitored_sites_user_all" ON public.monitored_sites
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitored_sites TO authenticated;

COMMENT ON TABLE public.monitored_sites IS 'Sites the user wants to monitor with periodic re-scans.';

-- ============================================
-- Compliance Badges: Embeddable badges
-- ============================================

CREATE TABLE IF NOT EXISTS public.compliance_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    website_url TEXT NOT NULL,
    badge_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    last_score INTEGER,
    last_scan_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, website_url)
);

CREATE INDEX IF NOT EXISTS idx_compliance_badges_token ON public.compliance_badges(badge_token);

ALTER TABLE public.compliance_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_badges_user_all" ON public.compliance_badges
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Allow public read for badge rendering
CREATE POLICY "compliance_badges_public_read" ON public.compliance_badges
    FOR SELECT TO anon
    USING (is_active = true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_badges TO authenticated;
GRANT SELECT ON public.compliance_badges TO anon;

COMMENT ON TABLE public.compliance_badges IS 'Embeddable compliance badges for user websites.';
