import { useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  CreditCard,
  Sparkles,
  Lock,
  ArrowUpRight,
  PlusCircle,
  Banknote,
  History,
  Wallet,
} from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import BankAccountManager from '../../wallet/components/BankAccountManager';
import { useTranslation } from '../../../hooks/useTranslation';
import { useApp } from '../../../app/providers/AppProvider';
import { UserRole } from '../../../types/models/User';

export function PaymentTab() {
  const { t } = useTranslation(['settings', 'wallet', 'common']);
  const { role } = useApp();
  const isClient = role === UserRole.Client;

  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // GSAP Entrance Timeline Animation
  useGSAP(
    () => {
      if (containerRef.current) {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.fromTo(
          '.payment-hero-card',
          { opacity: 0, y: 20, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.5, clearProps: 'all' }
        )
        .fromTo(
          '.payment-badge',
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.7)', clearProps: 'all' },
          '-=0.3'
        )
        .fromTo(
          '.payment-quick-nav-card',
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, clearProps: 'all' },
          '-=0.2'
        )
        .fromTo(
          '.payment-body-section',
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.45, clearProps: 'all' },
          '-=0.2'
        );
      }
    },
    { scope: containerRef }
  );

  // Micro-hover animations for navigation buttons
  const handleBtnMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, { y: -3, scale: 1.015, duration: 0.2, ease: 'power2.out' });
  };

  const handleBtnMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, { y: 0, scale: 1, duration: 0.2, ease: 'power2.out' });
  };

  return (
    <div ref={containerRef} className="space-y-6 w-full max-w-full min-w-0">
      {/* Hero Header Card */}
      <div className="payment-hero-card settings-bento-card settings-bento-col-12 bg-gradient-to-br from-[var(--brand-soft,rgba(73,75,231,0.08))] via-[var(--surface,#ffffff)] to-[var(--surface-muted,#f8f9fa)] border border-[var(--brand-border,rgba(73,75,231,0.25))] p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="payment-badge inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-[var(--brand,#494be7)] bg-[var(--brand-soft,rgba(73,75,231,0.12))] border border-[var(--brand-border,rgba(73,75,231,0.2))]">
              <Sparkles size={13} />
              <span>{t('settings.payoutsAndBillings', { defaultValue: 'Thanh toán & Nạp tiền' })}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
              {t('settings.paymentMethods', { defaultValue: 'Phương thức thanh toán' })}
            </h2>
            <p className="text-xs sm:text-sm text-secondary font-medium max-w-xl leading-relaxed">
              {isClient
                ? t('settings.paymentMethodsClientSubtitle', {
                    defaultValue: 'Nạp tiền tiện lợi vào Ví qua PayOS và xem lịch sử giao dịch thanh toán dự án.',
                  })
                : t('settings.paymentMethodsSubtitle', {
                    defaultValue: 'Thêm và quản lý tài khoản ngân hàng để nạp/rút tiền dự án nhanh chóng.',
                  })}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand,#494be7)] text-white shadow-lg shadow-[var(--brand-soft)] flex shrink-0">
              <CreditCard size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Wallet Navigation Card */}
      <div className="payment-quick-nav-card settings-form-card space-y-3">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-[var(--brand,#494be7)]" />
          <h3 className="font-bold text-sm text-primary">
            {t('settings.quickWalletNav', { defaultValue: 'Truy cập nhanh Ví' })}
          </h3>
        </div>

        <div className={`grid grid-cols-1 ${isClient ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3`}>
          {/* Button 1: Nạp tiền */}
          <button
            type="button"
            onClick={() => navigate('/wallet/deposit')}
            onMouseEnter={handleBtnMouseEnter}
            onMouseLeave={handleBtnMouseLeave}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-muted,#f8f9fa)] hover:bg-[var(--brand-soft,rgba(73,75,231,0.1))] border border-[var(--border,#ededf0)] hover:border-[var(--brand,#494be7)] text-[var(--text-primary)] hover:text-[var(--brand,#494be7)] font-bold text-xs sm:text-sm transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <PlusCircle size={18} />
              </div>
              <span>{t('settings.depositBtn', { defaultValue: 'Nạp tiền' })}</span>
            </div>
            <ArrowUpRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors" />
          </button>

          {/* Button 2: Rút tiền (Chỉ hiển thị cho Freelancer, ẩn với Client) */}
          {!isClient && (
            <button
              type="button"
              onClick={() => navigate('/wallet/withdrawals')}
              onMouseEnter={handleBtnMouseEnter}
              onMouseLeave={handleBtnMouseLeave}
              className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-muted,#f8f9fa)] hover:bg-[var(--brand-soft,rgba(73,75,231,0.1))] border border-[var(--border,#ededf0)] hover:border-[var(--brand,#494be7)] text-[var(--text-primary)] hover:text-[var(--brand,#494be7)] font-bold text-xs sm:text-sm transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Banknote size={18} />
                </div>
                <span>{t('settings.withdrawBtn', { defaultValue: 'Rút tiền' })}</span>
              </div>
              <ArrowUpRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors" />
            </button>
          )}

          {/* Button 3: Lịch sử giao dịch */}
          <button
            type="button"
            onClick={() => navigate('/wallet/history')}
            onMouseEnter={handleBtnMouseEnter}
            onMouseLeave={handleBtnMouseLeave}
            className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-muted,#f8f9fa)] hover:bg-[var(--brand-soft,rgba(73,75,231,0.1))] border border-[var(--border,#ededf0)] hover:border-[var(--brand,#494be7)] text-[var(--text-primary)] hover:text-[var(--brand,#494be7)] font-bold text-xs sm:text-sm transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <History size={18} />
              </div>
              <span>{t('settings.historyBtn', { defaultValue: 'Lịch sử giao dịch' })}</span>
            </div>
            <ArrowUpRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors" />
          </button>
        </div>
      </div>

      {/* Bank Account Manager Workspace Component */}
      <div className="payment-body-section w-full max-w-full min-w-0">
        <BankAccountManager />
      </div>

      {/* Footer Security Notice */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-muted,#f8f9fa)] border border-[var(--border,#ededf0)] text-xs text-secondary font-medium">
        <div className="flex items-center gap-2">
          <Lock size={14} className="text-[var(--brand,#494be7)]" />
          <span>{t('settings.pciDssNotice', { defaultValue: 'Mọi thông tin thanh toán đều được bảo mật theo tiêu chuẩn PCI-DSS.' })}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[var(--brand,#494be7)] font-bold">
          <span>{t('settings.supportCenter', { defaultValue: 'Trung tâm hỗ trợ' })}</span>
          <ArrowUpRight size={13} />
        </div>
      </div>
    </div>
  );
}
