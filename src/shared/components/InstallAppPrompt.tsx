import { useEffect, useState } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'gigbridge_install_prompt_dismissed';
const IOS_DISMISS_KEY = 'gigbridge_ios_install_hint_dismissed';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

// iPadOS 13+ reports as a Mac in the UA string, so touch support is the tell.
function isIosSafari() {
  const ua = window.navigator.userAgent;
  const isIosDevice = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIosDevice && isSafari;
}

export default function InstallAppPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    if (isIosSafari()) {
      if (!localStorage.getItem(IOS_DISMISS_KEY)) setShowIosHint(true);
      return;
    }

    if (localStorage.getItem(DISMISS_KEY)) return;

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

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const dismissIosHint = () => {
    localStorage.setItem(IOS_DISMISS_KEY, '1');
    setShowIosHint(false);
  };

  if (showIosHint) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-start gap-3 rounded-2xl border border-white/10 bg-[#12121a] p-4 shadow-2xl">
        <img src="/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{t('installApp.iosTitle')}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-white/60">
            <Share className="h-3.5 w-3.5 shrink-0" />
            {t('installApp.iosStep1')}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/60">
            <SquarePlus className="h-3.5 w-3.5 shrink-0" />
            {t('installApp.iosStep2')}
          </p>
        </div>
        <button
          onClick={dismissIosHint}
          aria-label={t('installApp.dismiss')}
          className="shrink-0 rounded-full p-1 text-white/40 hover:text-white/80"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (!visible || !deferredPrompt) return null;

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
