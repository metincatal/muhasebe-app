/**
 * Tek seferlik lansman duyurusu gönderim scripti.
 * Kullanım:
 *   node scripts/send-launch-email.mjs
 *
 * Gerekli ortam değişkenleri (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY
 *   NEXT_PUBLIC_SITE_URL  (opsiyonel, varsayılan: https://siyakat.app)
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env.local'i oku
try {
  const env = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
  for (const line of env.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
} catch {
  // .env.local yoksa ortam değişkenleri zaten set edilmiş olabilir
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://siyakat.app";

if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_KEY) {
  console.error("Eksik ortam değişkeni: SUPABASE_URL, SERVICE_ROLE_KEY veya RESEND_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const resend = new Resend(RESEND_KEY);

const LOGO_URL = `${SITE_URL}/icons/icon-512.png`;

function buildHtml(name) {
  const greeting = name ? `Merhaba ${name.split(" ")[0]},` : "Merhaba,";
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Siyakat v1.0 Yayında</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:540px;">

        <tr>
          <td style="background-color:#0f172a;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <img src="${LOGO_URL}" alt="Siyakat" width="64" height="64" style="display:inline-block;border-radius:14px;margin-bottom:14px;" />
            <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.4px;margin:0;">Siyakat</div>
            <div style="color:#94a3b8;font-size:13px;margin-top:4px;">Muhasebe ve Finans Yönetimi</div>
          </td>
        </tr>

        <tr>
          <td style="background-color:#ffffff;padding:40px 40px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <p style="color:#64748b;font-size:15px;margin:0 0 6px;">${greeting}</p>
            <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 16px;letter-spacing:-0.4px;">Siyakat v1.0 kararlı sürümü yayında!</h1>
            <p style="color:#475569;font-size:15px;line-height:1.75;margin:0 0 32px;">
              Uzun süredir üzerinde çalıştığımız özellikler artık hazır. Beta sürecinde verdiğiniz destek için teşekkür ederiz. İşte bu sürümde öne çıkanlar:
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
              ${[
                ["Tekrarlayan İşlemler", "Kira, maaş gibi düzenli gelir ve giderlerinizi bir kez tanımlayın, otomatik oluşturulsun."],
                ["Bütçe Takibi", "Kategori bazlı bütçe oluşturun, gerçekleşen harcamalarla anlık karşılaştırın."],
                ["KDV Takvimi", "Beyanname dönemlerini ve ödeme tarihlerini takip edin, son dakika sürprizleri yaşamayın."],
                ["Banka Mutabakatı", "Banka ekstrenizi Siyakat işlemleriyle eşleştirin, uyumsuzlukları anında görün."],
                ["Yapay Zeka ile Kategori Önerisi", "Fiş ve işlem açıklamalarından doğru kategori otomatik öneriliyor."],
                ["Çok Yıllı Karşılaştırma Raporu", "Yıllara göre gelir, gider ve kâr trendlerinizi tek ekranda görün."],
                ["Telefona Ekle (PWA)", "Siyakat'ı ana ekranınıza ekleyin, uygulama gibi kullanın."],
              ].map(([title, desc], i) => `
              <tr>
                <td style="padding:14px 16px;background-color:#f8fafc;border-radius:10px;border-left:3px solid #0f172a;">
                  <div style="color:#0f172a;font-size:14px;font-weight:700;margin-bottom:3px;">${title}</div>
                  <div style="color:#64748b;font-size:13px;line-height:1.5;">${desc}</div>
                </td>
              </tr>
              ${i < 6 ? '<tr><td style="height:8px;"></td></tr>' : ""}
              `).join("")}
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td align="center">
                  <a href="${SITE_URL}" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:10px;font-size:15px;font-weight:600;">
                    Uygulamayı Aç
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">Bu e-postayı almak istemiyorsanız hesabınızı silebilirsiniz.</p>
            <p style="color:#cbd5e1;font-size:11px;margin:6px 0 0;">© ${new Date().getFullYear()} Siyakat · siyakat.app</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function main() {
  // Tüm kullanıcıları çek (admin client — RLS bypass)
  const { data: usersPage, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error("Kullanıcılar alınamadı:", error.message);
    process.exit(1);
  }

  const users = usersPage.users.filter((u) => u.email);
  console.log(`Toplam ${users.length} kullanıcı bulundu.\n`);

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    const name = user.user_metadata?.full_name || "";
    try {
      const { error: emailErr } = await resend.emails.send({
        from: "Siyakat <noreply@siyakat.app>",
        to: user.email,
        subject: "Siyakat kararlı sürüme geçti 🎉",
        html: buildHtml(name),
      });

      if (emailErr) {
        console.error(`  ✗ ${user.email} — ${emailErr.message}`);
        failed++;
      } else {
        console.log(`  ✓ ${user.email}`);
        sent++;
      }
    } catch (err) {
      console.error(`  ✗ ${user.email} — ${err.message}`);
      failed++;
    }

    // Rate limit: Resend ücretsiz planda saniyede 2 istek
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`\nTamamlandı: ${sent} gönderildi, ${failed} başarısız.`);
}

main();
