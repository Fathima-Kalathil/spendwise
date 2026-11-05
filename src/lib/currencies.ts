export const CURRENCIES = [
  { code: "INR", name: "Indian Rupee" }, { code: "AED", name: "UAE Dirham" }, { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" }, { code: "GBP", name: "British Pound" }, { code: "SAR", name: "Saudi Riyal" },
  { code: "QAR", name: "Qatari Riyal" }, { code: "KWD", name: "Kuwaiti Dinar" }, { code: "OMR", name: "Omani Rial" },
  { code: "BHD", name: "Bahraini Dinar" }, { code: "SGD", name: "Singapore Dollar" }, { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" }, { code: "JPY", name: "Japanese Yen" }, { code: "CNY", name: "Chinese Yuan" },
  { code: "CHF", name: "Swiss Franc" }, { code: "MYR", name: "Malaysian Ringgit" }, { code: "PKR", name: "Pakistani Rupee" },
  { code: "BDT", name: "Bangladeshi Taka" }, { code: "LKR", name: "Sri Lankan Rupee" },
] as const;

export const CURRENCY_CODES: string[] = CURRENCIES.map((c) => c.code);
export const ACCOUNT_TYPES = ["cash", "bank", "wallet", "card", "savings"] as const;
export const PAYMENT_METHODS = ["cash", "card", "bank transfer", "upi", "wallet"] as const;
