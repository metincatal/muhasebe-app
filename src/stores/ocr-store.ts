import { create } from "zustand";
import type { ReceiptOCRResult } from "@/types";

type OcrStatus = "idle" | "processing" | "done" | "error";

interface OcrState {
  status: OcrStatus;
  imagePreview: string | null;
  result: ReceiptOCRResult | null;
  error: string | null;
  startProcessing: (file: File, imageDataUrl?: string) => void;
  reset: () => void;
}

export const useOcrStore = create<OcrState>((set) => ({
  status: "idle",
  imagePreview: null,
  result: null,
  error: null,

  startProcessing: (file: File, imageDataUrl?: string) => {
    set({ status: "processing", imagePreview: imageDataUrl ?? null, result: null, error: null });

    const run = async () => {
      // Önizleme yoksa dosyadan oku
      if (!imageDataUrl) {
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        set({ imagePreview: preview });
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/ocr", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Fiş okunamadı.");
        }

        const result: ReceiptOCRResult = await response.json();
        set({ status: "done", result });
      } catch (err) {
        let errorMsg = "Fiş okunamadı. Lütfen tekrar deneyin.";
        if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
          errorMsg = "İnternet bağlantınızı kontrol edip tekrar deneyin.";
        } else if (err instanceof Error && err.message) {
          errorMsg = err.message;
        }
        set({ status: "error", error: errorMsg });
      }
    };

    run();
  },

  reset: () => set({ status: "idle", imagePreview: null, result: null, error: null }),
}));
