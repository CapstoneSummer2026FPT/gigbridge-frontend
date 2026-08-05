import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  Eye,
  MessageSquareQuote,
  Send,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { getProposalCreatePath } from '../../proposals/utils/proposalRoutes';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { jobInvitationAPI } from '../../../api/jobInvitationAPI';
import { UserRole } from '../../../types/models/User';
import { JobInvitationStatus, type JobInvitationDto } from '../../../types/jobInvitation';
import { GigCoinBudget } from '../../../shared/components/GigCoinAmount';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { useTranslation } from '../../../hooks/useTranslation';

type StatusFilter = 'all' | 'active' | 'applied' | 'declined' | 'cancelled';

const getInvitationId = (invitation: JobInvitationDto): string =>
  invitation.jobInvitationId ?? invitation.jobInvitationsId ?? '';

const getInvitationJobPostId = (invitation: JobInvitationDto): string =>
  invitation.jobPostId ?? invitation.jobPostsId ?? '';

const isActiveInvitation = (invitation: JobInvitationDto): boolean => {
  const status = Number(invitation.status);
  return status === JobInvitationStatus.Pending || status === JobInvitationStatus.Viewed;
};

const statusLabelKey = (status?: number): string => {
  switch (Number(status)) {
    case JobInvitationStatus.Pending:
      return 'jobInvitations.active';
    case JobInvitationStatus.Viewed:
      return 'jobInvitations.active';
    case JobInvitationStatus.Applied:
      return 'jobInvitations.applied';
    case JobInvitationStatus.Declined:
      return 'jobInvitations.declined';
    case JobInvitationStatus.Expired:
      return 'jobInvitations.cancelled';
    case JobInvitationStatus.Cancelled:
      return 'jobInvitations.cancelled';
    default:
      return 'jobInvitations.all';
  }
};

const statusBadgeClass = (status?: number): string => {
  switch (Number(status)) {
    case JobInvitationStatus.Pending:
      return 'border border-brand/20 bg-brand/10 text-brand';
    case JobInvitationStatus.Viewed:
      return 'border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400';
    case JobInvitationStatus.Applied:
      return 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case JobInvitationStatus.Declined:
    case JobInvitationStatus.Cancelled:
    case JobInvitationStatus.Expired:
      return 'border border-rose-500/20 bg-rose-500/10 text-rose-500';
    default:
      return 'border border-border bg-surface-muted text-text-muted';
  }
};

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const skillNames = (invitation: JobInvitationDto): string[] => [
  ...(invitation.skills || []).map(skill => skill.name || '').filter(Boolean),
  ...(invitation.customSkillNames || []),
];

