"use client";

import { ArrowRight, RefreshCw, X, Wrench, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateStore } from "@/stores/update-store";

async function doUpdate() {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    if (res.ok) {
      const v = await res.json();
      localStorage.setItem("app_version", JSON.stringify(v));
      localStorage.removeItem("update_snooze_until");
    }
  } catch {
    // ignore
  }
  window.location.reload();
}

export function ChangelogUpdateBanner() {
  const { showUpdate, currentVersion, newVersion, isSameBuild, dismiss, remindLater } =
    useUpdateStore();

  if (!showUpdate) return null;

  return (
    <div className="mb-8 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* İkon */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 mt-0.5">
              {isSameBuild ? (
                <Wrench className="h-4 w-4 text-indigo-500" />
              ) : (
                <Sparkles className="h-4 w-4 text-indigo-500" />
              )}
            </div>

            {/* İçerik */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold tracking-tight text-indigo-700 dark:text-indigo-300">
                {isSameBuild ? "Bakım Güncellemesi Hazır" : "Yeni Sürüm Bu Sayfada"}
              </p>

              {isSameBuild ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Performans ve güvenlik iyileştirmesi içeren yeni bir derleme mevcut.
                </p>
              ) : (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-mono text-muted-foreground tabular-nums">
                    {currentVersion ?? "—"}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="h-px w-4 bg-border" />
                    <ArrowRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                    <div className="h-px w-4 bg-border" />
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {newVersion ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">· Aşağıda detaylar</span>
                </div>
              )}

              {/* Aksiyonlar */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Button
                  size="sm"
                  className="h-8 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                  onClick={doUpdate}
                >
                  <RefreshCw className="mr-1.5 h-3 w-3" />
                  Şimdi Güncelle
                </Button>
                <button
                  onClick={remindLater}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sonra hatırlat (1 saat)
                </button>
              </div>
            </div>

            {/* Kapat */}
            <button
              onClick={dismiss}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
