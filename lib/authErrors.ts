export function formatAuthError(error: any, t: (key: string) => string): string {
  if (!error) return '';
  const msg = typeof error === 'string' ? error : error.message || '';

  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
    return t('auth.invalidCredentials');
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return t('auth.userAlreadyExists');
  }
  if (lower.includes('email not confirmed')) {
    return t('auth.emailNotConfirmed');
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return t('auth.rateLimitExceeded');
  }
  if (lower.includes('user not found')) {
    return t('auth.userNotFound');
  }
  if (lower.includes('password should be at least')) {
    return t('auth.passwordFailsRequirements');
  }
  if (lower.includes('google_signin_failed') || lower.includes('google sign-in') || lower.includes('oauth')) {
    return t('auth.googleSignInFailed');
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('internet') || lower.includes('connection')) {
    return t('auth.networkError');
  }

  // Never expose developer internals, database schemas, or Supabase URLs/allowlists to users
  if (
    lower.includes('supabase') ||
    lower.includes('redirecturi') ||
    lower.includes('redirect_uri') ||
    lower.includes('allowlist') ||
    lower.includes('gotrue') ||
    lower.includes('relation') ||
    lower.includes('postgres') ||
    lower.includes('violates') ||
    lower.includes('column') ||
    lower.includes('null value')
  ) {
    return t('auth.unexpectedError');
  }

  return msg;
}
