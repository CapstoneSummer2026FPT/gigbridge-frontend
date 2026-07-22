import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Bot, BriefcaseBusiness, Crown, Scale, Sparkles, Target, WandSparkles } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { clientPremiumAPI } from '../api/premiumAPI';
import { PremiumStatusBadge } from '../components/PremiumStatusBadge';
import { JobPromotionStudio } from '../components/JobPromotionStudio';
import { PremiumTimeRemaining } from '../components/PremiumTimeRemaining';
import { usePremiumResource } from '../hooks';
import { PremiumSubscriptionStatus } from '../types';
import '../styles/premium.css';
import '../styles/auto-renew.css';

export default function ClientPremiumScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const current = usePremiumResource(useCallback(clientPremiumAPI.currentSubscription, []));
  const history = usePremiumResource(useCallback(clientPremiumAPI.subscriptionHistory, []));
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const entitled = Boolean(current.data?.isPremium && current.data.status === 0 && new Date(current.data.endDate) > new Date());

  useEffect(() => {
    if (location.hash === '#job-promotions') {
      window.setTimeout(() => document.getElementById('job-promotions')?.scrollIntoView({ behavior: 'smooth' }), 0);
    }
  }, [location.hash]);

  const updateAutoRenew = async (autoRenew: boolean) => {
    setBusy(true); setMessage({});
    const response = await clientPremiumAPI.updateAutoRenew(autoRenew);
    setBusy(false);
    if (!response.success) return setMessage({ error: response.message });
    setMessage({ success: autoRenew ? 'Automatic renewal is on.' : 'Automatic renewal is off.' });
    window.dispatchEvent(new Event('gigbridge-premium-updated'));
    await Promise.all([current.refresh(), history.refresh()]);
  };

  const cancelRenewal = async () => {
    setBusy(true); setMessage({});
    const response = await clientPremiumAPI.cancelSubscription();
    setBusy(false);
    if (!response.success) return setMessage({ error: response.message });
    setConfirmCancel(false);
    setMessage({ success: 'Renewal cancelled. Premium benefits stay active through the end date.' });
    window.dispatchEvent(new Event('gigbridge-premium-updated'));
    await Promise.all([current.refresh(), history.refresh()]);
  };

  const features = [
    { icon: <Target size={22} />, title: 'Smart talent matching', description: 'Rank eligible freelancers with transparent skills, category, reputation, and availability signals.', path: '/talent-matching', action: 'Find talent' },
    { icon: <WandSparkles size={22} />, title: 'AI job builder', description: 'Turn a hiring brief into a structured job draft, then review every field before publishing.', path: '/jobs/post/guide', action: 'Create a job' },
    { icon: <BriefcaseBusiness size={22} />, title: 'Promoted job posts', description: 'Use GigCoin to feature an open job and improve marketplace reach.', path: '/premium/client#job-promotions', action: 'Open promotion studio' },
    { icon: <Bot size={22} />, title: 'AI interview setup', description: 'Attach a structured text or voice interview to an open job and review candidate results.', path: '/jobs/my-jobs', action: 'Configure interviews' },
    { icon: <Scale size={22} />, title: 'Priority dispute handling', description: 'Client disputes automatically enter the Premium 24-hour priority queue with AI-assisted analysis.', path: '/contracts', action: 'View contracts' },
  ];

  return <AppLayout><main className="premium-shell">
    <section className="premium-hero">
      <div className="premium-eyebrow"><Crown size={16} /> Client Premium</div>
      <h1 className="premium-title">Your hiring intelligence hub.</h1>
      <p className="premium-muted">Use every Premium hiring capability from the workflow where it belongs, with clear status for both Standard and Premium clients.</p>
      <div className="premium-hero-actions">
        <PremiumStatusBadge active={entitled} />
        <button className="premium-button" onClick={() => navigate('/premium/client/pricing')}>{entitled ? 'Extend Premium' : 'Upgrade to Premium'}</button>
      </div>
    </section>

    {location.state?.purchased && <div className="premium-notice"><Sparkles size={18} />Client Premium is active. Your hiring tools are now unlocked.</div>}
    {message.error && <div className="premium-error">{message.error}</div>}
    {message.success && <div className="premium-notice"><Sparkles size={18} />{message.success}</div>}

    {(current.loading || history.loading) ? <div className="premium-grid"><div className="premium-skeleton" /><div className="premium-skeleton" /></div> :
      <div className="premium-grid">
        <section className="premium-card">
          <h3>{entitled ? current.data?.planName : 'Standard Client'}</h3>
          {entitled ? <PremiumTimeRemaining subscriptions={history.data?.length ? history.data : (current.data ? [current.data] : [])} /> : <p className="premium-muted">Core hiring tools remain available. Premium actions will guide you to upgrade.</p>}
          {entitled && <>
            <label className="premium-auto-renew"><input type="checkbox" checked={Boolean(current.data?.autoRenew)} disabled={busy} onChange={event => void updateAutoRenew(event.target.checked)} /><span>Automatic renewal</span></label>
            <p className="premium-muted premium-auto-renew-help">{current.data?.autoRenew ? 'Your plan renews automatically using GigCoin.' : 'Your access ends on the current end date unless renewed.'}</p>
            {current.data?.autoRenew && <button className="premium-button secondary" disabled={busy} onClick={() => setConfirmCancel(true)}>Cancel renewal</button>}
          </>}
        </section>
        <section className="premium-card">
          <Crown color="#8b5cf6" /><h3>{entitled ? 'All hiring tools unlocked' : 'Preview Premium capabilities'}</h3>
          <p className="premium-muted">Feature buttons remain visible for Standard clients, but protected actions require an active plan.</p>
        </section>
      </div>}

    <h2 style={{ margin: '30px 0 14px', fontSize: 24, fontWeight: 900 }}>Premium hiring tools</h2>
    <div className="premium-grid">
      {features.map(feature => <article className="premium-card premium-feature-card" key={feature.title}>
        <div className="premium-feature-icon">{feature.icon}</div><h3>{feature.title}</h3><p className="premium-muted">{feature.description}</p>
        <button className="premium-button" onClick={() => navigate(entitled ? feature.path : '/premium/client/pricing')}>{entitled ? feature.action : 'Unlock with Premium'}</button>
      </article>)}
    </div>

    {!!history.data?.length && <section className="premium-card" style={{ marginTop: 24 }}><h3>Subscription history</h3>{history.data.map(item => <div className="premium-row" key={item.id}><div><strong>{item.planName}</strong><div className="premium-muted">{new Date(item.startDate).toLocaleDateString()} – {new Date(item.endDate).toLocaleDateString()}</div></div><span>{PremiumSubscriptionStatus[item.status]}</span></div>)}</section>}

    {confirmCancel && <div className="premium-modal" onClick={() => setConfirmCancel(false)}><div className="premium-modal-box" onClick={event => event.stopPropagation()}><h2>Cancel automatic renewal?</h2><p className="premium-muted">Your Premium client benefits remain active through the current end date.</p><div className="premium-modal-actions"><button className="premium-button secondary" disabled={busy} onClick={() => setConfirmCancel(false)}>Keep renewal</button><button className="premium-button" disabled={busy} onClick={() => void cancelRenewal()}>{busy ? 'Cancelling…' : 'Confirm cancellation'}</button></div></div></div>}
    <section id="job-promotions" className="client-promotion-section">
      <div className="client-promotion-heading"><div><div className="premium-eyebrow"><BriefcaseBusiness size={16} /> Dedicated promotion manager</div><h2>Promote your open jobs</h2><p className="premium-muted">Design the card, crop its artwork, preview the final placement, and track active campaigns in one place.</p></div></div>
      <JobPromotionStudio entitled={entitled} />
    </section>
  </main></AppLayout>;
}
