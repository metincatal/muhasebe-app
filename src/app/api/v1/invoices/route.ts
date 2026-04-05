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
  const status = searchParams.get("status");

  const supabase = createAdminClient();

  let query = supabase
    .from("invoices")
    .select("id, type, invoice_number, date, due_date, status, counterparty_name, subtotal, tax_amount, total, currency, created_at")
    .eq("organization_id", auth.organization_id)
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type && ["sales", "purchase"].includes(type)) {
    query = query.eq("type", type);
  }

  if (status && ["draft", "sent", "paid", "overdue", "cancelled"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, meta: { limit, offset } });
}
