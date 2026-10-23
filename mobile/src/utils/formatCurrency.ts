// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Currency Utilities & Formatter
// Faithfully matching frontend/src/utils/formatCurrency.js
// ---------------------------------------------------------------------------

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  locale: string;
  label: string;
}

export const DEFAULT_CURRENCIES: CurrencyConfig[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN', label: '₹ Indian Rupee (INR)' },
];

export const POPULAR_CURRENCIES: CurrencyConfig[] = [
  ...DEFAULT_CURRENCIES,
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US', label: '$ US Dollar (USD)' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE', label: '€ Euro (EUR)' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB', label: '£ British Pound (GBP)' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', locale: 'ja-JP', label: '¥ Japanese Yen (JPY)' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', locale: 'en-CA', label: 'CA$ Canadian Dollar (CAD)' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU', label: 'A$ Australian Dollar (AUD)' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG', label: 'S$ Singapore Dollar (SGD)' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', locale: 'ar-AE', label: 'د.إ UAE Dirham (AED)' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', locale: 'ar-SA', label: '﷼ Saudi Riyal (SAR)' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', locale: 'de-CH', label: 'CHF Swiss Franc (CHF)' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', locale: 'zh-CN', label: '¥ Chinese Yuan (CNY)' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', locale: 'en-NZ', label: 'NZ$ New Zealand Dollar (NZD)' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', locale: 'pt-BR', label: 'R$ Brazilian Real (BRL)' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', locale: 'en-ZA', label: 'R South African Rand (ZAR)' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', locale: 'ko-KR', label: '₩ South Korean Won (KRW)' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', locale: 'ms-MY', label: 'RM Malaysian Ringgit (MYR)' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', locale: 'th-TH', label: '฿ Thai Baht (THB)' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', locale: 'id-ID', label: 'Rp Indonesian Rupiah (IDR)' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', locale: 'en-PH', label: '₱ Philippine Peso (PHP)' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', locale: 'ar-KW', label: 'KD Kuwaiti Dinar (KWD)' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR', locale: 'ar-QA', label: 'QR Qatari Riyal (QAR)' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', locale: 'tr-TR', label: '₺ Turkish Lira (TRY)' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', locale: 'ru-RU', label: '₽ Russian Ruble (RUB)' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', locale: 'es-MX', label: 'Mex$ Mexican Peso (MXN)' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD', locale: 'ar-BH', label: 'BD Bahraini Dinar (BHD)' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR', locale: 'ar-OM', label: 'OMR Omani Rial (OMR)' },
];

export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {};
POPULAR_CURRENCIES.forEach((c) => {
  CURRENCY_CONFIGS[c.code] = c;
});

// In-memory / storage custom currencies cache
let customCurrenciesCache: CurrencyConfig[] = [];

export function getCustomCurrencies(): CurrencyConfig[] {
  return customCurrenciesCache;
}

export function registerCurrency(curr: Partial<CurrencyConfig>): CurrencyConfig | undefined {
  if (!curr || !curr.code) return undefined;
  const code = curr.code.trim().toUpperCase();
  const conf: CurrencyConfig = {
    locale: curr.locale || 'en-US',
    code,
    symbol: curr.symbol || code,
    name: curr.name || code,
    label: curr.label || `${curr.symbol || code} ${curr.name || code} (${code})`,
  };
  CURRENCY_CONFIGS[code] = conf;
  return conf;
}

export function saveCustomCurrency(curr: Partial<CurrencyConfig>): CurrencyConfig[] {
  const code = (curr.code || '').trim().toUpperCase();
  if (!code) return customCurrenciesCache;
  const filtered = customCurrenciesCache.filter((c) => c.code !== code);
  const item: CurrencyConfig = {
    code,
    name: curr.name || code,
    symbol: curr.symbol || code,
    locale: curr.locale || 'en-US',
    label: curr.label || `${curr.symbol || code} ${curr.name || code} (${code})`,
  };
  customCurrenciesCache = [...filtered, item];
  registerCurrency(item);
  return customCurrenciesCache;
}

export function removeCustomCurrency(code: string): CurrencyConfig[] {
  const upper = (code || '').trim().toUpperCase();
  customCurrenciesCache = customCurrenciesCache.filter((c) => c.code !== upper);
  return customCurrenciesCache;
}

export function getCurrencyConfig(currencyCode: string = 'INR'): CurrencyConfig {
  const code = (currencyCode || 'INR').trim().toUpperCase();
  return (
    CURRENCY_CONFIGS[code] || {
      code,
      name: code,
      symbol: code,
      locale: 'en-US',
      label: `${code} Currency`,
    }
  );
}

export function formatCurrency(
  value: number | string | null | undefined,
  currencyCode: string = 'INR',
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    compact?: boolean;
  }
): string {
  const num = Number(value) || 0;
  const conf = getCurrencyConfig(currencyCode);

  if (options?.compact) {
    return formatCompactCurrency(num, currencyCode);
  }

  try {
    const hasDecimals = num % 1 !== 0;
    return new Intl.NumberFormat(conf.locale, {
      style: 'currency',
      currency: conf.code,
      minimumFractionDigits: options?.minimumFractionDigits ?? 0,
      maximumFractionDigits: options?.maximumFractionDigits ?? (hasDecimals ? 2 : 0),
    }).format(num);
  } catch {
    return `${conf.symbol} ${num.toLocaleString()}`;
  }
}

export function formatCompactCurrency(val: number, currencyCode: string = 'INR'): string {
  const conf = getCurrencyConfig(currencyCode);
  const prefix = conf.symbol || '$';
  if (val === 0) return `${prefix}0`;
  if (Math.abs(val) >= 1_000_000) {
    return `${prefix}${(val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (Math.abs(val) >= 1_000) {
    return `${prefix}${(val / 1_000).toFixed(val % 1_000 === 0 ? 0 : 1)}K`;
  }
  return `${prefix}${val}`;
}

export const money = formatCurrency;
export default formatCurrency;
