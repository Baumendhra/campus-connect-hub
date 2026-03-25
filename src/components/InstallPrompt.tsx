import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const install = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-card border rounded-xl shadow-lg p-4 flex items-center gap-3">
      <Download className="w-8 h-8 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Install BHub</p>
        <p className="text-xs text-muted-foreground">Get the full app experience</p>
      </div>
      <Button size="sm" onClick={install}>Install</Button>
      <button onClick={() => setDismissed(true)} className="text-muted-foreground">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
