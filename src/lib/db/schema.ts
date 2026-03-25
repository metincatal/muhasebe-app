import { pgTable, uuid, text, timestamp, boolean, decimal, integer, date, jsonb, serial, uniqueIndex } from "drizzle-orm/pg-core";

// ==========================================
// KULLANICILAR VE ORGANİZASYONLAR
// ==========================================

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type", { enum: ["individual", "corporate"] }).notNull(),
  taxId: text("tax_id"),
  taxOffice: text("tax_office"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  logoUrl: text("logo_url"),
  defaultCurrency: text("default_currency").notNull().default("TRY"),
  fiscalYearStart: integer("fiscal_year_start").default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(), // References auth.users(id)
  fullName: text("full_name").notNull(),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  preferredLanguage: text("preferred_language").default("tr"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["admin", "accountant", "viewer"] }).notNull(),
  invitedBy: uuid("invited_by").references(() => userProfiles.id),
  invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  status: text("status", { enum: ["pending", "active", "inactive"] }).notNull().default("pending"),
}, (table) => [
  uniqueIndex("org_user_unique").on(table.organizationId, table.userId),
]);

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role", { enum: ["admin", "accountant", "viewer"] }).notNull(),
  token: text("token").notNull().unique(),
  invitedBy: uuid("invited_by").notNull().references(() => userProfiles.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ==========================================
// HESAP PLANI VE FİNANSAL YAPI
// ==========================================

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: text("type", { enum: ["asset", "liability", "equity", "revenue", "expense"] }).notNull(),
  parentId: uuid("parent_id"),
  isSystem: boolean("is_system").default(false),
  isActive: boolean("is_active").default(true),
  currency: text("currency").default("TRY"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex("org_account_code_unique").on(table.organizationId, table.code),
]);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  color: text("color"),
  icon: text("icon"),
  parentId: uuid("parent_id"),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ==========================================
// İŞLEMLER VE MUHASEBE KAYITLARI
// ==========================================

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["income", "expense", "transfer"] }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  accountId: uuid("account_id").references(() => accounts.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("TRY"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }).default("1.0"),
  amountInBase: decimal("amount_in_base", { precision: 15, scale: 2 }),
  description: text("description"),
  date: date("date").notNull(),
  counterparty: text("counterparty"),
  tags: text("tags").array(),
  receiptId: uuid("receipt_id"),
  invoiceId: uuid("invoice_id"),
  bankTransactionId: text("bank_transaction_id"),
  isReconciled: boolean("is_reconciled").default(false),
  createdBy: uuid("created_by").references(() => userProfiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  entryNumber: serial("entry_number"),
  date: date("date").notNull(),
  description: text("description"),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  isPosted: boolean("is_posted").default(false),
  createdBy: uuid("created_by").references(() => userProfiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const journalEntryLines = pgTable("journal_entry_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  journalEntryId: uuid("journal_entry_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  debit: decimal("debit", { precision: 15, scale: 2 }).default("0"),
  credit: decimal("credit", { precision: 15, scale: 2 }).default("0"),
  description: text("description"),
  currency: text("currency").default("TRY"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }).default("1.0"),
});

// ==========================================
// FATURALAR VE FİŞLER
// ==========================================

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["sales", "purchase"] }).notNull(),
  invoiceNumber: text("invoice_number"),
  date: date("date").notNull(),
  dueDate: date("due_date"),
  status: text("status", { enum: ["draft", "sent", "paid", "overdue", "cancelled"] }).notNull().default("draft"),
  counterpartyName: text("counterparty_name").notNull(),
  counterpartyTaxId: text("counterparty_tax_id"),
  counterpartyAddress: text("counterparty_address"),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 15, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("TRY"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }).default("1.0"),
  notes: text("notes"),
  pdfUrl: text("pdf_url"),
  createdBy: uuid("created_by").references(() => userProfiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull().default("1"),
  unit: text("unit").default("adet"),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("20.00"),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 15, scale: 2 }).notNull().default("0"),
  categoryId: uuid("category_id").references(() => categories.id),
  sortOrder: integer("sort_order").default(0),
});

export const receipts = pgTable("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  ocrRawText: text("ocr_raw_text"),
  ocrParsedData: jsonb("ocr_parsed_data"),
  vendorName: text("vendor_name"),
  date: date("date"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }),
  currency: text("currency").default("TRY"),
  categoryId: uuid("category_id").references(() => categories.id),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  status: text("status", { enum: ["pending", "processed", "confirmed", "rejected"] }).default("pending"),
  createdBy: uuid("created_by").references(() => userProfiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ==========================================
// DÖVİZ VE BANKA
// ==========================================

export const currencies = pgTable("currencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  decimalPlaces: integer("decimal_places").default(2),
});

export const exchangeRates = pgTable("exchange_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  baseCurrency: text("base_currency").notNull().default("TRY"),
  targetCurrency: text("target_currency").notNull(),
  rate: decimal("rate", { precision: 12, scale: 6 }).notNull(),
  date: date("date").notNull(),
  source: text("source").default("tcmb"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex("exchange_rate_unique").on(table.baseCurrency, table.targetCurrency, table.date),
]);

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  accountName: text("account_name"),
  iban: text("iban"),
  currency: text("currency").default("TRY"),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  provider: text("provider"),
  connectionStatus: text("connection_status").default("disconnected"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  accountId: uuid("account_id").references(() => accounts.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const bankTransactions = pgTable("bank_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  bankAccountId: uuid("bank_account_id").notNull().references(() => bankAccounts.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  date: date("date").notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 15, scale: 2 }),
  type: text("type", { enum: ["credit", "debit"] }),
  categorySuggestion: text("category_suggestion"),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  isMatched: boolean("is_matched").default(false),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ==========================================
// KİŞİLER (Müşteriler/Tedarikçiler)
// ==========================================

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["customer", "supplier", "both"] }).notNull(),
  name: text("name").notNull(),
  taxId: text("tax_id"),
  taxOffice: text("tax_office"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
