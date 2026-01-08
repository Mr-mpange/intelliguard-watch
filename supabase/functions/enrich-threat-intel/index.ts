import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentRequest {
  domain?: string;
  ip?: string;
  scanId?: string;
}

interface ThreatIndicator {
  source: string;
  type: string;
  severity: string;
  description: string;
  tags: string[];
  first_seen?: string;
  last_seen?: string;
}

// AlienVault OTX API for threat intelligence (free tier available)
async function fetchAlienVaultOTX(indicator: string, type: 'domain' | 'IPv4'): Promise<ThreatIndicator[]> {
  const otxApiKey = Deno.env.get('ALIENVAULT_OTX_KEY');
  
  if (!otxApiKey) {
    console.log('AlienVault OTX API key not configured, using mock data');
    return getMockThreatIntel(indicator, type);
  }

  try {
    const endpoint = type === 'domain' 
      ? `https://otx.alienvault.com/api/v1/indicators/domain/${indicator}/general`
      : `https://otx.alienvault.com/api/v1/indicators/IPv4/${indicator}/general`;

    const response = await fetch(endpoint, {
      headers: { 'X-OTX-API-KEY': otxApiKey },
    });

    if (!response.ok) {
      console.error('AlienVault OTX API error:', response.status);
      return [];
    }

    const data = await response.json();
    const indicators: ThreatIndicator[] = [];

    // Parse pulse information
    if (data.pulse_info?.pulses) {
      for (const pulse of data.pulse_info.pulses.slice(0, 5)) {
        indicators.push({
          source: 'AlienVault OTX',
          type: pulse.attack_types?.[0] || 'Unknown',
          severity: pulse.adversary ? 'high' : 'medium',
          description: pulse.description || pulse.name,
          tags: pulse.tags || [],
          first_seen: pulse.created,
          last_seen: pulse.modified,
        });
      }
    }

    return indicators;
  } catch (error) {
    console.error('Error fetching from AlienVault OTX:', error);
    return [];
  }
}

// AbuseIPDB for IP reputation (free tier available)
async function fetchAbuseIPDB(ip: string): Promise<ThreatIndicator[]> {
  const abuseIpDbKey = Deno.env.get('ABUSEIPDB_API_KEY');
  
  if (!abuseIpDbKey) {
    console.log('AbuseIPDB API key not configured');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`,
      {
        headers: {
          'Key': abuseIpDbKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('AbuseIPDB API error:', response.status);
      return [];
    }

    const data = await response.json();
    const result = data.data;

    if (result.abuseConfidenceScore > 0) {
      return [{
        source: 'AbuseIPDB',
        type: 'Malicious IP',
        severity: result.abuseConfidenceScore > 80 ? 'critical' : 
                  result.abuseConfidenceScore > 50 ? 'high' : 'medium',
        description: `IP reported ${result.totalReports} times. ISP: ${result.isp}. Country: ${result.countryCode}.`,
        tags: result.usageType ? [result.usageType] : [],
        last_seen: result.lastReportedAt,
      }];
    }

    return [];
  } catch (error) {
    console.error('Error fetching from AbuseIPDB:', error);
    return [];
  }
}

// Mock threat intel for demo purposes
function getMockThreatIntel(indicator: string, type: 'domain' | 'IPv4'): ThreatIndicator[] {
  const mockIndicators: ThreatIndicator[] = [];
  
  // Generate realistic mock data based on indicator patterns
  const isSuspicious = indicator.includes('temp') || indicator.includes('free') || 
                       indicator.includes('test') || indicator.length < 6;

  if (isSuspicious || Math.random() > 0.7) {
    mockIndicators.push({
      source: 'Threat Intelligence Feed',
      type: type === 'domain' ? 'Phishing' : 'Botnet C2',
      severity: Math.random() > 0.5 ? 'high' : 'medium',
      description: type === 'domain' 
        ? `Domain associated with known phishing campaigns targeting financial institutions.`
        : `IP address linked to command and control infrastructure.`,
      tags: ['malware', 'phishing', 'suspicious'],
      first_seen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_seen: new Date().toISOString(),
    });
  }

  if (Math.random() > 0.6) {
    mockIndicators.push({
      source: 'Community Reports',
      type: 'Spam',
      severity: 'low',
      description: `Reported in community threat sharing platforms for spam activity.`,
      tags: ['spam', 'unwanted'],
      first_seen: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return mockIndicators;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { domain, ip, scanId }: EnrichmentRequest = await req.json();

    if (!domain && !ip) {
      return new Response(
        JSON.stringify({ error: 'Either domain or ip is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Enriching threat intel for: ${domain || ip}`);

    const indicators: ThreatIndicator[] = [];

    // Fetch from multiple threat intelligence sources
    if (domain) {
      const otxIndicators = await fetchAlienVaultOTX(domain, 'domain');
      indicators.push(...otxIndicators);
    }

    if (ip) {
      const otxIndicators = await fetchAlienVaultOTX(ip, 'IPv4');
      indicators.push(...otxIndicators);

      const abuseIndicators = await fetchAbuseIPDB(ip);
      indicators.push(...abuseIndicators);
    }

    // Calculate overall threat score
    const threatScore = indicators.reduce((score, ind) => {
      switch (ind.severity) {
        case 'critical': return score + 40;
        case 'high': return score + 25;
        case 'medium': return score + 10;
        case 'low': return score + 5;
        default: return score;
      }
    }, 0);

    const enrichedData = {
      indicator: domain || ip,
      type: domain ? 'domain' : 'ip',
      threatScore: Math.min(100, threatScore),
      riskLevel: threatScore >= 60 ? 'critical' : 
                 threatScore >= 40 ? 'high' : 
                 threatScore >= 20 ? 'medium' : 'low',
      indicators,
      sources: [...new Set(indicators.map(i => i.source))],
      tags: [...new Set(indicators.flatMap(i => i.tags))],
      enrichedAt: new Date().toISOString(),
    };

    // If this is for a specific scan, create an alert for high-risk indicators
    if (scanId && enrichedData.riskLevel !== 'low') {
      // Get user ID from the scan
      const { data: scanData } = await supabase
        .from('domain_scans')
        .select('user_id')
        .eq('id', scanId)
        .single();

      if (scanData?.user_id) {
        await supabase.from('threat_alerts').insert({
          user_id: scanData.user_id,
          severity: enrichedData.riskLevel,
          title: `Threat Intelligence Alert: ${domain || ip}`,
          description: `External threat feeds report ${indicators.length} indicators for this ${domain ? 'domain' : 'IP'}. Risk score: ${enrichedData.threatScore}/100.`,
          threat_type: 'threat_intelligence',
          source_domain: domain || null,
          source_ip: ip || null,
          confidence: enrichedData.threatScore,
        });
      }
    }

    return new Response(
      JSON.stringify(enrichedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Threat enrichment error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
