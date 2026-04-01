import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "Decern <noreply@decern.dev>";

export async function sendWelcomeEmail(to: string, name?: string) {
  const displayName = name?.trim() || "there";

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to Decern!",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#0284c7;padding:32px 40px;text-align:center;">
              <span style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Decern</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">
                Hey ${displayName}!
              </h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">
                Welcome to Decern. You're all set to start capturing and enforcing your team's technical decisions.
              </p>
              <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#0f172a;">
                Here's how to get started:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:8px 0;font-size:15px;line-height:1.6;color:#475569;">
                    <span style="display:inline-block;width:24px;height:24px;background:#0284c7;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:13px;font-weight:600;margin-right:12px;">1</span>
                    Create your first project
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:15px;line-height:1.6;color:#475569;">
                    <span style="display:inline-block;width:24px;height:24px;background:#0284c7;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:13px;font-weight:600;margin-right:12px;">2</span>
                    Document your first decision
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:15px;line-height:1.6;color:#475569;">
                    <span style="display:inline-block;width:24px;height:24px;background:#0284c7;color:#fff;border-radius:50%;text-align:center;line-height:24px;font-size:13px;font-weight:600;margin-right:12px;">3</span>
                    Add Decern Gate to your CI pipeline
                  </td>
                </tr>
              </table>
              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#0284c7;border-radius:8px;">
                    <a href="https://app.decern.dev/dashboard" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#94a3b8;">
                Need help? Check out our <a href="https://decern.dev/docs" style="color:#0284c7;text-decoration:none;">documentation</a> or reply to this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:13px;color:#94a3b8;">
                Decern — Technical Decision Records for Engineering Teams
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}
