-- Audit Log Tablosu
-- Her create/update/delete işlemi için kayıt tutar

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Org üyeleri kendi org'larının loglarını görebilir
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Org üyeleri kendi org'larına log yazabilir (sadece kendi user_id'leri ile)
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Performans index'leri
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
  ON audit_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record
  ON audit_logs(table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON audit_logs(user_id, created_at DESC);
