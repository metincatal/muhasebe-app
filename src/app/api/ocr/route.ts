import { NextRequest, NextResponse } from "next/server";
import { parseReceipt } from "@/lib/ai/ocr";

function toUserMessage(error: unknown): { message: string; status: number } {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg === "SERVICE_OVERLOADED" || msg.includes("503") || msg.includes("Service Unavailable")) {
    return {
      message: "Fiş okuma servisi şu an çok yoğun. Birkaç dakika bekleyip tekrar deneyin.",
      status: 503,
    };
  }
  if (msg.includes("429") || msg.includes("quota") || msg.includes("Too Many Requests")) {
    return {
      message: "Günlük fiş tarama limitine ulaşıldı. Yarın tekrar deneyin.",
      status: 429,
    };
  }
  if (msg === "EMPTY_RESPONSE") {
    return {
      message: "Fişteki yazılar okunamadı. Daha iyi ışıkta, yakından çekilmiş bir fotoğraf deneyin.",
      status: 422,
    };
  }
  if (msg.startsWith("PARSE_FAILED")) {
    return {
      message: "Fiş bilgileri çıkarılamadı. Daha net veya farklı bir açıdan çekilmiş fotoğraf deneyin.",
      status: 422,
    };
  }
  if (msg.includes("GEMINI_API_KEY") || msg.includes("API_KEY") || msg.includes("401")) {
    return {
      message: "Fiş tarama servisi yapılandırılmamış. Yöneticiyle iletişime geçin.",
      status: 503,
    };
  }
  if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("fetch failed")) {
    return {
      message: "Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.",
      status: 503,
    };
  }

  return { message: "Fiş okunamadı. Lütfen tekrar deneyin.", status: 500 };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY ortam degiskeni ayarlanmamis");
      return NextResponse.json(
        { error: "Fiş tarama servisi yapılandırılmamış. Yöneticiyle iletişime geçin." },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Dosya yüklenemedi. Lütfen tekrar deneyin." },
        { status: 400 }
      );
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Desteklenmeyen dosya türü. JPEG, PNG veya WebP yükleyin." },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Dosya boyutu 10 MB'den büyük olamaz. Daha küçük bir fotoğraf deneyin." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const result = await parseReceipt(
      base64,
      file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif"
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("OCR error:", error);
    const { message, status } = toUserMessage(error);
    return NextResponse.json({ error: message }, { status });
  }
}
