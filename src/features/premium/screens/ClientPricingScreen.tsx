import { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Bot, Check, ChevronDown, Crown, Flame,
  FileText, HelpCircle, Megaphone, ShieldCheck, Sparkles, Target,
  Wallet, X, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { AppLayout } from '../../../shared/components/AppLayout';
import { GigCoinAmount, GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { clientPremiumAPI } from '../api/premiumAPI';
import { usePremiumResource } from '../hooks';
import type { SubscriptionPlan } from '../types';
import '../styles/client-pricing-screen.css';

const YEARLY_PROMO_PLAN_ID = '96000000-0000-0000-0000-000000000003';

const parseFeatures = (value?: string | null): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
    if (parsed && typeof parsed === 'object')
      return Object.entries(parsed)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
  } catch { /* text fallback */ }
  return value.split(/\r?\n|,/).map(x => x.trim()).filter(Boolean);
};

const CLIENT_FAQS = [
  {
    q: 'How does the AI Job Post Generator work?',
    a: 'Simply type a short title or summary, and our AI instantly drafts a structured, high-converting job post complete with required skill tags, major requirements, milestones, and competitive budget recommendations.',
  },
  {
    q: 'What is Featured Job Promotion?',
    a: 'Client Premium job listings are pinned to the top of freelancer search feeds with a distinct 3D Neon Gold border and priority badge, driving up to 3.8x faster application rates.',
  },
  {
    q: 'How does Smart Talent Matching work?',
    a: 'Our engine reads candidate majors, verified skill badges, Elo rank tier, and past project history, automatically screening and highlighting the top 5% matched talent for your job.',
  },
  {
    q: 'What are AI Interview Definitions and Results?',
    a: 'You define custom interview questions or evaluation criteria. When freelancers apply, the AI Screener Bot conducts an instant interactive Q&A session and presents you with ranked candidate scores and transcript summaries.',
  },
  {
    q: 'What is VIP Dispute Fast-Track & Profile Avatar Badge?',
    a: 'Client Premium accounts get direct fast-track queue for dispute resolutions with a dedicated account manager, plus a 3D Neon Ring overlay on your avatar to signal top-tier employer credibility.',
  },
];

const COMPARE_ROWS = [
  { label: 'AI Job Post Generator', sub: 'AI drafts & polishes job requirements & tags', std: false, prem: 'Unlimited AI job generation', tag: 'AI POWERED' },
  { label: 'Featured Job Promotion', sub: 'Job ranking in freelancer search feeds', std: 'Organic position', prem: 'Top pinned + 3D Neon Gold border', tag: 'TOP PINNED' },
  { label: 'Smart Talent Matching', sub: 'Auto-match candidates by Major, Skill & Elo', std: false, prem: 'Auto-highlight top 5% fit', tag: 'EXCLUSIVE' },
  { label: 'AI Interview Definitions & Results', sub: 'Automated screening bots & candidate scores', std: false, prem: 'Custom AI interview definitions & transcript summaries', tag: 'AI SCREENER' },
  { label: 'VIP Dispute Fast-Track', sub: 'Priority resolution & dedicated support', std: 'Standard queue', prem: 'VIP priority queue + dedicated manager', tag: 'VIP ACCESS' },
  { label: 'Profile Avatar Badge', sub: '3D Neon Gold Ring badge on client profile', std: 'Plain avatar', prem: '3D Neon Gold Ring Badge', tag: 'PREMIUM HIRER' },
];

