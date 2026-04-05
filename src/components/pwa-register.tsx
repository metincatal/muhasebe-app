"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const VERSION_KEY = "app_version";
const POLL_INTERVAL = 5 * 60 * 1000; // 5 dakika

async function fetchVersion(): Promise<string | null> {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.version ?? null;
  } catch {
    return null;
  }
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Versiyon kontrolü — değişmişse bildirim göster
  async function checkForUpdate() {
    const latest = await fetchVersion();
    if (!latest || latest === "dev") return;

    const stored = localStorage.getItem(VERSION_KEY);
    if (!stored) {
      localStorage.setItem(VERSION_KEY, latest);
      return;
    }

    if (stored !== latest) {
      setShowUpdate(true);
    }
  }

  useEffect(() => {
    // SW'yi sessizce kaydet (offline destek için)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {});
    }

    // "Ana ekrana ekle" prompt'unu yakala
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Sayfa yüklenince ilk kontrol
    checkForUpdate();

    // Periyodik polling
    pollingRef.current = setInterval(checkForUpdate, POLL_INTERVAL);

    // Sekmeye dönünce kontrol et
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
    // Yeni versiyonu kaydet, sayfayı yenile
    fetchVersion().then((v) => {
      if (v) localStorage.setItem(VERSION_KEY, v);
      window.location.reload();
    });
  }

  return (
    <>
      {/* Güncelleme bildirimi */}
      {showUpdate && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-card border rounded-xl shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Yeni sürüm mevcut</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Güncellemeleri almak için yenileyin
              </p>
              <div className="flex gap-2 mt-2.5">
                <Button size="sm" className="h-7 text-xs" onClick={handleUpdate}>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Güncelle
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setShowUpdate(false)}
                >
                  Sonra
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PWA kurulum bildirimi */}
      {showInstall && !showUpdate && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-card border rounded-xl shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              M
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Uygulamayı Yükle</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ana ekrana ekleyerek daha hızlı erişin
              </p>
              <div className="flex gap-2 mt-2.5">
                <Button size="sm" className="h-7 text-xs" onClick={handleInstall}>
                  <Download className="mr-1 h-3 w-3" />
                  Yükle
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
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
