"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useOcrStore } from "@/stores/ocr-store";

// Kullanıcı fiş tarama sayfasından ayrılırken işlem devam ederse
// tamamlandığında global toast bildirimi gösterir.
export function OcrNotifier() {
  const status = useOcrStore((s) => s.status);
  const error = useOcrStore((s) => s.error);
  const reset = useOcrStore((s) => s.reset);
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useRef(false);

  useEffect(() => {
    // Mount'ta skip et — sadece değişimleri dinle
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    // Scan sayfasındayken scan/page.tsx kendi UI'ını yönetir
    if (pathname === "/receipts/scan") return;

    if (status === "done") {
      toast.success("Fiş okundu!", {
        description: "Bilgileri inceleyip kaydedebilirsiniz.",
        action: {
          label: "Görüntüle →",
          onClick: () => router.push("/receipts/scan"),
        },
        duration: 10000,
      });
    } else if (status === "error") {
      toast.error("Fiş okunamadı", {
        description: error ?? "İşlem başarısız oldu.",
      });
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return null;
}
