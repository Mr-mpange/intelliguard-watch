-- Create domain_scans table to persist scan history
CREATE TABLE public.domain_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,
  is_malicious BOOLEAN NOT NULL DEFAULT false,
  positives INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  reputation INTEGER DEFAULT 0,
  categories JSONB DEFAULT '{}',
  engines JSONB DEFAULT '[]',
  ssl_issuer TEXT,
  ssl_valid_from TEXT,
  ssl_valid_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.domain_scans ENABLE ROW LEVEL SECURITY;

-- Users can view their own scans
CREATE POLICY "Users can view their own domain scans"
ON public.domain_scans
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own scans
CREATE POLICY "Users can insert their own domain scans"
ON public.domain_scans
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_domain_scans_user_id ON public.domain_scans(user_id);
CREATE INDEX idx_domain_scans_created_at ON public.domain_scans(created_at DESC);