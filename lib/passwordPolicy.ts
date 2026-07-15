export type PasswordRequirement = {
  label: string;
  test: (pw: string) => boolean;
};

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number', test: (pw) => /[0-9]/.test(pw) },
];

export function isPasswordValid(pw: string): boolean {
  return PASSWORD_REQUIREMENTS.every((r) => r.test(pw));
}
