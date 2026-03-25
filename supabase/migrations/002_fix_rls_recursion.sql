-- ==========================================
-- RLS Sonsuz Dongu Duzeltmesi
-- ==========================================

-- Sorun: org_members_admin_manage politikasi FOR ALL olarak tanimli
-- ve organization_members tablosunu kendi icinden sorguluyor.
-- SELECT sirasinda bu politika da degerlendiriliyor ve
-- sonsuz dongu (infinite recursion) olusturuyor.

-- 1) Eski politikalari kaldir
DROP POLICY IF EXISTS "org_members_read" ON organization_members;
DROP POLICY IF EXISTS "org_members_admin_manage" ON organization_members;

-- 2) SELECT: Kullanici kendi uyeligini gorebilir
CREATE POLICY "org_members_select" ON organization_members
  FOR SELECT USING (user_id = auth.uid());

-- 3) INSERT: Sadece admin ekleyebilir (security definer fonksiyon ile)
CREATE POLICY "org_members_insert" ON organization_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
    OR user_id = auth.uid() -- Kullanici kendi kaydini olusturabilir (trigger icin)
  );

-- 4) UPDATE: Sadece admin guncelleyebilir
CREATE POLICY "org_members_update" ON organization_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- 5) DELETE: Sadece admin silebilir
CREATE POLICY "org_members_delete" ON organization_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );
