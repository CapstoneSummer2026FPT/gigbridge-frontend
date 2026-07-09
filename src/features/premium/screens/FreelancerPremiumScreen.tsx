import { useCallback, useMemo, useState } from 'react';
import { CalendarDays, Crown, Megaphone, Shield, Sparkles, Wallet } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { premiumAPI } from '../api';
import { usePremiumResource } from '../hooks';
import { PremiumSubscriptionStatus, PromotionStatus, WalletTransactionType } from '../types';
import '../styles/premium.css';

type Tab = 'overview' | 'points' | 'vacation' | 'promotions' | 'history';
const formatDate = (value: string) => new Date(value).toLocaleDateString();

export default function FreelancerPremiumScreen() {
  const [tab, setTab] = useState<Tab>('overview');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState<{ kind: 'vacation' | 'cancelVacation' | 'promotion'; packageId?: string; label?: string }>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const idempotency = useMemo(() => new Map<string, string>(), []);
  const current = usePremiumResource(useCallback(premiumAPI.currentSubscription, []));
  const points = usePremiumResource(useCallback(premiumAPI.points, []));
  const vacation = usePremiumResource(useCallback(premiumAPI.rankProtection, []));
  const packages = usePremiumResource(useCallback(premiumAPI.promotionPackages, []));
  const promotion = usePremiumResource(useCallback(premiumAPI.currentPromotion, []));
  const promotions = usePremiumResource(useCallback(premiumAPI.promotionHistory, []));
  const wallet = usePremiumResource(useCallback(premiumAPI.wallet, []));
  const transactions = usePremiumResource(useCallback(premiumAPI.walletTransactions, []));
  const history = usePremiumResource(useCallback(premiumAPI.subscriptionHistory, []));
  const entitled = current.data && new Date(current.data.endDate) > new Date();

  const mutate = async () => {
    if (!confirm) return;
    setBusy(true); setMessage({});
    let response;
    if (confirm.kind === 'vacation') response = await premiumAPI.activateRankProtection(new Date(endDate + 'T23:59:59').toISOString(), reason);
    else if (confirm.kind === 'cancelVacation') response = await premiumAPI.cancelRankProtection();
    else {
      const key = confirm.packageId!;
      if (!idempotency.has(key)) idempotency.set(key, crypto.randomUUID());
      response = await premiumAPI.purchasePromotion(key, idempotency.get(key)!);
    }
    setBusy(false);
    if (!response.success) return setMessage({ error: response.message });
    if (confirm.kind === 'promotion') idempotency.delete(confirm.packageId!);
    setMessage({ success: response.message || 'Saved successfully.' }); setConfirm(undefined);
    await Promise.all([vacation.refresh(), promotion.refresh(), promotions.refresh(), wallet.refresh(), transactions.refresh()]);
  };

  const tabs: { id: Tab; label: string }[] = [{ id: 'overview', label: 'Overview' }, { id: 'points', label: 'Points & tier' }, { id: 'vacation', label: 'Vacation Mode' }, { id: 'promotions', label: 'Promotions' }, { id: 'history', label: 'History' }];
  const loading = current.loading || points.loading;

  return <AppLayout><main className="premium-shell">
    <section className="premium-hero"><div className="premium-eyebrow"><Crown size={16} /> Freelancer Premium</div><h1 className="premium-title">{entitled ? 'Your Premium command center' : 'Build your Premium edge'}</h1><p className="premium-muted">Track your tier, protect your rank, and manage profile promotion campaigns.</p></section>
    <div className="premium-tabs">{tabs.map(x => <button key={x.id} className={`premium-tab ${tab === x.id ? 'active' : ''}`} onClick={() => setTab(x.id)}>{x.label}</button>)}</div>
    {message.error && <div className="premium-error">{message.error}</div>}
    {message.success && <div className="premium-notice"><Sparkles size={18} />{message.success}</div>}
    {loading ? <div className="premium-grid"><div className="premium-skeleton" /><div className="premium-skeleton" /></div> :
      tab === 'overview' ? <div className="premium-grid">
        <section className="premium-card"><Crown color="#8b5cf6" /><h3>{current.data?.planName || 'Free plan'}</h3><p className="premium-muted">{entitled ? `Premium through ${formatDate(current.data!.endDate)}` : 'No active Premium entitlement'}</p><a href="/subscription" className="premium-button">{entitled ? 'Manage plan' : 'View plans'}</a></section>
        <section className="premium-card"><Sparkles color="#22d3ee" /><h3>{points.data?.eloPoints ?? 0} Elo</h3><p className="premium-muted">{points.data?.tierName || 'Tier unlocks with Premium'}</p><div className="premium-progress"><span style={{ width: `${Math.min(100, Number(points.data?.tierProgress || 0))}%` }} /></div></section>
        <section className="premium-card"><Shield color="#22c55e" /><h3>Vacation Mode</h3><p className="premium-muted">{vacation.data?.isEnabled ? `Protected until ${formatDate(vacation.data.endsAt)}` : 'Rank protection is off'}</p></section>
        <section className="premium-card"><Megaphone color="#f59e0b" /><h3>Profile promotion</h3><p className="premium-muted">{promotion.data ? `${promotion.data.packageName} active until ${formatDate(promotion.data.endsAt)}` : 'No active campaign'}</p></section>
      </div> :
      tab === 'points' ? <section className="premium-card"><h3>{points.data?.tierName || 'Elo points'} · {points.data?.eloPoints}</h3><p className="premium-muted">{points.data?.nextTierName ? `${points.data.nextTierThreshold! - points.data.eloPoints} points to ${points.data.nextTierName}` : 'You are at the highest configured tier.'}</p><div className="premium-progress"><span style={{ width: `${Math.min(100, Number(points.data?.tierProgress || 0))}%` }} /></div>{points.data?.recentTransactions?.length ? points.data.recentTransactions.map(x => <div className="premium-row" key={x.id}><div><strong>{x.sourceEntityType || `Activity ${x.reason}`}</strong><div className="premium-muted">{new Date(x.createdAt).toLocaleString()}</div></div><strong style={{ color: x.pointsDelta >= 0 ? '#22c55e' : '#ef4444' }}>{x.pointsDelta > 0 ? '+' : ''}{x.pointsDelta}</strong></div>) : <p className="premium-muted">No point activity yet.</p>}</section> :
      tab === 'vacation' ? <section className="premium-card"><CalendarDays color="#8b5cf6" /><h3>Vacation Mode</h3>{vacation.data?.isEnabled ? <><p className="premium-muted">Your rank is protected until {formatDate(vacation.data.endsAt)}.</p><button className="premium-button secondary" onClick={() => setConfirm({ kind: 'cancelVacation' })}>End Vacation Mode</button></> : <><p className="premium-muted">Choose an end date no later than your subscription expiry{current.data ? ` (${formatDate(current.data.endDate)})` : ''}.</p><input className="premium-input" type="date" min={new Date().toISOString().slice(0, 10)} max={current.data?.endDate.slice(0, 10)} value={endDate} onChange={e => setEndDate(e.target.value)} /><input className="premium-input" placeholder="Optional reason" value={reason} onChange={e => setReason(e.target.value)} /><button className="premium-button" disabled={!entitled || !endDate} onClick={() => setConfirm({ kind: 'vacation' })}>Activate Vacation Mode</button></>}</section> :
      tab === 'promotions' ? <><section className="premium-card" style={{ marginBottom: 16 }}><Wallet color="#22d3ee" /><h3>{wallet.data?.availableTokens?.toLocaleString() ?? '—'} available tokens</h3><p className="premium-muted">{promotion.data ? `Active: ${promotion.data.packageName}` : 'No promotion is currently active.'}</p></section><div className="premium-grid">{packages.data?.map(pkg => <section className="premium-card" key={pkg.id}><h3>{pkg.name}</h3><div className="premium-price">{pkg.tokenPrice.toLocaleString()} tokens</div><p className="premium-muted">{pkg.description}<br />{pkg.durationDays} days · {pkg.boostWeight}× boost</p><button className="premium-button" disabled={!entitled} onClick={() => setConfirm({ kind: 'promotion', packageId: pkg.id, label: `${pkg.name} for ${pkg.tokenPrice} tokens` })}>Purchase</button></section>)}</div><section className="premium-card" style={{ marginTop: 16 }}><h3>Campaign queue & history</h3>{promotions.data?.map(x => <div className="premium-row" key={x.id}><div><strong>{x.packageName}</strong><div className="premium-muted">{formatDate(x.startsAt)} – {formatDate(x.endsAt)}</div></div><span>{PromotionStatus[x.status]}</span></div>) || <p className="premium-muted">No campaigns yet.</p>}</section></> :
      <div className="premium-grid"><section className="premium-card"><h3>Subscriptions</h3>{history.data?.map(x => <div className="premium-row" key={x.id}><div><strong>{x.planName}</strong><div className="premium-muted">{formatDate(x.startDate)} – {formatDate(x.endDate)}</div></div><span>{PremiumSubscriptionStatus[x.status]}</span></div>) || <p className="premium-muted">No subscription history.</p>}</section><section className="premium-card"><h3>Premium wallet activity</h3>{transactions.data?.filter(x => x.type === WalletTransactionType.PromotionPurchase || x.type === WalletTransactionType.SubscriptionPurchase).map(x => <div className="premium-row" key={x.walletTransactionId}><div><strong>{WalletTransactionType[x.type]}</strong><div className="premium-muted">{new Date(x.createdAt).toLocaleString()}</div></div><strong>-{Math.abs(x.tokenAmount).toLocaleString()}</strong></div>) || <p className="premium-muted">No Premium transactions.</p>}</section></div>}
    {confirm && <div className="premium-modal" onClick={() => setConfirm(undefined)}><div className="premium-modal-box" onClick={e => e.stopPropagation()}><h2>Confirm {confirm.kind === 'promotion' ? 'token spend' : 'Vacation Mode change'}</h2><p className="premium-muted">{confirm.label || (confirm.kind === 'vacation' ? `Protect your rank through ${endDate}?` : 'End rank protection now?')}</p><div style={{ display: 'flex', gap: 10, marginTop: 20 }}><button className="premium-button secondary" onClick={() => setConfirm(undefined)}>Go back</button><button className="premium-button" disabled={busy} onClick={() => void mutate()}>{busy ? 'Submitting…' : 'Confirm'}</button></div></div></div>}
  </main></AppLayout>;
}

