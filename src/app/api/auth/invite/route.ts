import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token gerekli" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: invitation, error } = await supabase
    .from("invitations")
    .select("id, email, role, organization_id, expires_at, accepted_at")
    .eq("token", token)
    .single();

  if (error || !invitation) {
    return NextResponse.json({ error: "Gecersiz davet" }, { status: 404 });
  }

  if (invitation.accepted_at) {
    return NextResponse.json({ error: "Bu davet zaten kullanilmis" }, { status: 400 });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "Davet suresi dolmus" }, { status: 400 });
  }

  return NextResponse.json({
    email: invitation.email,
    role: invitation.role,
    organization_id: invitation.organization_id,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, user_id } = body;

  if (!token || !user_id) {
    return NextResponse.json({ error: "Token ve user_id gerekli" }, { status: 400 });
  }

  // Admin client kullan: yeni kayıt olan kullanıcının session'ı henüz cookie'lerde
  // olmayabileceği için RLS'i bypass etmek gerekiyor.
  const adminClient = createAdminClient();

  // Daveti bul (okuma işlemi için normal client yeterli)
  const supabase = await createClient();
  const { data: invitation, error: invError } = await supabase
    .from("invitations")
    .select("id, email, role, organization_id, expires_at, accepted_at")
    .eq("token", token)
    .single();

  if (invError || !invitation) {
    return NextResponse.json({ error: "Gecersiz davet" }, { status: 404 });
  }

  if (invitation.accepted_at) {
    return NextResponse.json({ error: "Bu davet zaten kullanilmis" }, { status: 400 });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "Davet suresi dolmus" }, { status: 400 });
  }

  // Kullaniciyi organizasyona ekle (admin client ile RLS bypass)
  const { error: memberError } = await adminClient
    .from("organization_members")
    .insert({
      organization_id: invitation.organization_id,
      user_id,
      role: invitation.role,
      status: "active",
      accepted_at: new Date().toISOString(),
    });

  if (memberError) {
    console.error("Member insert error:", memberError);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  // Daveti kabul edildi olarak isaretle (admin client ile)
  await adminClient
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  return NextResponse.json({ success: true });
}
