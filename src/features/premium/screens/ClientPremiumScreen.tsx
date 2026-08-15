import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowRight, Bot, BriefcaseBusiness, CheckCircle2, Crown,
  Megaphone, Sparkles, Target, WandSparkles, Zap
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useTranslation } from '../../../hooks/useTranslation';
import { clientPremiumAPI } from '../api/premiumAPI';
import { JobPromotionStudio } from '../components/JobPromotionStudio';
import { PremiumTimeRemaining } from '../components/PremiumTimeRemaining';
import { usePremiumResource } from '../hooks';
import { PremiumSubscriptionStatus } from '../types';
import '../styles/client-pricing-screen.css';
import '../styles/auto-renew.css';

type Tab = 'overview' | 'aiBuilder' | 'promotions' | 'talentMatching' | 'interviews' | 'history';

export default function ClientPremiumScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('premium');

  const [tab, setTab] = useState<Tab>('overview');
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});

  const current = usePremiumResource(useCallback(clientPremiumAPI.currentSubscription, []));
  const history = usePremiumResource(useCallback(clientPremiumAPI.subscriptionHistory, []));
  const entitled = Boolean(current.data?.isPremium && current.data.status === 0 && new Date(current.data.endDate) > new Date());

  useEffect(() => {
    const stateTab = (location.state as { activeTab?: Tab } | null)?.activeTab;
    if (stateTab) {
      setTab(stateTab);
    } else if (location.hash === '#job-promotions' || location.hash === '#promotions') {
      setTab('promotions');
    }
  }, [location.hash, location.state]);

  const updateAutoRenew = async (autoRenew: boolean) => {
    setBusy(true); setMessage({});
    const response = await clientPremiumAPI.updateAutoRenew(autoRenew);
    setBusy(false);
    if (!response.success) return setMessage({ error: response.message });
    setMessage({ success: t(autoRenew ? 'clientPremium.autoRenewOn' : 'clientPremium.autoRenewOff') });
    window.dispatchEvent(new Event('gigbridge-premium-updated'));
    await Promise.all([current.refresh(), history.refresh()]);
  };

  const cancelRenewal = async () => {
    setBusy(true); setMessage({});
    const response = await clientPremiumAPI.cancelSubscription();
    setBusy(false);
    if (!response.success) return setMessage({ error: response.message });
    setConfirmCancel(false);
    setMessage({ success: t('clientPremium.cancelSuccess') });
    window.dispatchEvent(new Event('gigbridge-premium-updated'));
    await Promise.all([current.refresh(), history.refresh()]);
  };

  const tabItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',       label: t('clientPremium.tabs.overview'),       icon: <Crown size={15} /> },
    { id: 'aiBuilder',      label: t('clientPremium.tabs.aiBuilder'),      icon: <WandSparkles size={15} /> },
    { id: 'promotions',     label: t('clientPremium.tabs.promotions'),     icon: <Megaphone size={15} /> },
    { id: 'talentMatching', label: t('clientPremium.tabs.talentMatching'), icon: <Target size={15} /> },
    { id: 'interviews',     label: t('clientPremium.tabs.interviews'),     icon: <Bot size={15} /> },
    { id: 'history',        label: t('clientPremium.tabs.history'),        icon: <BriefcaseBusiness size={15} /> },
  ];

  return (
    <AppLayout>
      <main className="cp-shell">

        {/* ══════════════════════════════════════
            HERO BANNER (Awwwards Editorial Style)
        ══════════════════════════════════════ */}
        <section className="cp-hero">
          <div className="cp-hero-eyebrow">
            <span className="cp-hero-eyebrow-dot" />
            {t('clientPremium.name')}
          </div>
          <h1 className="cp-hero-headline">
            {t('clientPremium.title')}
          </h1>
          <p className="cp-hero-sub">
            {t('clientPremium.subtitle')}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button className="cp-btn" onClick={() => navigate('/premium/client/pricing')}>
              <Zap size={14} />
              {entitled ? t('clientPremium.extend') : t('clientPremium.upgrade')}
            </button>
          </div>
        </section>

        {location.state?.purchased && (
          <div className="cp-hero-eyebrow" style={{ color: '#10b981', marginTop: 16 }}>
            <Sparkles size={16} /> {t('clientPremium.activeNotice')}
          </div>
        )}
        {message.error && (
          <div style={{ color: '#ef4444', padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,68,68,.08)', margin: '16px 0', fontSize: 13 }}>
            {message.error}
          </div>
        )}
        {message.success && (
          <div style={{ color: '#10b981', padding: '12px 16px', borderRadius: '12px', background: 'rgba(16,185,129,.08)', margin: '16px 0', fontSize: 13 }}>
            {message.success}
          </div>
        )}

        {/* RESTRAINED EDITORIAL TABS */}
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

        {/* ══════════════════════════════════════
            TAB 1: OVERVIEW (Editorial Dashboard)
        ══════════════════════════════════════ */}
        {tab === 'overview' && (
          <div>

            {/* SUBSCRIPTION CONTROL CARD (HIGH END EDITORIAL PLAN CARD) */}
            <div style={{ padding: '36px 0', borderBottom: '1px solid var(--cp-border)' }}>
              <p className="cp-section-eyebrow"><Crown size={13} /> Active Plan Status</p>

              {(current.loading || history.loading) ? (
                <div style={{ height: 260, borderRadius: 24, background: 'var(--card)', opacity: 0.5 }} />
              ) : (
                <article className="cp-plan-prem" style={{ margin: 0, padding: 36 }}>
                  <div className="cp-plan-prem-orb" aria-hidden />

                  <div className="cp-plan-prem-top">
                    <div className="cp-plan-prem-badge">
                      <Sparkles size={12} /> {entitled ? 'Active Subscription' : 'Standard Account'}
                    </div>
                    <div className="cp-plan-prem-tier">
                      <Crown size={14} /> {entitled ? (current.data?.planName || 'Client Premium') : t('clientPremium.standardTitle')}
                    </div>
                  </div>

                  <div className="cp-plan-prem-headline">
                    {entitled ? 'Client Premium Velocity Suite' : 'Standard Hiring Mode'}
                  </div>

                  {entitled ? (
                    <PremiumTimeRemaining subscriptions={history.data?.length ? history.data : (current.data ? [current.data] : [])} />
                  ) : (
                    <p className="cp-plan-std-desc" style={{ fontSize: 14, margin: '16px 0 24px' }}>
                      {t('clientPremium.standardSub')}
                    </p>
                  )}

                  {entitled ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderTop: '1px solid var(--cp-border)', paddingTop: 20, marginTop: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <label className={`cp-toggle ${Boolean(current.data?.autoRenew) ? '' : 'off'}`} title="Tự động gia hạn gói Client Premium">
                          <input
                            type="checkbox"
                            checked={Boolean(current.data?.autoRenew)}
                            disabled={busy}
                            onChange={e => void updateAutoRenew(e.target.checked)}
                          />
                          <span className="cp-slider" />
                        </label>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: 'var(--cp-text)' }}>
                            <span>{t('clientPremium.autoRenewLabel')}</span>
                            {Boolean(current.data?.autoRenew) ? (
                              <span style={{ fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 999, background: 'rgba(16,185,129,0.15)', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                ACTIVE ✦
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 999, background: 'rgba(99,102,241,0.15)', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                RECOMMENDED
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--cp-muted)', marginTop: 2, fontWeight: 600 }}>
                            {current.data?.autoRenew
                              ? 'Tự động gia hạn đang bật — Đảm bảo bài ghim Top #1 & phỏng vấn AI luôn hoạt động liên tục.'
                              : 'Bật tự động gia hạn để duy trì bài đăng vị trí Top #1 và công cụ phỏng vấn AI không bị gián đoạn.'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                        {current.data?.autoRenew && (
                          <button className="cp-btn ghost" style={{ padding: '8px 16px', fontSize: 12 }} disabled={busy} onClick={() => setConfirmCancel(true)}>
                            {t('clientPremium.cancelRenewalBtn')}
                          </button>
                        )}
                        <button className="cp-btn" style={{ padding: '8px 18px', fontSize: 12 }} onClick={() => navigate('/premium/client/pricing')}>
                          <Zap size={14} /> {t('clientPremium.extend')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderTop: '1px solid var(--cp-border)', paddingTop: 16, marginTop: 12 }}>
                      <div className="cp-plan-std-desc" style={{ margin: 0 }}>
                        Upgrade to Client Premium to unlock top-pinned listings, AI screeners &amp; 3D Neon badge.
                      </div>
                      <button className="cp-btn" onClick={() => navigate('/premium/client/pricing')}>
                        <Zap size={14} /> {t('clientPremium.upgrade')}
                      </button>
                    </div>
                  )}
                </article>
              )}
            </div>

            {/* CORE RECRUITING SUPERPOWERS (4 TOOLS) */}
            <div style={{ padding: '36px 0' }}>
              <p className="cp-section-eyebrow"><Sparkles size={13} /> {t('clientPremium.suiteEyebrow', { defaultValue: 'Recruiting Suite' })}</p>
              <h2 className="cp-section-headline" style={{ marginBottom: 28 }}>{t('clientPremium.fourCoreTools', { defaultValue: 'Four Core Superpower Tools' })}</h2>

              <div className="cp-tools-grid-4">
                {/* TOOL 1: AI JOB BUILDER */}
                <article className="cp-tool-card cp-tool-indigo" onClick={() => setTab('aiBuilder')}>
                  <div className="cp-tool-glow" />
                  <div className="cp-tool-top">
                    <div className="cp-tool-icon icon-indigo"><WandSparkles size={20} /></div>
                    <span className="cp-tool-badge badge-indigo">
                      <Sparkles size={10} /> AI GENERATOR
                    </span>
                  </div>
                  <h3 className="cp-tool-title">{t('clientPremium.tools.aiGenerator.title', { defaultValue: 'AI Job Post Generator' })}</h3>
                  <p className="cp-tool-desc">
                    {t('clientPremium.tools.aiGenerator.desc', { defaultValue: 'AI drafts descriptions, milestone breakdowns, and skill tags in seconds.' })}
                  </p>
                  <button className="cp-tool-action" onClick={(e) => { e.stopPropagation(); setTab('aiBuilder'); }}>
                    <span>{t('clientPremium.tools.aiGenerator.action', { defaultValue: 'Launch AI Generator' })}</span>
                    <ArrowRight size={14} className="cp-tool-arrow" />
                  </button>
                </article>

                {/* TOOL 2: FEATURED JOB PROMOTION */}
                <article className="cp-tool-card cp-tool-amber" onClick={() => setTab('promotions')}>
                  <div className="cp-tool-glow" />
                  <div className="cp-tool-top">
                    <div className="cp-tool-icon icon-amber"><Megaphone size={20} /></div>
                    <span className="cp-tool-badge badge-amber">
                      <Crown size={10} /> TOP #1 BOOST
                    </span>
                  </div>
                  <h3 className="cp-tool-title">{t('clientPremium.tools.jobPromotion.title', { defaultValue: 'Featured Job Promotion' })}</h3>
                  <p className="cp-tool-desc">
                    {t('clientPremium.tools.jobPromotion.desc', { defaultValue: 'Pin your job post to position #1 with a 3D Gold border to get 3.8× candidate responses.' })}
                  </p>
                  <button className="cp-tool-action" onClick={(e) => { e.stopPropagation(); setTab('promotions'); }}>
                    <span>{t('clientPremium.tools.jobPromotion.action', { defaultValue: 'Open Studio' })}</span>
                    <ArrowRight size={14} className="cp-tool-arrow" />
                  </button>
                </article>

                {/* TOOL 3: SMART TALENT MATCHING */}
                <article className="cp-tool-card cp-tool-emerald" onClick={() => setTab('talentMatching')}>
                  <div className="cp-tool-glow" />
                  <div className="cp-tool-top">
                    <div className="cp-tool-icon icon-emerald"><Target size={20} /></div>
                    <span className="cp-tool-badge badge-emerald">
                      <Sparkles size={10} /> 90%+ MATCH
                    </span>
                  </div>
                  <h3 className="cp-tool-title">{t('clientPremium.tools.talentMatching.title', { defaultValue: 'Smart Talent Matching' })}</h3>
                  <p className="cp-tool-desc">
                    {t('clientPremium.tools.talentMatching.desc', { defaultValue: 'Auto-highlight the top 5% matched freelancers by Major, verified skills, and Elo rank.' })}
                  </p>
                  <button className="cp-tool-action" onClick={(e) => { e.stopPropagation(); setTab('talentMatching'); }}>
                    <span>{t('clientPremium.tools.talentMatching.action', { defaultValue: 'Match Candidates' })}</span>
                    <ArrowRight size={14} className="cp-tool-arrow" />
                  </button>
                </article>

                {/* TOOL 4: AI INTERVIEW SCREENERS */}
                <article className="cp-tool-card cp-tool-cyan" onClick={() => setTab('interviews')}>
                  <div className="cp-tool-glow" />
                  <div className="cp-tool-top">
                    <div className="cp-tool-icon icon-cyan"><Bot size={20} /></div>
                    <span className="cp-tool-badge badge-cyan">
                      <Bot size={10} /> AUTO SCREEN
                    </span>
                  </div>
                  <h3 className="cp-tool-title">{t('clientPremium.tools.interviews.title', { defaultValue: 'AI Interview Screeners' })}</h3>
                  <p className="cp-tool-desc">
                    {t('clientPremium.tools.interviews.desc', { defaultValue: 'Automated Q&A screening bot interviews applicants and provides scored transcript summaries.' })}
                  </p>
                  <button className="cp-tool-action" onClick={(e) => { e.stopPropagation(); setTab('interviews'); }}>
                    <span>{t('clientPremium.tools.interviews.action', { defaultValue: 'Manage Screeners' })}</span>
                    <ArrowRight size={14} className="cp-tool-arrow" />
                  </button>
                </article>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 2: AI BUILDER (MOVED UP)
        ══════════════════════════════════════ */}
        {tab === 'aiBuilder' && (
          <section className="cp-studio-box">
            <div className="cp-card-header" style={{ marginBottom: 20 }}>
              <div className="cp-card-icon"><WandSparkles size={24} /></div>
              <div>
                <h2 className="cp-card-title" style={{ fontSize: 22 }}>AI Job Post Generator</h2>
                <p className="cp-card-body" style={{ margin: 0 }}>Turn hiring briefs into high-converting, structured job listings in seconds.</p>
              </div>
            </div>
            <div style={{ padding: '20px 24px', borderRadius: 16, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#6366f1', marginBottom: 8, fontSize: 13 }}>
                <Sparkles size={16} /> AI Assistant Active
              </div>
              <p style={{ fontSize: 13, color: 'var(--cp-muted)', lineHeight: 1.6, margin: 0 }}>
                Type a title or brief summary. The AI generator produces structured descriptions, required major criteria, skill tags, milestones, and competitive budget recommendations.
              </p>
            </div>
            <button className="cp-btn" onClick={() => navigate(entitled ? '/jobs/post/guide' : '/premium/client/pricing')}>
              {entitled ? 'Create Job with AI Generator' : 'Unlock AI Generator with Premium'} <ArrowRight size={14} />
            </button>
          </section>
        )}

        {/* ══════════════════════════════════════
            TAB 3: PROMOTIONS STUDIO
        ══════════════════════════════════════ */}
        {tab === 'promotions' && (
          <section id="job-promotions" className="cp-studio-box">
            <div style={{ marginBottom: 24 }}>
              <p className="cp-section-eyebrow"><BriefcaseBusiness size={13} /> Dedicated Studio</p>
              <h2 className="cp-section-headline" style={{ marginBottom: 12 }}>Promote Your Open Jobs</h2>
              <p className="cp-hero-sub" style={{ margin: 0 }}>
                Design featured job cards, crop artwork, preview the live 2:3 card format, and pin your listings to position #1.
              </p>
            </div>
            <JobPromotionStudio entitled={entitled} />
          </section>
        )}

        {/* ══════════════════════════════════════
            TAB 4: TALENT MATCHING
        ══════════════════════════════════════ */}
        {tab === 'talentMatching' && (
          <section className="cp-studio-box">
            <div className="cp-card-header" style={{ marginBottom: 20 }}>
              <div className="cp-card-icon"><Target size={24} /></div>
              <div>
                <h2 className="cp-card-title" style={{ fontSize: 22 }}>Smart AI Talent Matching</h2>
                <p className="cp-card-body" style={{ margin: 0 }}>Auto-screen freelancers by Major, verified skills, contract outcomes &amp; Elo rank.</p>
              </div>
            </div>
            <div style={{ padding: '20px 24px', borderRadius: 16, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#10b981', marginBottom: 8, fontSize: 13 }}>
                <CheckCircle2 size={16} /> Matching Engine Active
              </div>
              <p style={{ fontSize: 13, color: 'var(--cp-muted)', lineHeight: 1.6, margin: 0 }}>
                Our algorithm cross-references candidate verified skill badges and Elo ratings against your active job specs, presenting you with candidates matching 90%+ compatibility.
              </p>
            </div>
            <button className="cp-btn" onClick={() => navigate(entitled ? '/talent-matching' : '/premium/client/pricing')}>
              {entitled ? 'Open Smart Talent Matcher' : 'Unlock Talent Matcher with Premium'} <ArrowRight size={14} />
            </button>
          </section>
        )}

        {/* ══════════════════════════════════════
            TAB 5: INTERVIEWS
        ══════════════════════════════════════ */}
        {tab === 'interviews' && (
          <section className="cp-studio-box">
            <div className="cp-card-header" style={{ marginBottom: 20 }}>
              <div className="cp-card-icon"><Bot size={24} /></div>
              <div>
                <h2 className="cp-card-title" style={{ fontSize: 22 }}>Automated AI Interview Screeners</h2>
                <p className="cp-card-body" style={{ margin: 0 }}>Define custom AI screening Q&amp;A to automatically interview candidates upon application.</p>
              </div>
            </div>
            <div style={{ padding: '20px 24px', borderRadius: 16, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#6366f1', marginBottom: 8, fontSize: 13 }}>
                <Bot size={16} /> AI Bot Screener Active
              </div>
              <p style={{ fontSize: 13, color: 'var(--cp-muted)', lineHeight: 1.6, margin: 0 }}>
                Attach AI interview definitions to your open jobs. As freelancers apply, the bot conducts instant interactive Q&amp;A sessions and delivers scored transcript summaries before you schedule live calls.
              </p>
            </div>
            <button className="cp-btn" onClick={() => navigate(entitled ? '/jobs/my-jobs' : '/premium/client/pricing')}>
              {entitled ? 'Configure Job AI Interviews' : 'Unlock AI Screener with Premium'} <ArrowRight size={14} />
            </button>
          </section>
        )}

        {/* ══════════════════════════════════════
            TAB 6: HISTORY
        ══════════════════════════════════════ */}
        {tab === 'history' && (
          <section className="cp-studio-box">
            <h2 className="cp-card-title" style={{ fontSize: 22, marginBottom: 20 }}>{t('clientPremium.subscriptionHistory')}</h2>
            {history.data?.length ? (
              <table className="cp-compare-table">
                <thead>
                  <tr>
                    <th>Plan Name</th>
                    <th>Period</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 800 }}>{item.planName}</td>
                      <td style={{ color: 'var(--cp-muted)' }}>{new Date(item.startDate).toLocaleDateString()} – {new Date(item.endDate).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800 }}>{PremiumSubscriptionStatus[item.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="cp-card-body">No subscription history found.</p>
            )}
          </section>
        )}

        {/* CONFIRM CANCEL MODAL */}
        {confirmCancel && (
          <div className="cp-modal-overlay" onClick={() => setConfirmCancel(false)}>
            <div className="cp-modal-box" onClick={e => e.stopPropagation()}>
              <h2>{t('clientPremium.cancelConfirmTitle')}</h2>
              <p className="cp-card-body">{t('clientPremium.cancelConfirmSub')}</p>
              <div className="cp-modal-actions">
                <button className="cp-btn ghost" disabled={busy} onClick={() => setConfirmCancel(false)}>
                  {t('clientPremium.keepRenewal')}
                </button>
                <button className="cp-btn" disabled={busy} onClick={() => void cancelRenewal()}>
                  {busy ? 'Cancelling…' : t('clientPremium.confirmCancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
