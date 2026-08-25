/**
 * When Platform Settings has "Require strong passwords" on: minimum 8
 * characters (already enforced everywhere unconditionally) plus at least
 * one uppercase letter, one lowercase letter, and one digit — matching the
 * setting's own description ("min 8 chars, mixed case"). Returns an error
 * message, or null if the password passes.
 */
export function checkPasswordStrength(password: string, requireStrong: boolean): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!requireStrong) return null;

  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';

  return null;
}
