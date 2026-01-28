-- Create the waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
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
