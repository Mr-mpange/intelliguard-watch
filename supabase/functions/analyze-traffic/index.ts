import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { trafficData, fileName } = await req.json();
    if (!trafficData || !trafficData.trim()) {
      return new Response(
        JSON.stringify({ error: 'Traffic data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit data size for AI processing
    const truncatedData = trafficData.substring(0, 15000);

    console.log(`Analyzing traffic from ${fileName || 'unknown file'}, data length: ${truncatedData.length}`);

    // Call Lovable AI for threat analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert cybersecurity threat analyst. Analyze network traffic logs and identify threats, anomalies, and attack patterns.

You MUST respond with valid JSON only (no markdown, no code blocks). Use this exact schema:
{
  "summary": {
    "totalRecords": <number of records/lines analyzed>,
    "threats": <number of threats detected>,
    "zeroDay": <number of potential zero-day/unknown threats>,
    "normal": <number of normal/clean records>,
    "avgConfidence": <average confidence score 0-1>
  },
  "predictions": [
    {
      "id": "<unique id>",
      "attackType": "<e.g. DDoS, SQL Injection, Port Scan, Brute Force, Malware, XSS, Phishing, Data Exfiltration, Normal>",
      "severity": "<critical|high|medium|low>",
      "confidence": <0-1>,
      "sourceIP": "<source IP or hostname>",
      "destinationIP": "<destination IP or hostname>",
      "timestamp": "<ISO timestamp>",
      "port": <port number>,
      "protocol": "<TCP|UDP|HTTP|HTTPS|DNS|etc>",
      "anomalyScore": <0-1, higher means more anomalous>,
      "isZeroDay": <boolean>,
      "details": "<brief description of why this is flagged>"
    }
  ],
  "attackDistribution": [{"name": "<attack type>", "value": <count>}],
  "severityDistribution": [{"severity": "<critical|high|medium|low>", "count": <number>}],
  "timelineData": [{"time": "<ISO timestamp>", "threats": <count>, "normal": <count>}]
}

Be thorough but realistic. Only flag real threats you can identify from the data. If the data looks mostly clean, report that honestly.`
          },
          {
            role: 'user',
            content: `Analyze the following network traffic log data and identify any security threats, anomalies, or attack patterns:\n\n${truncatedData}`
          }
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let analysisText = aiData.choices?.[0]?.message?.content || '';
    
    // Strip markdown code fences if present
    analysisText = analysisText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      console.error('Failed to parse AI response:', analysisText.substring(0, 500));
      throw new Error('AI returned invalid analysis format');
    }

    console.log(`Analysis complete: ${analysis.summary?.threats || 0} threats found`);

    // Create threat alerts for detected threats
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    if (analysis.predictions && analysis.predictions.length > 0) {
      const criticalThreats = analysis.predictions.filter(
        (p: { severity: string; attackType: string }) => 
          (p.severity === 'critical' || p.severity === 'high') && p.attackType !== 'Normal'
      );
      
      for (const threat of criticalThreats.slice(0, 10)) {
        await serviceClient.from('threat_alerts').insert({
          user_id: user.id,
          title: `${threat.attackType} Detected`,
          description: threat.details || `${threat.attackType} attack detected from ${threat.sourceIP}`,
          severity: threat.severity,
          threat_type: threat.attackType,
          source_ip: threat.sourceIP,
          source_domain: threat.destinationIP,
          confidence: Math.round(threat.confidence * 100),
        });
      }
    }

    // Log to audit
    await serviceClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'ai_traffic_analysis',
      resource_type: 'traffic_log',
      resource_id: fileName || 'unknown',
      details: {
        threats: analysis.summary?.threats || 0,
        totalRecords: analysis.summary?.totalRecords || 0,
        zeroDay: analysis.summary?.zeroDay || 0,
      },
      severity: analysis.summary?.threats > 0 ? 'warning' : 'info',
    });

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Traffic analysis error:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyze traffic';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
