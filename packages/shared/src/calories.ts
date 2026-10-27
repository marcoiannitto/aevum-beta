/**
 * Calorie and TDEE calculations — single source of truth.
 * Previously duplicated in doRegister(), completeProfile(), updateProfile().
 */

/** Mifflin-St Jeor TDEE calculation */
export function mifflinTDEE(
  weight: number,
  height: number,
  age: number,
  sex: 'm' | 'f',
  activity: number
): number {
  const s = sex === 'm' ? 5 : -161;
  return Math.round((10 * weight + 6.25 * height - 5 * age + s) * activity);
}

/** Calculate age from date of birth string (YYYY-MM-DD) */
export function dobToAge(dob: string): number {
  const b = new Date(dob);
  const t = new Date();
  const a = t.getFullYear() - b.getFullYear();
  return (
    t.getMonth() < b.getMonth() ||
    (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())
  ) ? a - 1 : a;
}

/** Safe number parser — returns null if not a valid number */
export function num(v: unknown): number | null {
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

/** Truthy check matching the backend convention */
export function isTruthy(v: unknown): boolean {
  return (
    v === true || v === 1 || v === '1' ||
    v === 'yes' || v === 'YES' || v === 'Yes' ||
    v === 'true' || v === 'TRUE'
  );
}
