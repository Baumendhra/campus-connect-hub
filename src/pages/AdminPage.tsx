import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Eye, Loader2, UserPlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Profile = Tables<'profiles'>;

export default function AdminPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchNo, setBatchNo] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [role, setRole] = useState<'admin' | 'boys_rep' | 'girls_rep' | 'student'>('student');
  const [creating, setCreating] = useState(false);

  // Analytics state
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [views, setViews] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchAnalytics();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('batch_no');
    setUsers(data || []);
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    const [{ data: ann }, { data: v }] = await Promise.all([
      supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('announcement_views').select('*'),
    ]);
    setAnnouncements(ann || []);
    setViews(v || []);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchNo.trim() || !name.trim()) return;
    setCreating(true);

    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { batch_no: batchNo.trim(), name: name.trim(), gender, role },
    });

    if (error || data?.error) {
      toast.error(data?.error || 'Failed to create user');
    } else {
      toast.success('User created!');
      setBatchNo('');
      setName('');
      fetchUsers();
    }
    setCreating(false);
  };

  const getViewCount = (annId: string) => views.filter(v => v.announcement_id === annId).length;

  const getTargetCount = (targetGroup: string) => {
    if (targetGroup === 'all') return users.filter(u => u.role === 'student').length;
    if (targetGroup === 'boys') return users.filter(u => u.gender === 'boy' && u.role === 'student').length;
    return users.filter(u => u.gender === 'girl' && u.role === 'student').length;
  };

  if (profile?.role !== 'admin') {
    return <p className="text-center py-10 text-muted-foreground">Access denied. Admin only.</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Users className="w-6 h-6 text-primary" /> Admin Panel
      </h1>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-4">
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Add User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input value={batchNo} onChange={e => setBatchNo(e.target.value)} placeholder="Batch Number" required />
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" required />
                <Select value={gender} onValueChange={v => setGender(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boy">Boy</SelectItem>
                    <SelectItem value="girl">Girl</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={role} onValueChange={v => setRole(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="boys_rep">Boys Rep</SelectItem>
                    <SelectItem value="girls_rep">Girls Rep</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={creating} className="gradient-primary text-primary-foreground sm:col-span-2">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create User
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">All Users ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2">Batch</th>
                        <th className="pb-2">Name</th>
                        <th className="pb-2">Gender</th>
                        <th className="pb-2">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.batch_no} className="border-b last:border-0">
                          <td className="py-2 font-mono text-xs">{u.batch_no}</td>
                          <td className="py-2">{u.name}</td>
                          <td className="py-2 capitalize">{u.gender}</td>
                          <td className="py-2 capitalize">{u.role.replace('_', ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-4">
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" /> Announcement Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <p className="text-muted-foreground text-sm">No announcements to show.</p>
              ) : (
                <div className="space-y-3">
                  {announcements.map(a => {
                    const viewCount = getViewCount(a.id);
                    const targetCount = getTargetCount(a.target_group);
                    const pct = targetCount > 0 ? Math.round((viewCount / targetCount) * 100) : 0;
                    return (
                      <div key={a.id} className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-1 line-clamp-1">{a.content}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Target: {targetCount}</span>
                          <span>Viewed: {viewCount}</span>
                          <span>Rate: {pct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                          <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
