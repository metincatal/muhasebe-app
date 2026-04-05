import { GoogleGenerativeAI } from "@google/generative-ai";

export interface CategoryOption {
  id: string;
  name: string;
  type: string;
}

export interface CategorizationResult {
  category_id: string | null;
  category_name: string | null;
  confidence: "high" | "medium" | "low";
}

function extractJSON(text: string): string {
  let jsonStr = text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  return jsonStr;
}

export async function suggestCategory(
  description: string,
  categories: CategoryOption[],
  options?: {
    vendorName?: string;
    amount?: number;
    type?: string;
  }
): Promise<CategorizationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY yapilandirilmamis");

  if (!description.trim() || categories.length === 0) {
    return { category_id: null, category_name: null, confidence: "low" };
  }

  const filteredCats = options?.type
    ? categories.filter((c) => c.type === options.type)
    : categories;

  if (filteredCats.length === 0) {
    return { category_id: null, category_name: null, confidence: "low" };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const categoryList = filteredCats.map((c) => `${c.id}|${c.name}`).join("\n");

  const prompt = `Turk muhasebe uygulamasi kategori tahmini.

Islem:
- Aciklama: "${description}"${options?.vendorName ? `\n- Satici: "${options.vendorName}"` : ""}${options?.amount ? `\n- Tutar: ${options.amount} TRY` : ""}
- Tur: ${options?.type === "income" ? "Gelir" : "Gider"}

Kategoriler (id|isim):
${categoryList}

En uygun kategoriyi sec. Sadece JSON dondur:
{"category_id":"id veya null","category_name":"isim veya null","confidence":"high|medium|low"}

Hicbiri uymuyorsa null dondur. Sadece JSON.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text) return { category_id: null, category_name: null, confidence: "low" };

  try {
    const parsed = JSON.parse(extractJSON(text)) as CategorizationResult;
    if (parsed.category_id && !filteredCats.find((c) => c.id === parsed.category_id)) {
      return { category_id: null, category_name: null, confidence: "low" };
    }
    return parsed;
  } catch {
    return { category_id: null, category_name: null, confidence: "low" };
  }
}
