-- Enable realtime for domain_scans
ALTER TABLE public.domain_scans REPLICA IDENTITY FULL;

-- Create monitored_domains table for scheduled scanning
CREATE TABLE public.monitored_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  scan_frequency TEXT NOT NULL DEFAULT 'daily', -- hourly, daily, weekly
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  last_status TEXT, -- clean, suspicious, malicious
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain)
);

-- Enable RLS
ALTER TABLE public.monitored_domains ENABLE ROW LEVEL SECURITY;

-- Users can view their own monitored domains
CREATE POLICY "Users can view their own monitored domains"
ON public.monitored_domains
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own monitored domains
CREATE POLICY "Users can insert their own monitored domains"
ON public.monitored_domains
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own monitored domains
CREATE POLICY "Users can update their own monitored domains"
ON public.monitored_domains
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own monitored domains
CREATE POLICY "Users can delete their own monitored domains"
ON public.monitored_domains
FOR DELETE
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_monitored_domains_user_id ON public.monitored_domains(user_id);
CREATE INDEX idx_monitored_domains_active ON public.monitored_domains(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_monitored_domains_updated_at
BEFORE UPDATE ON public.monitored_domains
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for domain_scans table
ALTER PUBLICATION supabase_realtime ADD TABLE public.domain_scans;