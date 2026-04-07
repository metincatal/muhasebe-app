// Action fonksiyonlarının dönüş tipi — tüm property'leri opsiyonel tutar
// böylece page kodlarında `result.error` ve `result.data` doğrudan erişilebilir.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionReturn = { error?: string; [key: string]: any };
