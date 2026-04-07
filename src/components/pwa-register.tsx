"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUp, Download, RefreshCw, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type VersionData = { version: string; build: string };

const VERSION_KEY = "app_version";
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
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function checkForUpdate() {
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
      // Eski format (düz string) — yeni formata geç
    }

    if (!stored) {
      // Eski format (düz string) — zaten farklı bir deployment var, bildirimi göster
      setCurrentVersion("—");
      setNewVersion(latest.version);
      setShowUpdate(true);
      return;
    }

    if (stored.build !== latest.build) {
      setCurrentVersion(stored.version);
      setNewVersion(latest.version);
      setShowUpdate(true);
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
      window.location.reload();
    });
  }

  return (
    <>
      {/* Güncelleme bildirimi */}
      {showUpdate && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-card rounded-xl shadow-2xl border border-border/60 overflow-hidden">
            {/* Gradient accent bar */}
            <div className="h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

            <div className="p-4">
              {/* Başlık */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <ArrowUp className="h-3.5 w-3.5 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">Yeni Sürüm Hazır</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
                      Güncelleme bekliyor
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpdate(false)}
                  className="ml-2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Versiyon karşılaştırma */}
              {(currentVersion || newVersion) && (
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
                <Link
                  href="/changelog"
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap font-medium"
                >
                  Değişiklikler →
                </Link>
              </div>

              <button
                onClick={() => setShowUpdate(false)}
                className="mt-2.5 w-full text-center text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Sonra hatırlat
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
