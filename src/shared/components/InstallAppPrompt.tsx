import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'gigbridge_install_prompt_dismissed';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export default function InstallAppPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const handleAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!visible || !deferredPrompt) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/10 bg-[#12121a] p-4 shadow-2xl">
      <img src="/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{t('installApp.title')}</p>
        <p className="truncate text-xs text-white/60">{t('installApp.description')}</p>
      </div>
      <button
        onClick={install}
        className="flex shrink-0 items-center gap-1 rounded-full bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-black"
      >
        <Download className="h-3.5 w-3.5" />
        {t('installApp.action')}
      </button>
      <button
        onClick={dismiss}
        aria-label={t('installApp.dismiss')}
        className="shrink-0 rounded-full p-1 text-white/40 hover:text-white/80"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
