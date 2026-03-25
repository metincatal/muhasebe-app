export const DEFAULT_INCOME_CATEGORIES = [
  { name: "Satış Geliri", icon: "shopping-bag", color: "#22c55e" },
  { name: "Hizmet Geliri", icon: "briefcase", color: "#3b82f6" },
  { name: "Faiz Geliri", icon: "percent", color: "#8b5cf6" },
  { name: "Kira Geliri", icon: "home", color: "#f59e0b" },
  { name: "Yatırım Geliri", icon: "trending-up", color: "#06b6d4" },
  { name: "Diğer Gelir", icon: "plus-circle", color: "#6b7280" },
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Kira", icon: "home", color: "#ef4444" },
  { name: "Maaş & Personel", icon: "users", color: "#f97316" },
  { name: "Market & Gıda", icon: "shopping-cart", color: "#84cc16" },
  { name: "Ulaşım & Yakıt", icon: "car", color: "#06b6d4" },
  { name: "Faturalar (Elektrik, Su, Doğalgaz)", icon: "zap", color: "#eab308" },
  { name: "İletişim (Telefon, İnternet)", icon: "phone", color: "#8b5cf6" },
  { name: "Ofis & Kırtasiye", icon: "file-text", color: "#64748b" },
  { name: "Pazarlama & Reklam", icon: "megaphone", color: "#ec4899" },
  { name: "Sigorta", icon: "shield", color: "#14b8a6" },
  { name: "Vergi & Harç", icon: "landmark", color: "#dc2626" },
  { name: "Bakım & Onarım", icon: "wrench", color: "#78716c" },
  { name: "Eğitim", icon: "graduation-cap", color: "#6366f1" },
  { name: "Sağlık", icon: "heart", color: "#f43f5e" },
  { name: "Diğer Gider", icon: "minus-circle", color: "#9ca3af" },
] as const;
