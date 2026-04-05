"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    // Service Worker kaydı
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.error("SW registration failed:", err));
    }

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

  if (!showInstall) return null;

  return (
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
  );
}
