// The GitHub Pages redirect bridge (docs/auth-bridge/index.html) used by any
// Supabase auth flow that needs to land back in the app via a custom URL
// scheme (exp://, bisco://) — see useGoogleSignIn.ts's comment for why this
// exists. Shared here since both Google sign-in and password-reset route
// through it.
export const AUTH_BRIDGE_URL = 'https://cerengulten.github.io/PawCare/auth-bridge/';
