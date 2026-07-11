import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, Check, Crown, Sparkles, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router';
import { AppLayout } from '../../../shared/components/AppLayout';
import { GigCoinAmount, GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import { premiumAPI } from '../api';
import { usePremiumResource } from '../hooks';
import type { SubscriptionPlan } from '../types';
import '../styles/premium.css';

const YEARLY_PROMOTION_PLAN_ID = '95000000-0000-0000-0000-000000000003';

const parseFeatures = (value?: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
    if (parsed && typeof parsed === 'object') return Object.entries(parsed)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()));
  } catch { /* text fallback */ }
  return value.split(/\r?\n|,/).map(x => x.trim()).filter(Boolean);
};

export default function FreelancerPricingScreen() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selected, setSelected] = useState<SubscriptionPlan>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const plans = usePremiumResource(useCallback(premiumAPI.plans, []));
  const current = usePremiumResource(useCallback(premiumAPI.currentSubscription, []));
  const wallet = usePremiumResource(useCallback(premiumAPI.wallet, []));
  const availablePlans = useMemo(() => {
    const configured = (plans.data || []).filter(plan => plan.price > 0);
    if (configured.some(plan => plan.billingPeriod === 'yearly' || plan.durationInDays >= 360)) return configured;
    const monthly = configured.find(plan => plan.billingPeriod === 'monthly' || plan.durationInDays < 360);
    if (!monthly) return configured;
    return [...configured, {
      ...monthly,
      id: YEARLY_PROMOTION_PLAN_ID,
      name: 'Freelancer Premium Yearly',
      description: 'A full year of Freelancer Premium with two months free',
      price: monthly.price * 10,
      durationInDays: 365,
      billingPeriod: 'yearly' as const,
      sortOrder: (monthly.sortOrder || 0) + 1,
    }];
  }, [plans.data]);
  const premiumPlans = useMemo(() => availablePlans.filter(plan =>
    (plan.billingPeriod || (plan.durationInDays >= 360 ? 'yearly' : 'monthly')) === period), [availablePlans, period]);
  const entitled = current.data?.isPremium && new Date(current.data.endDate) > new Date();

  const purchase = async () => {
    if (!selected) return;
    setBusy(true); setError(undefined);
    const response = await premiumAPI.purchaseSubscription(selected.id, crypto.randomUUID());
    setBusy(false);
    if (!response.success) return setError(response.message);
    window.dispatchEvent(new Event('gigbridge-wallet-updated'));
    navigate('/premium/freelancer', { replace: true, state: { purchased: true } });
  };

  return <AppLayout><main className="premium-shell premium-pricing-shell">
    <section className="premium-hero premium-pricing-hero">
      <div className="premium-eyebrow"><Crown size={16} /> Freelancer Premium</div>
      <h1 className="premium-title">Turn your reputation into an advantage.</h1>
      <p className="premium-muted">Unlock Elo tiers, rank protection, Premium identity, and profile promotion. Pay securely with GigCoin.</p>
      <div className="premium-balance"><Wallet size={18} /><span>Available balance</span><GigCoinAmount amount={wallet.data?.availableTokens || 0} /></div>
      {entitled && <button className="premium-button secondary" onClick={() => navigate('/premium/freelancer')}>Open Premium hub</button>}
    </section>

    <div className="premium-period-toggle" aria-label="Billing period">
      <button className={period === 'monthly' ? 'active' : ''} onClick={() => setPeriod('monthly')}>Monthly</button>
      <button className={period === 'yearly' ? 'active' : ''} onClick={() => setPeriod('yearly')}>Yearly <span>Save 2 months</span></button>
    </div>

    {(plans.error || wallet.error || error) && <div className="premium-error">{error || plans.error || wallet.error}</div>}
    {(plans.loading || wallet.loading) ? <div className="premium-grid"><div className="premium-skeleton" /><div className="premium-skeleton" /></div> :
      <div className="premium-grid premium-plan-grid">
        <article className="premium-card premium-free-card"><h3>Free</h3><div className="premium-price">0</div><p className="premium-muted">Core marketplace tools for getting started.</p><div className="premium-feature"><Check size={16} />Browse and apply to jobs</div><div className="premium-feature"><Check size={16} />Standard freelancer profile</div></article>
        {premiumPlans.map(plan => <article className="premium-card premium-plan-card" key={plan.id}>
          <div className="premium-eyebrow"><Sparkles size={14} /> Recommended</div><h3>{plan.name}</h3>
          <div className="premium-price gigcoin-price"><GigCoinAmount amount={plan.price} iconClassName="premium-price-coin" /></div>
          <p className="premium-muted">{plan.description}</p>{parseFeatures(plan.features).map(feature => <div className="premium-feature" key={feature}><Check size={16} color="#22c55e" />{feature}</div>)}
          <button className="premium-button" onClick={() => setSelected(plan)}>Top up {period} Premium</button>
        </article>)}
      </div>}

    <section className="premium-card premium-client-coming"><div><div className="premium-eyebrow">For clients</div><h3>Client Premium is coming later</h3><p className="premium-muted">Hiring-focused plans are being designed separately. No client purchase is available yet.</p></div><span className="premium-coming-badge">Coming soon</span></section>

    {selected && <div className="premium-modal" onClick={() => !busy && setSelected(undefined)}><div className="premium-modal-box" onClick={e => e.stopPropagation()}>
      <div className="premium-eyebrow"><GigCoinLogo size={18} /> Confirm GigCoin purchase</div><h2>{selected.name}</h2>
      <div className="premium-row"><span>Plan price</span><GigCoinAmount amount={selected.price} /></div><div className="premium-row"><span>Current balance</span><GigCoinAmount amount={wallet.data?.availableTokens || 0} /></div>
      {(wallet.data?.availableTokens || 0) < selected.price ? <div className="premium-notice"><AlertTriangle size={18} /><div><strong>Not enough GigCoin</strong><p className="premium-muted">Add GigCoin before purchasing this plan.</p></div></div> : <div className="premium-row"><span>Balance after purchase</span><GigCoinAmount amount={(wallet.data?.availableTokens || 0) - selected.price} /></div>}
      <div className="premium-modal-actions"><button className="premium-button secondary" disabled={busy} onClick={() => setSelected(undefined)}>Go back</button>{(wallet.data?.availableTokens || 0) < selected.price ? <button className="premium-button" onClick={() => navigate('/wallet/deposit')}>Get GigCoin</button> : <button className="premium-button" disabled={busy} onClick={() => void purchase()}>{busy ? 'Purchasing…' : 'Confirm purchase'}</button>}</div>
    </div></div>}
  </main></AppLayout>;
}
