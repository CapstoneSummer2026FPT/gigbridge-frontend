import { useCallback, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { CalendarDays, Crown, Megaphone, Shield, Sparkles } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { premiumAPI } from '../api';
import { usePremiumResource } from '../hooks';
import { PremiumSubscriptionStatus, WalletTransactionType } from '../types';
import '../styles/premium.css';
import '../styles/promotion-cta.css';
import '../styles/auto-renew.css';
import { PromotionManagerPanel } from '../components/PromotionManagerPanel';
import { useTranslation } from '../../../hooks/useTranslation';

type Tab = 'overview' | 'points' | 'vacation' | 'promotions' | 'history';
export default function FreelancerPremiumScreen({ initialTab = 'overview' }: { initialTab?: Tab }) {
  const { t, i18n } = useTranslation();
  const formatDate = (value: string) => new Date(value).toLocaleDateString(i18n.language);
  const location = useLocation();
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

  const mutate = async () => {
    if (!confirm) return;
    setBusy(true); setMessage({});
    let response;
    if (confirm.kind === 'vacation') response = await premiumAPI.activateRankProtection(new Date(endDate + 'T23:59:59').toISOString(), reason);
    else if (confirm.kind === 'cancelVacation') response = await premiumAPI.cancelRankProtection();
    else response = await premiumAPI.cancelRankProtection();
    setBusy(false);
    if (!response.success) return setMessage({ error: response.message });
    setMessage({ success: response.message || t('freelancerPremium.saved') }); setConfirm(undefined);
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

  const tabs: { id: Tab; label: string }[] = [{ id: 'overview', label: t('freelancerPremium.tabs.overview') }, { id: 'points', label: t('freelancerPremium.tabs.points') }, { id: 'vacation', label: t('freelancerPremium.tabs.vacation') }, { id: 'promotions', label: t('freelancerPremium.tabs.promotions') }, { id: 'history', label: t('freelancerPremium.tabs.history') }];
  const loading = current.loading || points.loading;

  if (!current.loading && !entitled) return <Navigate to="/premium/freelancer/pricing" replace />;

  return <AppLayout><main className="premium-shell">
    <section className="premium-hero"><div className="premium-eyebrow"><Crown size={16} /> {t('freelancerPremium.name')}</div><h1 className="premium-title">{t('freelancerPremium.title')}</h1><p className="premium-muted">{t('freelancerPremium.subtitle')}</p><a href="/premium/freelancer/pricing" className="premium-button secondary">{t('freelancerPremium.topUp')}</a></section>
    {location.state?.purchased && <div className="premium-notice"><Sparkles size={18} />{t('freelancerPremium.activatedNotice')}</div>}
    <div className="premium-tabs">{tabs.map(x => <button key={x.id} className={`premium-tab ${tab === x.id ? 'active' : ''}`} onClick={() => setTab(x.id)}>{x.label}</button>)}</div>
    {message.error && <div className="premium-error">{message.error}</div>}
    {message.success && <div className="premium-notice"><Sparkles size={18} />{message.success}</div>}
    {loading ? <div className="premium-grid"><div className="premium-skeleton" /><div className="premium-skeleton" /></div> :
      tab === 'overview' ? <div className="premium-grid">
        <section className="premium-card"><Crown color="#8b5cf6" /><h3>{current.data?.planName || 'Premium'}</h3><p className="premium-muted">{t('freelancerPremium.premiumThrough', { date: formatDate(current.data!.endDate) })}</p><label className="premium-auto-renew"><input type="checkbox" checked={Boolean(current.data?.autoRenew)} disabled={autoRenewBusy} onChange={event => void updateAutoRenew(event.target.checked)} /><span>{t('freelancerPremium.autoRenew')}</span></label><p className="premium-muted premium-auto-renew-help">{t(current.data?.autoRenew ? 'freelancerPremium.autoRenewEnabledHelp' : 'freelancerPremium.autoRenewDisabledHelp')}</p><a href="/premium/freelancer/pricing" className="premium-button">{t('freelancerPremium.topUpPlan')}</a></section>
        <section className="premium-card"><Sparkles color="#22d3ee" /><h3>{points.data?.eloPoints ?? 0} Elo</h3><p className="premium-muted">{points.data?.tierName || t('freelancerPremium.tierUnlocks')}</p><div className="premium-progress"><span style={{ width: `${Math.min(100, Number(points.data?.tierProgress || 0))}%` }} /></div><button className="premium-button premium-promotion-cta" onClick={() => setTab('promotions')}><Megaphone size={16} /> {t('freelancerPremium.activatePromotion')}</button></section>
        <section className="premium-card"><Shield color="#22c55e" /><h3>{t('freelancerPremium.vacationMode')}</h3><p className="premium-muted">{vacation.data?.isEnabled ? t('freelancerPremium.protectedUntil', { date: formatDate(vacation.data.endsAt) }) : t('freelancerPremium.rankProtectionOff')}</p></section>
        <section className="premium-card"><Megaphone color="#f59e0b" /><h3>{t('freelancerPremium.profilePromotion')}</h3><p className="premium-muted">{promotion.data ? t('freelancerPremium.campaignActiveUntil', { name: promotion.data.packageName, date: formatDate(promotion.data.endsAt) }) : t('freelancerPremium.noActiveCampaign')}</p></section>
      </div> :
      tab === 'points' ? <section className="premium-card"><h3>{points.data?.tierName || t('freelancerPremium.eloPoints')} · {points.data?.eloPoints}</h3><p className="premium-muted">{points.data?.nextTierName ? t('freelancerPremium.pointsToTier', { count: points.data.nextTierThreshold! - points.data.eloPoints, tier: points.data.nextTierName }) : t('freelancerPremium.highestTier')}</p><div className="premium-progress"><span style={{ width: `${Math.min(100, Number(points.data?.tierProgress || 0))}%` }} /></div>{points.data?.recentTransactions?.length ? points.data.recentTransactions.map(x => <div className="premium-row" key={x.id}><div><strong>{x.sourceEntityType || t('freelancerPremium.activity', { reason: x.reason })}</strong><div className="premium-muted">{new Date(x.createdAt).toLocaleString(i18n.language)}</div></div><strong style={{ color: x.pointsDelta >= 0 ? '#22c55e' : '#ef4444' }}>{x.pointsDelta > 0 ? '+' : ''}{x.pointsDelta}</strong></div>) : <p className="premium-muted">{t('freelancerPremium.noPointActivity')}</p>}</section> :
      tab === 'vacation' ? <section className="premium-card"><CalendarDays color="#8b5cf6" /><h3>{t('freelancerPremium.vacationMode')}</h3>{vacation.data?.isEnabled ? <><p className="premium-muted">{t('freelancerPremium.rankProtectedUntil', { date: formatDate(vacation.data.endsAt) })}</p><button className="premium-button secondary" onClick={() => setConfirm({ kind: 'cancelVacation' })}>{t('freelancerPremium.endVacation')}</button></> : <><p className="premium-muted">{t('freelancerPremium.chooseEndDate', { date: current.data ? formatDate(current.data.endDate) : '' })}</p><input className="premium-input" type="date" min={new Date().toISOString().slice(0, 10)} max={current.data?.endDate.slice(0, 10)} value={endDate} onChange={e => setEndDate(e.target.value)} /><input className="premium-input" placeholder={t('freelancerPremium.optionalReason')} value={reason} onChange={e => setReason(e.target.value)} /><button className="premium-button" disabled={!entitled || !endDate} onClick={() => setConfirm({ kind: 'vacation' })}>{t('freelancerPremium.activateVacation')}</button></>}</section> :
      tab === 'promotions' ? <PromotionManagerPanel entitled={entitled} /> :
      <div className="premium-grid"><section className="premium-card"><h3>{t('freelancerPremium.subscriptions')}</h3>{history.data?.map(x => <div className="premium-row" key={x.id}><div><strong>{x.planName}</strong><div className="premium-muted">{formatDate(x.startDate)} – {formatDate(x.endDate)}</div></div><span>{PremiumSubscriptionStatus[x.status]}</span></div>) || <p className="premium-muted">{t('freelancerPremium.noSubscriptionHistory')}</p>}</section><section className="premium-card"><h3>{t('freelancerPremium.walletActivity')}</h3>{transactions.data?.filter(x => x.type === WalletTransactionType.PromotionPurchase || x.type === WalletTransactionType.SubscriptionPurchase).map(x => <div className="premium-row" key={x.walletTransactionId}><div><strong>{WalletTransactionType[x.type]}</strong><div className="premium-muted">{new Date(x.createdAt).toLocaleString(i18n.language)}</div></div><strong>-{Math.abs(x.tokenAmount).toLocaleString()}</strong></div>) || <p className="premium-muted">{t('freelancerPremium.noTransactions')}</p>}</section></div>}
    {confirm && <div className="premium-modal" onClick={() => setConfirm(undefined)}><div className="premium-modal-box" onClick={e => e.stopPropagation()}><h2>{t('freelancerPremium.confirmVacationChange')}</h2><p className="premium-muted">{confirm.label || t(confirm.kind === 'vacation' ? 'freelancerPremium.confirmProtect' : 'freelancerPremium.confirmEnd', { date: endDate })}</p><div style={{ display: 'flex', gap: 10, marginTop: 20 }}><button className="premium-button secondary" onClick={() => setConfirm(undefined)}>{t('freelancerPremium.goBack')}</button><button className="premium-button" disabled={busy} onClick={() => void mutate()}>{t(busy ? 'freelancerPremium.submitting' : 'freelancerPremium.confirm')}</button></div></div></div>}
  </main></AppLayout>;
}

