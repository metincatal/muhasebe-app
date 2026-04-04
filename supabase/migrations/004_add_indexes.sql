-- Performance index'leri
-- transactions tablosu
CREATE INDEX IF NOT EXISTS idx_transactions_org_date
  ON transactions(organization_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_category_id
  ON transactions(category_id);

-- invoices tablosu
CREATE INDEX IF NOT EXISTS idx_invoices_org_status
  ON invoices(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_due_date
  ON invoices(due_date);

-- receipts tablosu
CREATE INDEX IF NOT EXISTS idx_receipts_org_created
  ON receipts(organization_id, created_at DESC);

-- bank_transactions tablosu
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account_date
  ON bank_transactions(bank_account_id, date DESC);

-- organization_members tablosu
CREATE INDEX IF NOT EXISTS idx_org_members_user_id
  ON organization_members(user_id);
