-- ==========================================
-- Üye Listesi RLS Düzeltmesi
-- Sorun: org_members_select politikası sadece user_id = auth.uid() izni veriyordu.
-- Adminler ve diğer üyeler yalnızca kendi satırlarını görebiliyordu.
-- Çözüm: Security Definer fonksiyon ile recursion'dan kaçınarak
-- org üyelerinin birbirini görmesi sağlanıyor.
-- ==========================================

-- Security Definer fonksiyon: kullanıcının org'da aktif üye olup olmadığını
-- RLS'i bypass ederek kontrol eder (recursion yok).
CREATE OR REPLACE FUNCTION user_is_active_member_of(org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND status = 'active'
  )
$$;

-- Eski tek-satır politikasını kaldır
DROP POLICY IF EXISTS "org_members_select" ON organization_members;

-- Yeni: tüm aktif org üyeleri, aynı org'un tüm üyelerini görebilir
CREATE POLICY "org_members_select" ON organization_members
  FOR SELECT USING (
    user_is_active_member_of(organization_id)
  );
