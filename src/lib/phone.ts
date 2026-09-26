/**
 * Utility functions for formatting and normalizing Brazilian phone numbers.
 * Formats:
 * - Mobile (11 digits): (21) 9 6518-8988
 * - Landline (10 digits): (21) 3456-7890
 */

export function cleanPhoneDigits(value?: string | null): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits.slice(2);
  }
  return digits;
}

export function formatBrazilianPhone(value?: string | null): string {
  if (!value) return "";
  const digits = cleanPhoneDigits(value).slice(0, 11);
  if (!digits) return "";

  // 1-2 digits: (XX
  if (digits.length <= 2) {
    return `(${digits}`;
  }

  // Mobile number (starts with 9 after DDD or 11 digits total)
  const isMobile = digits.length > 10 || (digits.length >= 3 && digits[2] === "9");

  if (isMobile) {
    if (digits.length === 3) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  }

  // Landline (10 digits or in progress)
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
}
