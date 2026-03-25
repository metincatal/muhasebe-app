import Anthropic from "@anthropic-ai/sdk";
import type { ReceiptOCRResult } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

export async function parseReceipt(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<ReceiptOCRResult> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: OCR_PROMPT,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("OCR yaniti alinamadi");
  }

  // Extract JSON from response (may be wrapped in markdown code blocks)
  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    return JSON.parse(jsonStr) as ReceiptOCRResult;
  } catch {
    throw new Error("OCR sonucu ayristirilamadi: " + jsonStr.slice(0, 200));
  }
}

export async function parsePDFInvoice(
  textContent: string
): Promise<Partial<ReceiptOCRResult>> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Bu bir Turk faturasinin metin icerigidir. Lutfen asagidaki bilgileri JSON formatinda cikar:

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
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("PDF analiz yaniti alinamadi");
  }

  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  return JSON.parse(jsonStr);
}
