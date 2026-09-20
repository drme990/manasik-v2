/**
 * Customer name validation shared across checkout, register and
 * settings. Matches the backend rule (`backend/lib/utils/name.ts`)
 * and EasyKash's `onlyNumbersAndCharacters` requirement — names with
 * punctuation, symbols or emojis fail payment-link creation, so they
 * must be rejected at input time.
 */
const CUSTOMER_NAME_PATTERN =
  /^[\p{L}\p{N}]+(?:[\p{L}\p{N} ]*[\p{L}\p{N}])?$/u;

export function isValidCustomerName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && CUSTOMER_NAME_PATTERN.test(trimmed);
}
