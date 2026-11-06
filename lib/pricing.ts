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
  try {
    const locales = getLocales();
    let detectedRegion = '';
    let detectedCurrency = '';

    if (locales && locales.length > 0) {
      for (const loc of locales) {
        if (!detectedRegion && loc.regionCode) detectedRegion = loc.regionCode.toUpperCase();
        if (!detectedCurrency && loc.currencyCode) detectedCurrency = loc.currencyCode.toUpperCase();
      }
    }

    // 1. If device is in Italy or Eurozone, or currency is EUR, strictly show EUR
    if (
      detectedRegion === 'IT' ||
      detectedCurrency === 'EUR' ||
      (detectedRegion && EUROZONE_COUNTRIES.includes(detectedRegion))
    ) {
      return REGIONAL_PRICING.EUR;
    }

    // 2. Turkey priority if region is TR or currency is TRY
    if (detectedRegion === 'TR' || detectedCurrency === 'TRY') return REGIONAL_PRICING.TRY;

    // 3. United Kingdom
    if (detectedRegion === 'GB' || detectedCurrency === 'GBP') return REGIONAL_PRICING.GBP;

    // 4. US
    if (detectedRegion === 'US' || detectedCurrency === 'USD') return REGIONAL_PRICING.USD;
  } catch (err) {
    console.warn('[pricing] failed to detect locale:', err);
  }

  // 2. Secondary fallback: If device country is neutral/undetermined, infer from language
  if (lang === 'tr') return REGIONAL_PRICING.TRY;

  return REGIONAL_PRICING.USD;
}

export function useRegionalPricing(): RegionalPricing {
  const { lang } = useT();
  return useMemo(() => resolveRegionalPricing(lang), [lang]);
}
