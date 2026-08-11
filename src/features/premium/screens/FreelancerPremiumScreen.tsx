import { useCallback, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import {
  ArrowRight,
  BriefcaseBusiness,
  Crown,
  Megaphone,
  Shield,
  Sparkles,
  Target,
  Zap,
  X,
  Check,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useTranslation } from '../../../hooks/useTranslation';
import { premiumAPI } from '../api';
import { usePremiumResource } from '../hooks';
import { PremiumSubscriptionStatus, WalletTransactionType } from '../types';
import { PromotionManagerPanel } from '../components/PromotionManagerPanel';
import { PremiumTimeRemaining } from '../components/PremiumTimeRemaining';

import '../styles/client-pricing-screen.css';
import '../styles/auto-renew.css';

type Tab = 'overview' | 'jobMatching' | 'promotions' | 'vacation' | 'points' | 'history';

export default function FreelancerPremiumScreen({ initialTab = 'overview' }: { initialTab?: Tab }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('premium');

  const formatDate = (value: string) => new Date(value).toLocaleDateString(i18n.language);

  const [tab, setTab] = useState<Tab>(initialTab);
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState<{ kind: 'vacation' | 'cancelVacation'; label?: string }>();
  const [busy, setBusy] = useState(false);
  const [autoRenewBusy, setAutoRenewBusy] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});

  const current = usePremiumResource(useCallback(premiumAPI.currentSubscription, []));
  const points = usePremiumResource(useCallback(premiumAPI.points, []));
  const vacation = usePremiumResource(useCallback(premiumAPI.rankProtection, []));
  const promotion = usePremiumResource(useCallback(premiumAPI.currentPromotion, []));
  const transactions = usePremiumResource(useCallback(premiumAPI.walletTransactions, []));
  const history = usePremiumResource(useCallback(premiumAPI.subscriptionHistory, []));

  const entitled = Boolean(current.data?.isPremium && new Date(current.data.endDate) > new Date());

  const mutateRankProtection = async () => {
    if (!confirm) return;
    setBusy(true);
    setMessage({});
    let response;
    if (confirm.kind === 'vacation') {
      response = await premiumAPI.activateRankProtection(new Date(endDate + 'T23:59:59').toISOString(), reason);
    } else {
      response = await premiumAPI.cancelRankProtection();
    }
    setBusy(false);
    if (!response.success) return setMessage({ error: response.message });
    setMessage({ success: response.message || t('freelancerPremium.saved') });
    setConfirm(undefined);
    await Promise.all([vacation.refresh(), promotion.refresh(), transactions.refresh()]);
  };

  const updateAutoRenew = async (autoRenew: boolean) => {
    setAutoRenewBusy(true);
    setMessage({});
    const response = await premiumAPI.updateAutoRenew(autoRenew);
    setAutoRenewBusy(false);
    if (!response.success) {
      setMessage({ error: response.message });
      return;
    }
    setMessage({ success: t(autoRenew ? 'freelancerPremium.autoRenewOn' : 'freelancerPremium.autoRenewOff') });
    await Promise.all([current.refresh(), history.refresh()]);
  };

  const tabItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',    label: t('freelancerPremium.tabs.overview', { defaultValue: 'Tổng quan' }),              icon: <Crown size={15} /> },
    { id: 'jobMatching', label: t('freelancerPremium.tabs.jobMatching', { defaultValue: 'Gợi ý việc làm AI' }),    icon: <Target size={15} /> },
    { id: 'promotions',  label: t('freelancerPremium.tabs.promotions', { defaultValue: 'Quảng bá' }),            icon: <Megaphone size={15} /> },
    { id: 'vacation',    label: t('freelancerPremium.tabs.vacation', { defaultValue: 'Nghỉ phép' }),              icon: <Shield size={15} /> },
    { id: 'points',      label: t('freelancerPremium.tabs.points', { defaultValue: 'Điểm & Cấp bậc' }),           icon: <Sparkles size={15} /> },
    { id: 'history',     label: t('freelancerPremium.tabs.history', { defaultValue: 'Lịch sử' }),                 icon: <BriefcaseBusiness size={15} /> },
  ];

  const loading = current.loading || points.loading || history.loading;

  if (!current.loading && !entitled) {
    return <Navigate to="/premium/freelancer/pricing" replace />;
  }

  return (
    <AppLayout>
      <main className="cp-shell">

        {/* HERO BANNER */}
        <section className="cp-hero">
          <div className="cp-hero-eyebrow">
            <span className="cp-hero-eyebrow-dot" />
            {t('freelancerPremium.name', { defaultValue: 'Premium cho Freelancer' })}
          </div>
          <h1 className="cp-hero-headline">
            {t('freelancerPremium.title', { defaultValue: 'Trung tâm quản lý Premium' })}
          </h1>
          <p className="cp-hero-sub">
            {t('freelancerPremium.subtitle', { defaultValue: 'Theo dõi cấp bậc, bảo vệ thứ hạng và quản lý các chiến dịch quảng bá hồ sơ.' })}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button className="cp-btn" onClick={() => navigate('/premium/freelancer/pricing')}>
              <Zap size={14} />
              {t('freelancerPremium.topUp', { defaultValue: 'Gia hạn Premium' })}
            </button>
          </div>
        </section>

        {location.state?.purchased && (
          <div className="cp-hero-eyebrow" style={{ color: 'var(--cp-accent)', marginTop: 16 }}>
            <Sparkles size={16} /> {t('freelancerPremium.activatedNotice')}
          </div>
        )}
        {message.error && (
          <div style={{ color: 'var(--cp-red)', padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,68,68,.08)', margin: '16px 0', fontSize: 13 }}>
            {message.error}
          </div>
        )}
        {message.success && (
          <div style={{ color: 'var(--cp-accent)', padding: '12px 16px', borderRadius: '12px', background: 'var(--cp-accent-dim)', margin: '16px 0', fontSize: 13 }}>
            {message.success}
          </div>
        )}

        {/* TABS */}
        <div className="cp-tabs" role="tablist">
          {tabItems.map(item => (
            <button
              key={item.id}
              className={`cp-tab ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {loading ? (
          <div className="cp-card-grid" style={{ marginTop: 24 }}>
            <div style={{ height: 200, borderRadius: 24, background: 'var(--card)', opacity: 0.5 }} />
            <div style={{ height: 200, borderRadius: 24, background: 'var(--card)', opacity: 0.5 }} />
          </div>
        ) : tab === 'overview' ? (
          <div>
            {/* SUBSCRIPTION CONTROL CARD */}
            <div style={{ padding: '24px 0 36px', borderBottom: '1px solid var(--cp-border)' }}>
              <p className="cp-section-eyebrow"><Crown size={13} /> {t('freelancerPremium.activePlanStatus', { defaultValue: 'Trạng thái Gói Premium' })}</p>

              <article className="cp-plan-prem" style={{ margin: 0, padding: 36 }}>
                <div className="cp-plan-prem-orb" aria-hidden />

                <div className="cp-plan-prem-top">
                  <div className="cp-plan-prem-badge">
                    <Sparkles size={12} /> {entitled ? t('freelancerPremium.activeSub', { defaultValue: 'Đang Hoạt Động' }) : t('freelancerPremium.standardAcc', { defaultValue: 'Tài Khoản Tiêu Chuẩn' })}
                  </div>
                  <div className="cp-plan-prem-tier">
                    <Crown size={14} /> {current.data?.planName || 'Freelancer Premium'}
                  </div>
                </div>

                <div className="cp-plan-prem-headline">
                  Freelancer Velocity &amp; Rank Suite
                </div>

                <PremiumTimeRemaining subscriptions={history.data?.length ? history.data : (current.data ? [current.data] : [])} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderTop: '1px solid var(--cp-border)', paddingTop: 20, marginTop: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label className={`cp-toggle ${Boolean(current.data?.autoRenew) ? '' : 'off'}`} title={t('freelancerPremium.autoRenew')}>
                      <input
                        type="checkbox"
                        checked={Boolean(current.data?.autoRenew)}
                        disabled={autoRenewBusy}
                        onChange={e => void updateAutoRenew(e.target.checked)}
                      />
                      <span className="cp-slider" />
                    </label>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: 'var(--cp-text)' }}>
                        <span>{t('freelancerPremium.autoRenew')}</span>
                        {Boolean(current.data?.autoRenew) ? (
                          <span style={{ fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 999, background: 'var(--cp-accent-dim)', color: 'var(--cp-accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            ACTIVE ✦
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: 'var(--cp-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            OFF
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--cp-muted)', marginTop: 2, fontWeight: 600 }}>
                        {t(current.data?.autoRenew ? 'freelancerPremium.autoRenewEnabledHelp' : 'freelancerPremium.autoRenewDisabledHelp')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                    <button className="cp-btn" style={{ padding: '8px 18px', fontSize: 12 }} onClick={() => navigate('/premium/freelancer/pricing')}>
                      <Zap size={14} /> {t('freelancerPremium.topUpPlan', { defaultValue: 'Gia hạn gói' })}
                    </button>
                  </div>
                </div>
              </article>
            </div>

            {/* FREELANCER CORE TOOLS GRID */}
            <div style={{ padding: '36px 0' }}>
              <p className="cp-section-eyebrow"><Sparkles size={13} /> {t('freelancerPremium.freelancerSuite', { defaultValue: 'Bộ Công Cụ Freelancer' })}</p>
              <h2 className="cp-section-headline" style={{ marginBottom: 32 }}>{t('freelancerPremium.coreToolsTitle', { defaultValue: 'Bộ 4 Công Cụ Hiệu Suất Cốt Lõi' })}</h2>

              <div className="cp-card-grid">
                {/* TOOL 1: AI JOB MATCHING */}
                <article className="cp-card">
                  <div className="cp-card-header">
                    <div className="cp-card-icon"><Target size={20} /></div>
                    <h3 className="cp-card-title">{t('freelancerPremium.aiJobMatchingTitle', { defaultValue: 'AI Smart Job Matching' })}</h3>
                  </div>
                  <p className="cp-card-body">
                    {t('freelancerPremium.jobMatchingDesc', { defaultValue: 'Tìm kiếm các dự án phù hợp với kỹ năng và thứ hạng Elo của bạn.' })}
                  </p>
                  <button className="cp-btn ghost" onClick={() => setTab('jobMatching')}>
                    {t('freelancerPremium.exploreMatching', { defaultValue: 'Khám phá AI Matching' })} <ArrowRight size={14} />
                  </button>
                </article>

                {/* TOOL 2: VACATION MODE */}
                <article className="cp-card">
                  <div className="cp-card-header">
                    <div className="cp-card-icon"><Shield size={20} /></div>
                    <h3 className="cp-card-title">{t('freelancerPremium.vacationMode')}</h3>
                  </div>
                  <p className="cp-card-body">
                    {vacation.data?.isEnabled
                      ? t('freelancerPremium.protectedUntil', { date: formatDate(vacation.data.endsAt) })
                      : t('freelancerPremium.rankProtectionOff')}
                  </p>
                  <button className="cp-btn ghost" onClick={() => setTab('vacation')}>
                    {t('freelancerPremium.tabs.vacation')} <ArrowRight size={14} />
                  </button>
                </article>

                {/* TOOL 3: ELO POINTS */}
                <article className="cp-card">
                  <div className="cp-card-header">
                    <div className="cp-card-icon"><Sparkles size={20} /></div>
                    <h3 className="cp-card-title">{points.data?.eloPoints ?? 0} Elo Points</h3>
                  </div>
                  <p className="cp-card-body">
                    {points.data?.tierName || t('freelancerPremium.tierUnlocks')}
                  </p>
                  <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', margin: '12px 0 18px' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, Number(points.data?.tierProgress || 0))}%`, background: 'var(--cp-accent)' }} />
                  </div>
                  <button className="cp-btn ghost" onClick={() => setTab('points')}>
                    {t('freelancerPremium.tabs.points')} <ArrowRight size={14} />
                  </button>
                </article>

                {/* TOOL 4: PROFILE PROMOTIONS */}
                <article className="cp-card">
                  <div className="cp-card-header">
                    <div className="cp-card-icon"><Megaphone size={20} /></div>
                    <h3 className="cp-card-title">{t('freelancerPremium.profilePromotion')}</h3>
                  </div>
                  <p className="cp-card-body">
                    {promotion.data
                      ? t('freelancerPremium.campaignActiveUntil', { name: promotion.data.packageName, date: formatDate(promotion.data.endsAt) })
                      : t('freelancerPremium.noActiveCampaign')}
                  </p>
                  <button className="cp-btn ghost" onClick={() => setTab('promotions')}>
                    {t('freelancerPremium.activatePromotion')} <ArrowRight size={14} />
                  </button>
                </article>
              </div>
            </div>
          </div>
        ) : tab === 'jobMatching' ? (
          /* TAB 2: GỢI Ý VIỆC LÀM AI */
          <div style={{ padding: '24px 0' }}>
            <article className="cp-plan-prem" style={{ margin: 0, padding: 40 }}>
              <div className="cp-plan-prem-orb" aria-hidden />

              <div className="cp-plan-prem-top">
                <div className="cp-plan-prem-badge">
                  <Target size={12} /> {t('freelancerPremium.aiMatchingBadge', { defaultValue: 'AI Matching Engine ✦ Tính Năng Premium' })}
                </div>
              </div>

              <div className="cp-plan-prem-headline">
                {t('freelancerPremium.aiJobMatchingTitle', { defaultValue: 'Công cụ Tìm kiếm Việc làm Phù hợp AI' })}
              </div>

              <p style={{ fontSize: 14, color: 'var(--cp-muted)', lineHeight: 1.6, maxWidth: 680, margin: '16px 0 28px' }}>
                {t('freelancerPremium.aiJobMatchingDesc', { defaultValue: 'Thuật toán AI tự động phân tích sâu hồ sơ, kỹ năng chuyên môn và chỉ số uy tín Elo của bạn để liên tục tìm kiếm, đề xuất những dự án chất lượng có tỉ lệ trúng thầu cao nhất.' })}
              </p>

              <div style={{ borderTop: '1px solid var(--cp-border)', paddingTop: 24, marginTop: 12 }}>
                <button className="cp-btn" style={{ padding: '14px 32px', fontSize: 15 }} onClick={() => navigate('/jobs/browse')}>
                  <Target size={18} /> {t('freelancerPremium.goToBrowseJobs', { defaultValue: 'Đi tới trang Tìm kiếm Việc làm (Browse Jobs)' })} <ArrowRight size={18} />
                </button>
              </div>
            </article>
          </div>
        ) : tab === 'promotions' ? (
          /* TAB 3: PROMOTIONS */
          <div style={{ padding: '24px 0' }}>
            <PromotionManagerPanel entitled={entitled} />
          </div>
        ) : tab === 'vacation' ? (
          /* TAB 4: VACATION MODE */
          <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div>
              <p className="cp-section-eyebrow">
                <Shield size={13} /> {t('freelancerPremium.vacationEyebrow', { defaultValue: 'Rank Protection Shield' })}
              </p>
              <h2 className="cp-section-headline">
                {t('freelancerPremium.vacationTitle', { defaultValue: 'Chế Độ Nghỉ Phép & Bảo Vệ Thứ Hạng Elo' })}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--cp-muted)', marginTop: 4, fontWeight: 500 }}>
                {t('freelancerPremium.vacationSub', { defaultValue: 'Bảo vệ điểm uy tín Elo của bạn không bị suy giảm khi tạm dừng làm việc hoặc đi nghỉ dưỡng.' })}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28, alignItems: 'start' }}>

              {/* LEFT COLUMN: ACTIVE OR SETUP FORM */}
              {vacation.data?.isEnabled ? (
                <article className="cp-plan-prem" style={{ margin: 0, padding: 32 }}>
                  <div className="cp-plan-prem-orb" aria-hidden />

                  <div className="cp-plan-prem-top">
                    <div className="cp-plan-prem-badge">
                      <Shield size={12} /> PROTECTED ✦ ACTIVE
                    </div>
                    <div className="cp-plan-prem-tier">
                      Rank Freeze Active
                    </div>
                  </div>

                  <div className="cp-plan-prem-headline" style={{ fontSize: 20, marginBottom: 12 }}>
                    {t('freelancerPremium.rankProtectedActiveTitle', { defaultValue: 'Đã Kích Hoạt Bảo Vệ Thứ Hạng' })}
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--cp-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
                    {t('freelancerPremium.rankProtectedUntil', { date: formatDate(vacation.data.endsAt), defaultValue: `Điểm Elo của bạn đang được đóng băng an toàn đến ngày ${formatDate(vacation.data.endsAt)}.` })}
                  </p>

                  {vacation.data.reason && (
                    <div style={{ padding: 14, borderRadius: 14, background: 'var(--card)', border: '1px solid var(--cp-border)', fontSize: 12, color: 'var(--cp-text)', marginBottom: 20 }}>
                      <strong style={{ color: 'var(--cp-muted)', display: 'block', marginBottom: 2, fontSize: 10, textTransform: 'uppercase' }}>
                        {t('freelancerPremium.vacationReasonLabel', { defaultValue: 'Lý do nghỉ phép:' })}
                      </strong>
                      "{vacation.data.reason}"
                    </div>
                  )}

                  <button
                    className="cp-btn ghost"
                    onClick={() => setConfirm({ kind: 'cancelVacation' })}
                    style={{ color: 'var(--cp-red)', borderColor: 'rgba(239,68,68,0.35)' }}
                  >
                    {t('freelancerPremium.endVacation', { defaultValue: 'Tắt Chế Độ Nghỉ Phép Ngay' })}
                  </button>
                </article>
              ) : (
                <article className="cp-card" style={{ padding: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--cp-accent-dim)', color: 'var(--cp-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Shield size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 900, color: 'var(--cp-text)', margin: 0 }}>
                        {t('freelancerPremium.setupVacationTitle', { defaultValue: 'Kích Hoạt Bảo Vệ Thứ Hạng' })}
                      </h3>
                      <span style={{ fontSize: 12, color: 'var(--cp-muted)', fontWeight: 600 }}>
                        {t('freelancerPremium.setupVacationSub', { defaultValue: 'Chọn thời gian kết thúc kỳ nghỉ phép của bạn' })}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--cp-muted)', display: 'block', marginBottom: 6 }}>
                        {t('freelancerPremium.vacationStep1', { defaultValue: '1. Ngày kết thúc nghỉ phép' })} *
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().slice(0, 10)}
                        max={current.data?.endDate.slice(0, 10)}
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        style={{ width: '100%', height: 44, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--cp-border)', padding: '0 14px', color: 'var(--cp-text)', outline: 'none', fontSize: 13, fontWeight: 600 }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--cp-muted)', marginTop: 4, display: 'block' }}>
                        {t('freelancerPremium.chooseEndDate', { date: current.data ? formatDate(current.data.endDate) : '', defaultValue: `Tối đa đến hết ngày gia hạn Premium: ${current.data ? formatDate(current.data.endDate) : ''}` })}
                      </span>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--cp-muted)', display: 'block', marginBottom: 6 }}>
                        {t('freelancerPremium.vacationStep2', { defaultValue: '2. Lý do nghỉ phép (Tùy chọn)' })}
                      </label>
                      <input
                        type="text"
                        placeholder={t('freelancerPremium.optionalReason', { defaultValue: 'Nhập lý do (ví dụ: Đi du lịch, bận việc gia đình...)' })}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        style={{ width: '100%', height: 44, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--cp-border)', padding: '0 14px', color: 'var(--cp-text)', outline: 'none', fontSize: 13, fontWeight: 600 }}
                      />
                    </div>

                    <button
                      className="cp-btn"
                      disabled={!entitled || !endDate}
                      onClick={() => setConfirm({ kind: 'vacation' })}
                      style={{ padding: '12px 24px', fontSize: 14, marginTop: 4 }}
                    >
                      <Shield size={16} />
                      {t('freelancerPremium.activateVacation', { defaultValue: 'Bật Chế Độ Nghỉ Phép' })}
                    </button>
                  </div>
                </article>
              )}

              {/* RIGHT COLUMN: MONOCHROME BENEFITS LIST */}
              <article className="cp-card" style={{ padding: 28 }}>
                <h3 style={{ fontSize: 15, fontWeight: 900, color: 'var(--cp-text)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} style={{ color: 'var(--cp-accent)' }} />
                  {t('freelancerPremium.vacationBenefitsHeader', { defaultValue: 'Quyền Lợi Bảo Vệ Thứ Hạng' })}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--cp-accent-dim)', color: 'var(--cp-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Shield size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--cp-text)', margin: '0 0 4px' }}>
                        {t('freelancerPremium.benefit1Title', { defaultValue: 'Đóng băng chỉ số Elo' })}
                      </h4>
                      <p style={{ fontSize: 12, color: 'var(--cp-muted)', margin: 0, lineHeight: 1.5 }}>
                        {t('freelancerPremium.benefit1Sub', { defaultValue: 'Khóa điểm uy tín Elo không bị suy giảm hoặc bị trừ phạt khi không phản hồi báo giá mới.' })}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--cp-accent-dim)', color: 'var(--cp-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Crown size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--cp-text)', margin: '0 0 4px' }}>
                        {t('freelancerPremium.benefit2Title', { defaultValue: 'Tạm ẩn trạng thái bận' })}
                      </h4>
                      <p style={{ fontSize: 12, color: 'var(--cp-muted)', margin: 0, lineHeight: 1.5 }}>
                        {t('freelancerPremium.benefit2Sub', { defaultValue: 'Hồ sơ hiển thị nhãn "Đang nghỉ phép" giúp Nhà tuyển dụng nhận biết và không làm phiền.' })}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--cp-accent-dim)', color: 'var(--cp-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Zap size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--cp-text)', margin: '0 0 4px' }}>
                        {t('freelancerPremium.benefit3Title', { defaultValue: 'Khôi phục tự động' })}
                      </h4>
                      <p style={{ fontSize: 12, color: 'var(--cp-muted)', margin: 0, lineHeight: 1.5 }}>
                        {t('freelancerPremium.benefit3Sub', { defaultValue: 'Tự động mở lại trạng thái hoạt động ngay khi kết thúc thời gian nghỉ phép đã chọn.' })}
                      </p>
                    </div>
                  </div>
                </div>
              </article>

            </div>
          </div>
        ) : tab === 'points' ? (
          /* TAB 5: POINTS & ELO RANK TIER */
          <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div>
              <p className="cp-section-eyebrow">
                <Sparkles size={13} /> {t('freelancerPremium.pointsEyebrow', { defaultValue: 'Elo Rank & Reward System' })}
              </p>
              <h2 className="cp-section-headline">
                {t('freelancerPremium.pointsTitle', { defaultValue: 'Điểm Uy Tín Elo & Tiêu Chuẩn Cấp Bậc' })}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--cp-muted)', marginTop: 4, fontWeight: 500 }}>
                {t('freelancerPremium.pointsSub', { defaultValue: 'Tích lũy điểm Elo qua các dự án hoàn thành xuất sắc để thăng hạng và mở khóa đặc quyền ưu tiên.' })}
              </p>
            </div>

            {/* TOP ELO STATUS BANNER */}
            <article className="cp-plan-prem" style={{ margin: 0, padding: 36 }}>
              <div className="cp-plan-prem-orb" aria-hidden />

              <div className="cp-plan-prem-top">
                <div className="cp-plan-prem-badge">
                  <Sparkles size={12} /> ELO RANK TIER
                </div>
                <div className="cp-plan-prem-tier">
                  <Crown size={14} /> {points.data?.tierName || 'Bronze Rank'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '16px 0 8px' }}>
                <span style={{ fontSize: 40, fontWeight: 900, color: 'var(--cp-text)', letterSpacing: '-0.03em' }}>
                  {points.data?.eloPoints ?? 0}
                </span>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--cp-accent)' }}>Elo Points</span>
              </div>

              <p style={{ fontSize: 13, color: 'var(--cp-muted)', margin: '0 0 24px', fontWeight: 500 }}>
                {points.data?.nextTierName
                  ? t('freelancerPremium.pointsToTier', { count: points.data.nextTierThreshold! - points.data.eloPoints, tier: points.data.nextTierName, defaultValue: `Cần thêm ${points.data.nextTierThreshold! - points.data.eloPoints} Elo để thăng hạng ${points.data.nextTierName}` })
                  : t('freelancerPremium.highestTier', { defaultValue: 'Bạn đã đạt cấp bậc Elo cao nhất!' })}
              </p>

              {/* MONOCHROME ACCENT PROGRESS BAR */}
              <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${Math.min(100, Number(points.data?.tierProgress || 0))}%`, background: 'var(--cp-accent)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, color: 'var(--cp-muted)' }}>
                <span>{points.data?.tierName || 'Bronze'}</span>
                <span>{points.data?.tierProgress?.toFixed(0) || 0}%</span>
                <span>{points.data?.nextTierName || 'Max Tier'}</span>
              </div>
            </article>

            {/* RECENT ELO POINT TRANSACTION HISTORY */}
            <article className="cp-card" style={{ padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--cp-accent-dim)', color: 'var(--cp-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BriefcaseBusiness size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 900, color: 'var(--cp-text)', margin: 0 }}>
                    {t('freelancerPremium.recentPointActivity', { defaultValue: 'Lịch sử Biến động Điểm Elo' })}
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--cp-muted)', fontWeight: 600 }}>
                    {t('freelancerPremium.recentPointActivitySub', { defaultValue: 'Theo dõi chi tiết cộng/trừ điểm Elo real-time từ các dự án' })}
                  </span>
                </div>
              </div>

              {points.data?.recentTransactions?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {points.data.recentTransactions.map(x => (
                    <div key={x.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--cp-border)' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--cp-text)' }}>
                          {x.reason === 5 ? t('freelancerPremium.legacyIntegrityAdjustment', { defaultValue: 'Điều chỉnh điểm hệ thống' }) : x.sourceEntityType || t('freelancerPremium.activity', { reason: x.reason, defaultValue: `Giao dịch điểm #${x.reason}` })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--cp-muted)', marginTop: 2, fontWeight: 500 }}>
                          {new Date(x.createdAt).toLocaleString(i18n.language)}
                        </div>
                      </div>
                      <strong style={{ fontSize: 15, fontWeight: 900, color: x.pointsDelta >= 0 ? 'var(--cp-text)' : 'var(--cp-red)' }}>
                        {x.pointsDelta > 0 ? '+' : ''}{x.pointsDelta} Elo
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--cp-muted)', margin: 0, padding: '12px 0' }}>
                  {t('freelancerPremium.noPointActivity', { defaultValue: 'Chưa có biến động điểm Elo gần đây.' })}
                </p>
              )}
            </article>
          </div>
        ) : (
          /* TAB 6: HISTORY */
          <div style={{ padding: '24px 0' }}>
            <div className="cp-card-grid">
              {/* Subscriptions */}
              <article className="cp-card">
                <h3 className="cp-card-title" style={{ marginBottom: 16 }}>{t('freelancerPremium.subscriptions')}</h3>
                {history.data?.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {history.data.map(x => (
                      <div key={x.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--cp-border)' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cp-text)' }}>{x.planName}</div>
                          <div style={{ fontSize: 11, color: 'var(--cp-muted)', marginTop: 2 }}>{formatDate(x.startDate)} – {formatDate(x.endDate)}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'var(--cp-accent-dim)', color: 'var(--cp-accent)' }}>
                          {PremiumSubscriptionStatus[x.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--cp-muted)', margin: 0 }}>{t('freelancerPremium.noSubscriptionHistory')}</p>
                )}
              </article>

              {/* Wallet Activity */}
              <article className="cp-card">
                <h3 className="cp-card-title" style={{ marginBottom: 16 }}>{t('freelancerPremium.walletActivity')}</h3>
                {transactions.data?.filter(x => x.type === WalletTransactionType.PromotionPurchase || x.type === WalletTransactionType.SubscriptionPurchase).length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {transactions.data
                      .filter(x => x.type === WalletTransactionType.PromotionPurchase || x.type === WalletTransactionType.SubscriptionPurchase)
                      .map(x => (
                        <div key={x.walletTransactionId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--cp-border)' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cp-text)' }}>{WalletTransactionType[x.type]}</div>
                            <div style={{ fontSize: 11, color: 'var(--cp-muted)', marginTop: 2 }}>{new Date(x.createdAt).toLocaleString(i18n.language)}</div>
                          </div>
                          <strong style={{ fontSize: 13, color: 'var(--cp-red)' }}>-{Math.abs(x.tokenAmount).toLocaleString()}</strong>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--cp-muted)', margin: 0 }}>{t('freelancerPremium.noTransactions')}</p>
                )}
              </article>
            </div>
          </div>
        )}

        {/* REDESIGN: ELEGANT EDITORIAL CONFIRMATION MODAL */}
        {confirm && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background: 'rgba(10, 10, 15, 0.75)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={() => setConfirm(undefined)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 440,
                borderRadius: 24,
                background: 'var(--card)',
                border: '1px solid var(--cp-border)',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
                padding: 28,
                position: 'relative',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* CLOSE BUTTON */}
              <button
                type="button"
                onClick={() => setConfirm(undefined)}
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: 'var(--cp-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>

              {/* HEADER BADGE & TITLE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--cp-accent-dim)', color: 'var(--cp-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Shield size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 900, color: 'var(--cp-text)', margin: 0 }}>
                    {t(confirm.kind === 'vacation' ? 'freelancerPremium.confirmVacationModalTitle' : 'freelancerPremium.confirmCancelVacationModalTitle', { defaultValue: confirm.kind === 'vacation' ? 'Xác Nhận Bật Nghỉ Phép' : 'Xác Nhận Tắt Nghỉ Phép' })}
                  </h3>
                  <span style={{ fontSize: 11, color: 'var(--cp-muted)', fontWeight: 600 }}>Rank Protection Status</span>
                </div>
              </div>

              {/* SUMMARY BOX */}
              <div style={{ padding: 16, borderRadius: 16, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', margin: '16px 0 24px' }}>
                <p style={{ fontSize: 13, color: 'var(--cp-text)', margin: 0, fontWeight: 600, lineHeight: 1.5 }}>
                  {confirm.label || t(confirm.kind === 'vacation' ? 'freelancerPremium.confirmProtect' : 'freelancerPremium.confirmEnd', { date: endDate ? formatDate(endDate) : '', defaultValue: confirm.kind === 'vacation' ? `Bảo vệ và đóng băng điểm uy tín Elo của bạn đến hết ngày ${endDate ? formatDate(endDate) : ''}?` : 'Tắt chế độ nghỉ phép và mở lại trạng thái nhận dự án ngay lập tức?' })}
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="cp-btn ghost"
                  onClick={() => setConfirm(undefined)}
                  style={{ padding: '10px 18px', fontSize: 13 }}
                >
                  {t('freelancerPremium.goBack', { defaultValue: 'Hủy & Quay lại' })}
                </button>
                <button
                  type="button"
                  className="cp-btn"
                  disabled={busy}
                  onClick={() => void mutateRankProtection()}
                  style={{ padding: '10px 22px', fontSize: 13 }}
                >
                  {busy ? <Zap size={14} className="animate-spin" /> : <Check size={15} />}
                  {t(busy ? 'freelancerPremium.submitting' : 'freelancerPremium.confirm', { defaultValue: busy ? 'Đang xử lý...' : 'Xác Nhận Thực Hiện' })}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </AppLayout>
  );
}
