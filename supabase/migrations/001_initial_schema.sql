-- ==========================================
-- Muhasebe Pro - Veritabani Semasi
-- ==========================================

-- Organizasyonlar
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('individual', 'corporate')),
  tax_id TEXT,
  tax_office TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  default_currency TEXT NOT NULL DEFAULT 'TRY',
  fiscal_year_start INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kullanici profilleri
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  preferred_language TEXT DEFAULT 'tr',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Organizasyon uyelikleri
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'accountant', 'viewer')),
  invited_by UUID REFERENCES user_profiles(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive')),
  UNIQUE(organization_id, user_id)
);

-- Davetler
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'accountant', 'viewer')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES user_profiles(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Kategoriler
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT,
  icon TEXT,
  parent_id UUID REFERENCES categories(id),
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Hesap plani
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_id UUID REFERENCES accounts(id),
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  currency TEXT DEFAULT 'TRY',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- Islemler
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  category_id UUID REFERENCES categories(id),
  account_id UUID REFERENCES accounts(id),
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  exchange_rate DECIMAL(10,6) DEFAULT 1.0,
  amount_in_base DECIMAL(15,2),
  description TEXT,
  date DATE NOT NULL,
  counterparty TEXT,
  tags TEXT[],
  receipt_id UUID,
  invoice_id UUID,
  bank_transaction_id TEXT,
  is_reconciled BOOLEAN DEFAULT false,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Yevmiye kayitlari
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entry_number SERIAL,
  date DATE NOT NULL,
  description TEXT,
  transaction_id UUID REFERENCES transactions(id),
  is_posted BOOLEAN DEFAULT false,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Yevmiye satirlari
CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  currency TEXT DEFAULT 'TRY',
  exchange_rate DECIMAL(10,6) DEFAULT 1.0
);

-- Faturalar
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sales', 'purchase')),
  invoice_number TEXT,
  date DATE NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  counterparty_name TEXT NOT NULL,
  counterparty_tax_id TEXT,
  counterparty_address TEXT,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  exchange_rate DECIMAL(10,6) DEFAULT 1.0,
  notes TEXT,
  pdf_url TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fatura kalemleri
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'adet',
  unit_price DECIMAL(15,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 20.00,
  tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  category_id UUID REFERENCES categories(id),
  sort_order INT DEFAULT 0
);

-- Fisler
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  ocr_raw_text TEXT,
  ocr_parsed_data JSONB,
  vendor_name TEXT,
  date DATE,
  total_amount DECIMAL(15,2),
  tax_amount DECIMAL(15,2),
  currency TEXT DEFAULT 'TRY',
  category_id UUID REFERENCES categories(id),
  transaction_id UUID REFERENCES transactions(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'confirmed', 'rejected')),
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Para birimleri
CREATE TABLE currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_places INT DEFAULT 2
);

-- Doviz kurlari
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL DEFAULT 'TRY',
  target_currency TEXT NOT NULL,
  rate DECIMAL(12,6) NOT NULL,
  date DATE NOT NULL,
  source TEXT DEFAULT 'tcmb',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(base_currency, target_currency, date)
);

-- Banka hesaplari
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_name TEXT,
  iban TEXT,
  currency TEXT DEFAULT 'TRY',
  balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  provider TEXT,
  connection_status TEXT DEFAULT 'disconnected',
  last_synced_at TIMESTAMPTZ,
  account_id UUID REFERENCES accounts(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Banka islemleri
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  external_id TEXT,
  date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2),
  type TEXT CHECK (type IN ('credit', 'debit')),
  category_suggestion TEXT,
  transaction_id UUID REFERENCES transactions(id),
  is_matched BOOLEAN DEFAULT false,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Kisiler (Musteriler/Tedarikciler)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('customer', 'supplier', 'both')),
  name TEXT NOT NULL,
  tax_id TEXT,
  tax_office TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- VARSAYILAN VERILER
