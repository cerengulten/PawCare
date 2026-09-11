import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Profile } from '../../types';

// Takes the already-resolved user id from the caller (AuthedApp's `session.user.id`)
// instead of independently calling supabase.auth.getSession() on mount — see
// lib/hooks/useDogs.ts's top comment for why: getSession() can hit the network to
// refresh a near-expiry token, which can race a cold app launch. Write calls below still
// read the session fresh since they're triggered by a user action, not a cold start.
export function useProfile(userId: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  async function fetchProfile() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (!error) setProfile(data);
    setLoading(false);
  }

  async function completeOnboarding(fullName: string, username: string, avatarUrl?: string | null) {
    // Upsert, not insert: a `profiles` row is already auto-created by the
    // `on_auth_user_created` DB trigger at signup (with full_name/username
    // null), so this needs to update that existing row for new users, while
    // still working for legacy users who signed up before the trigger
    // existed. full_name and username are saved together so a user can never
    // end up with one set and not the other from this flow. avatarUrl is
    // optional (the onboarding photo picker step is skippable) and only
    // included in the upsert when actually set, so skipping it never nulls
    // out a photo some other path already saved.
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, full_name: fullName, username, ...(avatarUrl ? { avatar_url: avatarUrl } : {}) })
      .select()
      .single();
    if (!error && data) setProfile(data);
    return { data, error };
  }

  // Read-only: does not touch profile/loading state, since it fires
  // repeatedly while the user is still typing, not just on save.
  async function checkUsernameAvailable(username: string) {
    const { data, error } = await supabase.rpc('is_username_available', { candidate: username });
    if (error) return { available: false, error };
    return { available: Boolean(data), error: null };
  }

  async function updateProfile(updates: Partial<Pick<Profile, 'full_name' | 'username' | 'avatar_url'>>) {
    // Upsert, not update: a `profiles` row always exists via the signup trigger,
    // but upsert keeps this consistent with completeOnboarding above.
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...updates })
      .select()
      .single();
    if (!error && data) setProfile(data);
    return { error };
  }

  return { profile, loading, completeOnboarding, checkUsernameAvailable, updateProfile, refetch: fetchProfile };
}
