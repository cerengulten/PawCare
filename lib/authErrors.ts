export function formatAuthError(error: any, t: (key: string) => string): string {
  if (!error) return '';
  const msg = typeof error === 'string' ? error : error.message || '';

  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return t('auth.invalidCredentials');
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return t('auth.userAlreadyExists');
  }
  if (lower.includes('email not confirmed')) {
    return t('auth.emailNotConfirmed');
  }
  if (lower.includes('rate limit')) {
    return t('auth.rateLimitExceeded');
  }
  if (lower.includes('user not found')) {
    return t('auth.userNotFound');
  }
  if (lower.includes('password should be at least')) {
    return t('auth.passwordFailsRequirements');
  }

  return msg;
}
