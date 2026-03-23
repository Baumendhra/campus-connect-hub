import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Profile = Tables<'profiles'>;
type Message = Tables<'messages'>;

export default function MessagesPage() {
  const { profile } = useAuth();
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [selectedContact, setSelectedContact] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    fetchContacts();
  }, [profile]);

  const fetchContacts = async () => {
    if (!profile) return;
    let query = supabase.from('profiles').select('*').neq('batch_no', profile.batch_no);

    if (profile.role === 'student') {
      // Students can only message admin or their gender rep
      const repRole = profile.gender === 'boy' ? 'boys_rep' : 'girls_rep';
      query = query.in('role', ['admin', repRole]);
    } else if (profile.role === 'boys_rep') {
      query = query.or('gender.eq.boy,role.eq.admin');
    } else if (profile.role === 'girls_rep') {
      query = query.or('gender.eq.girl,role.eq.admin');
    }
    // Admin sees all

    const { data } = await query;
    setContacts(data || []);
  };

  useEffect(() => {
    if (!selectedContact || !profile) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_batch_no.eq.${profile.batch_no},receiver_batch_no.eq.${selectedContact.batch_no}),and(sender_batch_no.eq.${selectedContact.batch_no},receiver_batch_no.eq.${profile.batch_no})`
        )
        .order('created_at', { ascending: true });
      setMessages(data || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat-${profile.batch_no}-${selectedContact.batch_no}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message;
        if (
          (msg.sender_batch_no === profile.batch_no && msg.receiver_batch_no === selectedContact.batch_no) ||
          (msg.sender_batch_no === selectedContact.batch_no && msg.receiver_batch_no === profile.batch_no)
        ) {
          setMessages(prev => [...prev, msg]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedContact, profile]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !profile || !selectedContact) return;
    setSending(true);

    const { error } = await supabase.from('messages').insert({
      sender_batch_no: profile.batch_no,
      receiver_batch_no: selectedContact.batch_no,
      content: newMsg.trim(),
    });

    if (error) toast.error('Failed to send');
    setNewMsg('');
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-primary" /> Messages
      </h1>

      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[400px]">
        {/* Contact list */}
        <div className="w-48 md:w-56 border rounded-xl bg-card overflow-y-auto flex-shrink-0">
          {contacts.map(c => (
            <button
              key={c.batch_no}
              onClick={() => setSelectedContact(c)}
              className={cn(
                'w-full text-left p-3 border-b hover:bg-muted transition text-sm',
                selectedContact?.batch_no === c.batch_no && 'bg-primary/10'
              )}
            >
              <p className="font-medium truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{c.role?.replace('_', ' ')}</p>
            </button>
          ))}
          {contacts.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">No contacts available</p>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col border rounded-xl bg-card overflow-hidden">
          {selectedContact ? (
            <>
              <div className="p-3 border-b bg-muted/50">
                <p className="font-medium text-sm">{selectedContact.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{selectedContact.role?.replace('_', ' ')}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map(m => (
                  <div key={m.id} className={cn(
                    'max-w-[75%] p-2.5 rounded-xl text-sm',
                    m.sender_batch_no === profile?.batch_no
                      ? 'ml-auto gradient-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted rounded-bl-sm'
                  )}>
                    {m.content}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
                <Input
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={sending} className="gradient-primary text-primary-foreground">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a contact to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
