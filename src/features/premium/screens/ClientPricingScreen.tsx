import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, Check, Crown, Sparkles, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router';
import { AppLayout } from '../../../shared/components/AppLayout';
import { GigCoinAmount, GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import { clientPremiumAPI } from '../api/premiumAPI';
import { usePremiumResource } from '../hooks';
import type { SubscriptionPlan } from '../types';
import '../styles/premium.css';

const parseFeatures = (value?: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
    if (parsed && typeof parsed === 'object') return Object.entries(parsed)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()));
  } catch { /* fall through to text plans */ }
  return value.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean);
};

export default function ClientPricingScreen() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selected, setSelected] = useState<SubscriptionPlan>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const plans = usePremiumResource(useCallback(clientPremiumAPI.plans, []));
  const current = usePremiumResource(useCallback(clientPremiumAPI.currentSubscription, []));
  const wallet = usePremiumResource(useCallback(clientPremiumAPI.wallet, []));
  const premiumPlans = useMemo(() => (plans.data || []).filter(plan =>
    (plan.billingPeriod || (plan.durationInDays >= 360 ? 'yearly' : 'monthly')) === period),
  [plans.data, period]);
  const entitled = Boolean(current.data?.isPremium && new Date(current.data.endDate) > new Date());

  const purchase = async () => {
    if (!selected) return;
    setBusy(true);
    setError(undefined);
    const response = await clientPremiumAPI.purchaseSubscription(selected.id, crypto.randomUUID());
    setBusy(false);
    if (!response.success) return setError(response.message);
    window.dispatchEvent(new Event('gigbridge-wallet-updated'));
    window.dispatchEvent(new Event('gigbridge-premium-updated'));
    navigate('/premium/client', { replace: true, state: { purchased: true } });
  };

  return <AppLayout><main className="premium-shell premium-pricing-shell">
    <section className="premium-hero premium-pricing-hero">
      <div className="premium-eyebrow"><Crown size={16} /> Client Premium</div>
      <h1 className="premium-title">Hire with better signals and less manual work.</h1>
      <p className="premium-muted">Unlock deterministic talent matching, AI-assisted hiring, promoted job posts, AI interviews, and priority dispute handling.</p>
      <div className="premium-balance"><Wallet size={18} /><span>Available balance</span><GigCoinAmount amount={wallet.data?.totalSpendableGigCoin || 0} /></div>
      {entitled && <button className="premium-button secondary" onClick={() => navigate('/premium/client')}>Open Premium hub</button>}
    </section>

    <div className="premium-period-toggle" aria-label="Billing period">
      <button className={period === 'monthly' ? 'active' : ''} onClick={() => setPeriod('monthly')}>Monthly</button>
      <button className={period === 'yearly' ? 'active' : ''} onClick={() => setPeriod('yearly')}>Yearly <span>Best value</span></button>
    </div>

    {(plans.error || wallet.error || error) && <div className="premium-error">{error || plans.error || wallet.error}</div>}
    {(plans.loading || wallet.loading) ? <div className="premium-grid"><div className="premium-skeleton" /><div className="premium-skeleton" /></div> :
      <div className="premium-grid premium-plan-grid">
        <article className="premium-card premium-free-card">
          <h3>Standard Client</h3><div className="premium-price">0</div>
          <p className="premium-muted">Post jobs, review proposals, manage contracts, and hire through the core marketplace.</p>
          <div className="premium-feature"><Check size={16} />Core job and contract workflows</div>
          <div className="premium-feature"><Check size={16} />Manual freelancer discovery</div>
        </article>
        {premiumPlans.map(plan => <article className="premium-card premium-plan-card" key={plan.id}>
          <div className="premium-eyebrow"><Sparkles size={14} /> Hiring intelligence</div>
          <h3>{plan.name}</h3>
          <div className="premium-price gigcoin-price"><GigCoinAmount amount={plan.price} iconClassName="premium-price-coin" /></div>
          <p className="premium-muted">{plan.description}</p>
          {parseFeatures(plan.features).map(feature => <div className="premium-feature" key={feature}><Check size={16} color="#22c55e" />{feature}</div>)}
          <button className="premium-button" onClick={() => setSelected(plan)}>{entitled ? 'Extend' : 'Choose'} {period} Premium</button>
        </article>)}
        {!premiumPlans.length && <article className="premium-card"><h3>No {period} plan available</h3><p className="premium-muted">An administrator has not published this billing option yet.</p></article>}
      </div>}

    {selected && <div className="premium-modal" onClick={() => !busy && setSelected(undefined)}><div className="premium-modal-box" onClick={event => event.stopPropagation()}>
      <div className="premium-eyebrow"><GigCoinLogo size={18} /> Confirm GigCoin purchase</div>
      <h2>{selected.name}</h2>
      <div className="premium-row"><span>Plan price</span><GigCoinAmount amount={selected.price} /></div>
      <div className="premium-row"><span>Current balance</span><GigCoinAmount amount={wallet.data?.totalSpendableGigCoin || 0} /></div>
      {(wallet.data?.totalSpendableGigCoin || 0) < selected.price ? <div className="premium-notice"><AlertTriangle size={18} /><div><strong>Not enough GigCoin</strong><p className="premium-muted">Add GigCoin before purchasing this plan.</p></div></div> : <div className="premium-row"><span>Balance after purchase</span><GigCoinAmount amount={(wallet.data?.totalSpendableGigCoin || 0) - selected.price} /></div>}
      <div className="premium-modal-actions"><button className="premium-button secondary" disabled={busy} onClick={() => setSelected(undefined)}>Go back</button>{(wallet.data?.totalSpendableGigCoin || 0) < selected.price ? <button className="premium-button" onClick={() => navigate('/wallet/deposit')}>Get GigCoin</button> : <button className="premium-button" disabled={busy} onClick={() => void purchase()}>{busy ? 'Purchasing…' : 'Confirm purchase'}</button>}</div>
    </div></div>}
  </main></AppLayout>;
}
