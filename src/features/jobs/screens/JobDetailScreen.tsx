import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { toast } from 'sonner';
import {
  Clock, Users, Globe, CheckCircle,
  Bot, Bookmark, Share2, ChevronRight, Zap, Edit3, FileText,
  Briefcase, ArrowUpRight, Lock, ShieldCheck, Sparkles, Award,
  Check, DollarSign, Calendar, MapPin, Building2, Shield,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserRole } from '../../../types/models/User';
import { canEditProposal, canViewProposalAnswers, canWithdrawProposal, getStatusLabel } from '../../proposals/utils/statusHelpers';
import { useJobDetail } from '../hooks/useJobDetail';
import '../styles/job-detail-screen.css';
import { GigCoinBudget } from '../../../shared/components/GigCoinAmount';
import { useTranslation } from '../../../hooks/useTranslation';
import { NestedMilestonePlanEditor, type EditableMilestonePlan } from '../../../shared/components/NestedMilestonePlanEditor';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { getProfilePath } from '../../../shared/hooks/useProfileNavigation';
import { renderDescription } from '../utils/descriptionFormatter';

export default function JobDetailScreen() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const {
    navigate,
    role,
    isClientMode,
    job,
    client,
    clientProfile,
    similarJobs,
    myProposal,
    isSaved,
    loading,
    proposalLoading,
    isApplying,
    isSavingSavedJob,
    proposalMessage,
    proposalCheckFailed,
    canApplyToJob,
    formatStatus,
    toggleSavedJob,
    handleApplyJob,
    handleContinueEditingProposal,
    handleWithdrawProposal,
  } = useJobDetail();

  // Date formatter for Deadline
  const formatDeadlineDate = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // AI Match Score gauge setup
  const matchScore = job?.aiMatchScore ?? 0;
  const gR = 22;
  const gC = 2 * Math.PI * gR;
  const gOff = gC * (1 - matchScore / 100);

  // Reusable GSAP Entrance Hook
  usePageGSAP({
    containerRef,
    loading: loading || !job,
    groups: [
      { selector: '.jd-gsap-hero', y: 24, duration: 0.6 },
      { selector: '.jd-gsap-ai', y: 16, duration: 0.45 },
      { selector: '.jd-gsap-card', y: 20, duration: 0.5, stagger: 0.08 },
      { selector: '.jd-gsap-sidebar', y: 20, duration: 0.5, stagger: 0.1 },
    ],
    onAnimate: (_context, mult) => {
      gsap.fromTo('.jd-factor-fill',
        { width: '0%' },
        {
          width: (_i, target: HTMLElement) => target.dataset.width || '0%',
          duration: 0.85 * mult,
          stagger: 0.1 * mult,
          ease: 'power2.out'
        }
      );
      if (matchScore > 0) {
        gsap.fromTo('.jd-gauge-bar',
          { strokeDashoffset: gC },
          { strokeDashoffset: gOff, duration: 1.2 * mult, ease: 'power2.out' }
        );
      }
    },
    dependencies: [job?.id],
  });

  // Share job link
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success(t('jobDetail.linkCopied') || 'Job link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* ── Loading Skeleton ── */
  if (loading) {
    return (
      <AppLayout>
        <div className="jd-page max-w-6xl mx-auto">
          <div className="jd-glass-card rounded-2xl p-8 animate-pulse h-52 opacity-40 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <div className="jd-glass-card rounded-2xl p-6 animate-pulse h-56 opacity-30" />
              <div className="jd-glass-card rounded-2xl p-6 animate-pulse h-28 opacity-20" />
            </div>
            <div className="lg:col-span-4">
              <div className="jd-glass-card rounded-2xl p-6 animate-pulse h-80 opacity-25" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ── 404 Job Not Found ── */
  if (!job) {
    return (
      <AppLayout>
        <div className="jd-page max-w-6xl mx-auto text-center py-24 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand text-2xl mx-auto mb-4">
            🔍
          </div>
          <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">{t('jobDetail.jobNotFound')}</h2>
          <p className="text-text-secondary text-sm max-w-md mx-auto">{t('jobDetail.jobNotFoundDesc')}</p>
          <button
            className="jd-btn-apply max-w-xs mx-auto mt-6"
            onClick={() => navigate(isClientMode ? '/jobs/my-jobs' : '/jobs/browse')}
          >
            {isClientMode ? t('nav.myJobs') : t('nav.browseJobs')}
          </button>
        </div>
      </AppLayout>
    );
  }

  // Client profile navigation path
  const clientProfileUserId = clientProfile?.userId || client?.id || job?.userId || job?.clientUserId || null;
  const clientProfilePath = getProfilePath(clientProfileUserId, 'client');

  return (
    <AppLayout>
      <div ref={containerRef} className="jd-page max-w-6xl mx-auto">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center justify-between gap-4 mb-5 jd-gsap-hero">
          <nav className="jd-breadcrumb">
            <a
              href="#"
              onClick={e => {
                e.preventDefault();
                navigate(isClientMode ? '/jobs/my-jobs' : '/jobs/browse');
              }}
            >
              {isClientMode ? t('nav.myJobs') : t('nav.browseJobs')}
            </a>
            <ChevronRight size={12} />
            <span className="text-text-primary font-semibold truncate max-w-[240px]">{job.title}</span>
          </nav>

          {!isClientMode && (
            <div className="flex items-center gap-2 shrink-0">
              {role === UserRole.Freelancer && (
                <button
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border border-border hover:border-brand hover:text-brand transition-all bg-surface-muted/80 backdrop-blur-md ${isSavingSavedJob ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  onClick={toggleSavedJob}
                  disabled={isSavingSavedJob}
                  title={isSaved ? 'Remove from saved' : 'Save job'}
                >
                  <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} className={isSaved ? 'text-brand' : ''} />
                </button>
              )}

              <button
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-border hover:border-brand hover:text-brand transition-all bg-surface-muted/80 backdrop-blur-md"
                onClick={handleShare}
                title="Copy job link"
              >
                {copied ? <Check size={15} className="text-success" /> : <Share2 size={15} />}
              </button>
            </div>
          )}
        </div>

        {/* ═══════ HERO HEADER CARD (Clean Executive Design) ═══════ */}
        <div className="jd-glass-card jd-hero-card p-6 md:p-8 mb-6 jd-gsap-hero">
          {/* Subtle Ambient Glow */}
          <div className="jd-glow-orb" />

          <div className="relative z-10">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="badge-indigo">
                <Sparkles size={11} /> {job.category}
              </span>

              {job.isAiRecommended && (
                <span className="badge-purple">
                  <Zap size={11} /> {t('jobDetail.aiMatch')}
                </span>
              )}

              {job.hasAiInterview && role === UserRole.Freelancer && (
                <span className="badge-purple">
                  <Bot size={12} /> {t('jobs.aiInterviewTag')}
                </span>
              )}

              <span className={`jd-status-pill jd-status-${job.status}`}>
                <span className="jd-status-dot" />
                {formatStatus(job.status)}
              </span>
            </div>

            {/* Main Job Title */}
            <h1 className="jd-title mb-5">{job.title}</h1>

            {/* Integrated Hero Key Specs Banner */}
            <div className="jd-hero-banner">
              <div className="jd-hero-banner-item">
                <div className="jd-hero-banner-label">Budget Range</div>
                <div className="jd-hero-banner-val text-brand">
                  <GigCoinBudget min={job.budgetMin} max={job.budgetMax} />
                </div>
              </div>

              <div className="jd-hero-banner-divider" />

              <div className="jd-hero-banner-item">
                <div className="jd-hero-banner-label">Location</div>
                <div className="jd-hero-banner-val flex items-center gap-1.5">
                  <Globe size={13} className="text-text-muted" />
                  {job.isRemote ? t('jobDetail.remote') : t('jobDetail.onSite')}
                </div>
              </div>

              <div className="jd-hero-banner-divider" />

              <div className="jd-hero-banner-item">
                <div className="jd-hero-banner-label">Proposals</div>
                <div className="jd-hero-banner-val flex items-center gap-1.5">
                  <Users size={13} className="text-text-muted" />
                  {t('jobDetail.proposalsCount', { count: job.proposalCount })}
                </div>
              </div>

              <div className="jd-hero-banner-divider" />

              <div className="jd-hero-banner-item">
                <div className="jd-hero-banner-label">Posted</div>
                <div className="jd-hero-banner-val flex items-center gap-1.5">
                  <Clock size={13} className="text-text-muted" />
                  {job.postedAt || t('jobDetail.recently')}
                </div>
              </div>
            </div>

            {/* Client Owner Action Toolbar */}
            {isClientMode && role === UserRole.Client && (
              <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-border">
                {job.visibility === 3 ? (
                  <span className="badge-red text-xs py-2 px-3 inline-flex items-center gap-1.5 font-bold rounded-xl border border-red-500/35 bg-red-500/10">
                    <Lock size={13} className="text-red-500" /> Locked by Admin
                  </span>
                ) : (
                  <button className="jd-btn-edit" onClick={() => navigate(`/jobs/${job.id}/edit`)}>
                    <Edit3 size={14} />
                    {t('jobDetail.editPost')}
                  </button>
                )}

                <button className="jd-btn-manage" onClick={() => navigate(`/proposals?job=${job.id}`)}>
                  <FileText size={14} />
                  {t('jobDetail.proposals')}
                  <span className="jd-count">{job.proposalCount}</span>
                </button>
              </div>
            )}

            {/* AI Match Spotlight Strip */}
            {role === UserRole.Freelancer && matchScore > 0 && (
              <div className="jd-ai-strip mt-5 jd-gsap-ai">
                <div className="jd-ai-gauge-container">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
                    <defs>
                      <linearGradient id="aiGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#494be7" />
                        <stop offset="100%" stopColor="#9f4bff" />
                      </linearGradient>
                    </defs>
                    <circle cx="26" cy="26" r={gR} className="jd-gauge-bg" />
                    <circle
                      cx="26"
                      cy="26"
                      r={gR}
                      className="jd-gauge-bar"
                      strokeDasharray={gC}
                      strokeDashoffset={gC}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-brand">
                    {matchScore}%
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Bot size={15} className="text-brand" />
                      <span className="text-xs font-bold text-text-primary">{t('jobDetail.aiMatchAnalysis')}</span>
                    </div>
                    <span className="text-[10px] font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full border border-brand/20">
                      High Match
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: t('jobDetail.skills'), pct: 92 },
                      { label: t('jobDetail.profile'), pct: 88 },
                      { label: t('jobDetail.budget'), pct: 95 },
                    ].map(f => (
                      <div key={f.label}>
                        <div className="flex justify-between text-[10px] font-semibold text-text-muted mb-1">
                          <span>{f.label}</span>
                          <span className="text-text-primary">{f.pct}%</span>
                        </div>
                        <div className="jd-factor-track">
                          <div className="jd-factor-fill" data-width={`${f.pct}%`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════ MAIN CONTENT GRID: 8 Cols / 4 Cols ═══════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── LEFT COLUMN (8 cols) ── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Job Description Card */}
            <div className="jd-glass-card rounded-2xl p-6 md:p-8 jd-gsap-card">
              <h2 className="jd-section-title">{t('jobDetail.jobDescription')}</h2>
              <div className="jd-desc-text whitespace-pre-line">{renderDescription(job.description)}</div>
            </div>

            {/* Baseline Milestone Plan */}
            {job.milestonePlans?.length ? (
              <div className="jd-glass-card rounded-2xl p-6 md:p-8 jd-gsap-card">
                <NestedMilestonePlanEditor
                  value={job.milestonePlans as EditableMilestonePlan[]}
                  onChange={() => undefined}
                  readOnly
                  showDueDate
                  showWorkItems={job.milestonePlans.some(milestone => milestone.workItems.length > 0)}
                  title="Client Baseline Milestone Plan"
                  description="Review the milestone outcomes and acceptance criteria before preparing your proposal."
                />
              </div>
            ) : null}

            {/* Required Skills Cloud */}
            <div className="jd-glass-card rounded-2xl p-6 md:p-8 jd-gsap-card">
              <h2 className="jd-section-title">{t('jobDetail.requiredSkills')}</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill: string) => (
                  <span key={skill} className="jd-skill-chip">
                    <Award size={12} className="text-brand shrink-0" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Similar Positions */}
            {!isClientMode && similarJobs.length > 0 && (
              <div className="jd-glass-card rounded-2xl p-6 md:p-8 jd-gsap-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="jd-section-title mb-0">{t('jobDetail.similarPositions')}</h2>
                  <button
                    className="flex items-center gap-1 text-[11px] font-bold text-brand uppercase tracking-wider hover:underline"
                    onClick={() => navigate('/jobs/browse')}
                  >
                    {t('jobDetail.viewAll')} <ArrowUpRight size={12} />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {similarJobs.map(sj => (
                    <div
                      key={sj.id}
                      className="jd-similar-card"
                      onClick={() => navigate(`/jobs/${sj.id}`)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
                        <Briefcase size={16} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-text-primary truncate">
                          {sj.title}
                        </h4>
                        <p className="text-[11px] text-text-muted font-medium mt-0.5">
                          {sj.budgetMin.toLocaleString()} - {sj.budgetMax.toLocaleString()} GigCoin · {t('jobDetail.fixedPrice')} · {sj.isRemote ? t('jobDetail.remote') : t('jobDetail.onSite')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {sj.aiMatchScore && (
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${sj.aiMatchScore >= 90
                              ? 'bg-success/12 text-success border border-success/25'
                              : 'bg-warning/12 text-warning border border-warning/25'
                              }`}
                          >
                            {sj.aiMatchScore}%
                          </span>
                        )}
                        <ChevronRight size={15} className="text-text-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN (4 cols) — STICKY SIDEBAR ── */}
          <div className="lg:col-span-4 jd-sidebar">

            {/* Apply & Proposal Action Box */}
            {!isClientMode && role === UserRole.Freelancer && (
              <div className="jd-glass-card rounded-2xl p-6 jd-gsap-sidebar">
                <h3 className="jd-section-title">{t('jobDetail.applyToThisJob')}</h3>

                {proposalMessage && (
                  <div className="mb-4 p-3 rounded-xl text-xs font-semibold text-warning bg-warning/10 border border-warning/20">
                    {proposalMessage}
                  </div>
                )}

                {/* Proposal Status & Action Buttons */}
                {proposalLoading ? (
                  <div className="text-center py-4 text-xs text-text-muted animate-pulse">
                    {t('jobDetail.checkingStatus')}
                  </div>
                ) : myProposal ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/25 text-xs font-bold text-success mb-2">
                      <CheckCircle size={15} />
                      {t('jobDetail.proposalStatus', { status: getStatusLabel(myProposal.status) })}
                    </div>

                    {job.hasAiInterview && Number(myProposal.status) === 0 && !myProposal.aiInterviewCompleted && (
                      <button
                        className="jd-btn-apply"
                        onClick={() => navigate(`/ai-interview/${encodeURIComponent(job.id)}?proposalId=${myProposal.proposalId}`)}
                        style={{ background: 'var(--brand)', boxShadow: '0 4px 14px -2px rgba(73,75,231,0.3)' }}
                      >
                        <Bot size={14} />
                        {myProposal.aiInterviewInProgress || localStorage.getItem(`ai_interview_session_${job.id}`)
                          ? (t('aiInterview.proposal.continueAction') || 'Continue AI Interview')
                          : (t('aiInterview.proposal.startAction') || 'Start AI Interview')}
                      </button>
                    )}

                    {canEditProposal(myProposal.status) && (
                      <button
                        className="jd-btn-secondary"
                        onClick={handleContinueEditingProposal}
                        disabled={isApplying}
                      >
                        <Edit3 size={14} />
                        {t('jobDetail.continueEditing')}
                      </button>
                    )}

                    {canWithdrawProposal(myProposal.status) && (
                      <button
                        className="jd-btn-danger"
                        onClick={handleWithdrawProposal}
                        disabled={isApplying}
                      >
                        {t('jobDetail.withdraw')}
                      </button>
                    )}

                    {canViewProposalAnswers(myProposal.status) && (
                      <button
                        className="jd-btn-secondary"
                        onClick={() => navigate(`/proposals/${myProposal.proposalId}/answers`)}
                      >
                        <FileText size={14} />
                        {t('jobDetail.viewAnswers')}
                      </button>
                    )}
                  </div>
                ) : proposalCheckFailed ? (
                  <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs font-semibold text-red-500">
                    Unable to verify your proposal status. Please refresh or try again later.
                  </div>
                ) : !canApplyToJob ? (
                  <div className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-xs font-semibold text-warning">
                    This job post is no longer accepting proposals.
                  </div>
                ) : (
                  <button className="jd-btn-apply" onClick={handleApplyJob} disabled={isApplying}>
                    {isApplying ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        {t('jobDetail.applying')}
                      </>
                    ) : job.hasAiInterview ? (
                      t('jobs.applyWithAiInterview')
                    ) : (
                      t('jobDetail.applyNow')
                    )}
                  </button>
                )}
              </div>
            )}

            {/* About Client Card */}
            {!isClientMode && (
              <div className="jd-glass-card rounded-2xl p-6 jd-gsap-sidebar">
                <h3 className="jd-section-title">{t('jobDetail.aboutClient')}</h3>

                <UserProfileLink userId={clientProfileUserId} role="client" className="flex items-center gap-3.5 mb-4 group">
                  <UserAvatar name={client?.fullName || job?.clientFullName || 'Client'} src={clientProfile?.userAvatar} userId={clientProfileUserId} size="md" />
                  <div className="min-w-0">
                    <p className="text-text-primary font-bold text-sm truncate group-hover:text-brand transition-colors">
                      {client?.fullName || job?.clientFullName || 'Client'}
                    </p>
                    <p className="text-[11px] text-text-muted font-medium truncate flex items-center gap-1 mt-0.5">
                      <Building2 size={12} className="text-brand shrink-0" />
                      {clientProfile?.companyName || 'Individual Client'}
                    </p>
                  </div>
                </UserProfileLink>

                <div className="space-y-0.5 mb-4">
                  {clientProfile?.industry && (
                    <div className="jd-spec-row">
                      <span className="jd-spec-label flex items-center gap-1">
                        <Building2 size={12} /> Industry
                      </span>
                      <span className="jd-spec-val">{clientProfile.industry}</span>
                    </div>
                  )}

                  {clientProfile?.location && (
                    <div className="jd-spec-row">
                      <span className="jd-spec-label flex items-center gap-1">
                        <MapPin size={12} /> {t('jobDetail.location')}
                      </span>
                      <span className="jd-spec-val">{clientProfile.location}</span>
                    </div>
                  )}

                  <div className="jd-spec-row">
                    <span className="jd-spec-label flex items-center gap-1">
                      <ShieldCheck size={12} className="text-success" /> Payment Verified
                    </span>
                    <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
                      Verified
                    </span>
                  </div>
                </div>

                <button
                  className="jd-btn-secondary"
                  disabled={!clientProfilePath}
                  onClick={() => clientProfilePath && navigate(clientProfilePath)}
                >
                  {t('jobDetail.viewClientProfile')}
                </button>
              </div>
            )}

            {/* Redesigned Quick Facts Card (Clean Executive List) */}
            <div className="jd-glass-card rounded-2xl p-6 jd-gsap-sidebar">
              <h3 className="jd-section-title">{t('jobDetail.quickFacts')}</h3>

              <div className="space-y-1 mb-5">
                <div className="jd-spec-row">
                  <span className="jd-spec-label flex items-center gap-1.5">
                    <DollarSign size={13} className="text-brand" />
                    {t('jobDetail.budget')}
                  </span>
                  <span className="jd-spec-val text-brand font-bold">
                    <GigCoinBudget min={job.budgetMin} max={job.budgetMax} />
                  </span>
                </div>

                <div className="jd-spec-row">
                  <span className="jd-spec-label flex items-center gap-1.5">
                    <Briefcase size={13} className="text-brand" />
                    {t('jobDetail.type')}
                  </span>
                  <span className="jd-spec-val">{t('jobDetail.fixedPrice')}</span>
                </div>

                <div className="jd-spec-row">
                  <span className="jd-spec-label flex items-center gap-1.5">
                    <Calendar size={13} className="text-brand" />
                    {t('jobDetail.deadline')}
                  </span>
                  <span className="jd-spec-val">{formatDeadlineDate(job.deadline) || t('jobDetail.flexible')}</span>
                </div>

                <div className="jd-spec-row">
                  <span className="jd-spec-label flex items-center gap-1.5">
                    <Users size={13} className="text-brand" />
                    {t('jobDetail.proposals')}
                  </span>
                  <span className="jd-spec-val">{t('jobDetail.submitted', { count: job.proposalCount })}</span>
                </div>

                <div className="jd-spec-row">
                  <span className="jd-spec-label flex items-center gap-1.5">
                    <Globe size={13} className="text-brand" />
                    {t('jobDetail.location')}
                  </span>
                  <span className="jd-spec-val">{job.isRemote ? t('jobDetail.remoteWorldwide') : t('jobDetail.onSite')}</span>
                </div>

                <div className="jd-spec-row">
                  <span className="jd-spec-label flex items-center gap-1.5">
                    <Clock size={13} className="text-brand" />
                    {t('jobs.postedDate')}
                  </span>
                  <span className="jd-spec-val">{job.postedAt || t('jobDetail.recently')}</span>
                </div>
              </div>

              {/* Escrow Protection Badge */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-muted border border-border text-xs font-medium text-text-secondary">
                <Shield size={15} className="text-brand shrink-0" />
                <span>Protected by GigBridge Escrow Protection</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
