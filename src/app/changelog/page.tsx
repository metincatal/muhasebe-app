import { ArrowLeft, Tag } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Değişiklik Günlüğü — Siyakat",
  description: "Siyakat'ın her sürümünde yapılan değişiklikler.",
};

const changelog: {
  version: string;
  date: string;
  label?: string;
  changes: { type: "yeni" | "iyileştirme" | "düzeltme"; text: string }[];
}[] = [
  {
    version: "1.0.3",
    date: "7 Nisan 2026",
    changes: [
      { type: "iyileştirme", text: "Sidebar ve giriş ekranındaki 'S' harfi Siyakat amblemiyle değiştirildi" },
      { type: "iyileştirme", text: "Favicon ve apple-touch-icon Siyakat logosuna güncellendi" },
    ],
  },
  {
    version: "1.0.2",
    date: "7 Nisan 2026",
    changes: [
      { type: "iyileştirme", text: "Sürüm yönetimi ve otomatik changelog altyapısı" },
      { type: "düzeltme", text: "Güncelleme bildirimi eski tarayıcılarda görünmüyordu" },
    ],
  },
  {
    version: "1.0.1",
    date: "7 Nisan 2026",
    changes: [
      { type: "düzeltme", text: "Mobil breadcrumb'da UUID gösteriliyordu" },
      { type: "iyileştirme", text: "Fiş detay ekranında kırık görsel yerine OCR verisi gösteriliyor" },
      { type: "yeni", text: "Güncelleme bildirimi yeniden tasarlandı — sürüm numaraları ve değişiklikler linki eklendi" },
      { type: "yeni", text: "Değişiklik günlüğü sayfası (/changelog)" },
    ],
  },
  {
    version: "1.0.0",
    date: "7 Nisan 2026",
    label: "İlk Kararlı Sürüm",
    changes: [
      { type: "yeni", text: "Çok kiracılı organizasyon yapısı ve davet sistemi" },
      { type: "yeni", text: "Gelir, gider ve transfer işlem yönetimi" },
      { type: "yeni", text: "Fatura oluşturma ve PDF dışa aktarma" },
      { type: "yeni", text: "Fiş tarama ve OCR ile otomatik veri çıkarma" },
      { type: "yeni", text: "Banka hesabı ve hareket yönetimi" },
      { type: "yeni", text: "Bilanço ve finansal raporlar" },
      { type: "yeni", text: "Bütçe takibi ve tekrarlayan işlemler" },
      { type: "yeni", text: "Döviz desteği ve TCMB kur entegrasyonu" },
      { type: "yeni", text: "API erişimi ve webhook desteği" },
      { type: "yeni", text: "Denetim günlüğü" },
      { type: "yeni", text: "PWA desteği ve çevrimdışı modu" },
    ],
  },
];

const typeStyles = {
  yeni: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  iyileştirme: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  düzeltme: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

const typeLabels = {
  yeni: "Yeni",
  iyileştirme: "İyileştirme",
  düzeltme: "Düzeltme",
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-20">
        {/* Başlık */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Geri dön
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-1 rounded-full bg-gradient-to-b from-blue-500 via-indigo-500 to-violet-500" />
            <h1 className="text-2xl font-bold tracking-tight">Değişiklik Günlüğü</h1>
          </div>
          <p className="text-sm text-muted-foreground pl-4">
            Siyakat'ın her sürümünde yapılan değişiklikler ve yenilikler.
          </p>
        </div>

        {/* Zaman çizelgesi */}
        <div className="relative">
          <div className="absolute left-[7px] top-3 bottom-0 w-px bg-border/60" />

          <div className="space-y-14">
            {changelog.map((entry) => (
              <div key={entry.version} className="relative pl-8">
                {/* Nokta */}
                <div className="absolute left-0 top-[9px] h-[15px] w-[15px] rounded-full border-2 border-indigo-500 bg-background ring-4 ring-background" />

                {/* Sürüm başlığı */}
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                    <Tag className="h-3 w-3" />
                    v{entry.version}
                  </span>
                  {entry.label && (
                    <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5 border border-border/60">
                      {entry.label}
                    </span>
                  )}
                  <time className="text-xs text-muted-foreground/60 ml-auto">{entry.date}</time>
                </div>

                {/* Değişiklikler */}
                <ul className="space-y-2.5">
                  {entry.changes.map((change, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 shrink-0 inline-flex items-center rounded border px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide ${typeStyles[change.type]}`}
                      >
                        {typeLabels[change.type]}
                      </span>
                      <span className="text-sm text-foreground/80 leading-relaxed">
                        {change.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Alt bilgi */}
        <div className="mt-16 pt-8 border-t border-border/40 text-center">
          <p className="text-xs text-muted-foreground/50">
            Siyakat · Muhasebe ve Finans Yönetimi
          </p>
        </div>
      </div>
    </div>
  );
}
