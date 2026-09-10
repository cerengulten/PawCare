export type PasswordRequirement = {
  /** i18n key under `pwReq` — resolve with t() at the call site. */
  labelKey: string;
  test: (pw: string) => boolean;
};

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { labelKey: 'pwReq.minLength', test: (pw) => pw.length >= 8 },
  { labelKey: 'pwReq.uppercase', test: (pw) => /[A-Z]/.test(pw) },
  { labelKey: 'pwReq.lowercase', test: (pw) => /[a-z]/.test(pw) },
  { labelKey: 'pwReq.number', test: (pw) => /[0-9]/.test(pw) },
];

export function isPasswordValid(pw: string): boolean {
  return PASSWORD_REQUIREMENTS.every((r) => r.test(pw));
}
