const roleLabels: Record<string, string> = {
  admin: "Yönetici",
  accountant: "Muhasebeci",
  viewer: "İzleyici",
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

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return { error: "RESEND_API_KEY yapılandırılmamış" };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: "Siyakat <noreply@siyakat.app>",
    to,
    subject: `${orgName} ekibine davet edildiniz — Siyakat`,
    html: `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f0f;padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-size:13px;font-weight:700;letter-spacing:4px;color:#6b7280;text-transform:uppercase;">SIYAKAT</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">

              <!-- Top accent line -->
              <tr>
                <td style="height:3px;background:linear-gradient(90deg,#78716c,#d4a853,#78716c);"></td>
              </tr>

              <!-- Header -->
              <tr>
                <td style="padding:40px 40px 32px;text-align:center;border-bottom:1px solid #2a2a2a;">
                  <div style="display:inline-block;width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#292524,#1c1917);border:1px solid #3a3632;color:#d4a853;font-size:24px;font-weight:700;line-height:56px;text-align:center;margin-bottom:20px;">س</div>
                  <h1 style="color:#f5f5f5;font-size:22px;margin:0 0 6px;font-weight:600;letter-spacing:-0.3px;">Ekibe Davet Edildiniz</h1>
                  <p style="color:#6b7280;font-size:13px;margin:0;">Muhasebe yönetim platformu</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:36px 40px;">
                  <p style="color:#a3a3a3;font-size:14px;line-height:1.7;margin:0 0 8px;">
                    <span style="color:#d4a853;font-weight:600;">${inviterName}</span>, sizi
                    <span style="color:#f5f5f5;font-weight:600;">${orgName}</span> organizasyonuna
                    <span style="color:#f5f5f5;font-weight:500;">${roleLabel}</span> olarak davet etti.
                  </p>
                  <p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 32px;">
                    Aşağıdaki butona tıklayarak daveti kabul edebilir ve hesabınızı oluşturabilirsiniz.
                  </p>

                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4a853,#b8893a);color:#0f0f0f;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.5px;">
                          Daveti Kabul Et
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="color:#4b4b4b;font-size:12px;line-height:1.6;margin:28px 0 0;text-align:center;">
                    Bu davet 7 gün içinde geçerliliğini yitirecektir.
                  </p>
                </td>
              </tr>

              <!-- Bottom accent line -->
              <tr>
                <td style="height:1px;background:#2a2a2a;"></td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:20px 40px;text-align:center;">
                  <p style="color:#4b4b4b;font-size:11px;margin:0;letter-spacing:0.3px;">
                    Bu e-postayı beklemiyorsanız güvenle yok sayabilirsiniz. · siyakat.app
                  </p>
                </td>
              </tr>

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
