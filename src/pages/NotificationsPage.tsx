import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/types';

type Notification = Tables<'notifications'>;

export default function NotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_batch_no', profile.batch_no)
        .order('created_at', { ascending: false });
      setNotifications(data || []);
      setLoading(false);
    };
    fetch();
  }, [profile]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Bell className="w-6 h-6 text-primary" /> Notifications
      </h1>

      {loading ? (
        <p className="text-center py-10 text-muted-foreground">Loading...</p>
      ) : notifications.length === 0 ? (
        <p className="text-center py-10 text-muted-foreground">No notifications</p>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <Card key={n.id} className={`border-0 shadow-card ${!n.read ? 'border-l-4 border-l-primary' : ''}`}>
              <CardContent className="pt-3 pb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.read && (
                  <Button variant="ghost" size="icon" onClick={() => markRead(n.id)} className="flex-shrink-0">
                    <Check className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
