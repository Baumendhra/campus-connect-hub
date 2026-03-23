import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Plus, Check, Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Poll = Tables<'polls'>;
type Vote = Tables<'votes'>;

export default function PollsPage() {
  const { profile } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [targetGroup, setTargetGroup] = useState<'all' | 'boys' | 'girls'>('all');
  const [creating, setCreating] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const fetchData = async () => {
    const [{ data: pollsData }, { data: votesData }] = await Promise.all([
      supabase.from('polls').select('*').order('created_at', { ascending: false }),
      supabase.from('votes').select('*'),
    ]);
    setPolls(pollsData || []);
    setVotes(votesData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('polls-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleVote = async (pollId: string, option: string) => {
    if (!profile) return;
    const existing = votes.find(v => v.poll_id === pollId && v.batch_no === profile.batch_no);
    if (existing) { toast.info('Already voted'); return; }

    const { error } = await supabase.from('votes').insert({
      poll_id: pollId,
      batch_no: profile.batch_no,
      selected_option: option,
    });
    if (error) toast.error('Failed to vote');
    else { toast.success('Vote recorded!'); fetchData(); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !question.trim()) return;
    setCreating(true);
    const validOpts = options.filter(o => o.trim());
    if (validOpts.length < 2) { toast.error('Need at least 2 options'); setCreating(false); return; }

    const { error } = await supabase.from('polls').insert({
      question: question.trim(),
      options: validOpts,
      created_by: profile.id,
      target_group: targetGroup,
    });
    if (error) toast.error('Failed to create poll');
    else {
      toast.success('Poll created!');
      setQuestion(''); setOptions(['', '']); setShowCreate(false);
    }
    setCreating(false);
  };

  const getVoteCounts = (poll: Poll) => {
    const pollVotes = votes.filter(v => v.poll_id === poll.id);
    const opts = (poll.options as string[]) || [];
    return opts.map(opt => ({
      option: opt,
      count: pollVotes.filter(v => v.selected_option === opt).length,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" /> Polls
        </h1>
        {isAdmin && (
          <Button onClick={() => setShowCreate(!showCreate)} className="gradient-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-1" /> Create
          </Button>
        )}
      </div>

      {showCreate && isAdmin && (
        <Card className="border-0 shadow-card">
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Poll question" />
              {options.map((opt, i) => (
                <Input key={i} value={opt} onChange={e => {
                  const newOpts = [...options];
                  newOpts[i] = e.target.value;
                  setOptions(newOpts);
                }} placeholder={`Option ${i + 1}`} />
              ))}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, ''])}>
                  + Option
                </Button>
                <Select value={targetGroup} onValueChange={v => setTargetGroup(v as any)}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="boys">Boys</SelectItem>
                    <SelectItem value="girls">Girls</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={creating} className="gradient-primary text-primary-foreground">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Create Poll
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : polls.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">No polls yet.</div>
      ) : (
        <div className="space-y-4">
          {polls.map(poll => {
            const counts = getVoteCounts(poll);
            const totalVotes = counts.reduce((s, c) => s + c.count, 0);
            const myVote = votes.find(v => v.poll_id === poll.id && v.batch_no === profile?.batch_no);
            return (
              <Card key={poll.id} className="border-0 shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{poll.question}</CardTitle>
                  <p className="text-xs text-muted-foreground capitalize">{poll.target_group} · {totalVotes} votes</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {counts.map(({ option, count }) => {
                    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                    const isSelected = myVote?.selected_option === option;
                    return (
                      <button
                        key={option}
                        onClick={() => handleVote(poll.id, option)}
                        disabled={!!myVote}
                        className="w-full text-left relative overflow-hidden rounded-lg border p-3 transition hover:border-primary disabled:cursor-default"
                      >
                        <div className="absolute inset-0 gradient-primary opacity-10" style={{ width: `${pct}%` }} />
                        <div className="relative flex justify-between items-center">
                          <span className="text-sm font-medium flex items-center gap-1">
                            {isSelected && <Check className="w-4 h-4 text-primary" />} {option}
                          </span>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
