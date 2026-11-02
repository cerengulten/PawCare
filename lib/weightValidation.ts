/**
 * Weight validation and sanitization utilities for Pet registration and editing.
 */

export const MIN_WEIGHT_KG = 0.1;
export const MAX_WEIGHT_KG = 150.0;

/**
 * Sanitizes live user typing in the weight input field:
 * - Automatically normalizes commas (',') to dots ('.')
 * - Strips all non-digit and non-dot characters
 * - Allows at most one decimal point (e.g. prevents '7.9.8' or '7.9,8')
 * - Limits integer digits to 3 (max 999) and decimal places to 2 (e.g. 14.25)
 */
export function sanitizeWeightInput(raw: string): string {
  if (!raw) return '';

  // 1. Normalize commas to dots and strip spaces
  let text = raw.replace(/,/g, '.').trim();

  // 2. Strip any character that is not a digit or dot
  text = text.replace(/[^0-9.]/g, '');

  // 3. Ensure at most one decimal point
  const firstDotIndex = text.indexOf('.');
  if (firstDotIndex !== -1) {
    const beforeDot = text.slice(0, firstDotIndex);
    const afterDot = text.slice(firstDotIndex + 1).replace(/\./g, '');
    // Limit integer part to 3 digits and decimal part to 2 digits
    const integerPart = beforeDot.slice(0, 3);
    const decimalPart = afterDot.slice(0, 2);
    return `${integerPart}.${decimalPart}`;
  }

  // Integer only, limit to 3 digits
  return text.slice(0, 3);
}

export type WeightValidationResult = {
  isValid: boolean;
  value: number | null;
  errorMessageKey?: 'weightPositive' | 'weightRange' | 'weightInvalid';
  errorMessage?: string;
};

/**
 * Validates the finalized weight text before saving:
 * Empty text is considered valid because weight is optional.
 */
export function validateWeight(text: string): WeightValidationResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { isValid: true, value: null };
  }

  // Normalize comma to dot just in case
  const normalized = trimmed.replace(/,/g, '.');

  // Check valid numeric format (1-3 digits, optional dot with 1-2 digits)
  const regex = /^\d{1,3}(\.\d{1,2})?$/;
  if (!regex.test(normalized)) {
    return {
      isValid: false,
      value: null,
      errorMessageKey: 'weightInvalid',
    };
  }

  const num = parseFloat(normalized);
  if (!Number.isFinite(num) || isNaN(num) || num <= 0) {
    return {
      isValid: false,
      value: null,
      errorMessageKey: 'weightPositive',
    };
  }

  if (num < MIN_WEIGHT_KG || num > MAX_WEIGHT_KG) {
    return {
      isValid: false,
      value: null,
      errorMessageKey: 'weightRange',
    };
  }

  return {
    isValid: true,
    value: Math.round(num * 100) / 100,
  };
}
