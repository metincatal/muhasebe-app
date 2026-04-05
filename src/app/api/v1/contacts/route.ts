import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/app/api/v1/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!auth.permissions.includes("read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
  const offset = Number(searchParams.get("offset") ?? "0");
  const type = searchParams.get("type");
  const search = searchParams.get("search");

  const supabase = createAdminClient();

  let query = supabase
    .from("contacts")
    .select("id, type, name, tax_id, email, phone, address, created_at")
    .eq("organization_id", auth.organization_id)
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (type && ["customer", "supplier", "both"].includes(type)) {
    query = query.eq("type", type);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,tax_id.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, meta: { limit, offset } });
}
