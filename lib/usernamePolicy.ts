export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
// Must match the `profiles_username_format` check constraint in Supabase —
// keep both in sync manually, there's no shared codegen between them.
export const USERNAME_REGEX = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;

export type UsernameRequirement = {
  label: string;
  test: (u: string) => boolean;
};

export const USERNAME_REQUIREMENTS: UsernameRequirement[] = [
  {
    label: `${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters`,
    test: (u) => u.length >= USERNAME_MIN_LENGTH && u.length <= USERNAME_MAX_LENGTH,
  },
  { label: 'Starts with a letter', test: (u) => /^[A-Za-z]/.test(u) },
  { label: 'Letters, numbers, underscores only', test: (u) => /^[A-Za-z0-9_]*$/.test(u) },
];

export function isUsernameFormatValid(u: string): boolean {
  return USERNAME_REGEX.test(u);
}

export function suggestUsernames(base: string, count = 3): string[] {
  const clean = base.replace(/[^A-Za-z0-9_]/g, '').slice(0, USERNAME_MAX_LENGTH - 4) || 'user';
  const out = new Set<string>();
  while (out.size < count) {
    const suffix = Math.floor(Math.random() * 900 + 100);
    out.add(`${clean}${suffix}`.slice(0, USERNAME_MAX_LENGTH));
  }
  return Array.from(out);
}

export const USERNAME_COOLDOWN_DAYS = 30;

// Mirrors the `profiles_username_cooldown` trigger (see
// supabase/sql/2026-09-07_account_settings.sql) so the UI can gate the field
// before a save round-trip, not just react to the server rejecting it.
export function usernameCooldown(changedAt: string | null): { active: boolean; unlockDate: Date | null } {
  if (!changedAt) return { active: false, unlockDate: null };
  const unlockDate = new Date(new Date(changedAt).getTime() + USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  return { active: unlockDate.getTime() > Date.now(), unlockDate };
}
