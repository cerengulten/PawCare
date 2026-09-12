import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { AppNotification } from '../../types';

const LIMIT = 50;

// Deliberately does NOT use useIsFocused() — unlike most of this app's other hooks, this
// one is also called from screens/AppTabs.tsx (for the More tab's unread dot), which sits
// above/outside the NavigationContainer it renders, so useIsFocused() would throw
// ("Couldn't find a navigation object") there. Plain mount-fetch + the existing
// `refetch`/optimistic local updates are enough for an unread-count badge; some staleness
// across tab switches is acceptable (same class as this app's other documented
// duplicate-hook-instance cases).
export function useNotifications(ownerId: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [ownerId]);

  async function fetchNotifications() {
    if (!ownerId) { setNotifications([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(LIMIT);
    if (!error && data) setNotifications(data);
    setLoading(false);
  }

  async function markAsRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  }

  async function markAllAsRead() {
    if (!ownerId) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('owner_id', ownerId).eq('is_read', false);
  }

  async function deleteNotification(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  }

  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
  };
}
