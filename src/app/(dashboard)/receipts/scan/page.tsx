"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCamera, dataURLtoFile, resizeImage } from "@/hooks/use-camera";
import { formatCurrency, SUPPORTED_CURRENCIES } from "@/lib/utils/currency";
import type { ReceiptOCRResult } from "@/types";
import { useAuthStore } from "@/stores/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { getCategories } from "@/lib/actions/categories";
import { createReceiptWithTransaction } from "@/lib/actions/receipts";
import {
  Camera,
  Upload,
  X,
  Loader2,
  Check,
  ArrowLeft,
  ScanLine,
  RotateCcw,
  Save,
  Sparkles,
  ImageIcon,
} from "lucide-react";

type Step = "capture" | "processing" | "review";

interface Category {
  id: string;
  name: string;
  type: string;
  color: string | null;
}

export default function ScanReceiptPage() {
  const router = useRouter();
  const { user, organization } = useAuthStore();
  const { canWrite } = usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { videoRef, videoCallbackRef, canvasRef, isActive, isReady, error: cameraError, startCamera, stopCamera, capturePhoto } = useCamera();

  const [step, setStep] = useState<Step>("capture");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<ReceiptOCRResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAiCategorizing, setIsAiCategorizing] = useState(false);
  const [aiCategorized, setAiCategorized] = useState(false);

  // Editable form state (populated from OCR)
  const [vendorName, setVendorName] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  useEffect(() => {
    if (!organization?.id) return;
    async function loadCats() {
      const cats = await getCategories(organization!.id, "expense");
      setCategories(cats as Category[]);
    }
    loadCats();
  }, [organization?.id]);

  const handleCapture = useCallback(() => {
    const dataUrl = capturePhoto();
    if (dataUrl) {
      setImagePreview(dataUrl);
      stopCamera();
      processImage(dataURLtoFile(dataUrl, "receipt.jpg"));
    }
  }, [capturePhoto, stopCamera]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Resize and process
    const resized = await resizeImage(file);
    processImage(resized);
  }, []);

  async function processImage(file: File) {
    if (!canWrite) {
      toast.error("Bu islemi yapmaya yetkiniz yok", {
        description: "Fis tarama sadece yonetici ve muhasebeciler tarafindan yapilabilir.",
      });
      return;
    }
    setStep("processing");
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "OCR islemi basarisiz");
      }

      const result: ReceiptOCRResult = await response.json();
      setOcrResult(result);

      // Populate form
      setVendorName(result.vendor_name || "");
      setReceiptDate(result.date || new Date().toISOString().split("T")[0]);
      setTotalAmount(result.total_amount?.toString() || "");
      setTaxAmount(result.tax_amount?.toString() || "");
      setCurrency(result.currency || "TRY");
      setPaymentMethod(result.payment_method || "");

      setStep("review");
      toast.success("Fis basariyla okundu!", {
        description: "Lutfen bilgileri kontrol edin ve onaylayin.",
      });

      // OCR bittikten sonra AI ile kategori tahmin et
      if (organization?.id) {
        const itemDescriptions = result.items?.map((i) => i.description).filter(Boolean).join(", ") ?? "";
        const combinedDesc = [result.vendor_name, itemDescriptions].filter(Boolean).join(" - ");
        if (combinedDesc.trim()) {
          setIsAiCategorizing(true);
          fetch("/api/categorize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description: combinedDesc,
              vendor_name: result.vendor_name,
              amount: result.total_amount,
              type: "expense",
              org_id: organization.id,
            }),
          })
            .then((r) => r.json())
            .then((data: { category_id?: string | null }) => {
              if (data.category_id) {
                setCategoryId(data.category_id);
                setAiCategorized(true);
              }
            })
            .catch(() => {})
            .finally(() => setIsAiCategorizing(false));
        }
      }
    } catch (err) {
      toast.error("OCR hatasi", {
        description: err instanceof Error ? err.message : "Fis okunamadi",
      });
      setStep("capture");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!organization?.id || !user?.id) return;
    setIsSaving(true);

    const result = await createReceiptWithTransaction({
      organization_id: organization.id,
      vendor_name: vendorName,
      date: receiptDate || new Date().toISOString().split("T")[0],
      total_amount: parseFloat(totalAmount) || 0,
      tax_amount: parseFloat(taxAmount) || undefined,
      currency,
      category_id: categoryId || undefined,
      ocr_raw_text: ocrResult?.raw_text || undefined,
      ocr_parsed_data: ocrResult ?? undefined,
      created_by: user.id,
    });

    if (result.error) {
      toast.error("Fis kaydedilemedi", { description: result.error });
      setIsSaving(false);
      return;
    }

    toast.success("Fis kaydedildi!", {
      description: `${vendorName} - ${formatCurrency(parseFloat(totalAmount) || 0, currency)}`,
    });
    setIsSaving(false);
    router.push("/receipts");
  }

  function resetScan() {
    setStep("capture");
    setImagePreview(null);
    setOcrResult(null);
    stopCamera();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/receipts" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fis Tara</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fisinizi fotograflayin veya yukleyin
          </p>
        </div>
      </div>

      {/* Step: Capture */}
      {step === "capture" && (
        <Card>
          <CardContent className="p-6">
            {/* Camera View */}
            {isActive && (
              <div className="relative rounded-xl overflow-hidden bg-black mb-4">
                <video
                  ref={videoCallbackRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-[3/4] object-cover"
                />
                {/* Loading overlay - kamera henuz hazir degilse */}
                {!isReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                    <Loader2 className="h-8 w-8 animate-spin mb-3" />
                    <p className="text-sm">Kamera baslatiliyor...</p>
                  </div>
                )}
                {/* Capture overlay */}
                {isReady && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-8 border-2 border-white/30 rounded-2xl" />
                    <div className="absolute top-8 left-8 w-8 h-8 border-t-3 border-l-3 border-white rounded-tl-xl" />
                    <div className="absolute top-8 right-8 w-8 h-8 border-t-3 border-r-3 border-white rounded-tr-xl" />
                    <div className="absolute bottom-8 left-8 w-8 h-8 border-b-3 border-l-3 border-white rounded-bl-xl" />
                    <div className="absolute bottom-8 right-8 w-8 h-8 border-b-3 border-r-3 border-white rounded-br-xl" />
                  </div>
                )}
                {/* Capture button */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon-lg"
                    onClick={stopCamera}
                    className="rounded-full bg-black/50 border-white/30 text-white hover:bg-black/70"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  <button
                    onClick={handleCapture}
                    disabled={!isReady}
                    className="h-16 w-16 rounded-full bg-white border-4 border-white/50 shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <div className="h-12 w-12 rounded-full bg-white border-2 border-gray-300" />
                  </button>
                </div>
              </div>
            )}

            {/* Initial state — no camera */}
            {!isActive && !imagePreview && (
              <div className="space-y-4">
                {/* Camera error message */}
                {cameraError && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {cameraError}
                  </div>
                )}

                {/* Upload Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:border-amber/50 hover:bg-amber/5 transition-all group"
                >
                  <div className="h-16 w-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4 group-hover:bg-amber/10 transition-colors">
                    <ImageIcon className="h-8 w-8 text-muted-foreground group-hover:text-amber transition-colors" />
                  </div>
                  <p className="font-medium text-sm">
                    Fis fotografini yukleyin
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPEG, PNG veya WebP — Maks. 10MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Or Camera */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">veya</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={startCamera}
                  className="w-full h-12"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Kamera ile Cek
                </Button>
              </div>
            )}

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
          </CardContent>
        </Card>
      )}

      {/* Step: Processing */}
      {step === "processing" && (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center">
              {/* Preview */}
              {imagePreview && (
                <div className="relative w-48 h-64 rounded-xl overflow-hidden mb-6 shadow-lg">
                  <img
                    src={imagePreview}
                    alt="Fis"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              )}

              {/* Spinner */}
              <div className="relative mb-4">
                <div className="h-14 w-14 rounded-2xl bg-amber/10 flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-amber animate-pulse" />
                </div>
              </div>
              <h3 className="font-semibold text-lg">Fis okunuyor...</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                AI fisinizi analiz ediyor. Tarih, tutar, magaza ve urunler otomatik olarak cikarilacak.
              </p>
              <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Isleniyor...
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Review */}
      {step === "review" && (
        <form onSubmit={handleSave} className="space-y-4">
          {/* Image Preview + OCR Badge */}
          <div className="flex gap-4">
            {imagePreview && (
              <div className="relative w-24 h-32 rounded-xl overflow-hidden shrink-0 shadow-md">
                <img src={imagePreview} alt="Fis" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-md bg-success/10 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-success" />
                </div>
                <span className="text-sm font-medium text-success">Fis basariyla okundu</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Asagidaki bilgileri kontrol edin ve gerekirse duzenleyin. Onayladiginizda islem olarak kaydedilecektir.
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={resetScan} className="mt-2 h-7 text-xs">
                <RotateCcw className="mr-1 h-3 w-3" />
                Yeniden Tara
              </Button>
            </div>
          </div>

          {/* Parsed Data Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-amber" />
                OCR Sonuclari
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="vendor">Magaza / Isletme</Label>
                  <Input id="vendor" value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Isletme adi" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rdate">Tarih</Label>
                  <Input id="rdate" type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment">Odeme Yontemi</Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v ?? "")}>
                    <SelectTrigger id="payment">
                      <SelectValue placeholder="Secin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nakit">Nakit</SelectItem>
                      <SelectItem value="kart">Kredi/Banka Karti</SelectItem>
                      <SelectItem value="havale">Havale/EFT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total">Toplam Tutar</Label>
                  <Input
                    id="total"
                    type="number"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax">KDV Tutari</Label>
                  <Input
                    id="tax"
                    type="number"
                    step="0.01"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Para Birimi</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v ?? "TRY")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    Kategori
                    {isAiCategorizing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    {aiCategorized && !isAiCategorizing && (
                      <span className="flex items-center gap-1 text-xs font-normal text-amber">
                        <Sparkles className="h-3 w-3" />
                        AI tarafindan onerildi
                      </span>
                    )}
                  </Label>
                  <Select value={categoryId} onValueChange={(v) => { setCategoryId(v ?? ""); setAiCategorized(false); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori secin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color || "#6b7280" }} />
                            {cat.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Items from OCR */}
              {ocrResult?.items && ocrResult.items.length > 0 && (
                <div className="space-y-2 pt-2">
                  <Label className="text-muted-foreground">Okunan Kalemler</Label>
                  <div className="rounded-lg border divide-y">
                    {ocrResult.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="truncate flex-1">{item.description}</span>
                        <span className="text-muted-foreground mx-2">x{item.quantity}</span>
                        <span className="font-medium tabular-nums">
                          {formatCurrency(item.total, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={resetScan}>
              Iptal
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Onayla ve Kaydet
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
