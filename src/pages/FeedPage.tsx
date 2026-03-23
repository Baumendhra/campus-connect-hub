import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Megaphone, Upload, Eye, Clock, Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Announcement = Tables<'announcements'> & { profiles?: { name: string; batch_no: string } | null };

export default function FeedPage() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [targetGroup, setTargetGroup] = useState<'all' | 'boys' | 'girls'>('all');
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  const isAdminOrRep = profile?.role === 'admin' || profile?.role === 'boys_rep' || profile?.role === 'girls_rep';

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*, profiles!announcements_created_by_fkey(name, batch_no)')
      .order('created_at', { ascending: false });
    setAnnouncements((data as Announcement[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();

    const channel = supabase
      .channel('announcements-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Track view
  const trackView = async (announcementId: string) => {
    if (!profile) return;
    await supabase.from('announcement_views').upsert({
      announcement_id: announcementId,
      batch_no: profile.batch_no,
    }, { onConflict: 'announcement_id,batch_no' });
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !profile) return;
    setPosting(true);

    let fileUrl: string | null = null;
    if (file) {
      const ext = file.name.split('.').pop();
      const path = `announcements/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('uploads').upload(path, file);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);
        fileUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('announcements').insert({
      content: content.trim(),
      file_url: fileUrl,
      created_by: profile.id,
      target_group: targetGroup,
    });

    if (error) {
      toast.error('Failed to post announcement');
    } else {
      toast.success('Announcement posted!');
      setContent('');
      setFile(null);
    }
    setPosting(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Megaphone className="w-6 h-6 text-primary" /> Announcements
      </h1>

      {isAdminOrRep && (
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Create Announcement</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePost} className="space-y-3">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your announcement..."
                rows={3}
              />
              <div className="flex flex-wrap gap-3">
                <Select value={targetGroup} onValueChange={(v) => setTargetGroup(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="boys">Boys</SelectItem>
                    <SelectItem value="girls">Girls</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="max-w-xs"
                  accept="image/*,.pdf"
                />
                <Button type="submit" disabled={posting} className="gradient-primary text-primary-foreground">
                  {posting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  Post
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">No announcements yet.</div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className="border-0 shadow-card" onMouseEnter={() => trackView(a.id)}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-medium">{a.profiles?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(a.created_at).toLocaleDateString()} · 
                      <span className="capitalize bg-muted px-1.5 py-0.5 rounded text-xs">{a.target_group}</span>
                    </p>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{a.content}</p>
                {a.file_url && (
                  <a href={a.file_url} target="_blank" rel="noopener" className="text-primary text-sm mt-2 inline-flex items-center gap-1 hover:underline">
                    <Eye className="w-3 h-3" /> View attachment
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
