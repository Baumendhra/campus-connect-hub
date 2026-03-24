import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, BarChart3, MessageSquare, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { profile , loading} = useAuth();

  if(loading) {
    return <div className="text-center py-20">Loading...</div>;
  }

  if(!profile) {
    window.location.href = "/login";
    return null;
  }

  const cards = [
    { to: '/feed', icon: Megaphone, label: 'Announcements', desc: 'View latest updates', color: 'gradient-primary' },
    { to: '/polls', icon: BarChart3, label: 'Polls', desc: 'Vote & see results', color: 'gradient-accent' },
    { to: '/messages', icon: MessageSquare, label: 'Messages', desc: 'Chat with your community', color: 'gradient-primary' },
  ];

  if (profile?.role === 'admin') {
    cards.push({ to: '/admin', icon: Users, label: 'Admin Panel', desc: 'Manage users & content', color: 'gradient-accent' });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Welcome, {profile?.name}!</h1>
      <p className="text-muted-foreground text-sm mb-6 capitalize">
        Role: {profile?.role?.replace('_', ' ')} · Batch: {profile?.batch_no}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <Link key={card.to} to={card.to}>
            <Card className="hover:shadow-elevated transition-shadow cursor-pointer border-0 shadow-card">
              <CardHeader className="pb-2">
                <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-2`}>
                  <card.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg">{card.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{card.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
