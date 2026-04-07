-- ==========================================
-- organization_members RLS düzeltmesi — auth.uid() SECURITY DEFINER sorunu
-- Sorun: user_is_active_member_of() fonksiyonu SECURITY DEFINER context'te
--        auth.uid() NULL dönebiliyor (Supabase'de bilinen davranış).
-- Bu yüzden auth-provider organization_members'a erişemiyor ve organization
-- null kalıyor. getMembers hiç çağrılmıyor.
-- Çözüm:
--   1. Fonksiyona SET search_path + (SELECT auth.uid()) wrapper eklendi
--   2. Policy'ye doğrudan user_id = auth.uid() koşulu eklendi (kendi satırını
--      her zaman görebilir, fonksiyona bağımlılık olmaz)
-- ==========================================

-- 1. Fonksiyonu düzelt: search_path zorla, (SELECT auth.uid()) wrapper ile NULL koruması
CREATE OR REPLACE FUNCTION user_is_active_member_of(org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = (SELECT auth.uid())
    AND status = 'active'
  )
$$;

-- 2. Policy'yi güncelle: kendi satırı her zaman görünür (SECURITY DEFINER'a bağımlılık yok)
DROP POLICY IF EXISTS "org_members_select" ON organization_members;

CREATE POLICY "org_members_select" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid()                          -- Kendi üyelik satırını her zaman görebilir
    OR user_is_active_member_of(organization_id)  -- Aynı org'daki diğer üyeleri görebilir
  );
