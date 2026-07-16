-- Migration to create email_verification_codes table for self-managed verification flow

CREATE TABLE IF NOT EXISTS public.email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS email_verification_codes_email_code_idx ON public.email_verification_codes (email, code);
CREATE INDEX IF NOT EXISTS email_verification_codes_user_id_idx ON public.email_verification_codes (user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- No public read/write access policies are defined, meaning only the service role can access this table.
-- Supabase Edge Functions with the service role key will bypass RLS.
