import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Tüm işlemler admin client üzerinden — RLS ve email doğrulama sorunlarını önler.

async function getInvitation(token: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invitations")
    .select("id, email, role, organization_id, expires_at, accepted_at")
    .eq("token", token)
    .single();
  return { data, error };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token gerekli" }, { status: 400 });
  }

  const { data: invitation, error } = await getInvitation(token);

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
  let body: { token?: string; full_name?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Gecersiz istek" }, { status: 400 });
  }

  const { token, full_name, password } = body;

  if (!token || !full_name || !password) {
    return NextResponse.json({ error: "Token, ad soyad ve sifre gerekli" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Daveti doğrula
  const { data: invitation, error: invError } = await getInvitation(token);

  if (invError || !invitation) {
    return NextResponse.json({ error: "Gecersiz davet" }, { status: 404 });
  }
  if (invitation.accepted_at) {
    return NextResponse.json({ error: "Bu davet zaten kullanilmis" }, { status: 400 });
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "Davet suresi dolmus" }, { status: 400 });
  }

  // 2. Kullanıcıyı admin üzerinden oluştur (email doğrulaması bypass)
  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    user_metadata: { full_name },
    email_confirm: true,
  });

  let userId: string;

  if (createError) {
    // Kullanıcı zaten varsa ID'sini bul
    if (createError.message?.toLowerCase().includes("already") || createError.message?.toLowerCase().includes("exists")) {
      const { data: existingUsers } = await admin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u) => u.email === invitation.email);
      if (!existing) {
        return NextResponse.json({ error: "Kullanici olusturulamadi: " + createError.message }, { status: 500 });
      }
      userId = existing.id;
    } else {
      console.error("createUser error:", createError);
      return NextResponse.json({ error: "Kullanici olusturulamadi: " + createError.message }, { status: 500 });
    }
  } else {
    userId = userData.user.id;
  }

  // 3. Organizasyona ekle (varsa skip)
  const { error: memberError } = await admin
    .from("organization_members")
    .insert({
      organization_id: invitation.organization_id,
      user_id: userId,
      role: invitation.role,
      status: "active",
      accepted_at: new Date().toISOString(),
    });

  if (memberError && !memberError.message?.includes("duplicate") && !memberError.message?.includes("unique")) {
    console.error("Member insert error:", memberError);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  // 4. Daveti kabul edildi olarak işaretle
  await admin
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  return NextResponse.json({ success: true, email: invitation.email });
}
