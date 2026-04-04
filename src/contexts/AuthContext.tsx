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
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
  };

  // useEffect(() => {
  //   const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
  //     if (session?.user) {
  //       await fetchProfile(session.user.id);
  //     } else {
  //       setProfile(null);
  //     }
  //     setLoading(false);
  //   });

  //   supabase.auth.getSession().then(async ({ data: { session } }) => {
  //     if (session?.user) {
  //       await fetchProfile(session.user.id);
  //     } else {
  //       setProfile(null);
  //     }
  //     setLoading(false);
  //   });

  //   //   return () => subscription.unsubscribe();
  //   // }, []);

  //   useEffect(() => {
  //   let isMounted = true;

  //   const init = async () => {
  //     try {
  //       const { data: { session } } = await supabase.auth.getSession();

  //       if (!isMounted) return;

  //       if (session?.user) {
  //         await fetchProfile(session.user.id);
  //       } else {
  //         setProfile(null);
  //       }
  //     } catch {
  //       setProfile(null);
  //     } finally {
  //       if (isMounted) setLoading(false);
  //     }
  //   };

  //   init();

  //   // 🔥 SAFETY FALLBACK (IMPORTANT)
  //   const timeout = setTimeout(() => {
  //     if (isMounted) setLoading(false);
  //   }, 2000);

  //   const { data: { subscription } } = supabase.auth.onAuthStateChange(
  //     async (_event, session) => {
  //       if (session?.user) {
  //         await fetchProfile(session.user.id);
  //       } else {
  //         setProfile(null);
  //       }
  //     }
  //   );

  //   return () => {
  //     isMounted = false;
  //     clearTimeout(timeout);
  //     subscription.unsubscribe();
  //   };
  // }, []);
  //   return () => subscription.unsubscribe();
  // }, []);

  useEffect(() => {
    setProfile(null);
    setLoading(false);
  }, []);

  const login = async (batchNo: string, name: string): Promise<{ error?: string }> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('batch_no', Number(batchNo))
      .single();

    if (error || !data) {
      return { error: 'Invalid batch number' };
    }

    if (data.name.toLowerCase() !== name.toLowerCase()) {
      return { error: 'Invalid name' };
    }

    setProfile(data);

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
