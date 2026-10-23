// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Currency Formatter
// ---------------------------------------------------------------------------

import { CurrencyConfig } from '../types';

export const POPULAR_CURRENCIES: CurrencyConfig[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN', label: '₹ Indian Rupee (INR)' },
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US', label: '$ US Dollar (USD)' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE', label: '€ Euro (EUR)' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB', label: '£ British Pound (GBP)' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', locale: 'ja-JP', label: '¥ Japanese Yen (JPY)' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', locale: 'en-CA', label: 'CA$ Canadian Dollar (CAD)' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU', label: 'A$ Australian Dollar (AUD)' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG', label: 'S$ Singapore Dollar (SGD)' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', locale: 'ar-AE', label: 'د.إ UAE Dirham (AED)' },
];

const CURRENCY_MAP: Record<string, CurrencyConfig> = {};
POPULAR_CURRENCIES.forEach((c) => {
  CURRENCY_MAP[c.code.toUpperCase()] = c;
});

export function getCurrencyConfig(currencyCode: string = 'INR'): CurrencyConfig {
  const code = (currencyCode || 'INR').trim().toUpperCase();
  return (
    CURRENCY_MAP[code] || {
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
    if (Math.abs(num) >= 1_000_000) {
      return `${conf.symbol}${(num / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(num) >= 1_000) {
      return `${conf.symbol}${(num / 1_000).toFixed(1)}K`;
    }
    return `${conf.symbol}${num.toFixed(0)}`;
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

export const money = formatCurrency;
