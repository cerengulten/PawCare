import { useMemo } from 'react';
import { getLocales } from 'expo-localization';
import { Lang } from './i18n';
import { useT } from './LanguageContext';

export type CurrencyCode = 'TRY' | 'EUR' | 'GBP' | 'USD';

export interface PlanPricing {
  price: number;
  formatted: string;
}

export interface RegionalPricing {
  region: string;
  currencyCode: CurrencyCode;
  currencySymbol: string;
  monthly: PlanPricing;
  annual: PlanPricing & {
    monthlyEquivalent: number;
    monthlyEquivalentFormatted: string;
    savingsPercent: number;
  };
}

/**
 * Regional Pricing Matrix (Purchasing Power Parity - PPP).
 *
 * NOTE FOR GOOGLE PLAY & APP STORE LAUNCH:
 * In beta / pre-store mode, this matrix provides realistic regional currency
 * and PPP price points (e.g. ₺99.99/mo in Turkey vs €4.99 in Italy vs $4.99 in US).
 * When Google Play Billing / In-App Purchases (e.g. RevenueCat) are enabled,
 * the store's localized `product.priceString` will become the primary source of truth.
 */
export const REGIONAL_PRICING: Record<CurrencyCode, RegionalPricing> = {
  TRY: {
    region: 'TR',
    currencyCode: 'TRY',
    currencySymbol: '₺',
    monthly: {
      price: 99.99,
      formatted: '₺99.99',
    },
    annual: {
      price: 599.99,
      formatted: '₺599.99',
      monthlyEquivalent: 50.0,
      monthlyEquivalentFormatted: '₺50.00',
      savingsPercent: 50,
    },
  },
  EUR: {
    region: 'EU',
    currencyCode: 'EUR',
    currencySymbol: '€',
    monthly: {
      price: 4.99,
      formatted: '€4.99',
    },
    annual: {
      price: 29.99,
      formatted: '€29.99',
      monthlyEquivalent: 2.5,
      monthlyEquivalentFormatted: '€2.50',
      savingsPercent: 50,
    },
  },
  GBP: {
    region: 'GB',
    currencyCode: 'GBP',
    currencySymbol: '£',
    monthly: {
      price: 4.49,
      formatted: '£4.49',
    },
    annual: {
      price: 24.99,
      formatted: '£24.99',
      monthlyEquivalent: 2.08,
      monthlyEquivalentFormatted: '£2.08',
      savingsPercent: 54,
    },
  },
  USD: {
    region: 'US',
    currencyCode: 'USD',
    currencySymbol: '$',
    monthly: {
      price: 4.99,
      formatted: '$4.99',
    },
    annual: {
      price: 24.99,
      formatted: '$24.99',
      monthlyEquivalent: 2.08,
      monthlyEquivalentFormatted: '$2.08',
      savingsPercent: 58,
    },
  },
};

const EUROZONE_COUNTRIES = [
  'IT', 'FR', 'DE', 'ES', 'NL', 'BE', 'PT', 'AT', 'IE', 'FI',
  'GR', 'LU', 'CY', 'MT', 'SK', 'SI', 'EE', 'LV', 'LT'
];

export function resolveRegionalPricing(lang?: Lang): RegionalPricing {
  // 1. Primary check: Device physical region or device store currency.
  // A user in Italy with a Turkish or English UI should see EUR (€).
  try {
    const locales = getLocales();
    const primary = locales && locales.length > 0 ? locales[0] : null;
    const region = primary?.regionCode?.toUpperCase();
    const currency = primary?.currencyCode?.toUpperCase();

    if (region === 'TR' || currency === 'TRY') return REGIONAL_PRICING.TRY;
    if (region === 'GB' || currency === 'GBP') return REGIONAL_PRICING.GBP;
    if (
      region === 'IT' ||
      currency === 'EUR' ||
      (region && EUROZONE_COUNTRIES.includes(region))
    ) {
      return REGIONAL_PRICING.EUR;
    }
    if (region === 'US' || currency === 'USD') return REGIONAL_PRICING.USD;
  } catch (err) {
    console.warn('[pricing] failed to detect locale:', err);
  }

  // 2. Secondary fallback: If device country is neutral/undetermined, infer from language
  if (lang === 'tr') return REGIONAL_PRICING.TRY;
  if (lang === 'it') return REGIONAL_PRICING.EUR;

  return REGIONAL_PRICING.USD;
}

export function useRegionalPricing(): RegionalPricing {
  const { lang } = useT();
  return useMemo(() => resolveRegionalPricing(lang), [lang]);
}
