import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestCategory } from "@/lib/ai/categorize";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      description: string;
      vendor_name?: string;
      amount?: number;
      type?: string;
      org_id: string;
    };

    if (!body.description || !body.org_id) {
      return NextResponse.json(
        { error: "description ve org_id gerekli" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, type")
      .eq("organization_id", body.org_id);

    if (!categories || categories.length === 0) {
      return NextResponse.json({
        category_id: null,
        category_name: null,
        confidence: "low",
      });
    }

    const result = await suggestCategory(body.description, categories, {
      vendorName: body.vendor_name,
      amount: body.amount,
      type: body.type,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Categorize error:", err);
    return NextResponse.json(
      { error: "Kategori tahmini basarisiz" },
      { status: 500 }
    );
  }
}