export default function ClientPricingScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation('premium');
  const { user } = useApp() || {};
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selected, setSelected] = useState<SubscriptionPlan>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const plans   = usePremiumResource(useCallback(clientPremiumAPI.plans, []));
  const current = usePremiumResource(useCallback(clientPremiumAPI.currentSubscription, []));
  const wallet  = usePremiumResource(useCallback(clientPremiumAPI.wallet, []));

  const allPlans = useMemo(() => {
    const configured = (plans.data || []).filter(p => p.price > 0);
    if (configured.some(p => p.billingPeriod === 'yearly' || p.durationInDays >= 360)) return configured;
    const monthly = configured.find(p => p.billingPeriod === 'monthly' || p.durationInDays < 360);
    if (!monthly) return configured;
    return [...configured, {
      ...monthly,
      id: YEARLY_PROMO_PLAN_ID,
      name: 'Client Premium Yearly',
      description: 'A full year of Client Premium — 2 months free + 100 Bonus Job Promotion Tokens.',
      price: monthly.price * 10,
      durationInDays: 365,
      billingPeriod: 'yearly' as const,
      sortOrder: (monthly.sortOrder || 0) + 1,
    }];
  }, [plans.data]);

  const visiblePlans = useMemo(() =>
    allPlans.filter(p => (p.billingPeriod || (p.durationInDays >= 360 ? 'yearly' : 'monthly')) === period),
    [allPlans, period]);

  const entitled = Boolean(current.data?.isPremium && new Date(current.data.endDate) > new Date());
  const balance  = wallet.data?.totalSpendableGigCoin || 0;

  const purchase = async () => {
    if (!selected) return;
    setBusy(true); setError(undefined);
    const res = await clientPremiumAPI.purchaseSubscription(selected.id, crypto.randomUUID());
    setBusy(false);
    if (!res.success) return setError(res.message);
    window.dispatchEvent(new Event('gigbridge-wallet-updated'));
    window.dispatchEvent(new Event('gigbridge-client-premium-updated'));
    navigate('/client/dashboard', { replace: true, state: { purchased: true } });
  };

  const name   = user?.full_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Client Employer';
  const avatar = user?.avatar;
  const uid    = user?.id;

  return (
    <AppLayout>
      <main className="cp-shell">

        {/* ══════════════════════════════════════
            CHAPTER 1 — THE HOOK (HERO)
        ══════════════════════════════════════ */}
        <section className="cp-hero">
          <div className="cp-hero-eyebrow">
            <span className="cp-hero-eyebrow-dot" />
            {t('clientPricing.eyebrow')}
          </div>

          <div className="cp-hero-layout">
            <div>
              <h1 className="cp-hero-headline">
                {t('clientPricing.heroTitleLine1')}<br />{t('clientPricing.heroTitleLine2')}<br />
                <em>{t('clientPricing.heroTitleEm')}</em>
              </h1>
              <p className="cp-hero-sub">
                {t('clientPricing.heroSub')}
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  className="cp-btn large"
                  onClick={() => document.getElementById('cp-pricing')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {t('clientPricing.seePricing')} <ArrowRight size={16} />
                </button>
                <button
                  className="cp-btn ghost"
                  style={{ padding: '14px 24px', fontSize: '13px', borderRadius: '12px' }}
                  onClick={() => document.getElementById('cp-features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {t('clientPricing.exploreFeatures')}
                </button>
              </div>

              <div className="cp-balance-strip">
                <div className="cp-balance-val">
                  <Wallet size={16} color="#6366f1" />
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{t('clientPricing.balance')}</span>
                  <GigCoinAmount amount={balance} />
                </div>
                <div className="cp-balance-actions">
                  <button className="cp-btn ghost" style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }} onClick={() => navigate('/wallet/deposit')}>
                    {t('clientPricing.getGigCoin')} <ArrowRight size={13} />
                  </button>
                  {entitled && (
                    <button className="cp-btn" style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }} onClick={() => navigate('/client/dashboard')}>
                      {t('clientPricing.dashboard')} <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* HERO VISUAL PREVIEW & AVATAR BADGE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Avatar Badge Showcase */}
              <div style={{
                padding: '20px', borderRadius: '20px', background: 'var(--card)',
                border: '1px solid var(--cp-border)', textAlign: 'center'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 12 }}>
                  <div>
                    <UserAvatar userId={uid} src={avatar} name={name} premium={false} size="lg" />
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', marginTop: 6 }}>Standard Client</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-secondary)', opacity: 0.5 }}>VS</div>
                  <div>
                    <UserAvatar userId={uid} src={avatar} name={name} premium={true} size="lg" />
                    <div style={{ fontSize: 10, fontWeight: 900, color: '#6366f1', marginTop: 6 }}>Premium Hirer ✦</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  3D Neon Gold Avatar Ring displays on all your job posts &amp; messages.
                </div>
              </div>

              <div style={{
                padding: '12px 16px', borderRadius: '12px', background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center', fontSize: '12px', color: '#10b981', fontWeight: 800
              }}>
                <Flame size={14} style={{ display: 'inline', marginRight: 6 }} />
                {t('clientPricing.fasterHireNotice')}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CHAPTER 2 — PRICING (TOP)
        ══════════════════════════════════════ */}
        <section className="cp-pricing" id="cp-pricing">
          <p className="cp-section-eyebrow"><Zap size={13} /> {t('clientPricing.pricingEyebrow')}</p>
          <h2 className="cp-section-headline">{t('clientPricing.pricingTitleLine1')}<br />{t('clientPricing.pricingTitleLine2')}</h2>

          {/* Billing toggle */}
          <div className="cp-billing-toggle" aria-label="Billing period">
            <button className={`cp-billing-btn ${period === 'monthly' ? 'active' : ''}`} onClick={() => setPeriod('monthly')}>
              {t('clientPricing.monthly')}
            </button>
            <button className={`cp-billing-btn ${period === 'yearly' ? 'active' : ''}`} onClick={() => setPeriod('yearly')}>
              {t('clientPricing.yearly')} <span className="cp-yearly-badge">{t('clientPricing.saveMonths')}</span>
            </button>
          </div>

          {error && (
            <div style={{ color: '#ef4444', padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,68,68,.08)', marginBottom: 20, fontSize: 13 }}>
              {error}
            </div>
          )}

          {plans.loading || wallet.loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: 16 }}>
              {[1, 2].map(i => <div key={i} style={{ height: 420, borderRadius: 20, background: 'var(--card)', opacity: 0.5 }} />)}
            </div>
          ) : (
            <div className="cp-pricing-layout">
              {/* ── LEFT: Standard Client (Free) ── */}
              <article className="cp-plan-std">
                <div className="cp-plan-std-tier">{t('clientPricing.standardTitle')}</div>
                <div className="cp-plan-std-price">Free</div>
                <p className="cp-plan-std-desc">{t('clientPricing.standardSub')}</p>
                <div className="cp-plan-std-divider" />
                <ul className="cp-plan-std-list">
                  <li className="has"><Check size={13} color="#10b981" /> Post basic project listings</li>
                  <li className="has"><Check size={13} color="#10b981" /> Manual applicant review</li>
                  <li className="has"><Check size={13} color="#10b981" /> Organic search feed placement</li>
                  <li className="no"><X size={13} color="#475569" /> AI Job Post Generator</li>
                  <li className="no"><X size={13} color="#475569" /> Featured Job Promotion</li>
                  <li className="no"><X size={13} color="#475569" /> Smart Talent Matching</li>
                  <li className="no"><X size={13} color="#475569" /> AI Interview Definitions &amp; Results</li>
                  <li className="no"><X size={13} color="#475569" /> VIP Dispute Fast-Track</li>
                  <li className="no"><X size={13} color="#475569" /> Profile 3D Neon Avatar Ring</li>
                </ul>
                <button className="cp-btn ghost" disabled style={{ width: '100%', marginTop: 24 }}>
                  {t('clientPricing.currentPlan')}
                </button>
              </article>

              {/* ── RIGHT: Client Premium Pass (Dominant) ── */}
              {visiblePlans.map(plan => {
                const days      = period === 'yearly' ? 365 : 30;
                const dailyRate = Math.max(1, Math.round(plan.price / days));
                const features  = parseFeatures(plan.features);
                const perks = features.length > 0
                  ? features.map(f => ({ icon: <Check size={15} />, label: f, sub: '' }))
                  : [
                    { icon: <FileText size={15} />,    label: 'AI Job Post Generator',         sub: 'Auto-write descriptions & skill tags' },
                    { icon: <Megaphone size={15} />,   label: 'Featured Job Promotion',        sub: 'Top pinned placement + 3D Gold border' },
                    { icon: <Target size={15} />,      label: 'Smart Talent Matching',         sub: 'Match by Major, Skill badges & Elo' },
                    { icon: <Bot size={15} />,         label: 'AI Interview Definitions & Results', sub: 'Automated screening bots & candidate scores' },
                    { icon: <ShieldCheck size={15} />, label: 'VIP Dispute Fast-Track',       sub: 'Priority dispute care + dedicated manager' },
                    { icon: <Crown size={15} />,       label: '3D Neon Gold Avatar Badge',     sub: 'Premium hirer ring on posts & profile' },
                  ];
                return (
                  <article className="cp-plan-prem" key={plan.id}>
                    <div className="cp-plan-prem-orb" aria-hidden />

                    <div className="cp-plan-prem-top">
                      <div className="cp-plan-prem-badge"><Sparkles size={12} /> {t('clientPricing.employerChoice')}</div>
                      <div className="cp-plan-prem-tier"><Crown size={14} /> {t('clientPricing.premiumTitle')}</div>
                    </div>

                    <div className="cp-plan-prem-headline">{t('clientPricing.premiumHeadline')}</div>

                    <div className="cp-plan-prem-price-block">
                      <div className="cp-plan-prem-price">
                        <GigCoinAmount amount={plan.price} />
                        <span className="cp-plan-prem-period">/ {period === 'yearly' ? 'year' : 'month'}</span>
                      </div>
                      <div className="cp-plan-prem-rate">
                        {t('clientPricing.perDay', { rate: dailyRate })}
                      </div>
                    </div>

                    <div className="cp-plan-prem-perks">
                      {perks.map(p => (
                        <div className="cp-plan-prem-perk" key={p.label}>
                          <div className="cp-plan-prem-perk-icon">{p.icon}</div>
                          <div>
                            <div className="cp-plan-prem-perk-label">{p.label}</div>
                            {p.sub && <div className="cp-plan-prem-perk-sub">{p.sub}</div>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button className="cp-plan-prem-cta" onClick={() => setSelected(plan)}>
                      <Zap size={16} />
                      {entitled
                        ? t('clientPricing.extend', { period: period === 'yearly' ? t('clientPricing.yearly') : t('clientPricing.monthly') })
                        : t('clientPricing.activate', { period: period === 'yearly' ? t('clientPricing.yearly') : t('clientPricing.monthly') })
                      }
                      <ArrowRight size={16} />
                    </button>

                    <div className="cp-plan-prem-guarantee">
                      <ShieldCheck size={13} /> {t('clientPricing.guarantee')}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════
            CHAPTER 3 — THE REALITY CHECK
        ══════════════════════════════════════ */}
        <section className="cp-reality">
          <p className="cp-reality-label">{t('clientPricing.realityLabel')}</p>
          <div className="cp-reality-grid">
            <div className="cp-reality-stat">
              <div className="cp-reality-number">{t('clientPricing.realityStat1Num')}</div>
              <p className="cp-reality-caption">{t('clientPricing.realityStat1Title')}</p>
              <p className="cp-reality-sub">{t('clientPricing.realityStat1Sub')}</p>
            </div>
            <div className="cp-reality-stat">
              <div className="cp-reality-number">{t('clientPricing.realityStat2Num')}</div>
              <p className="cp-reality-caption">{t('clientPricing.realityStat2Title')}</p>
              <p className="cp-reality-sub">{t('clientPricing.realityStat2Sub')}</p>
            </div>
            <div className="cp-reality-stat">
              <div className="cp-reality-number">{t('clientPricing.realityStat3Num')}</div>
              <p className="cp-reality-caption">{t('clientPricing.realityStat3Title')}</p>
              <p className="cp-reality-sub">{t('clientPricing.realityStat3Sub')}</p>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CHAPTER 4 — CLIENT SUPERPOWERS (5 OFFICIAL FEATURES)
        ══════════════════════════════════════ */}
        <section className="cp-features" id="cp-features">
          <p className="cp-section-eyebrow"><Sparkles size={13} /> Client Superpowers</p>
          <h2 className="cp-section-headline">Five core features.<br />One ultimate hiring pass.</h2>

          {/* SUPERPOWER 1 — AI Job Post Generator */}
          <div className="cp-feature-row">
            <div className="cp-feature-story">
              <p className="cp-feature-number">01 / 05</p>
              <h3 className="cp-feature-title">AI Job Post Generator</h3>
              <p className="cp-feature-body">
                Write compelling job descriptions in seconds. Our AI analyzes your hiring goal, auto-generates required skill tags, major prerequisites, clear milestones, and competitive budget suggestions.
              </p>
              <span className="cp-feature-tag"><FileText size={13} /> AI Job Post Generator</span>
            </div>
            <div className="cp-feature-visual">
              <div style={{ padding: '16px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--cp-border)', width: '100%', maxWidth: 300, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#6366f1', marginBottom: 8 }}>
                  <Sparkles size={15} /> AI Post Generator Active
                </div>
                <div style={{ background: 'rgba(99,102,241,0.06)', padding: '10px', borderRadius: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Auto-Generated Listing:</div>
                  "Senior Full-Stack Architect · Major: Software Eng. · Skills: React, .NET Core, PostgreSQL"
                </div>
              </div>
            </div>
          </div>

          {/* SUPERPOWER 2 — Featured Job Promotion */}
          <div className="cp-feature-row reverse">
            <div className="cp-feature-story">
              <p className="cp-feature-number">02 / 05</p>
              <h3 className="cp-feature-title">Featured Job Promotion</h3>
              <p className="cp-feature-body">
                Pin your job listing at position #1 on freelancer search feeds. Promoted listings feature a distinct 3D Neon Gold border and "Featured" badge for maximum visual authority.
              </p>
              <span className="cp-feature-tag"><Megaphone size={13} /> Featured Job Promotion</span>
            </div>
            <div className="cp-feature-visual">
              <div style={{ display: 'grid', gap: 8, width: '100%', maxWidth: 300 }}>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(99,102,241,0.12)', border: '1.5px solid #6366f1', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#6366f1', textTransform: 'uppercase' }}>🔥 Featured Job #1</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#10b981' }}>TOP PINNED</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)' }}>Lead Mobile App Developer</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>$3,500 - $5,000 · Pinned at Top</div>
                </div>
              </div>
            </div>
          </div>

          {/* SUPERPOWER 3 — Smart Talent Matching */}
          <div className="cp-feature-row">
            <div className="cp-feature-story">
              <p className="cp-feature-number">03 / 05</p>
              <h3 className="cp-feature-title">Smart Talent Matching</h3>
              <p className="cp-feature-body">
                Automatically match candidates by Major (chuyên ngành), verified Skill badges, and Elo ranking. Receive auto-highlighted lists of the top 5% matched freelancers for every open role.
              </p>
              <span className="cp-feature-tag"><Target size={13} /> Smart Talent Matching</span>
            </div>
            <div className="cp-feature-visual">
              <div style={{ display: 'grid', gap: 8, width: '100%', maxWidth: 300 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.12)', border: '1px solid #6366f1', fontSize: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Minh Tran · Senior .NET</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Major: Software Eng. · Elo: 1940</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 900, padding: '3px 8px', borderRadius: 999, background: '#10b981', color: '#fff' }}>98% Fit</span>
                </div>
              </div>
            </div>
          </div>

          {/* SUPERPOWER 4 — AI Interview Definitions and Results */}
          <div className="cp-feature-row reverse">
            <div className="cp-feature-story">
              <p className="cp-feature-number">04 / 05</p>
              <h3 className="cp-feature-title">AI Interview Definitions &amp; Results</h3>
              <p className="cp-feature-body">
                Define custom AI interview criteria and automated screening Q&amp;A. As freelancers apply, the AI Screener Bot interviews them instantly and presents scored transcript results before manual calls.
              </p>
              <span className="cp-feature-tag"><Bot size={13} /> AI Interview Screener &amp; Results</span>
            </div>
            <div className="cp-feature-visual">
              <div style={{ padding: '16px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--cp-border)', width: '100%', maxWidth: 300, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#6366f1', marginBottom: 8 }}>
                  <Bot size={16} /> Candidate AI Interview Score
                </div>
                <div style={{ background: 'rgba(99,102,241,0.06)', padding: '10px', borderRadius: 8, marginBottom: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Technical Rating: 9.4 / 10</strong><br />
                  "Passed all system design Q&amp;A scenarios with flying colors."
                </div>
              </div>
            </div>
          </div>

          {/* SUPERPOWER 5 — VIP Dispute Fast-Track & Profile Ring */}
          <div className="cp-feature-row">
            <div className="cp-feature-story">
              <p className="cp-feature-number">05 / 05</p>
              <h3 className="cp-feature-title">VIP Dispute Fast-Track &amp; Profile Avatar Ring</h3>
              <p className="cp-feature-body">
                Bypass standard support queues with VIP dispute fast-track handling. Plus, stand out as a top-tier employer with a 3D Neon Gold Avatar Ring badge across all client job posts and candidate messages.
              </p>
              <span className="cp-feature-tag"><ShieldCheck size={13} /> VIP Fast-Track &amp; 3D Neon Ring</span>
            </div>
            <div className="cp-feature-visual">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <UserAvatar userId={uid} src={avatar} name={name} premium={true} size="xl" />
                <div style={{ fontSize: 11, fontWeight: 800, color: '#6366f1', background: 'var(--cp-accent-dim)', padding: '4px 12px', borderRadius: 999 }}>
                  3D Neon Gold Avatar Badge
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CHAPTER 5 — COMPARISON MATRIX
        ══════════════════════════════════════ */}
        <section className="cp-compare">
          <p className="cp-section-eyebrow"><Crown size={13} /> Side by side</p>
          <h2 className="cp-section-headline">{t('clientPricing.compareTitle')}<br />{t('clientPricing.compareSub')}</h2>

          <table className="cp-compare-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Recruiting Feature</th>
                <th style={{ width: '25%', textAlign: 'center' }}>Standard Client</th>
                <th style={{ width: '35%', textAlign: 'center' }} className="accent-col">Client Premium Pass</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map(row => (
                <tr key={row.label}>
                  <td>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{row.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{row.sub}</div>
                  </td>
                  <td className="center">
                    {row.std === false
                      ? <span className="cp-cross"><X size={13} /></span>
                      : <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.std}</span>
                    }
                  </td>
                  <td className="center accent-col">
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{row.prem}</span>
                    {row.tag && <span className="cp-compare-tag">{row.tag}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ══════════════════════════════════════
            CHAPTER 6 — FINAL CALL
        ══════════════════════════════════════ */}
        <section className="cp-final-cta">
          <div className="cp-final-cta-headline">
            Build your dream engineering team<br /><em>in hours, not months.</em>
          </div>
          <p className="cp-final-cta-sub">
            Activate Client Premium today and start interviewing pre-screened top 1% candidates immediately.
          </p>
          <button className="cp-btn large" onClick={() => document.getElementById('cp-pricing')?.scrollIntoView({ behavior: 'smooth' })}>
            {t('clientPricing.activate', { period: period === 'yearly' ? t('clientPricing.yearly') : t('clientPricing.monthly') })} <ArrowRight size={16} />
          </button>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 999, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: 12, fontWeight: 800, marginTop: 16 }}>
              <ShieldCheck size={15} /> Zero commission markup · Full control of auto-renew settings
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CHAPTER 7 — FAQ
        ══════════════════════════════════════ */}
        <section className="cp-faq">
          <p className="cp-section-eyebrow"><HelpCircle size={13} /> Client FAQ</p>
          <h2 className="cp-section-headline" style={{ margin: 0 }}>{t('clientPricing.faqTitle')}</h2>

          <div className="cp-faq-list">
            {CLIENT_FAQS.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div className="cp-faq-item" key={faq.q}>
                  <button className="cp-faq-btn" onClick={() => setOpenFaq(open ? null : i)}>
                    <span>{faq.q}</span>
                    <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s ease', flexShrink: 0 }} />
                  </button>
                  {open && <div className="cp-faq-body">{faq.a}</div>}
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════
            PURCHASE MODAL
        ══════════════════════════════════════ */}
        {selected && (
          <div className="cp-modal-overlay" onClick={() => !busy && setSelected(undefined)}>
            <div className="cp-modal-box" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6366f1', marginBottom: 16 }}>
                <GigCoinLogo size={16} /> Confirm Purchase
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 20px', letterSpacing: '-0.02em' }}>{selected.name}</h2>

              <div className="cp-modal-row"><span>Plan</span><strong>{selected.name} ({period})</strong></div>
              <div className="cp-modal-row"><span>Price</span><GigCoinAmount amount={selected.price} /></div>
              <div className="cp-modal-row"><span>Your Balance</span><GigCoinAmount amount={balance} /></div>

              {balance < selected.price ? (
                <div style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', marginTop: 12 }}>
                  <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 800, color: '#d97706', fontSize: 13 }}>Insufficient balance</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                      You need {(selected.price - balance).toLocaleString()} more GigCoins.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="cp-modal-row" style={{ background: 'rgba(16,185,129,.06)', padding: '10px 14px', borderRadius: 10, margin: '12px 0' }}>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>After purchase</span>
                  <GigCoinAmount amount={balance - selected.price} />
                </div>
              )}

              <div className="cp-modal-actions">
                <button className="cp-btn ghost" disabled={busy} onClick={() => setSelected(undefined)} style={{ flex: 1 }}>Back</button>
                {balance < selected.price
                  ? <button className="cp-btn" onClick={() => navigate('/wallet/deposit')} style={{ flex: 1.3 }}>Top up GigCoin <ArrowRight size={14} /></button>
                  : <button className="cp-btn" disabled={busy} onClick={() => void purchase()} style={{ flex: 1.3 }}>
                      {busy ? 'Processing…' : 'Confirm & Activate'}
                    </button>
                }
              </div>
            </div>
          </div>
        )}

      </main>
    </AppLayout>
  );
}
