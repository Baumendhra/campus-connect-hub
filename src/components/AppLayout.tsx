import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, Megaphone, BarChart3, MessageSquare, 
  Users, LogOut, Bell, GraduationCap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/feed', icon: Megaphone, label: 'Feed' },
  { to: '/polls', icon: BarChart3, label: 'Polls' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
];

const adminNavItems = [
  { to: '/admin', icon: Users, label: 'Admin Panel' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile, logout } = useAuth();
  const location = useLocation();

  const allNav = profile?.role === 'admin' ? [...navItems, ...adminNavItems] : navItems;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b bg-card flex items-center px-4 gap-3 sticky top-0 z-50 glass">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-primary-foreground" />
        </div>
        <h1 className="font-bold text-lg hidden sm:block">BHub</h1>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground hidden sm:block">
          {profile?.name} · <span className="capitalize">{profile?.role?.replace('_', ' ')}</span>
        </span>
        <Link to="/notifications">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-4 h-4" />
          </Button>
        </Link>
        <Button variant="ghost" size="icon" onClick={logout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - desktop */}
        <aside className="hidden md:flex w-56 border-r bg-card flex-col p-3 gap-1">
          {allNav.map((item) => (
            <Link key={item.to} to={item.to}>
              <div className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                location.pathname === item.to
                  ? 'gradient-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            </Link>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 max-w-5xl">
          {children}
        </main>
      </div>

      {/* Bottom nav - mobile */}
      <nav className="md:hidden border-t bg-card flex sticky bottom-0 z-50">
        {allNav.map((item) => (
          <Link key={item.to} to={item.to} className="flex-1">
            <div className={cn(
              'flex flex-col items-center py-2 text-xs gap-0.5',
              location.pathname === item.to
                ? 'text-primary'
                : 'text-muted-foreground'
            )}>
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}
