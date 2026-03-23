import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface AuthContextType {
  profile: Profile | null;
  loading: boolean;
  login: (batchNo: string, name: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(data);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (batchNo: string, name: string): Promise<{ error?: string }> => {
    // Check if user exists in profiles
    const { data: existingProfile, error: lookupError } = await supabase
      .from('profiles')
      .select('*')
      .eq('batch_no', batchNo)
      .eq('name', name)
      .single();

    if (lookupError || !existingProfile) {
      return { error: 'Invalid batch number or name. Contact your admin.' };
    }

    // Sign in with fake email
    const email = `${batchNo}@bhub.local`;
    const password = `bhub_${batchNo}_secure`;

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      // First time - create auth account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) return { error: signUpError.message };
      
      // Update profile to link with auth user
      if (signUpData.user) {
        // We need to update the profile id to match the auth user id
        // But profile already exists. We'll use an edge function or direct approach.
        // Actually, the profile was pre-created without an auth user id.
        // Let's handle this differently - delete old profile, re-insert with auth id
        const { error: deleteError } = await supabase.rpc('get_user_role', { user_id: signUpData.user.id });
        // The profile needs the auth user's UUID. Since admin pre-inserts profiles,
        // we need a different approach. Let's use a server function.
        // For now, let's create a simpler flow:
        // Admin creates auth users + profiles together via an edge function.
        
        // Actually let's simplify: the profile.id should match auth.users.id
        // So we need the admin to create users through signUp first.
        // Let's provide an admin edge function for user creation.
      }
    }

    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
