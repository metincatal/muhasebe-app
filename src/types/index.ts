// OCR types
export interface ReceiptOCRResult extends Record<string, unknown> {
  vendor_name: string | null;
  date: string | null;
  items: ReceiptItem[];
  subtotal: number | null;
  tax_rate: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  currency: string;
  payment_method: string | null;
  receipt_number: string | null;
  raw_text: string;
}

export interface ReceiptItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// Organization types
export type OrganizationType = "individual" | "corporate";
export type UserRole = "admin" | "accountant" | "viewer";
export type TransactionType = "income" | "expense" | "transfer";
export type InvoiceType = "sales" | "purchase";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type ReceiptStatus = "pending" | "processed" | "confirmed" | "rejected";
export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type ContactType = "customer" | "supplier" | "both";
export type CategoryType = "income" | "expense";

// Dashboard summary
export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  pendingInvoices: number;
  overdueInvoices: number;
  recentTransactions: TransactionWithCategory[];
}

export interface TransactionWithCategory {
  id: string;
  type: TransactionType;
  amount: string;
  currency: string;
  description: string | null;
  date: string;
  counterparty: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
}

// Currency
export interface CurrencyRate {
  code: string;
  name: string;
  buyRate: number;
  sellRate: number;
  date: string;
}
