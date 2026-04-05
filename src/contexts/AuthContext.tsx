import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

// ─── Permission helpers ───────────────────────────────────────────────────────
export const canCreatePoll = (p: Profile | null | undefined): boolean => {
  if (!p) return false;
  return ['admin', 'boys_rep', 'girls_rep'].includes((p as any).role ?? '');
};
// ─────────────────────────────────────────────────────────────────────────────

interface AuthContextType {
  profile: Profile | null;
  loading: boolean;
  login: (batchNo: string, name: string, secretCode?: string) => Promise<{ error?: string; needsSecret?: boolean }>;
  logout: () => Promise<void>;
  // ✅ ADDED: change secret code post-login
  changeSecretCode: (currentCode: string, newCode: string) => Promise<{ error?: string }>;
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

  // useEffect(() => {
  //   setProfile(null);
  //   setLoading(false);
  // }, []);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setProfile(JSON.parse(storedUser));
      } else {
        setProfile(null);
      }
    } catch (e) {
      localStorage.removeItem("user"); // Clear if invalid
      setProfile(null);
    } finally {
      // Prevent infinite loading states
      setLoading(false);
    }
  }, []);


  // ✅ ADDED: optional secretCode param for admin/rep validation
  const login = async (batchNo: string, name: string, secretCode?: string): Promise<{ error?: string; needsSecret?: boolean }> => {
    // 🔒 Security: trim + empty-input guard
    const cleanBatchNo = batchNo.trim();
    const cleanName = name.trim();
    if (!cleanBatchNo || !cleanName) {
      return { error: 'Batch number and name are required' };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('batch_no', cleanBatchNo)
      .single();

    if (error || !data) {
      return { error: 'Invalid batch number' };
    }

    // Case-insensitive name check (preserved)
    if (data.name.toLowerCase() !== cleanName.toLowerCase()) {
      return { error: 'Invalid name' };
    }

    // ✅ ADDED: Secret code gate for ALL profiles (default is "-@123" if not set)
    const storedSecret = (data as any).secret_code || '-@123';
    if (!secretCode) {
      // Signal UI to show secret input
      return { needsSecret: true };
    }
    if (secretCode !== storedSecret) {
      return { error: 'Invalid secret code' };
    }

    // Silently log into Supabase Auth so Edge Functions (like create-user) have a valid session
    const email = `${batchNo}@bhub.local`;
    const password = `bhub_${batchNo}_secure`;
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.warn('Failed to start Supabase Auth session:', authError.message);
      // We'll still proceed since local login was successful, 
      // though admin edge functions may fail.
    }

    // 💾 Persist session to localStorage
    localStorage.setItem('user', JSON.stringify(data));
    setProfile(data);

    return {};
  };

  const logout = async () => {
    localStorage.removeItem('user');
    await supabase.auth.signOut();
    setProfile(null);
  };

  // ✅ FIXED: Split update + re-fetch to avoid 406 from chained .select().single() on update
  const changeSecretCode = async (currentCode: string, newCode: string): Promise<{ error?: string }> => {
    if (!profile) return { error: 'Not logged in' };
    const storedSecret = (profile as any).secret_code || '-@123';
    if (currentCode !== storedSecret) return { error: 'Current secret code is incorrect' };
    if (!newCode.trim()) return { error: 'New secret code cannot be empty' };

    // Step 1: plain update — NO chained .select() (avoids 406)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ secret_code: newCode.trim() } as any)
      .eq('id', profile.id);

    if (updateError) {
      console.error('changeSecretCode update error:', updateError);
      return { error: `Failed to update (${updateError.code ?? updateError.message})` };
    }

    // Step 2: re-fetch separately; fall back to local merge if it also fails
    const { data: refreshed } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile.id)
      .single();

    const updated = refreshed ?? { ...profile, secret_code: newCode.trim() };
    localStorage.setItem('user', JSON.stringify(updated));
    setProfile(updated as Profile);
    return {};
  };

  return (
    <AuthContext.Provider value={{ profile, loading, login, logout, changeSecretCode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
