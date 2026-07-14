import {
  Clock, Users, Globe, Star, CheckCircle,
  Bot, Bookmark, Share2, ChevronRight, Zap, Edit3, FileText,
  Briefcase, ArrowUpRight, Lock,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserRole } from '../../../types/models/User';
import { ProposalStatus } from '../../../types/models/Proposal';
import { canEditProposal, canViewProposalAnswers, canWithdrawProposal, getStatusLabel } from '../../proposals/utils/statusHelpers';
import { useJobDetail } from '../hooks/useJobDetail';
import '../styles/job-detail-screen.css';
import { GigCoinAmount, GigCoinBudget } from '../../../shared/components/GigCoinAmount';
import { useTranslation } from '../../../hooks/useTranslation';

export default function JobDetailScreen() {
  const { t } = useTranslation();
  const {
    navigate,
    role,
    isClientMode,
    job,
    client,
    clientProfile,
    similarJobs,
    myProposal,
    gigcoinBalance,
    isSaved,
    loading,
    proposalLoading,
    isApplying,
    isSavingSavedJob,
    proposalMessage,
    applicationCost,
    canApplyToJob,
    canApplyWithGigcoins,
    formatStatus,
    toggleSavedJob,
    handleApplyJob,
    handleWithdrawProposal,
  } = useJobDetail();

  /* ── Loading ── */
  if (loading) {
    return (
      <AppLayout>
        <div className="jd-page max-w-6xl mx-auto">
          <div className="glass-card rounded-2xl p-8 animate-pulse h-48 opacity-40 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <div className="glass-card rounded-2xl p-6 animate-pulse h-52 opacity-30" />
              <div className="glass-card rounded-2xl p-6 animate-pulse h-24 opacity-20" />
            </div>
            <div className="lg:col-span-4">
              <div className="glass-card rounded-2xl p-6 animate-pulse h-80 opacity-25" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ── 404 ── */
  if (!job) {
    return (
      <AppLayout>
        <div className="jd-page max-w-6xl mx-auto text-center py-24 space-y-5">
          <div className="text-7xl mb-4">🔍</div>
          <h2 className="text-3xl font-black text-text-primary tracking-tight">{t('jobDetail.jobNotFound')}</h2>
          <p className="text-text-secondary text-sm max-w-md mx-auto">{t('jobDetail.jobNotFoundDesc')}</p>
          <button className="jd-btn-apply max-w-xs mx-auto mt-6" onClick={() => navigate(isClientMode ? '/jobs/my-jobs' : '/jobs/browse')}>
            {isClientMode ? t('nav.myJobs') : t('nav.browseJobs')}
          </button>
        </div>
      </AppLayout>
    );
  }

  // AI match gauge
  const matchScore = job.aiMatchScore ?? 0;
  const gR = 18, gC = 2 * Math.PI * gR, gOff = gC * (1 - matchScore / 100);

  return (
    <AppLayout>
      <div className="jd-page max-w-6xl mx-auto">

        {/* ── Breadcrumb ── */}
        <nav className="jd-breadcrumb jd-stagger">
          <a href="#" onClick={e => { e.preventDefault(); navigate(isClientMode ? '/jobs/my-jobs' : '/jobs/browse'); }}>
            {isClientMode ? t('nav.myJobs') : t('nav.browseJobs')}
          </a>
          <ChevronRight size={12} />
          <span className="text-text-primary font-bold truncate max-w-[280px]">{job.title}</span>
        </nav>

        {/* ═══════ HEADER CARD ═══════ */}
        <div className="glass-card jd-header rounded-2xl p-6 md:p-8 mb-6 jd-stagger jd-d1">
          <div className="jd-header-orb jd-header-orb-1" />
          <div className="jd-header-orb jd-header-orb-2" />

          <div className="relative z-10">
            {/* Row 1: Badges + Save/Share */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge-cyan text-[10px]">{job.category}</span>
                {job.isAiRecommended && <span className="badge-purple text-[10px]">⚡ {t('jobDetail.aiMatch')}</span>}
                <span className={`jd-status jd-status-${job.status}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {formatStatus(job.status)}
                </span>
              </div>
              {!isClientMode && (
                <div className="flex gap-1.5 shrink-0">
                  {role === UserRole.Freelancer && (
                    <button
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border border-border hover:border-brand hover:text-brand transition-all bg-surface-muted ${isSavingSavedJob ? 'opacity-60 cursor-not-allowed' : ''}`}
                      onClick={toggleSavedJob}
                      disabled={isSavingSavedJob}
                    >
                      <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
                    </button>
                  )}
                  <button className="w-9 h-9 rounded-xl flex items-center justify-center border border-border hover:border-brand hover:text-brand transition-all bg-surface-muted">
                    <Share2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Row 2: Title */}
            <h1 className="jd-title mb-4">{job.title}</h1>

            {/* Row 3: Meta pills */}
            <div className="jd-meta-row mb-5">
              <span className="jd-meta-pill"><GigCoinBudget min={job.budgetMin} max={job.budgetMax} /></span>
              <span className="jd-meta-pill"><Globe size={12} />{job.isRemote ? t('jobDetail.remote') : t('jobDetail.onSite')}</span>
              <span className="jd-meta-pill"><Users size={12} />{t('jobDetail.proposalsCount', { count: job.proposalCount })}</span>
              <span className="jd-meta-pill"><Clock size={12} />{t('jobDetail.posted', { time: job.postedAt || t('jobDetail.recently') })}</span>
            </div>

            {/* Client owner actions */}
            {isClientMode && role === UserRole.Client && (
              <div className="flex flex-wrap gap-2.5 mb-5">
                {job.visibility === 3 ? (
                  <span className="badge-red text-xs py-2 px-3 inline-flex items-center gap-1.5 font-bold rounded-xl border border-red-500/35 bg-red-500/10">
                    <Lock size={12} className="text-red-500" /> Locked by Admin
                  </span>
                ) : (
                  <button className="jd-btn-edit" onClick={() => navigate(`/jobs/${job.id}/edit`)}><Edit3 size={13} />{t('jobDetail.editPost')}</button>
                )}
                <button className="jd-btn-manage" onClick={() => navigate(`/proposals?job=${job.id}`)}>
                  <FileText size={13} />{t('jobDetail.proposals')}<span className="jd-count">{job.proposalCount}</span>
                </button>
              </div>
            )}

            {/* Row 4: Stat tiles */}
            <div className="jd-stat-row">
              {[
                { label: t('jobDetail.budgetRange'), value: <GigCoinBudget min={job.budgetMin} max={job.budgetMax} /> },
                { label: t('jobDetail.workType'), value: t('jobDetail.fixedPrice') },
                { label: t('jobDetail.deadline'), value: job.deadline || t('jobDetail.flexible') },
                { label: t('jobDetail.proposals'), value: t('jobDetail.proposalsReceived', { count: job.proposalCount }) },
              ].map(s => (
                <div key={s.label} className="jd-stat-item">
                  <div className="jd-stat-label">{s.label}</div>
                  <div className="jd-stat-value">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Row 5: AI Match strip (inline, not a separate card) */}
            {role === UserRole.Freelancer && matchScore > 0 && (
              <div className="jd-ai-strip mt-5">
                <div className="jd-ai-gauge">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r={gR} className="jd-gauge-bg" />
                    <circle cx="22" cy="22" r={gR} className="jd-gauge-bar" strokeDasharray={gC} strokeDashoffset={gOff} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-brand">{matchScore}%</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Bot size={13} className="text-brand" />
                    <span className="text-xs font-black text-text-primary">{t('jobDetail.aiMatchAnalysis')}</span>
                  </div>
                  <div className="jd-ai-factors">
                    {[{ l: t('jobDetail.skills'), p: 92 }, { l: t('jobDetail.profile'), p: 88 }, { l: t('jobDetail.budget'), p: 95 }].map(f => (
                      <div key={f.l}>
                        <div className="flex justify-between text-[9px] font-bold text-text-muted mb-0.5">
                          <span>{f.l}</span><span>{f.p}%</span>
                        </div>
                        <div className="jd-factor-bar-track"><div className="jd-factor-bar-fill" style={{ width: `${f.p}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════ MAIN GRID: 8/4 ═══════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Left Column (8 cols) ── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Description */}
            <div className="glass-card rounded-2xl p-6 md:p-8 jd-stagger jd-d2">
              <h2 className="jd-section-title">{t('jobDetail.jobDescription')}</h2>
              <div className="jd-desc-text">{job.description}</div>
            </div>

            {/* Skills */}
            <div className="glass-card rounded-2xl p-6 md:p-8 jd-stagger jd-d3">
              <h2 className="jd-section-title">{t('jobDetail.requiredSkills')}</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill: string) => (
                  <span key={skill} className="jd-skill-chip">{skill}</span>
                ))}
              </div>
            </div>

            {/* Similar Jobs */}
            {!isClientMode && similarJobs.length > 0 && (
              <div className="glass-card rounded-2xl p-6 md:p-8 jd-stagger jd-d4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="jd-section-title mb-0">{t('jobDetail.similarPositions')}</h2>
                  <button className="flex items-center gap-1 text-[10px] font-black text-brand uppercase tracking-widest hover:underline" onClick={() => navigate('/jobs/browse')}>
                    {t('jobDetail.viewAll')} <ArrowUpRight size={11} />
                  </button>
                </div>
                <div className="space-y-3">
                  {similarJobs.map(sj => (
                    <div key={sj.id} className="jd-similar-card" onClick={() => navigate(`/jobs/${sj.id}`)}>
                      <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/15 flex items-center justify-center text-brand shrink-0">
                        <Briefcase size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-text-primary truncate">{sj.title}</h4>
                        <p className="text-[11px] text-text-muted font-medium mt-0.5">
                          {sj.budgetMin.toLocaleString()}-{sj.budgetMax.toLocaleString()} GigCoin · {t('jobDetail.fixedPrice')} · {sj.isRemote ? t('jobDetail.remote') : t('jobDetail.onSite')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {sj.aiMatchScore && (
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${sj.aiMatchScore >= 90 ? 'bg-success/12 text-success border border-success/25' : 'bg-warning/12 text-warning border border-warning/25'}`}>
                            {sj.aiMatchScore}%
                          </span>
                        )}
                        <ChevronRight size={14} className="text-text-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column (4 cols) — Sticky Sidebar ── */}
          <div className="lg:col-span-4 jd-sidebar">

            {/* Apply Section */}
            {!isClientMode && role === UserRole.Freelancer && (
              <div className="glass-card rounded-2xl p-5 jd-stagger jd-d3">
                <h3 className="jd-section-title">{t('jobDetail.applyToThisJob')}</h3>

                {proposalMessage && (
                  <div className="mb-3 p-2.5 rounded-lg text-xs font-semibold text-warning bg-warning/8 border border-warning/20">
                    {proposalMessage}
                  </div>
                )}

                <div className="jd-gigcoin-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-[8px] font-black text-text-muted uppercase tracking-widest">{t('jobDetail.applicationCost')}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Zap size={13} className="text-brand" />
                        <GigCoinAmount amount={applicationCost} className="text-sm font-black text-text-primary" />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] font-black text-text-muted uppercase tracking-widest">{t('jobDetail.yourBalance')}</span>
                      <span className={`text-sm font-black mt-0.5 block ${canApplyWithGigcoins ? 'text-success' : 'text-destructive'}`}>
                        {applicationCost === 0 && gigcoinBalance === null ? t('jobDetail.free') : <GigCoinAmount amount={gigcoinBalance ?? 0} />} 
                      </span>
                    </div>
                  </div>
                </div>

                {proposalLoading ? (
                  <div className="text-center py-4 text-xs text-text-muted animate-pulse">{t('jobDetail.checkingStatus')}</div>
                ) : myProposal ? (
                  <div className="space-y-2.5">
                    <div className="jd-proposal-banner"><CheckCircle size={14} />{t('jobDetail.proposalStatus', { status: getStatusLabel(myProposal.status) })}</div>
                    {canEditProposal(myProposal.status) && (
                      <button className="jd-btn-apply" onClick={() => navigate(`/proposals/${myProposal.proposalId}/edit`)}><Edit3 size={13} />{t('jobDetail.continueEditing')}</button>
                    )}
                    {canWithdrawProposal(myProposal.status) && (
                      <button className="jd-btn-danger" onClick={handleWithdrawProposal} disabled={isApplying}>{t('jobDetail.withdraw')}</button>
                    )}
                    {canViewProposalAnswers(myProposal.status) && (
                      <button className="jd-btn-secondary" onClick={() => navigate(`/proposals/${myProposal.proposalId}/answers`)}><FileText size={13} />{t('jobDetail.viewAnswers')}</button>
                    )}
                    {[ProposalStatus.Pending, ProposalStatus.Shortlisted, ProposalStatus.Accepted].includes(Number(myProposal.status)) && (
                      <button
                        className="jd-btn-secondary"
                        onClick={() => navigate(`/ai-interview/${encodeURIComponent(job.id)}`, {
                          state: { jobPostId: job.id, jobTitle: job.title },
                        })}
                      >
                        <Bot size={13} /> Start AI Interview
                      </button>
                    )}
                  </div>
                ) : !canApplyToJob ? (
                  <div className="rounded-xl border border-warning/25 bg-warning/8 p-3 text-xs font-semibold text-warning">
                    This job post is no longer accepting proposals.
                  </div>
                ) : canApplyWithGigcoins ? (
                  <button className="jd-btn-apply" onClick={handleApplyJob} disabled={isApplying}>
                    {isApplying ? (<><div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />{t('jobDetail.applying')}</>) : (<><Zap size={15} />{t('jobDetail.applyNow')}</>)}
                  </button>
                ) : (
                  <button className="jd-btn-apply" onClick={() => navigate('/wallet/deposit')} style={{ background: 'linear-gradient(135deg, #9f4bff, #7c3aed)' }}>
                    <Zap size={15} />{t('jobDetail.buyGigCoins')}
                  </button>
                )}
              </div>
            )}

            {/* Client Info */}
            {!isClientMode && (
              <div className="glass-card rounded-2xl p-5 jd-stagger jd-d4">
                <h3 className="jd-section-title">{t('jobDetail.aboutClient')}</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="jd-avatar-ring">
                    <div className="jd-avatar-inner">{client?.full_name?.charAt(0) || '?'}</div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-text-primary font-black text-sm truncate">{client?.full_name || 'Client'}</p>
                    <p className="text-[10px] text-text-muted font-medium truncate">{clientProfile?.company_name || 'Company'}</p>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="jd-client-row">
                    <span className="text-[11px] text-text-muted font-semibold">{t('jobDetail.rating')}</span>
                    <div className="flex items-center gap-1">
                      <Star size={11} fill="#F59E0B" className="text-warning" />
                      <span className="text-xs font-black text-text-primary">{clientProfile?.rating ?? '—'}</span>
                      <span className="text-[10px] text-text-muted">({clientProfile?.reviewCount ?? 0})</span>
                    </div>
                  </div>
                  <div className="jd-client-row">
                    <span className="text-[11px] text-text-muted font-semibold">{t('jobDetail.totalSpent')}</span>
                    <span className="text-xs font-black text-text-primary"><GigCoinAmount amount={clientProfile?.totalSpent || 0} /></span>
                  </div>
                  <div className="jd-client-row">
                    <span className="text-[11px] text-text-muted font-semibold">{t('jobDetail.jobsPosted')}</span>
                    <span className="text-xs font-black text-text-primary">{clientProfile?.postedJobs ?? '—'}</span>
                  </div>
                  <div className="jd-client-row">
                    <span className="text-[11px] text-text-muted font-semibold">{t('jobDetail.hireRate')}</span>
                    <span className="text-xs font-black text-success">82%</span>
                  </div>
                </div>
                {clientProfile?.isVerifiedClient && (
                  <div className="jd-verified"><CheckCircle size={12} />{t('jobDetail.paymentVerified')}</div>
                )}
                <button className="jd-btn-secondary mt-3" onClick={() => navigate(`/profile/client/${client?.id || job.clientId}`)}>{t('jobDetail.viewClientProfile')}</button>
              </div>
            )}

            {/* Quick Facts */}
            <div className="glass-card rounded-2xl p-5 jd-stagger jd-d5">
              <h3 className="jd-section-title">{t('jobDetail.quickFacts')}</h3>
              <div className="space-y-0.5">
                {[
                  { label: t('jobDetail.budget'), val: <GigCoinBudget min={job.budgetMin} max={job.budgetMax} /> },
                  { label: t('jobDetail.type'), val: t('jobDetail.fixedPrice') },
                  { label: t('jobDetail.location'), val: job.isRemote ? t('jobDetail.remoteWorldwide') : t('jobDetail.onSite') },
                  { label: t('jobDetail.proposals'), val: t('jobDetail.submitted', { count: job.proposalCount }) },
                  { label: t('jobDetail.deadline'), val: job.deadline || t('jobDetail.flexible') },
                ].map(r => (
                  <div key={r.label} className="jd-client-row">
                    <span className="text-[11px] text-text-muted font-semibold">{r.label}</span>
                    <span className="text-xs font-black text-text-primary">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
