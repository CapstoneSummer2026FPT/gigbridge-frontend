import { useCallback } from 'react';
import { Bot, Crown, Search, Sparkles, Star } from 'lucide-react';
import { useNavigate } from 'react-router';
import { AppLayout } from '../../../shared/components/AppLayout';
import { clientPremiumAPI } from '../api';
import { usePremiumResource } from '../hooks';
import '../styles/premium.css';

export default function ClientPremiumScreen() {
  const navigate = useNavigate();
  const current = usePremiumResource(useCallback(clientPremiumAPI.currentSubscription, []));
  const subscription = current.data;
  const active = Boolean(subscription?.isPremium && new Date(subscription.endDate) > new Date());

  return <AppLayout><main className="premium-shell">
    <section className="premium-hero"><div className="premium-eyebrow"><Crown size={16}/>Client Premium</div><h1 className="premium-title">Hire faster with a smarter shortlist.</h1><p className="premium-muted">Generate stronger job posts, promote open roles, rank matching freelancers, create AI interviews, and receive fast-track dispute priority.</p>{active ? <div className="premium-notice"><Sparkles size={20}/><div><strong>{subscription?.planName} is active</strong><div className="premium-muted">Premium access through {new Date(subscription!.endDate).toLocaleDateString()}.</div></div></div> : <button className="premium-button" onClick={() => navigate('/premium/client/pricing')}>Become Premium</button>}</section>
    {current.loading && <div className="premium-grid"><div className="premium-skeleton"/></div>}{current.error && <div className="premium-error">{current.error}</div>}
    <section className="premium-grid" style={{marginTop:20}}>
      <article className="premium-card"><Star size={22}/><h3>Promote job posts</h3><p className="premium-muted">Feature open roles using GigCoin and reach candidates sooner.</p><button className="premium-button secondary" onClick={() => navigate('/jobs/my-jobs')}>Choose a job</button></article>
      <article className="premium-card"><Search size={22}/><h3>Smart talent matching</h3><p className="premium-muted">Rank current freelancer profiles against each job’s skills.</p><button className="premium-button secondary" onClick={() => navigate('/talent-matching')}>Find talent</button></article>
      <article className="premium-card"><Bot size={22}/><h3>AI hiring tools</h3><p className="premium-muted">Generate editable job posts and job-specific interview definitions.</p><button className="premium-button secondary" onClick={() => navigate('/jobs/post')}>Create a job</button></article>
    </section>
    {active && <button className="premium-button" style={{marginTop:20}} onClick={() => navigate('/premium/client/pricing')}>Extend Premium</button>}
  </main></AppLayout>;
}
