import { useRef } from 'react';
import { CreditCard, ShieldCheck, Sparkles, Building2 } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import BankAccountManager from '../../wallet/components/BankAccountManager';
import { useTranslation } from '../../../hooks/useTranslation';

export function PaymentTab() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  // GSAP Entrance Stagger Animation
  useGSAP(
    () => {
      if (containerRef.current) {
        gsap.fromTo(
          '.payment-bento-card',
          { opacity: 0, y: 20, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.1, ease: 'power3.out' }
        );
      }
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Bento Grid Layout */}
      <div className="settings-bento-grid">
        {/* Bento Card 1: Hero Header Card */}
        <div className="settings-bento-card payment-bento-card settings-bento-col-12 bg-gradient-to-r from-[var(--brand-soft,rgba(73,75,231,0.08))] to-[var(--surface,#ffffff)] border border-[var(--brand-border,rgba(73,75,231,0.25))]">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-[var(--brand,#494be7)] bg-[var(--brand-soft,rgba(73,75,231,0.12))]">
                <Sparkles size={13} />
                <span>Payout & Billings</span>
              </div>
              <h2 className="text-xl font-extrabold text-primary pt-1">
                {t('settings.paymentMethods')}
              </h2>
              <p className="text-xs text-secondary">
                Manage bank accounts for fast, secure earnings withdrawal and project payouts.
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold">
                <ShieldCheck size={14} />
                <span>Encrypted Payouts</span>
              </div>
              <div className="h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand,#494be7)] text-white shadow-lg shadow-[var(--brand-soft)] flex">
                <CreditCard size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Bento Card 2: Bank Account Manager Workspace */}
        <div className="settings-bento-card payment-bento-card settings-bento-col-12 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--border,#ededf0)]">
            <Building2 size={18} className="text-[var(--brand,#494be7)]" />
            <h3 className="font-bold text-sm text-primary">Bank Account Details</h3>
          </div>

          <div className="pt-2">
            <BankAccountManager />
          </div>
        </div>
      </div>
    </div>
  );
}
