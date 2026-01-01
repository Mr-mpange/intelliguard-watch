import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ThreatAlertRequest {
  recipientEmail: string;
  recipientName?: string;
  alertType: "critical" | "high" | "medium" | "low";
  threatDetails: {
    domain?: string;
    attackType?: string;
    severity: string;
    description: string;
    detectedAt: string;
    sourceIP?: string;
    confidence?: number;
  };
}

const getSeverityColor = (severity: string): string => {
  switch (severity.toLowerCase()) {
    case "critical": return "#dc2626";
    case "high": return "#ea580c";
    case "medium": return "#ca8a04";
    case "low": return "#16a34a";
    default: return "#6b7280";
  }
};

const getSeverityEmoji = (severity: string): string => {
  switch (severity.toLowerCase()) {
    case "critical": return "🚨";
    case "high": return "⚠️";
    case "medium": return "🔔";
    case "low": return "ℹ️";
    default: return "📢";
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-threat-alert function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail, recipientName, alertType, threatDetails }: ThreatAlertRequest = await req.json();

    console.log(`Sending ${alertType} alert to ${recipientEmail}`);

    const severityColor = getSeverityColor(threatDetails.severity);
    const severityEmoji = getSeverityEmoji(threatDetails.severity);

    const emailHtml = `
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
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${severityColor} 0%, #1e293b 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                ${severityEmoji} IntelliGuard Security Alert
              </h1>
              <p style="margin: 10px 0 0 0; color: #e2e8f0; font-size: 14px;">
                Threat Detection Notification
              </p>
            </td>
          </tr>
          
          <!-- Alert Badge -->
          <tr>
            <td style="padding: 20px 30px 0 30px; text-align: center;">
              <span style="display: inline-block; background-color: ${severityColor}; color: #ffffff; padding: 8px 24px; border-radius: 20px; font-size: 14px; font-weight: bold; text-transform: uppercase;">
                ${threatDetails.severity} Severity
              </span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #e2e8f0; font-size: 16px; margin: 0 0 20px 0;">
                Hello${recipientName ? ` ${recipientName}` : ''},
              </p>
              <p style="color: #94a3b8; font-size: 15px; margin: 0 0 25px 0; line-height: 1.6;">
                Our AI-powered threat detection system has identified suspicious activity that requires your attention.
              </p>
              
              <!-- Threat Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border-radius: 8px; border: 1px solid #334155; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #f1f5f9; font-size: 16px; border-bottom: 1px solid #334155; padding-bottom: 10px;">
                      Threat Details
                    </h3>
                    
                    ${threatDetails.attackType ? `
                    <p style="margin: 0 0 10px 0;">
                      <span style="color: #64748b; font-size: 13px;">Attack Type:</span><br>
                      <span style="color: #f1f5f9; font-size: 15px; font-weight: 500;">${threatDetails.attackType}</span>
                    </p>
                    ` : ''}
                    
                    ${threatDetails.domain ? `
                    <p style="margin: 0 0 10px 0;">
                      <span style="color: #64748b; font-size: 13px;">Domain:</span><br>
                      <span style="color: #f1f5f9; font-size: 15px; font-weight: 500;">${threatDetails.domain}</span>
                    </p>
                    ` : ''}
                    
                    ${threatDetails.sourceIP ? `
                    <p style="margin: 0 0 10px 0;">
                      <span style="color: #64748b; font-size: 13px;">Source IP:</span><br>
                      <span style="color: #f1f5f9; font-size: 15px; font-weight: 500;">${threatDetails.sourceIP}</span>
                    </p>
                    ` : ''}
                    
                    ${threatDetails.confidence ? `
                    <p style="margin: 0 0 10px 0;">
                      <span style="color: #64748b; font-size: 13px;">Confidence Score:</span><br>
                      <span style="color: #f1f5f9; font-size: 15px; font-weight: 500;">${threatDetails.confidence}%</span>
                    </p>
                    ` : ''}
                    
                    <p style="margin: 0 0 10px 0;">
                      <span style="color: #64748b; font-size: 13px;">Description:</span><br>
                      <span style="color: #f1f5f9; font-size: 15px; line-height: 1.5;">${threatDetails.description}</span>
                    </p>
                    
                    <p style="margin: 15px 0 0 0;">
                      <span style="color: #64748b; font-size: 13px;">Detected At:</span><br>
                      <span style="color: #f1f5f9; font-size: 15px;">${threatDetails.detectedAt}</span>
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 20px 0;">
                    <a href="#" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                      View in Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.6;">
                This is an automated notification from IntelliGuard. Please review the threat details and take appropriate action.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 30px; border-top: 1px solid #334155;">
              <p style="margin: 0; color: #64748b; font-size: 12px; text-align: center;">
                IntelliGuard - AI-Powered Cyber Threat Detection<br>
                <span style="color: #475569;">This is an automated security notification. Please do not reply.</span>
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

    const emailResponse = await resend.emails.send({
      from: "IntelliGuard <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `${severityEmoji} [${threatDetails.severity.toUpperCase()}] Security Alert - ${threatDetails.attackType || 'Threat Detected'}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the email action to audit_logs if we have auth context
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          await supabase.from("audit_logs").insert({
            user_id: user.id,
            action: "email_notification",
            resource_type: "security_alert",
            details: {
              alert_type: alertType,
              severity: threatDetails.severity,
              recipient: recipientEmail,
            },
            severity: alertType === "critical" ? "critical" : "info",
            user_agent: req.headers.get("user-agent") || "edge-function",
          });
        }
      }
    } catch (auditError) {
      console.error("Failed to log audit event:", auditError);
    }

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-threat-alert function:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
