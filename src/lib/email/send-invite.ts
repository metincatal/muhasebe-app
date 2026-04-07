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

  // Mutlak logo URL'i için site kökenini inviteUrl'den türet
  const siteOrigin = new URL(inviteUrl).origin;
  const logoUrl = `${siteOrigin}/icons/icon-512.png`;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: "Siyakat <noreply@siyakat.app>",
    to,
    subject: `${orgName} ekibine davet edildiniz`,
    html: `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Siyakat Daveti</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;">

          <!-- Header: logo + marka adı -->
          <tr>
            <td style="background-color:#0f172a;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <img src="${logoUrl}" alt="Siyakat" width="64" height="64"
                   style="display:inline-block;border-radius:14px;margin-bottom:14px;" />
              <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.4px;margin:0;">Siyakat</div>
              <div style="color:#94a3b8;font-size:13px;margin-top:4px;">Muhasebe ve Finans Yönetimi</div>
            </td>
          </tr>

          <!-- Kart gövdesi -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 40px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

              <h1 style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 12px;letter-spacing:-0.3px;">
                Ekibe Davet Edildiniz
              </h1>

              <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
                <strong style="color:#0f172a;">${inviterName}</strong> sizi
                <strong style="color:#0f172a;">${orgName}</strong> organizasyonuna
                <strong style="color:#0f172a;">${roleLabel}</strong> rolüyle davet etti.
              </p>

              <!-- Rol rozeti -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
                <tr>
                  <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 18px;">
                    <span style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Rol</span>
                    <span style="color:#0f172a;font-size:14px;font-weight:600;margin-left:10px;">${roleLabel}</span>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}"
                       style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:-0.1px;">
                      Daveti Kabul Et
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:24px 0 0;text-align:center;">
                Bu davet 7 gün süreyle geçerlidir.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                Bu daveti beklemiyorsanız güvenle yok sayabilirsiniz.
              </p>
              <p style="color:#cbd5e1;font-size:11px;margin:6px 0 0;">
                © ${new Date().getFullYear()} Siyakat · siyakat.app
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
