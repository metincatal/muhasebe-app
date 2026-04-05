"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [waitingSW, setWaitingSW] = useState<ServiceWorker | null>(null);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function trackSW(sw: ServiceWorker) {
      sw.addEventListener("statechange", () => {
        if (sw.state === "installed") {
          if (navigator.serviceWorker.controller) {
            setWaitingSW(sw);
            setShowUpdate(true);
          } else {
            sw.postMessage("SKIP_WAITING");
          }
        }
      });
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Zaten waiting durumunda SW var mı? (önceki sayfadan kalan)
        if (registration.waiting) {
          if (navigator.serviceWorker.controller) {
            setWaitingSW(registration.waiting);
            setShowUpdate(true);
          } else {
            registration.waiting.postMessage("SKIP_WAITING");
          }
          return;
        }

        // Listener eklenmeden önce zaten installing başlamış olabilir
        if (registration.installing) {
          trackSW(registration.installing);
        }

        // Gelecekteki güncellemeler için
        registration.addEventListener("updatefound", () => {
          if (registration.installing) {
            trackSW(registration.installing);
          }
        });
      })
      .catch((err) => console.error("SW registration failed:", err));

    // SW aktif olunca sayfayı yenile
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    // "Ana ekrana ekle" prompt'unu yakala
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
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
    if (!waitingSW) return;
    waitingSW.postMessage("SKIP_WAITING");
    setShowUpdate(false);
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
