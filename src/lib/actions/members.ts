"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { sendInviteEmail } from "@/lib/email/send-invite";
import { requireAdminAccess } from "@/lib/auth/role-check";
import type { ActionReturn } from "@/lib/actions/types";

export async function getMembers(orgId: string) {
  // Admin client kullan — org_members_select RLS politikasındaki SECURITY DEFINER
  // context sorunu yaşandığında auth.uid() null dönebiliyor. Yetki kontrolünü kendimiz yapıyoruz.
  const supabase = await createClient();
  const admin = createAdminClient();

  // Mevcut kullanıcıyı doğrula ve bu org'un üyesi olduğunu kontrol et
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: myMembership, error: membershipError } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!myMembership) return [];

  // Yetkili: tüm üyeleri getir
  const { data, error } = await admin
    .from("organization_members")
    .select("id, role, created_at, user_id")
    .eq("organization_id", orgId)
    .order("created_at");

  if (error) {
    console.error("getMembers error:", error);
    return [];
  }

  // Profil bilgilerini ayri sorgula
  const userIds = (data || []).map((m) => m.user_id);
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);

  const profileMap: Record<string, { id: string; full_name: string | null; avatar_url: string | null }> = {};
  (profiles || []).forEach((p) => {
    profileMap[p.id] = p;
  });

  return (data || []).map((m) => ({
    ...m,
    user_profiles: profileMap[m.user_id] || null,
  }));
}

export async function getMemberEmails(userIds: string[]) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("user_profiles")
    .select("id, email")
    .in("id", userIds);

  if (error) {
    console.error("getMemberEmails error:", error);
    return {};
  }

  const emailMap: Record<string, string> = {};
  (data || []).forEach((u) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emailMap[u.id] = (u as any).email || "";
  });
  return emailMap;
}

export async function updateMemberRole(memberId: string, role: string): Promise<ActionReturn> {
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("id", memberId)
    .single();

  if (!member) return { error: "Uye bulunamadi" };

  const accessError = await requireAdminAccess(member.organization_id);
  if (accessError) return accessError;

  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("id", memberId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/users");
  return { success: true };
}

export async function removeMember(memberId: string): Promise<ActionReturn> {
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("id", memberId)
    .single();

  if (!member) return { error: "Uye bulunamadi" };

  const accessError = await requireAdminAccess(member.organization_id);
  if (accessError) return accessError;

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/users");
  return { success: true };
}

export async function createInvitation(orgId: string, email: string, role: string): Promise<ActionReturn> {
  const accessError = await requireAdminAccess(orgId);
  if (accessError) return accessError;

  const supabase = await createClient();

  // Mevcut kullaniciyi al
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Oturum bulunamadi" };
  }

  // Token olustur
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from("invitations")
    .insert({
      organization_id: orgId,
      email,
      role,
      token,
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("createInvitation error:", error);
    return { error: error.message };
  }

  // Davet e-postasi gonder
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://siyakat.app";
  const inviteUrl = `${baseUrl}/invite/${token}`;

  // Davet edenin adini al
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Organizasyon adini al
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();

  let emailSent = false;
  try {
    const emailResult = await sendInviteEmail({
      to: email,
      inviterName: profile?.full_name || "Bir kullanici",
      orgName: org?.name || "Siyakat",
      role,
      inviteUrl,
    });
    emailSent = !emailResult.error;
    if (emailResult.error) {
      console.error("Email send error:", emailResult.error);
    }
  } catch (err) {
    console.error("Email send exception:", err);
  }

  revalidatePath("/settings/users");
  return { data, token, emailSent };
}

export async function getInvitations(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getInvitations error:", error);
    return [];
  }

  return data;
}

export async function deleteInvitation(id: string): Promise<ActionReturn> {
  const supabase = await createClient();

  const { data: invitation } = await supabase
    .from("invitations")
    .select("organization_id")
    .eq("id", id)
    .single();

  if (!invitation) return { error: "Davet bulunamadi" };

  const accessError = await requireAdminAccess(invitation.organization_id);
  if (accessError) return accessError;

  const { error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/users");
  return { success: true };
}
