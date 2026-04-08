import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// GET: token'ı doğrula — invitations RLS sadece org admin'e izin verdiğinden admin client kullanılıyor
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Token gerekli" }, { status: 400 });
    }

    const admin = createAdminClient();

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

    // Davet edilen e-posta zaten kayıtlı kullanıcı mı?
    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const userExists = usersData?.users?.some((u) => u.email === invitation.email) ?? false;

    return NextResponse.json({
      email: invitation.email,
      role: invitation.role,
      organization_id: invitation.organization_id,
      userExists,
    });
  } catch (err) {
    console.error("Invite GET unhandled error:", err);
    const message = err instanceof Error ? err.message : "Bilinmeyen sunucu hatasi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: kullanıcı oluştur + org'a ekle — admin client gerekli (RLS bypass + email confirm bypass)
export async function POST(request: NextRequest) {
  try {
    let body: { token?: string; full_name?: string; password?: string; accept_only?: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Gecersiz istek" }, { status: 400 });
    }

    const { token, full_name, password, accept_only } = body;
    if (!token) {
      return NextResponse.json({ error: "Token gerekli" }, { status: 400 });
    }

    const admin = createAdminClient();

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

    let userId: string;

    if (accept_only) {
      // 2a. Mevcut kullanıcı: session'dan al, yeni hesap oluşturma
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Oturum acmaniz gerekiyor" }, { status: 401 });
      }
      if (user.email !== invitation.email) {
        return NextResponse.json(
          { error: `Bu davet ${invitation.email} adresine ait. Dogru hesapla giris yapin.` },
          { status: 403 }
        );
      }
      userId = user.id;
    } else {
      // 2b. Yeni kullanıcı: hesap oluştur
      if (!full_name || !password) {
        return NextResponse.json({ error: "Ad soyad ve sifre gerekli" }, { status: 400 });
      }

      const { data: userData, error: createError } = await admin.auth.admin.createUser({
        email: invitation.email,
        password,
        user_metadata: { full_name, skip_auto_org: "true" },
        email_confirm: true,
      });

      if (createError) {
        // Kullanıcı zaten varsa mevcut ID'yi kullan
        if (
          createError.message?.toLowerCase().includes("already") ||
          createError.message?.toLowerCase().includes("exists")
        ) {
          const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
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
    }

    // 3. Organizasyona ekle
    const { error: memberError } = await admin
      .from("organization_members")
      .insert({
        organization_id: invitation.organization_id,
        user_id: userId,
        role: invitation.role,
        status: "active",
        accepted_at: new Date().toISOString(),
      });

    if (memberError) {
      if (memberError.message?.includes("duplicate") || memberError.message?.includes("unique")) {
        return NextResponse.json({ error: "Bu organizasyonun zaten uyesisiniz" }, { status: 409 });
      }
      console.error("Member insert error:", memberError);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    // 4. Daveti kabul edildi olarak işaretle
    await admin
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return NextResponse.json({ success: true, email: invitation.email });
  } catch (err) {
    console.error("Invite POST unhandled error:", err);
    const message = err instanceof Error ? err.message : "Bilinmeyen sunucu hatasi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
