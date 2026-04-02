import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonitoredDomain {
  id: string;
  user_id: string;
  domain: string;
  scan_frequency: string;
  last_scanned_at: string | null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const virusTotalApiKey = Deno.env.get('VIRUSTOTAL_API_KEY');

    if (!virusTotalApiKey) {
      console.error('VIRUSTOTAL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'VirusTotal API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();

    // Get domains due for scanning based on frequency
    const { data: domains, error: fetchError } = await supabase
      .from('monitored_domains')
      .select('*')
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching monitored domains:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${domains?.length || 0} active monitored domains`);

    const domainsToScan = (domains || []).filter((domain: MonitoredDomain) => {
      if (!domain.last_scanned_at) return true;
      
      const lastScanned = new Date(domain.last_scanned_at);
      const hoursSinceLastScan = (now.getTime() - lastScanned.getTime()) / (1000 * 60 * 60);
      
      switch (domain.scan_frequency) {
        case 'hourly':
          return hoursSinceLastScan >= 1;
        case 'daily':
          return hoursSinceLastScan >= 24;
        case 'weekly':
          return hoursSinceLastScan >= 168;
        default:
          return hoursSinceLastScan >= 24;
      }
    });

    console.log(`${domainsToScan.length} domains due for scanning`);

    const results: { domain: string; status: string; error?: string }[] = [];

    for (const monitoredDomain of domainsToScan) {
      try {
        console.log(`Scanning domain: ${monitoredDomain.domain}`);
        
        // Call VirusTotal API
        const vtResponse = await fetch(
          `https://www.virustotal.com/api/v3/domains/${monitoredDomain.domain}`,
          {
            method: 'GET',
            headers: {
              'x-apikey': virusTotalApiKey,
              'Accept': 'application/json',
            },
          }
        );

        let scanStatus = 'clean';
        let positives = 0;
        let total = 0;
        let reputation = 0;
        let engines: { name: string; result: string; category: string }[] = [];
        let categories = {};

        if (vtResponse.ok) {
          const vtData = await vtResponse.json();
          const attributes = vtData.data?.attributes || {};
          
          const lastAnalysisStats = attributes.last_analysis_stats || {};
          positives = (lastAnalysisStats.malicious || 0) + (lastAnalysisStats.suspicious || 0);
          total = Object.values(lastAnalysisStats).reduce((sum: number, val: unknown) => sum + (val as number || 0), 0);
          reputation = attributes.reputation || 0;
          categories = attributes.categories || {};

          const lastAnalysisResults = attributes.last_analysis_results || {};
          engines = Object.entries(lastAnalysisResults)
            .map(([name, data]: [string, unknown]) => {
              const engineData = data as { result: string; category: string };
              return {
                name,
                result: engineData.result || 'clean',
                category: engineData.category || 'undetected',
              };
            })
            .filter(e => e.category === 'malicious' || e.category === 'suspicious');

          if (positives > 0) {
            scanStatus = engines.some(e => e.category === 'malicious') ? 'malicious' : 'suspicious';
          }
        } else if (vtResponse.status !== 404) {
          throw new Error(`VirusTotal API error: ${vtResponse.status}`);
        }

        // Save scan result
        await supabase.from('domain_scans').insert({
          user_id: monitoredDomain.user_id,
          domain: monitoredDomain.domain,
          is_malicious: scanStatus === 'malicious',
          positives,
          total,
          reputation,
          categories,
          engines,
        });

        // Update monitored domain
        await supabase
          .from('monitored_domains')
          .update({
            last_scanned_at: now.toISOString(),
            last_status: scanStatus,
          })
          .eq('id', monitoredDomain.id);

        // Create threat alert if malicious
        if (scanStatus === 'malicious' || scanStatus === 'suspicious') {
          await supabase.from('threat_alerts').insert({
            user_id: monitoredDomain.user_id,
            title: `${scanStatus === 'malicious' ? 'Malicious' : 'Suspicious'} Activity: ${monitoredDomain.domain}`,
            description: `Scheduled scan detected ${positives} security vendor${positives !== 1 ? 's' : ''} flagging ${monitoredDomain.domain}. Engines: ${engines.slice(0, 3).map(e => e.name).join(', ')}${engines.length > 3 ? '...' : ''}`,
            severity: scanStatus === 'malicious' ? 'critical' : 'medium',
            threat_type: 'Domain Threat',
            source_domain: monitoredDomain.domain,
            confidence: Math.round((positives / (total || 1)) * 100),
          });
          console.log(`Alert created for ${monitoredDomain.domain}`);
        }

        results.push({ domain: monitoredDomain.domain, status: scanStatus });
        console.log(`Scan complete for ${monitoredDomain.domain}: ${scanStatus}`);

        // Rate limiting - VirusTotal has API limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error scanning ${monitoredDomain.domain}:`, message);
        results.push({ domain: monitoredDomain.domain, status: 'error', error: message });
      }
    }

    return new Response(
      JSON.stringify({ 
        scanned: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scheduled scan error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
