import { useCallback, useState } from 'react';
import { AlertTriangle, Check, Crown, RefreshCw } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { premiumAPI } from '../../premium/api';
import { usePremiumResource } from '../../premium/hooks';
import { PremiumSubscriptionStatus } from '../../premium/types';
import '../../premium/styles/premium.css';

const parseFeatures = (value?: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch { /* backend may provide newline/comma text */ }
  return value.split(/\r?\n|,/).map(x => x.trim()).filter(Boolean);
};

export default function SubscriptionScreen() {
  const { role } = useApp();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const plans = usePremiumResource(useCallback(premiumAPI.plans, []));
  const current = usePremiumResource(useCallback(premiumAPI.currentSubscription, []));
  const history = usePremiumResource(useCallback(premiumAPI.subscriptionHistory, []));
  const subscription = current.data;
  const entitled = subscription && new Date(subscription.endDate) > new Date();

  const cancel = async () => {
    setSubmitting(true);
    setActionError(undefined);
    const result = await premiumAPI.cancelSubscription();
    setSubmitting(false);
    if (!result.success) return setActionError(result.message);
    setConfirmCancel(false);
    await Promise.all([current.refresh(), history.refresh()]);
  };

  return (
    <AppLayout>
      <main className="premium-shell">
        <section className="premium-hero">
          <div className="premium-eyebrow"><Crown size={16} /> GigBridge Premium</div>
          <h1 className="premium-title">Work with more reach and less friction.</h1>
          <p className="premium-muted">Live plan benefits and subscription status, directly from your account.</p>
          <div className="premium-notice">
            <AlertTriangle size={20} color="#f59e0b" />
            <div><strong>Payments are not available yet.</strong><div className="premium-muted">Purchases and yearly upgrades will open after the payment contract is approved.</div></div>
          </div>
          {role === 1 && entitled && <a className="premium-button" href="/freelancer/premium">Open Premium hub</a>}
        </section>

        {(plans.loading || current.loading) && <div className="premium-grid"><div className="premium-skeleton" /><div className="premium-skeleton" /></div>}
        {(plans.error || current.error) && <div className="premium-error">{plans.error || current.error} <button className="premium-button secondary" onClick={() => { void plans.refresh(); void current.refresh(); }}><RefreshCw size={14} /> Retry</button></div>}

        {!plans.loading && !current.loading && (
          <div className="premium-grid">
            <article className="premium-card">
              <h3>Free</h3><div className="premium-price">0</div>
              <p className="premium-muted">Core GigBridge tools for getting started.</p>
              <button className="premium-button secondary" disabled={!subscription}>Current plan</button>
            </article>
            {(plans.data || []).map(plan => (
              <article className="premium-card" key={plan.id}>
                <div className="premium-eyebrow"><Crown size={14} /> Premium</div>
                <h3>{plan.name}</h3>
                <div className="premium-price">{plan.price.toLocaleString()} {plan.currency}</div>
                <p className="premium-muted">{plan.description}</p>
                {parseFeatures(plan.features).map(feature => <div className="premium-feature" key={feature}><Check size={16} color="#22c55e" />{feature}</div>)}
                <button className="premium-button" disabled title="Payment integration pending">Purchase unavailable</button>
              </article>
            ))}
            {!plans.data?.length && <article className="premium-card"><h3>No plans available</h3><p className="premium-muted">Plan configuration has not been published yet.</p></article>}
          </div>
        )}

        {subscription && (
          <section className="premium-card" style={{ marginTop: 20 }}>
            <div className="premium-row"><div><h3>Your subscription</h3><p className="premium-muted">{subscription.planName}</p></div><span className="badge-purple">{PremiumSubscriptionStatus[subscription.status]}</span></div>
            <div className="premium-row"><span>Entitled until</span><strong>{new Date(subscription.endDate).toLocaleDateString()}</strong></div>
            <div className="premium-row"><span>Renewal</span><strong>{subscription.autoRenew ? 'Automatic' : 'Cancelled'}</strong></div>
            {subscription.autoRenew && <button className="premium-button secondary" onClick={() => setConfirmCancel(true)}>Cancel renewal</button>}
            {actionError && <p className="premium-error">{actionError}</p>}
          </section>
        )}

        {!!history.data?.length && <section className="premium-card" style={{ marginTop: 20 }}><h3>Subscription history</h3>{history.data.map(item => <div className="premium-row" key={item.id}><div><strong>{item.planName}</strong><div className="premium-muted">{new Date(item.startDate).toLocaleDateString()} – {new Date(item.endDate).toLocaleDateString()}</div></div><span>{PremiumSubscriptionStatus[item.status]}</span></div>)}</section>}
      </main>
      {confirmCancel && <div className="premium-modal" onClick={() => setConfirmCancel(false)}><div className="premium-modal-box" onClick={e => e.stopPropagation()}><h2>Cancel automatic renewal?</h2><p className="premium-muted">Your Premium benefits remain active through the current end date.</p><div style={{ display: 'flex', gap: 10, marginTop: 20 }}><button className="premium-button secondary" onClick={() => setConfirmCancel(false)}>Keep renewal</button><button className="premium-button" disabled={submitting} onClick={() => void cancel()}>{submitting ? 'Cancelling…' : 'Confirm cancellation'}</button></div></div></div>}
    </AppLayout>
  );
}
