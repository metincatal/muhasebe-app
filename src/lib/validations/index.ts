import { z } from "zod";

// Transaction validation
export const transactionSchema = z.object({
  organization_id: z.string().uuid("Gecersiz organizasyon"),
  type: z.enum(["income", "expense", "transfer"], {
    error: "Islem turu secilmeli",
  }),
  amount: z
    .number({ error: "Tutar gerekli" })
    .positive("Tutar sifirdan buyuk olmali")
    .max(999_999_999, "Tutar cok buyuk"),
  currency: z.string().min(3).max(3, "Gecersiz para birimi"),
  description: z
    .string({ error: "Aciklama gerekli" })
    .min(2, "Aciklama en az 2 karakter olmali")
    .max(500, "Aciklama en fazla 500 karakter olabilir"),
  counterparty: z.string().max(200).optional(),
  category_id: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Gecersiz tarih formati"),
  tags: z.array(z.string()).optional(),
  created_by: z.string().uuid("Gecersiz kullanici"),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

// Invoice validation
export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Kalem aciklamasi gerekli"),
  quantity: z.number().positive("Miktar sifirdan buyuk olmali"),
  unit: z.string().optional(),
  unit_price: z.number().min(0, "Birim fiyat negatif olamaz"),
  tax_rate: z.number().min(0).max(100, "KDV orani 0-100 arasi olmali"),
  tax_amount: z.number().min(0),
  total: z.number(),
});

export const invoiceSchema = z.object({
  organization_id: z.string().uuid(),
  type: z.enum(["sales", "purchase"], {
    error: "Fatura turu secilmeli",
  }),
  invoice_number: z.string().max(50).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Gecersiz tarih"),
  due_date: z.string().optional(),
  counterparty_name: z
    .string({ error: "Karsi taraf adi gerekli" })
    .min(2, "Ad en az 2 karakter olmali"),
  counterparty_tax_id: z.string().max(20).optional(),
  counterparty_address: z.string().max(500).optional(),
  currency: z.string().min(3).max(3),
  items: z.array(invoiceItemSchema).min(1, "En az bir kalem eklenmeli"),
  notes: z.string().max(1000).optional(),
  created_by: z.string().uuid(),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

// Contact validation
export const contactSchema = z.object({
  organization_id: z.string().uuid(),
  type: z.enum(["customer", "supplier", "both"]),
  name: z
    .string({ error: "Ad gerekli" })
    .min(2, "Ad en az 2 karakter olmali")
    .max(200),
  tax_id: z.string().max(20).optional(),
  tax_office: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email("Gecersiz e-posta adresi").optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

// Login validation
export const loginSchema = z.object({
  email: z
    .string({ error: "E-posta gerekli" })
    .email("Gecersiz e-posta adresi"),
  password: z
    .string({ error: "Sifre gerekli" })
    .min(6, "Sifre en az 6 karakter olmali"),
});

// Register validation
export const registerSchema = z.object({
  fullName: z
    .string({ error: "Ad soyad gerekli" })
    .min(2, "Ad en az 2 karakter olmali")
    .max(100),
  email: z
    .string({ error: "E-posta gerekli" })
    .email("Gecersiz e-posta adresi"),
  password: z
    .string({ error: "Sifre gerekli" })
    .min(6, "Sifre en az 6 karakter olmali"),
  accountType: z.enum(["individual", "corporate"]),
  orgName: z.string().max(200).optional(),
});
