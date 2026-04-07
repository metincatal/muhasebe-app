-- ==========================================
-- Davet ile kayıt olan kullanıcılar için trigger düzeltmesi
-- Sorun: handle_new_user trigger'ı her yeni kullanıcı için org yaratıyor,
--        davetli kullanıcılar da dahil. Bu da 2 üyeliğe neden oluyor.
-- Çözüm: user_metadata'da skip_auto_org = true ise org oluşturma, sadece profil yarat.
-- ==========================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Profili her zaman oluştur (FK için gerekli)
  INSERT INTO user_profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Kullanici'))
  ON CONFLICT (id) DO NOTHING;

  -- Davet ile oluşturulmuş kullanıcılar için org oluşturma
  IF (NEW.raw_user_meta_data->>'skip_auto_org') = 'true' THEN
    RETURN NEW;
  END IF;

  -- Normal kayıt: org + üyelik oluştur
  INSERT INTO organizations (name, type)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'org_name', NEW.raw_user_meta_data->>'full_name', 'Organizasyonum'),
    COALESCE(NEW.raw_user_meta_data->>'org_type', 'individual')
  )
  RETURNING id INTO new_org_id;

  INSERT INTO organization_members (organization_id, user_id, role, status, accepted_at)
  VALUES (new_org_id, NEW.id, 'admin', 'active', now());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