-- ==========================================

-- Para birimleri
INSERT INTO currencies (code, name, symbol) VALUES
  ('TRY', 'Turk Lirasi', '₺'),
  ('USD', 'ABD Dolari', '$'),
  ('EUR', 'Euro', '€'),
  ('GBP', 'Ingiliz Sterlini', '£'),
  ('CHF', 'Isvicre Frangi', 'CHF'),
  ('JPY', 'Japon Yeni', '¥'),
  ('SAR', 'Suudi Riyali', '﷼'),
  ('AED', 'BAE Dirhemi', 'د.إ');

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Currencies ve exchange_rates herkese okunabilir
CREATE POLICY "currencies_read" ON currencies FOR SELECT USING (true);
CREATE POLICY "exchange_rates_read" ON exchange_rates FOR SELECT USING (true);

-- Kullanici kendi profilini gorebilir/duzenleyebilir
CREATE POLICY "users_own_profile" ON user_profiles FOR ALL USING (auth.uid() = id);

-- Organizasyon uyeleri verileri gorebilir
CREATE POLICY "org_members_read" ON organization_members FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "org_members_admin_manage" ON organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- Organizasyon verilerine erisim (uyeler gorebilir)
CREATE POLICY "org_read" ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );
CREATE POLICY "org_insert" ON organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "org_update" ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Organizasyona bagli tablolar icin genel policy fonksiyonu
-- Kategoriler
CREATE POLICY "categories_org" ON categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = categories.organization_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Hesaplar
CREATE POLICY "accounts_org" ON accounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = accounts.organization_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Islemler
CREATE POLICY "transactions_org" ON transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = transactions.organization_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Faturalar
CREATE POLICY "invoices_org" ON invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = invoices.organization_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Fatura kalemleri
CREATE POLICY "invoice_items_org" ON invoice_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN organization_members ON organization_members.organization_id = invoices.organization_id
      WHERE invoices.id = invoice_items.invoice_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
    )
  );

-- Fisler
CREATE POLICY "receipts_org" ON receipts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = receipts.organization_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Yevmiye kayitlari
CREATE POLICY "journal_entries_org" ON journal_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = journal_entries.organization_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Yevmiye satirlari
CREATE POLICY "journal_lines_org" ON journal_entry_lines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      JOIN organization_members ON organization_members.organization_id = journal_entries.organization_id
      WHERE journal_entries.id = journal_entry_lines.journal_entry_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
    )
  );

-- Banka hesaplari
CREATE POLICY "bank_accounts_org" ON bank_accounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = bank_accounts.organization_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Banka islemleri
CREATE POLICY "bank_transactions_org" ON bank_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bank_accounts
      JOIN organization_members ON organization_members.organization_id = bank_accounts.organization_id
      WHERE bank_accounts.id = bank_transactions.bank_account_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
    )
  );

-- Kisiler
CREATE POLICY "contacts_org" ON contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = contacts.organization_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Davetler
CREATE POLICY "invitations_org" ON invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = invitations.organization_id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Doviz kurlari yazma (admin)
CREATE POLICY "exchange_rates_insert" ON exchange_rates FOR INSERT WITH CHECK (true);

-- ==========================================
-- TRIGGER: Yeni kullanici kayit olunca profil + org olustur
-- ==========================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Profil olustur
  INSERT INTO user_profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Kullanici'));

  -- Organizasyon olustur
  INSERT INTO organizations (name, type)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'org_name', NEW.raw_user_meta_data->>'full_name', 'Organizasyonum'),
    COALESCE(NEW.raw_user_meta_data->>'org_type', 'individual')
  )
  RETURNING id INTO new_org_id;

  -- Kullaniciyi admin olarak ekle
  INSERT INTO organization_members (organization_id, user_id, role, status, accepted_at)
  VALUES (new_org_id, NEW.id, 'admin', 'active', now());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
