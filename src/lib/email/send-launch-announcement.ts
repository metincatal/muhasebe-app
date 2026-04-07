export async function sendLaunchAnnouncementEmail({
  to,
  name,
}: {
  to: string;
  name?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return { error: "RESEND_API_KEY yapılandırılmamış" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://siyakat.app";
  const logoUrl = `${siteUrl}/icons/icon-512.png`;
  const greeting = name ? `Merhaba ${name.split(" ")[0]},` : "Merhaba,";

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: "Siyakat <noreply@siyakat.app>",
    to,
    subject: "Siyakat kararlı sürüme geçti 🎉",
    html: `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Siyakat v1.0 Yayında</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:540px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#0f172a;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <img src="${logoUrl}" alt="Siyakat" width="64" height="64"
                   style="display:inline-block;border-radius:14px;margin-bottom:14px;" />
              <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.4px;margin:0;">Siyakat</div>
              <div style="color:#94a3b8;font-size:13px;margin-top:4px;">Muhasebe ve Finans Yönetimi</div>
            </td>
          </tr>

          <!-- Kart -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 40px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

              <p style="color:#64748b;font-size:15px;margin:0 0 6px;">${greeting}</p>
              <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 16px;letter-spacing:-0.4px;">
                Siyakat v1.0 kararlı sürümü yayında!
              </h1>
              <p style="color:#475569;font-size:15px;line-height:1.75;margin:0 0 32px;">
                Uzun süredir üzerinde çalıştığımız özellikler artık hazır. Beta sürecinde verdiğiniz destek için teşekkür ederiz. İşte bu sürümde öne çıkanlar:
              </p>

              <!-- Özellik listesi -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">

                <!-- Tekrarlayan İşlemler -->
                <tr>
                  <td style="padding:14px 16px;background-color:#f8fafc;border-radius:10px;margin-bottom:8px;border-left:3px solid #0f172a;">
                    <div style="color:#0f172a;font-size:14px;font-weight:700;margin-bottom:3px;">Tekrarlayan İşlemler</div>
                    <div style="color:#64748b;font-size:13px;line-height:1.5;">Kira, maaş gibi düzenli gelir ve giderlerinizi bir kez tanımlayın, otomatik oluşturulsun.</div>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>

                <!-- Bütçe Takibi -->
                <tr>
                  <td style="padding:14px 16px;background-color:#f8fafc;border-radius:10px;border-left:3px solid #0f172a;">
                    <div style="color:#0f172a;font-size:14px;font-weight:700;margin-bottom:3px;">Bütçe Takibi</div>
                    <div style="color:#64748b;font-size:13px;line-height:1.5;">Kategori bazlı bütçe oluşturun, gerçekleşen harcamalarla anlık karşılaştırın.</div>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>

                <!-- KDV Takvimi -->
                <tr>
                  <td style="padding:14px 16px;background-color:#f8fafc;border-radius:10px;border-left:3px solid #0f172a;">
                    <div style="color:#0f172a;font-size:14px;font-weight:700;margin-bottom:3px;">KDV Takvimi</div>
                    <div style="color:#64748b;font-size:13px;line-height:1.5;">Beyanname dönemlerini ve ödeme tarihlerini takip edin, son dakika sürprizleri yaşamayın.</div>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>

                <!-- Banka Mutabakatı -->
                <tr>
                  <td style="padding:14px 16px;background-color:#f8fafc;border-radius:10px;border-left:3px solid #0f172a;">
                    <div style="color:#0f172a;font-size:14px;font-weight:700;margin-bottom:3px;">Banka Mutabakatı</div>
                    <div style="color:#64748b;font-size:13px;line-height:1.5;">Banka ekstrenizi Siyakat işlemleriyle eşleştirin, uyumsuzlukları anında görün.</div>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>

                <!-- AI Kategori Önerisi -->
                <tr>
                  <td style="padding:14px 16px;background-color:#f8fafc;border-radius:10px;border-left:3px solid #0f172a;">
                    <div style="color:#0f172a;font-size:14px;font-weight:700;margin-bottom:3px;">Yapay Zeka ile Kategori Önerisi</div>
                    <div style="color:#64748b;font-size:13px;line-height:1.5;">Fiş ve işlem açıklamalarından doğru kategori otomatik öneriliyor.</div>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>

                <!-- Karşılaştırma Raporu -->
                <tr>
                  <td style="padding:14px 16px;background-color:#f8fafc;border-radius:10px;border-left:3px solid #0f172a;">
                    <div style="color:#0f172a;font-size:14px;font-weight:700;margin-bottom:3px;">Çok Yıllı Karşılaştırma Raporu</div>
                    <div style="color:#64748b;font-size:13px;line-height:1.5;">Yıllara göre gelir, gider ve kâr trendlerinizi tek ekranda görün.</div>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>

                <!-- PWA -->
                <tr>
                  <td style="padding:14px 16px;background-color:#f8fafc;border-radius:10px;border-left:3px solid #0f172a;">
                    <div style="color:#0f172a;font-size:14px;font-weight:700;margin-bottom:3px;">Telefona Ekle (PWA)</div>
                    <div style="color:#64748b;font-size:13px;line-height:1.5;">Siyakat'ı ana ekranınıza ekleyin, uygulama gibi kullanın.</div>
                  </td>
                </tr>

              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center">
                    <a href="${siteUrl}"
                       style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:-0.1px;">
                      Uygulamayı Aç
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                Bu e-postayı almak istemiyorsanız hesabınızı silebilirsiniz.
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
