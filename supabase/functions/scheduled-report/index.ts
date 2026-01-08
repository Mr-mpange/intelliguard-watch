import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduledReport {
  id: string;
  user_id: string;
  report_name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  include_scan_history: boolean;
  include_threat_summary: boolean;
  include_monitored_domains: boolean;
  include_audit_logs: boolean;
  next_scheduled_at: string;
}

interface ReportData {
  scanHistory?: {
    total: number;
    malicious: number;
    clean: number;
    recentScans: { domain: string; is_malicious: boolean; created_at: string }[];
  };
  threatSummary?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  monitoredDomains?: {
    total: number;
    active: number;
    domains: { domain: string; last_status: string; last_scanned_at: string }[];
  };
  auditLogs?: {
    total: number;
    actions: { action: string; count: number }[];
  };
}

function getNextScheduledDate(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function generateReportHtml(reportName: string, data: ReportData, frequency: string): string {
  const periodLabel = frequency === 'daily' ? 'Daily' : frequency === 'weekly' ? 'Weekly' : 'Monthly';
  
  let sectionsHtml = '';

  if (data.scanHistory) {
    sectionsHtml += `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #f1f5f9; font-size: 20px; margin: 0 0 15px 0; border-bottom: 1px solid #334155; padding-bottom: 10px;">
          📊 Scan History
        </h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
          <div style="background: #1e293b; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${data.scanHistory.total}</div>
            <div style="color: #64748b; font-size: 12px;">Total Scans</div>
          </div>
          <div style="background: #1e293b; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${data.scanHistory.malicious}</div>
            <div style="color: #64748b; font-size: 12px;">Malicious</div>
          </div>
          <div style="background: #1e293b; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #22c55e;">${data.scanHistory.clean}</div>
            <div style="color: #64748b; font-size: 12px;">Clean</div>
          </div>
        </div>
        ${data.scanHistory.recentScans.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #1e293b;">
                <th style="padding: 10px; text-align: left; color: #94a3b8; font-size: 12px;">Domain</th>
                <th style="padding: 10px; text-align: left; color: #94a3b8; font-size: 12px;">Status</th>
                <th style="padding: 10px; text-align: left; color: #94a3b8; font-size: 12px;">Scanned</th>
              </tr>
            </thead>
            <tbody>
              ${data.scanHistory.recentScans.map(scan => `
                <tr style="border-bottom: 1px solid #1e293b;">
                  <td style="padding: 10px; color: #f1f5f9; font-size: 14px;">${scan.domain}</td>
                  <td style="padding: 10px;">
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; ${
                      scan.is_malicious 
                        ? 'background: #dc2626; color: #fff;' 
                        : 'background: #16a34a; color: #fff;'
                    }">${scan.is_malicious ? 'Malicious' : 'Clean'}</span>
                  </td>
                  <td style="padding: 10px; color: #64748b; font-size: 12px;">${formatDate(scan.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>
    `;
  }

  if (data.threatSummary) {
    sectionsHtml += `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #f1f5f9; font-size: 20px; margin: 0 0 15px 0; border-bottom: 1px solid #334155; padding-bottom: 10px;">
          🚨 Threat Summary
        </h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
          <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #fff;">${data.threatSummary.critical}</div>
            <div style="color: #fca5a5; font-size: 12px;">Critical</div>
          </div>
          <div style="background: linear-gradient(135deg, #ea580c, #c2410c); padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #fff;">${data.threatSummary.high}</div>
            <div style="color: #fed7aa; font-size: 12px;">High</div>
          </div>
          <div style="background: linear-gradient(135deg, #ca8a04, #a16207); padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #fff;">${data.threatSummary.medium}</div>
            <div style="color: #fef08a; font-size: 12px;">Medium</div>
          </div>
          <div style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #fff;">${data.threatSummary.low}</div>
            <div style="color: #bbf7d0; font-size: 12px;">Low</div>
          </div>
        </div>
      </div>
    `;
  }

  if (data.monitoredDomains) {
    sectionsHtml += `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #f1f5f9; font-size: 20px; margin: 0 0 15px 0; border-bottom: 1px solid #334155; padding-bottom: 10px;">
          🌐 Monitored Domains
        </h2>
        <p style="color: #94a3b8; margin-bottom: 15px;">
          ${data.monitoredDomains.active} of ${data.monitoredDomains.total} domains actively monitored
        </p>
        ${data.monitoredDomains.domains.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #1e293b;">
                <th style="padding: 10px; text-align: left; color: #94a3b8; font-size: 12px;">Domain</th>
                <th style="padding: 10px; text-align: left; color: #94a3b8; font-size: 12px;">Status</th>
                <th style="padding: 10px; text-align: left; color: #94a3b8; font-size: 12px;">Last Scanned</th>
              </tr>
            </thead>
            <tbody>
              ${data.monitoredDomains.domains.map(d => `
                <tr style="border-bottom: 1px solid #1e293b;">
                  <td style="padding: 10px; color: #f1f5f9; font-size: 14px;">${d.domain}</td>
                  <td style="padding: 10px; color: ${
                    d.last_status === 'malicious' ? '#ef4444' : 
                    d.last_status === 'suspicious' ? '#f59e0b' : '#22c55e'
                  }; font-size: 14px;">${d.last_status || 'Pending'}</td>
                  <td style="padding: 10px; color: #64748b; font-size: 12px;">${d.last_scanned_at ? formatDate(d.last_scanned_at) : 'Never'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="700" cellpadding="0" cellspacing="0" style="background-color: #0f172a;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                📋 ${periodLabel} Security Report
              </h1>
              <p style="margin: 10px 0 0 0; color: #e2e8f0; font-size: 14px;">
                ${reportName} - Generated ${new Date().toLocaleDateString()}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background-color: #0f172a; padding: 30px; border: 1px solid #334155; border-top: none;">
              ${sectionsHtml}
              
              <!-- Footer Note -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155; text-align: center;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">
                  This report was automatically generated by IntelliGuard.<br>
                  <a href="#" style="color: #3b82f6;">View Dashboard</a> | 
                  <a href="#" style="color: #3b82f6;">Manage Report Settings</a>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1e293b; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                IntelliGuard - AI-Powered Cyber Threat Detection
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

serve(async (req: Request) => {
  console.log("scheduled-report function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

    // Get all reports that are due
    const { data: dueReports, error: fetchError } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('is_active', true)
      .lte('next_scheduled_at', now.toISOString());

    if (fetchError) {
      console.error('Error fetching scheduled reports:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${dueReports?.length || 0} reports due for sending`);

    const results: { report_id: string; status: string; error?: string }[] = [];

    for (const report of (dueReports || []) as ScheduledReport[]) {
      try {
        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(report.user_id);
        const userEmail = userData?.user?.email;

        if (!userEmail) {
          results.push({ report_id: report.id, status: 'skipped', error: 'No email found' });
          continue;
        }

        // Get user's profile for name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', report.user_id)
          .single();

        // Calculate date range based on frequency
        const startDate = new Date();
        switch (report.frequency) {
          case 'daily':
            startDate.setDate(startDate.getDate() - 1);
            break;
          case 'weekly':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'monthly':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        }

        const reportData: ReportData = {};

        // Fetch scan history
        if (report.include_scan_history) {
          const { data: scans } = await supabase
            .from('domain_scans')
            .select('domain, is_malicious, created_at')
            .eq('user_id', report.user_id)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(10);

          const allScans = scans || [];
          reportData.scanHistory = {
            total: allScans.length,
            malicious: allScans.filter(s => s.is_malicious).length,
            clean: allScans.filter(s => !s.is_malicious).length,
            recentScans: allScans.slice(0, 5),
          };
        }

        // Fetch threat summary
        if (report.include_threat_summary) {
          const { data: alerts } = await supabase
            .from('threat_alerts')
            .select('severity')
            .eq('user_id', report.user_id)
            .gte('created_at', startDate.toISOString());

          const alertsList = alerts || [];
          reportData.threatSummary = {
            critical: alertsList.filter(a => a.severity === 'critical').length,
            high: alertsList.filter(a => a.severity === 'high').length,
            medium: alertsList.filter(a => a.severity === 'medium').length,
            low: alertsList.filter(a => a.severity === 'low').length,
          };
        }

        // Fetch monitored domains
        if (report.include_monitored_domains) {
          const { data: domains } = await supabase
            .from('monitored_domains')
            .select('domain, last_status, last_scanned_at, is_active')
            .eq('user_id', report.user_id)
            .limit(10);

          const domainsList = domains || [];
          reportData.monitoredDomains = {
            total: domainsList.length,
            active: domainsList.filter(d => d.is_active).length,
            domains: domainsList,
          };
        }

        // Generate and send email
        const emailHtml = generateReportHtml(report.report_name, reportData, report.frequency);

        await resend.emails.send({
          from: "IntelliGuard <onboarding@resend.dev>",
          to: [userEmail],
          subject: `📋 ${report.frequency.charAt(0).toUpperCase() + report.frequency.slice(1)} Security Report - ${report.report_name}`,
          html: emailHtml,
        });

        // Update report with next scheduled time
        const nextScheduled = getNextScheduledDate(report.frequency);
        await supabase
          .from('scheduled_reports')
          .update({
            last_sent_at: now.toISOString(),
            next_scheduled_at: nextScheduled.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', report.id);

        results.push({ report_id: report.id, status: 'sent' });
        console.log(`Report ${report.id} sent to ${userEmail}`);

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing report ${report.id}:`, message);
        results.push({ report_id: report.id, status: 'error', error: message });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scheduled report error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
