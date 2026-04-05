// ✅ ADDED: Change Secret Code Modal
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, X, Loader2, CheckCircle2 } from 'lucide-react';

interface ChangeSecretCodeModalProps {
  onClose: () => void;
}

export default function ChangeSecretCodeModal({ onClose }: ChangeSecretCodeModalProps) {
  const { changeSecretCode } = useAuth();
  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newCode !== confirmCode) {
      setError('New codes do not match');
      return;
    }
    if (newCode.length < 3) {
      setError('New code must be at least 3 characters');
      return;
    }

    setLoading(true);
    const result = await changeSecretCode(currentCode, newCode);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(onClose, 1800);
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card className="w-full max-w-sm border-0 shadow-elevated">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-primary-foreground" />
              </div>
              <CardTitle className="text-lg">Change Secret Code</CardTitle>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="font-semibold text-green-600">Secret code updated!</p>
              <p className="text-sm text-muted-foreground">Use your new code on next login.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Current Secret Code</label>
                <Input
                  type="password"
                  value={currentCode}
                  onChange={(e) => setCurrentCode(e.target.value)}
                  placeholder="Your current code (default: -@123)"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">New Secret Code</label>
                <Input
                  type="password"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="Enter new code"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm New Code</label>
                <Input
                  type="password"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  placeholder="Re-enter new code"
                />
              </div>

              {error && (
                <p className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg">{error}</p>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 gradient-primary text-primary-foreground"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Update
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
