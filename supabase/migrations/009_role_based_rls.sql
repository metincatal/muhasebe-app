-- ==========================================
-- Rol Tabanli RLS Politikalari
-- Viewer: sadece SELECT
-- Admin + Accountant: tam CRUD
-- ==========================================

-- ==========================================
-- KATEGORILER
-- ==========================================
DROP POLICY IF EXISTS "categories_org" ON categories;

CREATE POLICY "categories_select" ON categories FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "categories_update" ON categories FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "categories_delete" ON categories FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

-- ==========================================
-- HESAPLAR
-- ==========================================
DROP POLICY IF EXISTS "accounts_org" ON accounts;

CREATE POLICY "accounts_select" ON accounts FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "accounts_insert" ON accounts FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "accounts_update" ON accounts FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "accounts_delete" ON accounts FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

-- ==========================================
-- ISLEMLER
-- ==========================================
DROP POLICY IF EXISTS "transactions_org" ON transactions;

CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "transactions_update" ON transactions FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "transactions_delete" ON transactions FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

-- ==========================================
-- FATURALAR
-- ==========================================
DROP POLICY IF EXISTS "invoices_org" ON invoices;

CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "invoices_insert" ON invoices FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "invoices_update" ON invoices FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "invoices_delete" ON invoices FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

-- ==========================================
-- FATURA KALEMLERI (join uzerinden)
-- ==========================================
DROP POLICY IF EXISTS "invoice_items_org" ON invoice_items;

CREATE POLICY "invoice_items_select" ON invoice_items FOR SELECT USING (
  invoice_id IN (
    SELECT invoices.id FROM invoices
    JOIN organization_members ON organization_members.organization_id = invoices.organization_id
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.status = 'active'
  )
);

CREATE POLICY "invoice_items_insert" ON invoice_items FOR INSERT WITH CHECK (
  invoice_id IN (
    SELECT invoices.id FROM invoices
    JOIN organization_members ON organization_members.organization_id = invoices.organization_id
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.status = 'active'
    AND organization_members.role IN ('admin', 'accountant')
  )
);

CREATE POLICY "invoice_items_update" ON invoice_items FOR UPDATE USING (
  invoice_id IN (
    SELECT invoices.id FROM invoices
    JOIN organization_members ON organization_members.organization_id = invoices.organization_id
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.status = 'active'
    AND organization_members.role IN ('admin', 'accountant')
  )
);

CREATE POLICY "invoice_items_delete" ON invoice_items FOR DELETE USING (
  invoice_id IN (
    SELECT invoices.id FROM invoices
    JOIN organization_members ON organization_members.organization_id = invoices.organization_id
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.status = 'active'
    AND organization_members.role IN ('admin', 'accountant')
  )
);

-- ==========================================
-- FISLER
-- ==========================================
DROP POLICY IF EXISTS "receipts_org" ON receipts;

CREATE POLICY "receipts_select" ON receipts FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "receipts_insert" ON receipts FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "receipts_update" ON receipts FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "receipts_delete" ON receipts FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

-- ==========================================
-- YEVMIYE KAYITLARI
-- ==========================================
DROP POLICY IF EXISTS "journal_entries_org" ON journal_entries;

CREATE POLICY "journal_entries_select" ON journal_entries FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "journal_entries_insert" ON journal_entries FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "journal_entries_update" ON journal_entries FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "journal_entries_delete" ON journal_entries FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

-- ==========================================
-- YEVMIYE SATIRLARI (join uzerinden)
-- ==========================================
DROP POLICY IF EXISTS "journal_lines_org" ON journal_entry_lines;

CREATE POLICY "journal_lines_select" ON journal_entry_lines FOR SELECT USING (
  journal_entry_id IN (
    SELECT journal_entries.id FROM journal_entries
    JOIN organization_members ON organization_members.organization_id = journal_entries.organization_id
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.status = 'active'
  )
);

