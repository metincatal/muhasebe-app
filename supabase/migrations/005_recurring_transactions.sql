-- ==========================================
-- Tekrarlayan Islemler
-- ==========================================

CREATE TABLE recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  description TEXT NOT NULL,
  counterparty TEXT,
  category_id UUID REFERENCES categories(id),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE NOT NULL,
  last_run_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_transactions_org" ON recurring_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = recurring_transactions.organization_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE INDEX idx_recurring_transactions_org ON recurring_transactions(organization_id);
CREATE INDEX idx_recurring_transactions_next_run ON recurring_transactions(next_run_date) WHERE is_active = true;
