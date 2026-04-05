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
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  const supabase = createAdminClient();

  let query = supabase
    .from("transactions")
    .select("id, type, amount, currency, exchange_rate, amount_in_base, description, counterparty, date, tags, category_id, created_at")
    .eq("organization_id", auth.organization_id)
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type && ["income", "expense", "transfer"].includes(type)) {
    query = query.eq("type", type);
  }

  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    meta: { limit, offset, total: count },
  });
}

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!auth.permissions.includes("write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, amount, currency, description, date, category_id, counterparty } = body;

  if (!type || !amount || !currency || !description || !date) {
    return NextResponse.json(
      { error: "type, amount, currency, description, date alanları zorunludur" },
      { status: 400 }
    );
  }

  if (!["income", "expense", "transfer"].includes(type as string)) {
    return NextResponse.json({ error: "type: income | expense | transfer olmalı" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      organization_id: auth.organization_id,
      type,
      amount: Number(amount),
      currency,
      description,
      date,
      category_id: category_id ?? null,
      counterparty: counterparty ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
