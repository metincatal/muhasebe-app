"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUp, Download, RefreshCw, X } from "lucide-react";
import { useUpdateStore } from "@/stores/update-store";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type VersionData = { version: string; build: string };

const VERSION_KEY = "app_version";
const SNOOZE_KEY = "update_snooze_until";
const POLL_INTERVAL = 5 * 60 * 1000; // 5 dakika

async function fetchVersion(): Promise<VersionData | null> {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.build || data.build === "dev") return null;
    return { version: data.version ?? "—", build: data.build };
  } catch {
    return null;
  }
}

export function PwaRegister() {
  const pathname = usePathname();
  const isChangelog = pathname === "/changelog";
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { showUpdate, currentVersion, newVersion, isSameBuild, setUpdateAvailable, dismiss, remindLater } =
    useUpdateStore();

  async function checkForUpdate() {
    // Snooze kontrolü
    const snoozeUntil = localStorage.getItem(SNOOZE_KEY);
    if (snoozeUntil && Date.now() < Number(snoozeUntil)) return;

    const latest = await fetchVersion();
    if (!latest) return;

    const storedRaw = localStorage.getItem(VERSION_KEY);
    if (!storedRaw) {
      localStorage.setItem(VERSION_KEY, JSON.stringify(latest));
      return;
    }

    let stored: VersionData | null = null;
    try {
      const parsed = JSON.parse(storedRaw);
      if (parsed.build) stored = parsed as VersionData;
    } catch {
      // Eski format (düz string)
    }

    if (!stored) {
      setUpdateAvailable("—", latest.version);
      return;
    }

    if (stored.build !== latest.build) {
      setUpdateAvailable(stored.version, latest.version);
    }
  }

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    checkForUpdate();
    pollingRef.current = setInterval(checkForUpdate, POLL_INTERVAL);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstall(false);
      setDeferredPrompt(null);
    }
  }

  function handleUpdate() {
    fetchVersion().then((v) => {
      if (v) localStorage.setItem(VERSION_KEY, JSON.stringify(v));
      localStorage.removeItem(SNOOZE_KEY);
      window.location.reload();
    });
  }

  return (
    <>
      {/* Güncelleme bildirimi — sadece changelog dışı sayfalarda */}
      {showUpdate && !isChangelog && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-card rounded-xl shadow-2xl border border-border/60 overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

            <div className="p-4">
              {/* Başlık */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <ArrowUp className="h-3.5 w-3.5 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">
                      {isSameBuild ? "Bakım Güncellemesi" : "Yeni Sürüm Hazır"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
                      {isSameBuild ? "Performans ve güvenlik iyileştirmesi" : "Güncelleme bekliyor"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={dismiss}
                  className="ml-2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Versiyon karşılaştırma — sadece farklı sürümlerde */}
              {!isSameBuild && (currentVersion || newVersion) && (
                <div className="flex items-center gap-2 mb-3.5 bg-muted/40 rounded-lg px-3 py-2 border border-border/40">
                  <span className="text-xs font-mono text-muted-foreground tabular-nums">
                    {currentVersion ?? "—"}
                  </span>
                  <div className="flex-1 flex items-center gap-1">
                    <div className="h-px flex-1 bg-border/60" />
                    <ArrowRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                    <div className="h-px flex-1 bg-border/60" />
                  </div>
                  <span className="text-xs font-mono font-semibold text-foreground tabular-nums">
                    {newVersion ?? "—"}
                  </span>
                </div>
              )}

              {/* Aksiyonlar */}
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                  onClick={handleUpdate}
                >
                  <RefreshCw className="mr-1.5 h-3 w-3" />
                  Şimdi Güncelle
                </Button>
                {!isSameBuild && (
                  <a
                    href="/changelog"
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap font-medium"
                  >
                    Değişiklikler →
                  </a>
                )}
              </div>

              <button
                onClick={remindLater}
                className="mt-2.5 w-full text-center text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Sonra hatırlat (1 saat)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA kurulum bildirimi */}
      {showInstall && !showUpdate && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-card rounded-xl shadow-2xl border border-border/60 overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Download className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">Uygulamayı Yükle</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
                      Ana ekrana ekle
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInstall(false)}
                  className="ml-2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground mb-3.5">
                Siyakat'ı ana ekranınıza ekleyerek daha hızlı erişin.
              </p>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                  onClick={handleInstall}
                >
                  <Download className="mr-1.5 h-3 w-3" />
                  Yükle
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => setShowInstall(false)}
                >
                  Hayır
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
