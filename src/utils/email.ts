const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function emailValidationMessage(value: string): string {
  const email = normalizeEmail(value);
  if (!email) return "Email address is required.";
  return EMAIL_PATTERN.test(email) ? "" : "Enter a valid email address.";
}
