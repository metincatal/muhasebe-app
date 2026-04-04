import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ReceiptOCRResult } from "@/types";

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

export async function parseReceipt(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<ReceiptOCRResult> {
  const genAI = getGemini();
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
    { text: OCR_PROMPT },
  ]);

  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error("OCR yaniti alinamadi");
  }

  try {
    return JSON.parse(extractJSON(text)) as ReceiptOCRResult;
  } catch {
    throw new Error("OCR sonucu ayristirilamadi: " + text.slice(0, 200));
  }
}

export async function parsePDFInvoice(
  textContent: string
): Promise<Partial<ReceiptOCRResult>> {
  const genAI = getGemini();
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
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

  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error("PDF analiz yaniti alinamadi");
  }

  return JSON.parse(extractJSON(text));
}
