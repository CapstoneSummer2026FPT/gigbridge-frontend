import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Check, ChevronDown, Crown, Flame,
  HelpCircle, Megaphone, ShieldAlert, ShieldCheck, Sparkles,
  Target, Trophy, Wallet, X, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { AppLayout } from '../../../shared/components/AppLayout';
import { GigCoinAmount, GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { premiumAPI } from '../api';
import { usePremiumResource } from '../hooks';
import { PromotionCard } from '../components/PromotionCard';
import type { SubscriptionPlan } from '../types';
import '../styles/freelancer-pricing-screen.css';

const YEARLY_PROMO_PLAN_ID = '95000000-0000-0000-0000-000000000003';

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

const FAQS = [
  {
    q: 'How does Elo Rank Inactivity Protection actually work?',
    a: 'Standard accounts lose -35 Elo per week if inactive for more than 7 days. The moment you activate Premium, an invisible shield locks your score — whether you take 2 weeks or 2 months off, your rank stays exactly where you left it.',
  },
  {
    q: 'What makes the AI Job Matching different from the search bar?',
    a: 'Our engine reads your full profile — your major (chuyên ngành), every verified skill badge, your Elo tier, and past project categories — then instantly surfaces jobs with 90%+ compatibility before you even think to search.',
  },
  {
    q: 'What exactly is Profile Promotion Studio?',
    a: 'You design a sponsored card — photo, headline, quote — and it runs as a featured ad inside client dashboards. Premium freelancers with active promotions average 4.2x more direct project invitations.',
  },
  {
    q: 'Does the 3D Neon Ring show everywhere?',
    a: 'Yes. On your proposal cards, the Talent Directory, project chat headers, contract pages, and client recommendation feeds. It is the fastest way to signal you are serious.',
  },
  {
    q: 'Can I cancel before my plan renews?',
    a: 'Absolutely. One click in Premium Hub disables auto-renew. Your perks stay active until the last day of your paid period, then you revert to Standard — no hidden fees.',
  },
];

const COMPARE_ROWS = [
  { label: 'Smart AI Job Matching', sub: 'By Major, Skills & Elo rank', std: false, prem: 'Auto-matched, 90%+ fit score', tag: 'EXCLUSIVE' },
  { label: 'Profile Avatar Badge', sub: 'Visibility in search & proposals', std: 'Plain avatar', prem: '3D Neon Gold Tube Ring', tag: null },
  { label: 'Elo Inactivity Shield', sub: 'Protection from weekly decay', std: false, prem: '0 Elo lost on break', tag: 'SHIELDED' },
  { label: 'Proposal Feed Position', sub: 'Ranking in client lists', std: 'Organic order', prem: 'Top featured position', tag: 'TOP #1' },
  { label: 'Profile Promotion Studio', sub: 'Sponsored ad cards on client feeds', std: false, prem: 'Full studio + 100 tokens', tag: '4.2× INVITES' },
  { label: 'Withdrawal Priority', sub: 'Payout processing speed', std: 'Standard queue', prem: 'Instant priority payout', tag: null },
];

export default function FreelancerPricingScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation('premium');
  const { user } = useApp() || {};
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selected, setSelected] = useState<SubscriptionPlan>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [profile, setProfile] = useState<{ id?: string; avatar?: string | null; name?: string }>();

  useEffect(() => {
    if (user?.id) {
      setProfile({
        id: user.id,
        avatar: user.avatar,
        name: user.full_name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || 'Freelancer',
      });
    }
    profileGetAPI.getMyFreelancerProfile().then(res => {
      if (res.success && res.data)
        setProfile({ id: res.data.userId, avatar: res.data.userAvatar, name: res.data.userFullName || 'Freelancer' });
    }).catch(() => {});
  }, [user]);

  const plans   = usePremiumResource(useCallback(premiumAPI.plans, []));
  const current = usePremiumResource(useCallback(premiumAPI.currentSubscription, []));
  const wallet  = usePremiumResource(useCallback(premiumAPI.wallet, []));

  const allPlans = useMemo(() => {
    const configured = (plans.data || []).filter(p => p.price > 0);
    if (configured.some(p => p.billingPeriod === 'yearly' || p.durationInDays >= 360)) return configured;
    const monthly = configured.find(p => p.billingPeriod === 'monthly' || p.durationInDays < 360);
    if (!monthly) return configured;
    return [...configured, {
      ...monthly,
      id: YEARLY_PROMO_PLAN_ID,
      name: 'Freelancer Premium Yearly',
      description: 'A full year of Premium — 2 months free and 100 Promotion Tokens as a bonus gift.',
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
    const res = await premiumAPI.purchaseSubscription(selected.id, crypto.randomUUID());
    setBusy(false);
    if (!res.success) return setError(res.message);
    window.dispatchEvent(new Event('gigbridge-wallet-updated'));
    window.dispatchEvent(new Event('gigbridge-premium-updated'));
    navigate('/premium/freelancer', { replace: true, state: { purchased: true } });
  };

  const name   = profile?.name   || user?.full_name || 'Freelancer';
  const avatar = profile?.avatar ?? user?.avatar;
  const uid    = profile?.id     || user?.id;

  return (
    <AppLayout>
      <main className="fp-shell">

        {/* ══════════════════════════════════════
            CHAPTER 1 — THE HOOK (HERO)
        ══════════════════════════════════════ */}
        <section className="fp-hero">
          <div className="fp-hero-eyebrow">
            <span className="fp-hero-eyebrow-dot" />
            {t('freelancerPricing.eyebrow')}
          </div>

          <div className="fp-hero-layout">
            <div>
              <h1 className="fp-hero-headline">
                {t('freelancerPricing.heroTitleLine1')}<br />{t('freelancerPricing.heroTitleLine2')}<br />
                <em>{t('freelancerPricing.heroTitleEm')}</em>
              </h1>
              <p className="fp-hero-sub">
                {t('freelancerPricing.heroSub')}
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  className="fp-btn large"
                  onClick={() => document.getElementById('fp-pricing')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {t('freelancerPricing.seePricing')} <ArrowRight size={16} />
                </button>
                <button
                  className="fp-btn ghost"
                  style={{ padding: '14px 24px', fontSize: '13px', borderRadius: '12px' }}
                  onClick={() => document.getElementById('fp-features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {t('freelancerPricing.exploreFeatures')}
                </button>
              </div>

              <div className="fp-balance-strip">
                <div className="fp-balance-val">
                  <Wallet size={16} color="#6366f1" />
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{t('freelancerPricing.balance')}</span>
                  <GigCoinAmount amount={balance} />
                </div>
                <div className="fp-balance-actions">
                  <button className="fp-btn ghost" style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }} onClick={() => navigate('/wallet/deposit')}>
                    {t('freelancerPricing.getGigCoin')} <ArrowRight size={13} />
                  </button>
                  {entitled && (
                    <button className="fp-btn" style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }} onClick={() => navigate('/premium/freelancer')}>
                      {t('freelancerPricing.openHub')} <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* HERO AVATAR COMPARISON */}
            <div className="fp-hero-avatar-stage">
              <div className="fp-hero-vs">
                <div style={{ textAlign: 'center' }}>
                  <UserAvatar userId={uid} src={avatar} name={name} premium={false} size="xl" />
                  <div className="fp-avatar-label">Standard</div>
                </div>
                <div className="fp-hero-vs-divider">vs</div>
                <div style={{ textAlign: 'center' }}>
                  <UserAvatar userId={uid} src={avatar} name={name} premium={true} size="xl" />
                  <div className="fp-avatar-label premium">Premium ✦</div>
                </div>
              </div>
              <div style={{
                marginTop: '20px', padding: '12px 16px', borderRadius: '12px',
                background: 'var(--fp-accent-dim)', border: '1px solid rgba(99,102,241,0.2)',
                textAlign: 'center', fontSize: '12px', color: '#818cf8', fontWeight: 700
              }}>
                <Flame size={14} color="#f59e0b" style={{ display: 'inline', marginRight: 6 }} />
                {t('freelancerPricing.topEarnersNotice')}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CHAPTER 2 — PRICING (TOP)
        ══════════════════════════════════════ */}
        <section className="fp-pricing" id="fp-pricing">
          <p className="fp-section-eyebrow"><Zap size={13} /> {t('freelancerPricing.pricingEyebrow')}</p>
          <h2 className="fp-section-headline">{t('freelancerPricing.pricingTitleLine1')}<br />{t('freelancerPricing.pricingTitleLine2')}</h2>

          {/* Billing toggle */}
          <div className="fp-billing-toggle" aria-label="Billing period">
            <button className={`fp-billing-btn ${period === 'monthly' ? 'active' : ''}`} onClick={() => setPeriod('monthly')}>
              {t('freelancerPricing.monthly')}
            </button>
            <button className={`fp-billing-btn ${period === 'yearly' ? 'active' : ''}`} onClick={() => setPeriod('yearly')}>
              {t('freelancerPricing.yearly')} <span className="fp-yearly-badge">{t('freelancerPricing.saveMonths')}</span>
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
            <div className="fp-pricing-layout">
              {/* ── LEFT: Standard ── */}
              <article className="fp-plan-std">
                <div className="fp-plan-std-tier">{t('freelancerPricing.standardTitle')}</div>
                <div className="fp-plan-std-price">Free</div>
                <p className="fp-plan-std-desc">{t('freelancerPricing.standardSub')}</p>
                <div className="fp-plan-std-divider" />
                <ul className="fp-plan-std-list">
                  <li className="has"><Check size={13} color="#10b981" /> Browse &amp; apply to listings</li>
                  <li className="has"><Check size={13} color="#10b981" /> Standard profile showcase</li>
                  <li className="has"><Check size={13} color="#10b981" /> Organic proposal placement</li>
                  <li className="no"><X size={13} color="#475569" /> Smart AI Job Matching</li>
                  <li className="no"><X size={13} color="#475569" /> 3D Neon Avatar ring</li>
                  <li className="no"><X size={13} color="#475569" /> Elo Inactivity Shield</li>
                  <li className="no"><X size={13} color="#475569" /> Profile Promotion Studio</li>
                </ul>
                <button className="fp-btn ghost" disabled style={{ width: '100%', marginTop: 24 }}>
                  {t('freelancerPricing.currentPlan')}
                </button>
              </article>

              {/* ── RIGHT: Premium ── */}
              {visiblePlans.map(plan => {
                const days      = period === 'yearly' ? 365 : 30;
                const dailyRate = Math.max(1, Math.round(plan.price / days));
                const features  = parseFeatures(plan.features);
                const perks = features.length > 0
                  ? features.map(f => ({ icon: <Check size={15} />, label: f, sub: '' }))
                  : [
                    { icon: <Target size={15} />,      label: 'Smart AI Job Matching',    sub: 'By Major, Skills & Elo rank' },
                    { icon: <Crown size={15} />,       label: '3D Neon Gold Avatar Ring',  sub: 'Everywhere on GigBridge' },
                    { icon: <ShieldCheck size={15} />, label: 'Elo Inactivity Shield',     sub: 'No decay on breaks >1 week' },
                    { icon: <Trophy size={15} />,      label: 'Top #1 Proposal Placement', sub: 'First in every client feed' },
                    { icon: <Megaphone size={15} />,   label: 'Profile Promotion Studio',  sub: `${period === 'yearly' ? '+100 Bonus Tokens · ' : ''}4.2× more invitations` },
                    { icon: <Zap size={15} />,         label: 'Priority Withdrawal',       sub: 'Instant payout processing' },
                  ];
                return (
                  <article className="fp-plan-prem" key={plan.id}>
                    <div className="fp-plan-prem-orb" aria-hidden />

                    <div className="fp-plan-prem-top">
                      <div className="fp-plan-prem-badge"><Sparkles size={12} /> {t('freelancerPricing.mostPopular')}</div>
                      <div className="fp-plan-prem-tier"><Crown size={14} /> {t('freelancerPricing.premiumTitle')}</div>
                    </div>

                    <div className="fp-plan-prem-headline">{t('freelancerPricing.premiumHeadline')}</div>

                    <div className="fp-plan-prem-price-block">
                      <div className="fp-plan-prem-price">
                        <GigCoinAmount amount={plan.price} />
                        <span className="fp-plan-prem-period">/ {period === 'yearly' ? 'year' : 'month'}</span>
                      </div>
                      <div className="fp-plan-prem-rate">
                        {t('freelancerPricing.perDay', { rate: dailyRate })}
                      </div>
                    </div>

                    <div className="fp-plan-prem-perks">
                      {perks.map(p => (
                        <div className="fp-plan-prem-perk" key={p.label}>
                          <div className="fp-plan-prem-perk-icon">{p.icon}</div>
                          <div>
                            <div className="fp-plan-prem-perk-label">{p.label}</div>
                            {p.sub && <div className="fp-plan-prem-perk-sub">{p.sub}</div>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button className="fp-plan-prem-cta" onClick={() => setSelected(plan)}>
                      <Zap size={16} />
                      {entitled
                        ? t('freelancerPricing.extend', { period: period === 'yearly' ? t('freelancerPricing.yearly') : t('freelancerPricing.monthly') })
                        : t('freelancerPricing.activate', { period: period === 'yearly' ? t('freelancerPricing.yearly') : t('freelancerPricing.monthly') })
                      }
                      <ArrowRight size={16} />
                    </button>

                    <div className="fp-plan-prem-guarantee">
                      <ShieldCheck size={13} /> {t('freelancerPricing.guarantee')}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>


        {/* ══════════════════════════════════════
            CHAPTER 4 — YOUR WEAPONS
        ══════════════════════════════════════ */}
        <section className="fp-features" id="fp-features">
          <p className="fp-section-eyebrow"><Sparkles size={13} /> Your arsenal</p>
          <h2 className="fp-section-headline">Four superpowers.<br />One subscription.</h2>

          {/* FEATURE 1 — Smart AI Job Matching */}
          <div className="fp-feature-row">
            <div className="fp-feature-story">
              <p className="fp-feature-number">01 / 04</p>
              <h3 className="fp-feature-title">The jobs that were made for you — delivered before the crowd sees them.</h3>
              <p className="fp-feature-body">
                Our AI reads your major, every verified skill badge, your Elo tier, and past projects. It cross-references every new listing and pushes the matches that fit you — not just jobs with the same keywords.
              </p>
              <span className="fp-feature-tag"><Target size={13} /> Smart AI Job Matcher</span>
            </div>
            <div className="fp-feature-visual">
              <div className="fp-match-widget">
                <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Your AI Feed — Top Matches
                </div>
                <div className="fp-match-job top">
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 12 }}>Full-Stack App (React + .NET)</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Major: Software Eng. · Skills: React, C#</div>
                  </div>
                  <span className="fp-match-score">98%</span>
                </div>
                <div className="fp-match-job">
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 12 }}>UI/UX Mobile Designer</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Skills: Figma, iOS, Design Systems</div>
                  </div>
                  <span className="fp-match-score mid">92%</span>
                </div>
                <div className="fp-match-job" style={{ opacity: 0.45 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12 }}>Generic Dev Role</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>No skill match detected</div>
                  </div>
                  <span className="fp-match-score mid">41%</span>
                </div>
              </div>
            </div>
          </div>

          {/* FEATURE 2 — Elo Inactivity Shield */}
          <div className="fp-feature-row reverse">
            <div className="fp-feature-story">
              <p className="fp-feature-number">02 / 04</p>
              <h3 className="fp-feature-title">Take a vacation. Come back to the same rank you left.</h3>
              <p className="fp-feature-body">
                Standard accounts lose -35 Elo per week if you go quiet for over 7 days. Your Master ranking can slide to Gold while you're simply taking a break. Premium Rank Protection makes that decay impossible.
              </p>
              <span className="fp-feature-tag"><ShieldCheck size={13} /> Elo Inactivity Shield</span>
            </div>
            <div className="fp-feature-visual">
              <div className="fp-elo-widget">
                <div className="fp-elo-card bad">
                  <span className="fp-elo-label"><ShieldAlert size={12} style={{ display: 'inline', marginRight: 4 }} /> Without Premium — 3 weeks away</span>
                  <div className="fp-elo-value red">1745 Elo</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Was 1850 · Lost 105 points silently</div>
                </div>
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>vs</div>
                <div className="fp-elo-card good">
                  <span className="fp-elo-label"><ShieldCheck size={12} style={{ display: 'inline', marginRight: 4 }} /> With Premium Shield</span>
                  <div className="fp-elo-value green">1850 Elo</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Untouched — 0 points lost 🛡️</div>
                </div>
              </div>
            </div>
          </div>

          {/* FEATURE 3 — Profile Promotion Studio */}
          <div className="fp-feature-row">
            <div className="fp-feature-story">
              <p className="fp-feature-number">03 / 04</p>
              <h3 className="fp-feature-title">Your name, inside client dashboards — before they even post a job.</h3>
              <p className="fp-feature-body">
                Design a sponsored card with your photo, headline, and quote. It runs as a featured ad directly inside client hiring dashboards — putting you in front of decision-makers the moment they open GigBridge.
              </p>
              <span className="fp-feature-tag"><Megaphone size={13} /> Profile Promotion Studio</span>
            </div>
            <div className="fp-feature-visual">
              <div style={{ width: '100%', maxWidth: 240 }}>
                <PromotionCard
                  preview={true}
                  card={{
                    photoUrl: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
                    displayName: name,
                    jobTitle: 'Senior Full-Stack Developer',
                    showJobTitle: true,
                    quote: 'Top 1% Verified · Available for high-impact projects.',
                    showQuote: true,
                  }}
                />
              </div>
            </div>
          </div>

          {/* FEATURE 4 — Proposal Top Position */}
          <div className="fp-feature-row reverse">
            <div className="fp-feature-story">
              <p className="fp-feature-number">04 / 04</p>
              <h3 className="fp-feature-title">Position #1 in every client's proposal feed. Every single time.</h3>
              <p className="fp-feature-body">
                Client sees 40 proposals. You're the first card. The 3D Neon Gold Ring catches their eye before they reach #2. Your name is the one they remember.
              </p>
              <span className="fp-feature-tag"><Trophy size={13} /> Priority Proposal Placement</span>
            </div>
            <div className="fp-feature-visual">
              <div className="fp-proposal-widget">
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Client Proposal Feed
                </div>
                <div className="fp-proposal-item featured">
                  <div className="fp-rank-badge top">#1</div>
                  <UserAvatar userId={uid} src={avatar} name={name} premium={true} size="sm" />
                  <div>
                    <div style={{ fontWeight: 800, color: '#6366f1', fontSize: 12 }}>{name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>⭐ Top Featured · 100% Success</div>
                  </div>
                </div>
                <div className="fp-proposal-item" style={{ opacity: 0.45 }}>
                  <div className="fp-rank-badge">#14</div>
                  <UserAvatar name="Other Applicant" premium={false} size="sm" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>Other Applicant</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Standard · No badge</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CHAPTER 5 — COMPARISON TABLE
        ══════════════════════════════════════ */}
        <section className="fp-compare">
          <p className="fp-section-eyebrow"><Crown size={13} /> Side by side</p>
          <h2 className="fp-section-headline">{t('freelancerPricing.compareTitle')}<br />{t('freelancerPricing.compareSub')}</h2>

          <table className="fp-compare-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Feature</th>
                <th style={{ width: '25%', textAlign: 'center' }}>Standard</th>
                <th style={{ width: '35%', textAlign: 'center' }} className="accent-col">Premium Pass</th>
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
                      ? <span className="fp-cross"><X size={13} /></span>
                      : <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.std}</span>
                    }
                  </td>
                  <td className="center accent-col">
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{row.prem}</span>
                    {row.tag && <span className="fp-compare-tag">{row.tag}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ══════════════════════════════════════
            CHAPTER 6 — FINAL CALL
        ══════════════════════════════════════ */}
        <section className="fp-final-cta">
          <div className="fp-final-cta-headline">
            Every day without Premium<br />is a day your competition<br /><em>gets chosen instead of you.</em>
          </div>
          <p className="fp-final-cta-sub">
            The best time to activate was the day you signed up. The second best time is right now.
          </p>
          <button className="fp-btn large" onClick={() => document.getElementById('fp-pricing')?.scrollIntoView({ behavior: 'smooth' })}>
            {t('freelancerPricing.activate', { period: period === 'yearly' ? t('freelancerPricing.yearly') : t('freelancerPricing.monthly') })} <ArrowRight size={16} />
          </button>
          <div>
            <div className="fp-guarantee">
              <ShieldCheck size={15} /> {t('freelancerPricing.guarantee')}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CHAPTER 7 — FAQ
        ══════════════════════════════════════ */}
        <section className="fp-faq">
          <p className="fp-section-eyebrow"><HelpCircle size={13} /> FAQ</p>
          <h2 className="fp-section-headline" style={{ margin: 0 }}>{t('freelancerPricing.faqTitle')}</h2>

          <div className="fp-faq-list">
            {FAQS.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div className="fp-faq-item" key={faq.q}>
                  <button className="fp-faq-btn" onClick={() => setOpenFaq(open ? null : i)}>
                    <span>{faq.q}</span>
                    <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s ease', flexShrink: 0 }} />
                  </button>
                  {open && <div className="fp-faq-body">{faq.a}</div>}
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════
            PURCHASE MODAL
        ══════════════════════════════════════ */}
        {selected && (
          <div className="fp-modal-overlay" onClick={() => !busy && setSelected(undefined)}>
            <div className="fp-modal-box" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6366f1', marginBottom: 16 }}>
                <GigCoinLogo size={16} /> Confirm Purchase
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 20px', letterSpacing: '-0.02em' }}>{selected.name}</h2>

              <div className="fp-modal-row"><span>Plan</span><strong>{selected.name} ({period})</strong></div>
              <div className="fp-modal-row"><span>Price</span><GigCoinAmount amount={selected.price} /></div>
              <div className="fp-modal-row"><span>Your Balance</span><GigCoinAmount amount={balance} /></div>

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
                <div className="fp-modal-row" style={{ background: 'rgba(16,185,129,.06)', padding: '10px 14px', borderRadius: 10, margin: '12px 0' }}>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>After purchase</span>
                  <GigCoinAmount amount={balance - selected.price} />
                </div>
              )}

              <div className="fp-modal-actions">
                <button className="fp-btn ghost" disabled={busy} onClick={() => setSelected(undefined)} style={{ flex: 1 }}>Back</button>
                {balance < selected.price
                  ? <button className="fp-btn" onClick={() => navigate('/wallet/deposit')} style={{ flex: 1.3 }}>Top up GigCoin <ArrowRight size={14} /></button>
                  : <button className="fp-btn" disabled={busy} onClick={() => void purchase()} style={{ flex: 1.3 }}>
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
