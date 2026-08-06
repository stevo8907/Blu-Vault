export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export interface LocationOption {
  code: string;
  name: string;
  flag: string;
  defaultCurrency: string;
}

export const LOCATION_OPTIONS: LocationOption[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', defaultCurrency: 'USD' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', defaultCurrency: 'GBP' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', defaultCurrency: 'CAD' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', defaultCurrency: 'AUD' },
  { code: 'EU', name: 'European Union', flag: '🇪🇺', defaultCurrency: 'EUR' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', defaultCurrency: 'JPY' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', defaultCurrency: 'EUR' },
  { code: 'FR', name: 'France', flag: '🇫🇷', defaultCurrency: 'EUR' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', defaultCurrency: 'BRL' },
  { code: 'IN', name: 'India', flag: '🇮🇳', defaultCurrency: 'INR' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', defaultCurrency: 'SEK' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', defaultCurrency: 'NZD' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', defaultCurrency: 'MXN' },
  { code: 'OTHER', name: 'International / Other', flag: '🌐', defaultCurrency: 'USD' },
];

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', flag: '🇲🇽' },
];

export function getSavedCurrencyCode(): string {
  if (typeof window === 'undefined') return 'USD';
  return localStorage.getItem('bluvault_currency') || 'USD';
}

export function getCurrencyOption(code?: string): CurrencyOption {
  const currentCode = code || getSavedCurrencyCode();
  return CURRENCY_OPTIONS.find(c => c.code === currentCode) || CURRENCY_OPTIONS[0];
}

export function setSavedCurrencyCode(code: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bluvault_currency', code);
    window.dispatchEvent(new Event('bluvault_currency_changed'));
  }
}

export function getSavedLocationCode(): string {
  if (typeof window === 'undefined') return 'US';
  return localStorage.getItem('bluvault_location') || 'US';
}

export function getLocationOption(code?: string): LocationOption {
  const currentCode = code || getSavedLocationCode();
  return LOCATION_OPTIONS.find(l => l.code === currentCode) || LOCATION_OPTIONS[0];
}

export function setSavedLocationCode(code: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bluvault_location', code);
    window.dispatchEvent(new Event('bluvault_location_changed'));
  }
}

export function formatPrice(amount: number, currencyCode?: string): string {
  const option = getCurrencyOption(currencyCode);
  if (option.code === 'JPY') {
    return `${option.symbol}${Math.round(amount).toLocaleString()}`;
  }
  return `${option.symbol}${amount.toFixed(2)}`;
}