CREATE POLICY "journal_lines_insert" ON journal_entry_lines FOR INSERT WITH CHECK (
  journal_entry_id IN (
    SELECT journal_entries.id FROM journal_entries
    JOIN organization_members ON organization_members.organization_id = journal_entries.organization_id
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.status = 'active'
    AND organization_members.role IN ('admin', 'accountant')
  )
);

CREATE POLICY "journal_lines_update" ON journal_entry_lines FOR UPDATE USING (
  journal_entry_id IN (
    SELECT journal_entries.id FROM journal_entries
    JOIN organization_members ON organization_members.organization_id = journal_entries.organization_id
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.status = 'active'
    AND organization_members.role IN ('admin', 'accountant')
  )
);

CREATE POLICY "journal_lines_delete" ON journal_entry_lines FOR DELETE USING (
  journal_entry_id IN (
    SELECT journal_entries.id FROM journal_entries
    JOIN organization_members ON organization_members.organization_id = journal_entries.organization_id
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.status = 'active'
    AND organization_members.role IN ('admin', 'accountant')
  )
);

-- ==========================================
-- BANKA HESAPLARI
-- ==========================================
DROP POLICY IF EXISTS "bank_accounts_org" ON bank_accounts;

CREATE POLICY "bank_accounts_select" ON bank_accounts FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "bank_accounts_insert" ON bank_accounts FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "bank_accounts_update" ON bank_accounts FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "bank_accounts_delete" ON bank_accounts FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

-- ==========================================
-- BANKA ISLEMLERI (join uzerinden)
-- ==========================================
DROP POLICY IF EXISTS "bank_transactions_org" ON bank_transactions;

CREATE POLICY "bank_transactions_select" ON bank_transactions FOR SELECT USING (
  bank_account_id IN (
    SELECT bank_accounts.id FROM bank_accounts
    JOIN organization_members ON organization_members.organization_id = bank_accounts.organization_id
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.status = 'active'
  )
);

CREATE POLICY "bank_transactions_insert" ON bank_transactions FOR INSERT WITH CHECK (
  bank_account_id IN (
    SELECT bank_accounts.id FROM bank_accounts
    JOIN organization_members ON organization_members.organization_id = bank_accounts.organization_id
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.status = 'active'
    AND organization_members.role IN ('admin', 'accountant')
  )
);

CREATE POLICY "bank_transactions_update" ON bank_transactions FOR UPDATE USING (
  bank_account_id IN (
    SELECT bank_accounts.id FROM bank_accounts
    JOIN organization_members ON organization_members.organization_id = bank_accounts.organization_id
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.status = 'active'
    AND organization_members.role IN ('admin', 'accountant')
  )
);

CREATE POLICY "bank_transactions_delete" ON bank_transactions FOR DELETE USING (
  bank_account_id IN (
    SELECT bank_accounts.id FROM bank_accounts
    JOIN organization_members ON organization_members.organization_id = bank_accounts.organization_id
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.status = 'active'
    AND organization_members.role IN ('admin', 'accountant')
  )
);

-- ==========================================
-- KISILER
-- ==========================================
DROP POLICY IF EXISTS "contacts_org" ON contacts;

CREATE POLICY "contacts_select" ON contacts FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "contacts_insert" ON contacts FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "contacts_update" ON contacts FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "contacts_delete" ON contacts FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

-- ==========================================
-- TEKRARLAYAN ISLEMLER
-- ==========================================
DROP POLICY IF EXISTS "recurring_transactions_org" ON recurring_transactions;

CREATE POLICY "recurring_transactions_select" ON recurring_transactions FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "recurring_transactions_insert" ON recurring_transactions FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "recurring_transactions_update" ON recurring_transactions FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "recurring_transactions_delete" ON recurring_transactions FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

-- ==========================================
-- BUTCELER
-- ==========================================
DROP POLICY IF EXISTS "budgets_org" ON budgets;

CREATE POLICY "budgets_select" ON budgets FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "budgets_insert" ON budgets FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "budgets_update" ON budgets FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "budgets_delete" ON budgets FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    AND role IN ('admin', 'accountant')
  )
);
