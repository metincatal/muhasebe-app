import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const roleLabels: Record<string, string> = {
  admin: "Yonetici",
  accountant: "Muhasebeci",
  viewer: "Izleyici",
};

export async function sendInviteEmail({
  to,
  inviterName,
  orgName,
  role,
  inviteUrl,
}: {
  to: string;
  inviterName: string;
  orgName: string;
  role: string;
  inviteUrl: string;
}) {
  const roleLabel = roleLabels[role] || role;

  const { data, error } = await resend.emails.send({
    from: "Muhasebe Pro <onboarding@resend.dev>",
    to,
    subject: `${orgName} - Muhasebe Pro'ya davet edildiniz`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#334155,#1e293b);padding:32px 32px 24px;text-align:center;">
              <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#4f46e5);color:white;font-size:22px;font-weight:bold;line-height:48px;text-align:center;">M</div>
              <h1 style="color:#ffffff;font-size:20px;margin:12px 0 4px;font-weight:600;">Muhasebe Pro</h1>
              <p style="color:#94a3b8;font-size:13px;margin:0;">Modern muhasebe yonetimi</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="color:#1e293b;font-size:18px;margin:0 0 16px;font-weight:600;">Davet Edildiniz</h2>
              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 8px;">
                <strong>${inviterName}</strong> sizi <strong>${orgName}</strong> organizasyonuna
                <strong>${roleLabel}</strong> olarak davet etti.
              </p>
              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
                Asagidaki butona tiklayarak daveti kabul edebilir ve hesabinizi olusturabilirsiniz.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#334155,#1e293b);color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.3px;">
                      Daveti Kabul Et
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:24px 0 0;text-align:center;">
                Bu davet 7 gun icinde gecerliliğini yitirecektir.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="color:#94a3b8;font-size:11px;margin:0;">
                Bu e-postayi beklemiyorsaniz guvende yok sayabilirsiniz.
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

  if (error) {
    console.error("Resend email error:", error);
    return { error: error.message };
  }

  return { data };
}