export default function JobInvitationsScreen() {
  const { t } = useTranslation(['jobs', 'common']);
  const navigate = useNavigate();
  const { role } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);

  const [invitations, setInvitations] = useState<JobInvitationDto[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningIds, setActioningIds] = useState<Set<string>>(new Set());

  // Decline Modal State
  const [declineTarget, setDeclineTarget] = useState<JobInvitationDto | null>(null);
  const [declineReasonText, setDeclineReasonText] = useState('');

  const isFreelancer = role === UserRole.Freelancer;

  useEffect(() => {
    let isMounted = true;

    const loadInvitations = async () => {
      if (!isFreelancer) {
        setInvitations([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await jobInvitationAPI.getMyInvitations({ page: 1, pageSize: 100 });
        if (isMounted) setInvitations(data);
      } catch (err) {
        if (!isMounted) return;
        setInvitations([]);
        setError(err instanceof Error ? err.message : t('jobInvitations.loadingError', { defaultValue: 'Job invitations could not be loaded.' }));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInvitations();

    return () => {
      isMounted = false;
    };
  }, [isFreelancer, t]);

  // GSAP Entrance animation
  usePageGSAP({
    containerRef,
    loading,
    groups: [
      { selector: '.jis-gsap-header', y: 20, duration: 0.55 },
      { selector: '.jis-gsap-tabs', y: 14, duration: 0.45 },
      { selector: '.jis-gsap-card', y: 24, duration: 0.5, stagger: 0.08 },
    ],
  });

  const filteredInvitations = useMemo(() => {
    return invitations.filter(invitation => {
      const status = Number(invitation.status);
      if (statusFilter === 'active') return isActiveInvitation(invitation);
      if (statusFilter === 'applied') return status === JobInvitationStatus.Applied;
      if (statusFilter === 'declined') return status === JobInvitationStatus.Declined;
      if (statusFilter === 'cancelled') return status === JobInvitationStatus.Cancelled || status === JobInvitationStatus.Expired;
      return true;
    });
  }, [invitations, statusFilter]);

  const countByStatus = useMemo(() => {
    const counts = { all: invitations.length, active: 0, applied: 0, declined: 0, cancelled: 0 };
    invitations.forEach(inv => {
      if (isActiveInvitation(inv)) counts.active += 1;
      else if (Number(inv.status) === JobInvitationStatus.Applied) counts.applied += 1;
      else if (Number(inv.status) === JobInvitationStatus.Declined) counts.declined += 1;
      else counts.cancelled += 1;
    });
    return counts;
  }, [invitations]);

  const updateInvitation = (updated: JobInvitationDto) => {
    const updatedId = getInvitationId(updated);
    setInvitations(prev => prev.map(invitation =>
      getInvitationId(invitation) === updatedId ? { ...invitation, ...updated } : invitation
    ));
  };

  const withAction = async (invitationId: string, action: () => Promise<void>) => {
    setActioningIds(prev => new Set(prev).add(invitationId));
    try {
      await action();
    } finally {
      setActioningIds(prev => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  const viewJob = async (invitation: JobInvitationDto) => {
    const invitationId = getInvitationId(invitation);
    const jobPostId = getInvitationJobPostId(invitation);
    if (!jobPostId) {
      toast.error('This invitation is missing a job post id.');
      return;
    }

    await withAction(invitationId, async () => {
      try {
        if (isActiveInvitation(invitation) && Number(invitation.status) === JobInvitationStatus.Pending) {
          updateInvitation(await jobInvitationAPI.markViewed(invitationId));
        }
      } catch (err) {
        console.error('Failed to mark invitation viewed:', err);
      } finally {
        navigate(`/jobs/${jobPostId}`);
      }
    });
  };

  const createProposal = async (invitation: JobInvitationDto) => {
    const invitationId = getInvitationId(invitation);
    const jobPostId = getInvitationJobPostId(invitation);
    if (!jobPostId) {
      toast.error('This invitation is missing a job post id.');
      return;
    }

    await withAction(invitationId, async () => {
      try {
        if (isActiveInvitation(invitation)) {
          updateInvitation(await jobInvitationAPI.markApplied(invitationId));
          toast.success(t('jobInvitations.appliedToast', { defaultValue: 'Invitation marked as applied.' }));
        }
        navigate(getProposalCreatePath(jobPostId, invitationId));
      } catch (err) {
        console.error('Failed to apply invitation:', err);
        toast.error(err instanceof Error ? err.message : 'Invitation could not be marked as applied.');
      }
    });
  };

  const confirmDeclineInvitation = async () => {
    if (!declineTarget) return;
    const invitationId = getInvitationId(declineTarget);
    const reason = declineReasonText.trim();

    setDeclineTarget(null);
    setDeclineReasonText('');

    await withAction(invitationId, async () => {
      try {
        updateInvitation(await jobInvitationAPI.declineInvitation(invitationId, { reason }));
        toast.success(t('jobInvitations.declinedToast', { defaultValue: 'Invitation declined.' }));
      } catch (err) {
        console.error('Failed to decline invitation:', err);
        toast.error(err instanceof Error ? err.message : 'Invitation could not be declined.');
      }
    });
  };

  if (!isFreelancer) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl py-20 px-4 text-center">
          <div className="rounded-3xl border border-border bg-background p-10 shadow-sm">
            <AlertCircle size={44} className="mx-auto mb-4 text-brand" />
            <p className="text-base font-bold text-text-primary">
              {t('jobInvitations.freelancersOnly')}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Loading state
  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
          <LemniscateBloomLoader label={t('jobInvitations.loading')} tag="Invitations" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div ref={containerRef} className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:py-8">

        {/* ── Top Header ─────────────────────────────────────────────────────── */}
        <div className="jis-gsap-header mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
              {t('jobInvitations.titleWord1')} <span className="text-brand italic font-light">{t('jobInvitations.titleWord2')}</span>
            </h1>
            <p className="mt-1 text-sm font-semibold text-text-secondary">
              {t('jobInvitations.subtitle')}
            </p>
          </div>
        </div>

        {/* ── Filter Tabs Bar ────────────────────────────────────────────────── */}
        <div className="jis-gsap-tabs mb-6 flex flex-wrap gap-2 rounded-2xl border border-border bg-background p-2 shadow-sm">
          {[
            { key: 'active', label: t('jobInvitations.active'), count: countByStatus.active },
            { key: 'all', label: t('jobInvitations.all'), count: countByStatus.all },
            { key: 'applied', label: t('jobInvitations.applied'), count: countByStatus.applied },
            { key: 'declined', label: t('jobInvitations.declined'), count: countByStatus.declined },
            { key: 'cancelled', label: t('jobInvitations.cancelled'), count: countByStatus.cancelled },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key as StatusFilter)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-surface-muted text-text-muted'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Main Content List ──────────────────────────────────────────────── */}
        {error ? (
          <div className="rounded-3xl border border-border bg-background p-10 text-center shadow-sm">
            <AlertCircle size={44} className="mx-auto mb-3 text-rose-500" />
            <p className="text-base font-bold text-text-primary mb-2">{error}</p>
          </div>
        ) : filteredInvitations.length === 0 ? (
          /* Empty State */
          <div className="jis-gsap-header rounded-3xl border border-border bg-background p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Briefcase size={32} />
            </div>
            <h2 className="text-xl font-black text-text-primary mb-2">
              {t('jobInvitations.noInvitations')}
            </h2>
            <p className="mx-auto max-w-md text-xs font-medium leading-relaxed text-text-secondary mb-6">
              {t('jobInvitations.noInvitationsDesc')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/jobs/browse')}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
              style={{
                background: 'var(--brand)',
                boxShadow: '0 6px 20px -4px rgba(73,75,231,0.35)',
              }}
            >
              <Briefcase size={15} /> {t('jobInvitations.browseJobs')}
            </button>
          </div>
        ) : (
          /* Cards List */
          <div className="space-y-4">
            {filteredInvitations.map(invitation => {
              const invitationId = getInvitationId(invitation);
              const isActioning = actioningIds.has(invitationId);
              const active = isActiveInvitation(invitation);
              const isApplied = Number(invitation.status) === JobInvitationStatus.Applied;
              const isDeclined = Number(invitation.status) === JobInvitationStatus.Declined;
              const isCancelled = Number(invitation.status) === JobInvitationStatus.Cancelled || Number(invitation.status) === JobInvitationStatus.Expired;
              const skills = skillNames(invitation);

              return (
                <div
                  key={invitationId}
                  className="jis-gsap-card rounded-2xl border border-border bg-background p-5 md:p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-brand/30"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                    {/* Left Details */}
                    <div className="min-w-0 flex-1 space-y-3">
                      {/* Title & Status badge */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${statusBadgeClass(invitation.status)}`}>
                            {t(statusLabelKey(invitation.status))}
                          </span>

                          {invitation.categoryName && (
                            <span className="rounded-full border border-brand/20 bg-brand/10 px-2.5 py-0.5 text-[10px] font-extrabold text-brand uppercase tracking-wider">
                              {invitation.categoryName}
                            </span>
                          )}
                        </div>

                        <h2
                          onClick={() => viewJob(invitation)}
                          className="text-base font-bold text-text-primary hover:text-brand transition-colors cursor-pointer leading-snug tracking-tight"
                        >
                          {invitation.jobTitle || 'Lời mời dự án'}
                        </h2>
                      </div>

                      {/* Job Description preview */}
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                        {invitation.jobDescription || 'Không có mô tả chi tiết.'}
                      </p>

                      {/* Client Message Block */}
                      {invitation.message && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-brand/15 bg-brand/5 p-3 text-xs">
                          <MessageSquareQuote size={16} className="mt-0.5 shrink-0 text-brand" />
                          <div>
                            <span className="font-extrabold text-brand block mb-0.5">
                              {t('jobInvitations.clientMessage')}
                            </span>
                            <p className="text-text-primary font-medium italic">"{invitation.message}"</p>
                          </div>
                        </div>
                      )}

                      {/* Skills Tags */}
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {skills.slice(0, 8).map(skill => (
                            <span
                              key={skill}
                              className="rounded-lg border border-border bg-surface-muted/70 px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:border-brand/30 hover:text-brand"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Metadata Row */}
                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-semibold text-text-muted">
                        <span className="flex items-center gap-1.5 text-brand font-bold">
                          <GigCoinBudget min={invitation.budgetMin} max={invitation.budgetMax} />
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock size={13} className="text-text-muted" />
                          {t('jobInvitations.invitedAt', { date: formatDate(invitation.createdAt) })}
                        </span>

                        <span className="flex items-center gap-1 text-text-secondary">
                          <User size={13} className="text-brand" />
                          {t('jobInvitations.client')}:{' '}
                          <UserProfileLink userId={invitation.clientUserId} role="client">
                            {invitation.clientCompanyName || invitation.clientName || 'Khách hàng'}
                          </UserProfileLink>
                        </span>
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 justify-end lg:justify-start w-full lg:w-40 pt-2 lg:pt-0 border-t border-border/50 lg:border-t-0">
                      {/* Create Proposal Button */}
                      <button
                        type="button"
                        onClick={() => createProposal(invitation)}
                        disabled={isActioning || isDeclined || isCancelled}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold text-white transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: 'var(--brand)',
                          boxShadow: !isDeclined && !isCancelled ? '0 4px 14px -2px rgba(73,75,231,0.3)' : 'none',
                        }}
                      >
                        {isApplied ? <CheckCircle2 size={14} /> : <Send size={14} />}
                        <span>{isApplied ? t('jobInvitations.appliedLabel') : t('jobInvitations.createProposal')}</span>
                      </button>

                      {/* View Job Button */}
                      <button
                        type="button"
                        onClick={() => viewJob(invitation)}
                        disabled={isActioning}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-text-primary hover:border-brand/40 hover:text-brand transition-all disabled:opacity-50"
                      >
                        <Eye size={13} />
                        <span>{t('jobInvitations.viewJobPost')}</span>
                      </button>

                      {/* Decline button with thick Mint & Brand gradient border */}
                      {active && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeclineTarget(invitation);
                            setDeclineReasonText('');
                          }}
                          disabled={isActioning}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-text-secondary hover:text-rose-500 transition-all disabled:opacity-50 cursor-pointer"
                          style={{
                            background: 'linear-gradient(var(--background), var(--background)) padding-box, linear-gradient(135deg, var(--brand), var(--mint)) border-box',
                            border: '2px solid transparent',
                          }}
                        >
                          <XCircle size={13} className="text-rose-500 shrink-0" />
                          <span>{t('jobInvitations.decline')}</span>
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── Decline Invitation Modal ────────────────────────────────────────── */}
      {declineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4"
            style={{
              background: 'linear-gradient(var(--background), var(--background)) padding-box, linear-gradient(135deg, var(--brand), var(--mint)) border-box',
              border: '2.5px solid transparent',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-text-primary flex items-center gap-2">
                <XCircle size={20} className="text-rose-500" />
                {t('jobInvitations.declineTitle')}
              </h3>
              <button
                type="button"
                onClick={() => setDeclineTarget(null)}
                className="rounded-lg p-1 text-text-muted hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-text-secondary font-medium">
              {t('jobInvitations.declinePrompt')}
            </p>

            <textarea
              rows={3}
              value={declineReasonText}
              onChange={e => setDeclineReasonText(e.target.value)}
              placeholder={t('jobInvitations.declinePlaceholder')}
              className="w-full rounded-xl border border-border bg-background p-3 text-xs text-text-primary outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeclineTarget(null)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-text-secondary hover:bg-surface-muted"
              >
                {t('jobInvitations.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDeclineInvitation}
                className="rounded-xl px-4 py-2 text-xs font-extrabold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-sm"
              >
                {t('jobInvitations.confirmDecline')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
