import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VirusTotalResult {
  isMalicious: boolean;
  positives: number;
  total: number;
  categories: Record<string, string>;
  reputation: number;
  lastAnalysisDate: string | null;
  engines: Array<{
    name: string;
    result: string;
    category: string;
  }>;
  whois?: string;
  sslCertificate?: {
    issuer: string;
    validFrom: string;
    validTo: string;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('VIRUSTOTAL_API_KEY');
    if (!apiKey) {
      console.error('VIRUSTOTAL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'VirusTotal API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { domain } = await req.json();
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean the domain (remove protocol, path, etc.)
    let cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0].split('?')[0];
    console.log(`Scanning domain: ${cleanDomain}`);

    // Get domain report from VirusTotal
    const vtResponse = await fetch(
      `https://www.virustotal.com/api/v3/domains/${cleanDomain}`,
      {
        method: 'GET',
        headers: {
          'x-apikey': apiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!vtResponse.ok) {
      const errorText = await vtResponse.text();
      console.error('VirusTotal API error:', vtResponse.status, errorText);
      
      if (vtResponse.status === 404) {
        // Domain not found in VirusTotal, return clean result
        return new Response(
          JSON.stringify({
            isMalicious: false,
            positives: 0,
            total: 0,
            categories: {},
            reputation: 0,
            lastAnalysisDate: null,
            engines: [],
            message: 'Domain not found in VirusTotal database'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`VirusTotal API error: ${vtResponse.status}`);
    }

    const vtData = await vtResponse.json();
    const attributes = vtData.data?.attributes || {};
    
    // Extract analysis stats
    const lastAnalysisStats = attributes.last_analysis_stats || {};
    const positives = (lastAnalysisStats.malicious || 0) + (lastAnalysisStats.suspicious || 0);
    const total = Object.values(lastAnalysisStats).reduce((sum: number, val: unknown) => sum + (val as number || 0), 0);

    // Extract engine results
    const lastAnalysisResults = attributes.last_analysis_results || {};
    const engines = Object.entries(lastAnalysisResults).map(([name, data]: [string, unknown]) => {
      const engineData = data as { result: string; category: string };
      return {
        name,
        result: engineData.result || 'clean',
        category: engineData.category || 'undetected',
      };
    }).filter(e => e.category === 'malicious' || e.category === 'suspicious');

    const result: VirusTotalResult = {
      isMalicious: positives > 0,
      positives,
      total: total as number,
      categories: attributes.categories || {},
      reputation: attributes.reputation || 0,
      lastAnalysisDate: attributes.last_analysis_date 
        ? new Date(attributes.last_analysis_date * 1000).toISOString() 
        : null,
      engines,
    };

    // Add SSL info if available
    if (attributes.last_https_certificate) {
      const cert = attributes.last_https_certificate;
      result.sslCertificate = {
        issuer: cert.issuer?.O || 'Unknown',
        validFrom: cert.validity?.not_before || '',
        validTo: cert.validity?.not_after || '',
      };
    }

    console.log(`Domain scan complete: ${cleanDomain}, malicious: ${result.isMalicious}, positives: ${positives}/${total}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error scanning domain:', error);
    const message = error instanceof Error ? error.message : 'Failed to scan domain';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
