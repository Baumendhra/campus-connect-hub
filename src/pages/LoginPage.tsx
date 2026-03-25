import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function LoginPage() {
  const { login } = useAuth();
  const [batchNo, setBatchNo] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

// useEffect(() => {
//   const hasSession = Object.keys(localStorage).some(key =>
//     key.includes("auth-token")
//   );

//   if (hasSession) {
//     navigate("/dashboard");
//   }
// }, []);

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError('');
//     setLoading(true);
//     const result = await login(batchNo.trim(), name.trim());
//     if (result.error) setError(result.error);
//     setLoading(false);
//   };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero">
      <Card className="w-full max-w-md shadow-elevated border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">College BHub</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">Sign in with your batch credentials</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Batch Number</label>
              <Input
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                placeholder="e.g. 274006"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your registered name"
                required
              />
            </div>
            {error && (
              <p className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg">{error}</p>
            )}
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
