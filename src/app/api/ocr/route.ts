import { NextRequest, NextResponse } from "next/server";
import { parseReceipt } from "@/lib/ai/ocr";

export async function POST(request: NextRequest) {
  try {
    // API key kontrolu
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY ortam degiskeni ayarlanmamis");
      return NextResponse.json(
        { error: "OCR servisi yapilandirilmamis. Lutfen yoneticiyle iletisime gecin." },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Dosya yuklenemedi" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Gecersiz dosya turu. JPEG, PNG, WebP veya GIF yukleyin." },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Dosya boyutu 10MB'den buyuk olamaz" },
        { status: 400 }
      );
    }

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Run OCR
    const result = await parseReceipt(
      base64,
      file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif"
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("OCR error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStatus = (error as { status?: number }).status;

    // Gemini API kota hatasi
    if (errorStatus === 429 || errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("Too Many Requests")) {
      return NextResponse.json(
        { error: "AI servisinin kullanim kotasi doldu. Lutfen daha sonra tekrar deneyin veya API planini yukseltiniz." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || "OCR islemi basarisiz oldu" },
      { status: 500 }
    );
  }
}
