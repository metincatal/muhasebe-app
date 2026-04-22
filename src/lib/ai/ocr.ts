import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import type { ReceiptOCRResult } from "@/types";

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-1.5-flash";

const OCR_PROMPT = `Bu bir Turk fisi/makbuzu fotografidir. Lutfen asagidaki bilgileri JSON formatinda cikar:

{
  "vendor_name": "Isletme adi",
  "date": "YYYY-MM-DD formatinda tarih",
  "items": [{"description": "Urun adi", "quantity": 1, "unit_price": 10.00, "total": 10.00}],
  "subtotal": 0.00,
  "tax_rate": 20,
  "tax_amount": 0.00,
  "total_amount": 0.00,
  "currency": "TRY",
  "payment_method": "nakit veya kart",
  "receipt_number": "fis numarasi",
  "raw_text": "fisin tam metni"
}

Kurallar:
- Eger bir alani okuyamiyorsan null yaz.
- Tutarlari sayisal deger olarak yaz (string degil).
- Tarihi YYYY-MM-DD formatinda yaz.
- Para birimi bulunamazsa "TRY" varsay.
- Sadece JSON dondur, baska aciklama ekleme.`;

function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY yapilandirilmamis");
  }
  return new GoogleGenerativeAI(apiKey);
}

function extractJSON(text: string): string {
  let jsonStr = text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  return jsonStr;
}

function httpStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    return (error as { status: number }).status;
  }
}

function isOverloaded(error: unknown): boolean {
  if (httpStatus(error) === 503) return true;
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("503") ||
    msg.includes("Service Unavailable") ||
    msg.includes("high demand") ||
    msg.includes("overloaded")
  );
}

async function callGemini(modelName: string, parts: Part[]): Promise<string> {
  const model = getGemini().getGenerativeModel({ model: modelName });
  const result = await model.generateContent(parts);

  // Yanıt bloklanmışsa (güvenlik filtresi, telif vb.) text() throw etmeden önce yakala
  const candidate = result.response.candidates?.[0];
  if (candidate?.finishReason && !["STOP", "MAX_TOKENS"].includes(candidate.finishReason as string)) {
    throw new Error(`BLOCKED:${candidate.finishReason}`);
  }

  const text = result.response.text();
  if (!text) throw new Error("EMPTY_RESPONSE");
  return text;
}

// 503 veya 404 (model bulunamadı) → fallback denemeli
function shouldFallback(error: unknown): boolean {
  if (isOverloaded(error)) return true;
  const code = httpStatus(error);
  if (code === 404) return true;
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("404") || msg.includes("not found") || msg.includes("Not Found");
}

async function callWithFallback(parts: Part[]): Promise<string> {
  // Birincil modeli 1 kez dene, 503/404 gelirse hemen yedek modele geç
  // (uzun retry döngüsü Vercel timeout riskini artırır)
  try {
    return await callGemini(PRIMARY_MODEL, parts);
  } catch (primaryError) {
    if (!shouldFallback(primaryError)) throw primaryError;
  }

  // Kısa bekleme sonrası birincili 1 kez daha dene (geçici yoğunluk için)
  await new Promise((r) => setTimeout(r, 500));
  try {
    return await callGemini(PRIMARY_MODEL, parts);
  } catch (primaryError2) {
    if (!shouldFallback(primaryError2)) throw primaryError2;
  }

  // Birincil model yine başarısız → yedek modele geç
  // Yedek modeldeki HERHANGİ bir hata → SERVICE_OVERLOADED
  try {
    return await callGemini(FALLBACK_MODEL, parts);
  } catch {
    throw new Error("SERVICE_OVERLOADED");
  }
}

export async function parseReceipt(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<ReceiptOCRResult> {
  const text = await callWithFallback([
    { inlineData: { mimeType, data: imageBase64 } },
    { text: OCR_PROMPT },
  ]);

  try {
    return JSON.parse(extractJSON(text)) as ReceiptOCRResult;
  } catch {
    throw new Error("PARSE_FAILED: " + text.slice(0, 200));
  }
}

export async function parsePDFInvoice(
  textContent: string
): Promise<Partial<ReceiptOCRResult>> {
  const text = await callWithFallback([
    {
      text: `Bu bir Turk faturasinin metin icerigidir. Lutfen asagidaki bilgileri JSON formatinda cikar:

{
  "vendor_name": "Firma adi",
  "date": "YYYY-MM-DD",
  "items": [{"description": "Kalem", "quantity": 1, "unit_price": 0, "total": 0}],
  "subtotal": 0,
  "tax_rate": null,
  "tax_amount": 0,
  "total_amount": 0,
  "currency": "TRY",
  "receipt_number": "Fatura numarasi"
}

Fatura metni:
${textContent}

Sadece JSON dondur.`,
    },
  ]);

  return JSON.parse(extractJSON(text));
}
