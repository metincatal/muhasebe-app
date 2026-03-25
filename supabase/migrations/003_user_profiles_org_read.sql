-- Ayni organizasyondaki uyelerin profillerini gorebilmek icin
-- Mevcut politika sadece kendi profilini gosteriyordu (auth.uid() = id)
CREATE POLICY "users_org_members_read" ON user_profiles FOR SELECT
  USING (
    id IN (
      SELECT om.user_id FROM organization_members om
      WHERE om.organization_id IN (
        SELECT om2.organization_id FROM organization_members om2
        WHERE om2.user_id = auth.uid()
      )
    )
  );
