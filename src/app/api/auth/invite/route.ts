import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: token'ı doğrula — invitations RLS sadece org admin'e izin verdiğinden admin client kullanılıyor
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token gerekli" }, { status: 400 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("Admin client olusturulamadi (GET):", err);
    return NextResponse.json({ error: "Sunucu yapilandirma hatasi. Yoneticiyle iletisime gecin." }, { status: 500 });
  }

  const { data: invitation, error } = await admin
    .from("invitations")
    .select("id, email, role, organization_id, expires_at, accepted_at")
    .eq("token", token)
    .single();

  if (error || !invitation) {
    console.error("Invitation query failed:", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      tokenPrefix: token?.substring(0, 8),
    });
    // PGRST116 = "JSON object requested, single row not found" — token bulunamadı
    const isNotFound = error?.code === "PGRST116";
    return NextResponse.json(
      { error: isNotFound ? "Gecersiz davet tokeni" : `Sunucu hatasi: ${error?.message || "Bilinmeyen"}` },
      { status: isNotFound ? 404 : 500 }
    );
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

// POST: kullanıcı oluştur + org'a ekle — admin client gerekli (RLS bypass + email confirm bypass)
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

  // Admin client oluştur
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("Admin client error:", err);
    return NextResponse.json(
      { error: "Sunucu yapilandirma hatasi. Lutfen yoneticiyle iletisime gecin." },
      { status: 500 }
    );
  }

  // 1. Daveti doğrula (admin client ile — RLS bypass)
  const { data: invitation, error: invError } = await admin
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

  // 2. Kullanıcıyı admin üzerinden oluştur (email doğrulaması bypass)
  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    user_metadata: { full_name },
    email_confirm: true,
  });

  let userId: string;

  if (createError) {
    // Kullanıcı zaten varsa mevcut ID'yi kullan
    if (
      createError.message?.toLowerCase().includes("already") ||
      createError.message?.toLowerCase().includes("exists")
    ) {
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

  // 3. Trigger'ın otomatik oluşturduğu organizasyonu temizle.
  //    on_auth_user_created trigger'ı her yeni kullanıcı için bir org + üyelik yaratıyor.
  //    Davetli kullanıcı zaten var olan bir org'a katılacağından bu sahte org silinmeli.
  const { data: autoMemberships } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .neq("organization_id", invitation.organization_id);

  if (autoMemberships && autoMemberships.length > 0) {
    const autoOrgIds = autoMemberships.map((m) => m.organization_id);
    await admin.from("organization_members").delete().eq("user_id", userId).neq("organization_id", invitation.organization_id);
    await admin.from("organizations").delete().in("id", autoOrgIds);
  }

  // 4. Organizasyona ekle
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

  // 5. Daveti kabul edildi olarak işaretle
  await admin
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  return NextResponse.json({ success: true, email: invitation.email });
}
