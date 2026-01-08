-- Create a threat_alerts table for real-time threat notifications
CREATE TABLE IF NOT EXISTS public.threat_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  threat_type TEXT NOT NULL,
  source_domain TEXT,
  source_ip TEXT,
  confidence INTEGER,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.threat_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for threat_alerts
CREATE POLICY "Users can view their own alerts" 
ON public.threat_alerts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" 
ON public.threat_alerts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts" 
ON public.threat_alerts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Service role can insert alerts
CREATE POLICY "Service can insert alerts" 
ON public.threat_alerts 
FOR INSERT 
WITH CHECK (true);

-- Enable realtime for threat_alerts
ALTER TABLE public.threat_alerts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.threat_alerts;

-- Create scheduled_reports table for report configuration
CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  include_scan_history BOOLEAN NOT NULL DEFAULT true,
  include_threat_summary BOOLEAN NOT NULL DEFAULT true,
  include_monitored_domains BOOLEAN NOT NULL DEFAULT true,
  include_audit_logs BOOLEAN NOT NULL DEFAULT false,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for scheduled_reports
CREATE POLICY "Users can view their own scheduled reports" 
ON public.scheduled_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled reports" 
ON public.scheduled_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled reports" 
ON public.scheduled_reports 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled reports" 
ON public.scheduled_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_threat_alerts_user_created ON public.threat_alerts(user_id, created_at DESC);
CREATE INDEX idx_threat_alerts_unread ON public.threat_alerts(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_scheduled_reports_next ON public.scheduled_reports(next_scheduled_at) WHERE is_active = true;