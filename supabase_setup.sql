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
