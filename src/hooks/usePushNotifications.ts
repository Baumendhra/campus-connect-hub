import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePushNotifications() {
  const { profile } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (!profile || initialized.current) return;
    initialized.current = true;

    if (!('Notification' in window)) return;

    const setup = async () => {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    };

    setup();

    // Listen for realtime notifications and show browser notifications
    const channel = supabase
      .channel('push-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_batch_no=eq.${profile.batch_no}`,
        },
        (payload) => {
          const n = payload.new as { title: string; body?: string };
          if (Notification.permission === 'granted' && document.hidden) {
            new Notification(n.title, {
              body: n.body || '',
              icon: '/icon-192.png',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);
}
