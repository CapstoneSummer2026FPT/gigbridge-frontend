import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Briefcase, Search, Plus, Eye, Users, Calendar,
  CheckCircle, Ban, XCircle, LayoutGrid, AlignJustify, FileText,
  HelpCircle, Send, Lock, Globe, UserRoundCheck, AlertCircle,
  Bot, ChevronDown, Crown, Megaphone, Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobAPI } from '../../../api/jobAPI';
import { InviteFreelancersAfterPostModal } from '../components/InviteFreelancersAfterPostModal';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  JobPostStatus,
  JobPostVisibility,
  type GetMyJobPostDto,
} from '../../../types/models/Job';
import '../styles/my-jobs-screen.css';
import { GigCoinBudget } from '../../../shared/components/GigCoinAmount';
import { useApp } from '../../../app/providers/AppProvider';
import { usePremiumStatus } from '../../premium/hooks';
import { PremiumStatusBadge } from '../../premium/components/PremiumStatusBadge';
import { JobPromotionStudio } from '../../premium/components/JobPromotionStudio';
import '../../premium/styles/premium.css';

type StatusFilter = 'all' | 'draft' | 'open' | 'closed' | 'cancelled' | 'unknown';

const STATUS_FILTERS: { key: StatusFilter; labelKey: string; activeClass: string }[] = [
  { key: 'all', labelKey: 'myJobs.filter.all', activeClass: 'active-cyan' },
  { key: 'draft', labelKey: 'myJobs.filter.draft', activeClass: 'active-gray' },
  { key: 'open', labelKey: 'myJobs.filter.open', activeClass: 'active-green' },
  { key: 'closed', labelKey: 'myJobs.filter.closed', activeClass: 'active-gray' },
  { key: 'cancelled', labelKey: 'myJobs.filter.cancelled', activeClass: 'active-red' },
  { key: 'unknown', labelKey: 'myJobs.filter.unknown', activeClass: 'active-amber' },
];

const statusToFilter = (status?: number | null): StatusFilter => {
  if (status === JobPostStatus.Draft) return 'draft';
  if (status === JobPostStatus.Open) return 'open';
  if (status === JobPostStatus.Closed) return 'closed';
  if (status === JobPostStatus.Cancelled) return 'cancelled';
  return 'unknown';
};

const statusLabel = (status: number | null | undefined, t: any) => {
  if (status === JobPostStatus.Draft) return t('myJobs.status.draft');
  if (status === JobPostStatus.Open) return t('myJobs.status.open');
  if (status === JobPostStatus.Closed) return t('myJobs.status.closed');
  if (status === JobPostStatus.Cancelled) return t('myJobs.status.cancelled');
  return t('myJobs.status.unknown');
};

const statusBadgeClass = (status?: number | null) => {
  if (status === JobPostStatus.Draft) return 'mj-badge-closed';
  if (status === JobPostStatus.Open) return 'mj-badge-open';
  if (status === JobPostStatus.Closed) return 'mj-badge-closed';
  if (status === JobPostStatus.Cancelled) return 'mj-badge-cancelled';
  return 'mj-badge-progress';
};

const visibilityLabel = (visibility: number | null | undefined, t: any) => {
  if (visibility === JobPostVisibility.Public) return t('myJobs.visibility.public');
  if (visibility === JobPostVisibility.Private) return t('myJobs.visibility.private');
  if (visibility === JobPostVisibility.InviteOnly) return t('myJobs.visibility.inviteOnly');
  if (visibility === 3) return t('myJobs.visibility.lockedByAdmin');
  return t('myJobs.visibility.unknown');
};

const visibilityIcon = (visibility?: number | null) => {
  if (visibility === JobPostVisibility.Public) return <Globe size={13} />;
  if (visibility === JobPostVisibility.Private) return <Lock size={13} />;
  if (visibility === JobPostVisibility.InviteOnly) return <UserRoundCheck size={13} />;
  if (visibility === 3) return <Lock size={13} className="text-red-500" />;
  return <HelpCircle size={13} />;
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function MyJobsScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role } = useApp();
  const premiumStatus = usePremiumStatus(role);
  const [jobs, setJobs] = useState<GetMyJobPostDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isCompact, setIsCompact] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [inviteJobId, setInviteJobId] = useState<string | null>(null);
  const [inviteJobTitle, setInviteJobTitle] = useState<string | undefined>(undefined);
  const [promoteTarget, setPromoteTarget] = useState<{ job: GetMyJobPostDto }>();
  const [interviewTarget, setInterviewTarget] = useState<GetMyJobPostDto>();
  const [premiumActionBusy, setPremiumActionBusy] = useState(false);

  const loadJobs = async () => {
    setIsLoading(true);
    setError(null);

    const response = await jobAPI.getMyJobPosts({ pageIndex: 1, pageSize: 100 });
    if (!response.success || !response.data) {
      setError(response.message || t('myJobs.unableToLoad'));
      setJobs([]);
      setIsLoading(false);
      return;
    }

    setJobs(response.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const openPremiumPath = (action: () => void) => {
    if (!premiumStatus.isPremium) {
      navigate('/premium/client/pricing');
      return;
    }
    action();
  };

  const createAiInterview = async (job: GetMyJobPostDto) => {
    setInterviewTarget(job);
    setPremiumActionBusy(true);
    const response = await jobAPI.createAiInterview(job.jobPostsId, {
      language: 'auto',
      mode: 'voice',
      questionCount: 5,
    });
    setPremiumActionBusy(false);
    if (!response.success || !response.data) return toast.error(response.message || 'Unable to configure the AI interview.');
    setInterviewTarget(undefined);
    toast.success(`AI interview enabled with ${response.data.questionCount} questions.`);
  };

  const counts = useMemo(() => {
    const base = {
      all: jobs.length,
      draft: 0,
      open: 0,
      closed: 0,
      cancelled: 0,
      unknown: 0,
    };

    for (const job of jobs) {
      base[statusToFilter(job.status)] += 1;
    }

    return base;
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return jobs.filter(job => {
      const matchesSearch = !query ||
        job.title.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query) ||
        (job.majorName || '').toLowerCase().includes(query) ||
        (job.categoryName || '').toLowerCase().includes(query) ||
        (job.location || '').toLowerCase().includes(query) ||
        (job.skills || []).some(skill => skill.name.toLowerCase().includes(query)) ||
        (job.customSkillNames || []).some(skill => skill.toLowerCase().includes(query));

      const matchesStatus = statusFilter === 'all' || statusToFilter(job.status) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchQuery, statusFilter]);

  const updateLocalJob = (jobPostId: string, patch: Partial<GetMyJobPostDto>) => {
    setJobs(prev => prev.map(job => job.jobPostsId === jobPostId ? { ...job, ...patch } : job));
  };

  const patchStatus = async (job: GetMyJobPostDto, status: JobPostStatus, successMessage: string) => {
    setPendingJobId(job.jobPostsId);
    const response = await jobAPI.updateJobPostStatus(job.jobPostsId, { status });
    setPendingJobId(null);

    if (!response.success) {
      toast.error(response.message || t('myJobs.unableUpdateStatus'));
      return;
    }

    updateLocalJob(job.jobPostsId, { status });
    toast.success(successMessage);
  };

  const patchVisibility = async (job: GetMyJobPostDto, visibility: JobPostVisibility) => {
    setPendingJobId(job.jobPostsId);
    const response = await jobAPI.updateJobPostVisibility(job.jobPostsId, { visibility });
    setPendingJobId(null);

    if (!response.success) {
      toast.error(response.message || t('myJobs.unableUpdateVisibility'));
      return;
    }

    updateLocalJob(job.jobPostsId, { visibility });
    toast.success(t('myJobs.visibilityUpdated'));
  };

  const canPublish = (job: GetMyJobPostDto) => job.status === JobPostStatus.Draft;
  const canClose = (job: GetMyJobPostDto) => job.status === JobPostStatus.Open;
  const canCancel = (job: GetMyJobPostDto) => job.status === JobPostStatus.Open || job.status === JobPostStatus.Draft;
  const canChangeVisibility = (job: GetMyJobPostDto) => job.visibility !== undefined && job.visibility !== null;

  return (
    <AppLayout>
      <div className="mj-custom-scrollbar" style={{ padding: '32px 0 64px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <header style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={18} className="mj-cyan" />
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gb-cyan,#1782FC)' }}>
                  {t('myJobs.management')}
                </span>
                {!premiumStatus.loading && <PremiumStatusBadge active={premiumStatus.isPremium} compact />}
              </div>
              <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f0f1a', margin: 0 }} className="black:text-white">
                {t('myJobs.title')}
              </h1>
              <p style={{ fontSize: 15, color: '#6b7280', marginTop: 4 }}>
                {t('myJobs.subtitle')}
              </p>
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                onClick={() => navigate('/jobs/post')}
                className="mj-action-btn mj-btn-primary"
                style={{ padding: '10px 22px', fontSize: 13 }}
              >
                <Plus size={16} />
                {t('myJobs.postNewJob')}
              </button>
            </div>
          </header>

          <div className="mj-stat-grid" style={{ marginBottom: 32 }}>
            {[
              { label: t('myJobs.totalJobs'), value: counts.all, icon: <Briefcase size={18} />, bg: 'mj-bg-cyan', color: 'mj-cyan' },
              { label: t('myJobs.status.open'), value: counts.open, icon: <CheckCircle size={18} />, bg: 'mj-bg-green', color: 'mj-green' },
              { label: t('myJobs.status.draft'), value: counts.draft, icon: <FileText size={18} />, bg: 'mj-bg-amber', color: 'mj-amber' },
              { label: t('myJobs.status.closed'), value: counts.closed, icon: <Ban size={18} />, bg: 'mj-bg-gray', color: 'mj-gray' },
              { label: t('myJobs.status.unknown'), value: counts.unknown, icon: <HelpCircle size={18} />, bg: 'mj-bg-purple', color: 'mj-purple' },
            ].map(stat => (
              <div key={stat.label} className="mj-stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className={`mj-stat-icon-wrap ${stat.bg}`}>
                    <span className={stat.color}>{stat.icon}</span>
                  </div>
                </div>
                <div>
                  <div className="mj-stat-value">{stat.value}</div>
                  <div className="mj-stat-label">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mj-card mj-filter-bar" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder={t('myJobs.searchPlaceholder')}
                  className="mj-input"
                />
              </div>

              <div className="mj-glass" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, flexWrap: 'wrap' }}>
                {STATUS_FILTERS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`mj-tab-pill ${statusFilter === tab.key ? tab.activeClass : 'inactive'}`}
                  >
                    {t(tab.labelKey)}
                    {tab.key !== 'all' && (
                      <span style={{
                        background: statusFilter === tab.key ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.08)',
                        borderRadius: 999,
                        padding: '1px 6px',
                        fontSize: 10,
                      }}>
                        {counts[tab.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mj-glass" style={{ display: 'flex', gap: 2, padding: 4, borderRadius: 10 }}>
                <button
                  onClick={() => setIsCompact(false)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: !isCompact ? 'var(--gb-cyan,#1782FC)' : 'transparent', color: !isCompact ? '#fff' : '#6b7280', transition: 'all 0.2s' }}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setIsCompact(true)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: isCompact ? 'var(--gb-cyan,#1782FC)' : 'transparent', color: isCompact ? '#fff' : '#6b7280', transition: 'all 0.2s' }}
                >
                  <AlignJustify size={16} />
                </button>
              </div>
            </div>

            <div
              style={{ marginTop: 10, fontSize: 12, color: '#9ca3af', fontWeight: 500 }}
              dangerouslySetInnerHTML={{ __html: t('myJobs.showingJobs', { count: filteredJobs.length, total: jobs.length }) }}
            />
          </div>

          {isLoading ? (
            <div className="mj-card mj-empty">
              <p style={{ fontSize: 14, color: '#6b7280' }}>{t('myJobs.loading')}</p>
            </div>
          ) : error ? (
            <div className="mj-card mj-empty">
              <XCircle size={36} className="mj-red" />
              <p style={{ fontSize: 18, fontWeight: 700, color: '#0f0f1a', marginBottom: 6 }} className="black:text-white">{t('myJobs.unableToLoad')}</p>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>{error}</p>
              <button onClick={loadJobs} className="mj-action-btn mj-btn-primary">{t('myJobs.retry')}</button>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="mj-card mj-empty">
              <div className="mj-empty-icon-wrap">
                <Briefcase size={36} className="mj-cyan" />
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#0f0f1a', marginBottom: 6 }} className="black:text-white">
                {t('myJobs.noJobs')}
              </p>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
                {searchQuery ? t('myJobs.noJobsDesc') : t('myJobs.noJobsPostFirst')}
              </p>
              <button onClick={() => navigate('/jobs/post')} className="mj-action-btn mj-btn-primary">
                <Plus size={16} /> {t('myJobs.postNewJob')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filteredJobs.map(job => {
                const isPending = pendingJobId === job.jobPostsId;
                const statusKnown = job.status !== undefined && job.status !== null;

                return (
                  <div key={job.jobPostsId} className="mj-card mj-job-card" style={isCompact ? { padding: '16px 20px' } : {}}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                          <h3 className="mj-job-title">{job.title}</h3>
                          <span className={`mj-badge ${statusBadgeClass(job.status)}`}>{statusLabel(job.status, t)}</span>
                          <span className="mj-badge mj-badge-progress" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {visibilityIcon(job.visibility)} {visibilityLabel(job.visibility, t)}
                          </span>
                        </div>
                        {!isCompact && (
                          <p className="mj-job-desc" style={{ marginBottom: 12 }}>{job.description}</p>
                        )}
                        {job.status === JobPostStatus.Draft && (
                          <div className="mj-draft-warning" style={{ marginBottom: 12 }}>
                            <AlertCircle size={15} style={{ flexShrink: 0 }} />
                            <span dangerouslySetInnerHTML={{ __html: t('myJobs.draftWarning') }} />
                          </div>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {job.majorName && <span className="mj-skill-tag">{job.majorName}</span>}
                          {job.categoryName && <span className="mj-skill-tag">{job.categoryName}</span>}
                          {(job.skills || []).slice(0, 5).map(skill => (
                            <span key={skill.skillId} className="mj-skill-tag">{skill.name}</span>
                          ))}
                          {(job.customSkillNames || []).slice(0, 5).map(skill => (
                            <span key={skill} className="mj-skill-tag">{skill}{t('myJobs.customSkillSuffix')}</span>
                          ))}
                          {job.location && <span className="mj-skill-tag">{job.location}</span>}
                          {job.estimatedDuration && <span className="mj-skill-tag">{job.estimatedDuration}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="mj-budget-value"><GigCoinBudget min={job.budgetMin} max={job.budgetMax} /></div>
                        <div className="mj-budget-label">{t('myJobs.budget')}</div>
                      </div>
                    </div>

                    {!isCompact && <hr className="mj-divider" style={{ marginBottom: 16 }} />}
                    <div className="mj-meta-grid" style={isCompact ? { marginTop: 10 } : {}}>
                      <div>
                        <div className="mj-meta-label">{t('myJobs.proposals')}</div>
                        <div className="mj-meta-value mj-purple">
                          <Users size={13} /> {job.proposalCount}
                        </div>
                      </div>
                      <div>
                        <div className="mj-meta-label">{t('myJobs.status')}</div>
                        <div className="mj-meta-value">
                          <CheckCircle size={13} /> {statusLabel(job.status, t)}
                        </div>
                      </div>
                      <div>
                        <div className="mj-meta-label">{t('myJobs.posted')}</div>
                        <div className="mj-meta-value">
                          <Calendar size={13} /> {formatDate(job.createdAt)}
                        </div>
                      </div>
                      <div>
                        <div className="mj-meta-label">{t('myJobs.visibility')}</div>
                        <div className="mj-meta-value">
                          {visibilityIcon(job.visibility)} {visibilityLabel(job.visibility, t)}
                        </div>
                      </div>
                    </div>

                    <hr className="mj-divider" style={{ margin: '16px 0' }} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <button onClick={() => navigate(`/jobs/my-jobs/${job.jobPostsId}`)} className="mj-action-btn mj-btn-cyan">
                        <Eye size={14} /> {t('myJobs.viewDetail')}
                      </button>
                      <button onClick={() => navigate(`/client/job-posts/${job.jobPostsId}/questions`)} className="mj-action-btn mj-btn-cyan">
                        <HelpCircle size={14} /> {t('myJobs.manageQuestions')}
                      </button>
                      {job.status === JobPostStatus.Open && (
                        <>
                          <button
                            onClick={() => {
                              setInviteJobId(job.jobPostsId);
                              setInviteJobTitle(job.title);
                            }}
                            disabled={isPending}
                            className="mj-action-btn mj-btn-cyan"
                          >
                            <Users size={14} /> {t('myJobs.inviteFreelancers')}
                          </button>
                          <details className="mj-premium-menu">
                            <summary className="mj-premium-action-label">
                              <Crown size={12} /> Premium features
                              {job.isFeatured && <span className="mj-premium-active-dot" title="Promotion active" />}
                              <ChevronDown size={13} className="mj-premium-chevron" />
                            </summary>
                            <div className="mj-premium-menu-panel">
                              <button
                                onClick={event => {
                                  event.currentTarget.closest('details')?.removeAttribute('open');
                                  openPremiumPath(() => navigate(`/talent-matching?job=${job.jobPostsId}`));
                                }}
                                className="mj-action-btn mj-btn-cyan"
                              >
                                <Target size={14} /> Talent matches {!premiumStatus.isPremium && <Crown size={12} />}
                              </button>
                              <button
                                onClick={event => {
                                  event.currentTarget.closest('details')?.removeAttribute('open');
                                  if (job.isFeatured) setPromoteTarget({ job });
                                  else openPremiumPath(() => setPromoteTarget({ job }));
                                }}
                                className="mj-action-btn mj-btn-cyan"
                              >
                                <Megaphone size={14} /> {job.isFeatured
                                  ? `Manage promotion · ends ${job.featuredUntil ? formatDate(job.featuredUntil) : ''}`
                                  : 'Promote'} {!premiumStatus.isPremium && !job.isFeatured && <Crown size={12} />}
                              </button>
                              <button
                                onClick={event => {
                                  event.currentTarget.closest('details')?.removeAttribute('open');
                                  openPremiumPath(() => void createAiInterview(job));
                                }}
                                disabled={premiumActionBusy}
                                className="mj-action-btn mj-btn-cyan"
                              >
                                <Bot size={14} /> {premiumActionBusy && interviewTarget?.jobPostsId === job.jobPostsId ? 'Enabling interview…' : 'Enable AI interview'} {!premiumStatus.isPremium && <Crown size={12} />}
                              </button>
                            </div>
                          </details>
                        </>
                      )}
                      {canPublish(job) && (
                        <button
                          onClick={() => patchStatus(job, JobPostStatus.Open, t('myJobs.publishSuccess'))}
                          disabled={isPending}
                          className="mj-action-btn mj-btn-green"
                        >
                          <Send size={14} /> {t('myJobs.publish')}
                        </button>
                      )}
                      {canClose(job) && (
                        <button
                          onClick={() => patchStatus(job, JobPostStatus.Closed, t('myJobs.closeSuccess'))}
                          disabled={isPending}
                          className="mj-action-btn mj-btn-green"
                        >
                          <Ban size={14} /> {t('myJobs.close')}
                        </button>
                      )}
                      {canCancel(job) && (
                        <button
                          onClick={() => patchStatus(job, JobPostStatus.Cancelled, t('myJobs.cancelSuccess'))}
                          disabled={isPending}
                          className="mj-action-btn mj-btn-red"
                        >
                          <XCircle size={14} /> {t('myJobs.cancel')}
                        </button>
                      )}
                      {!statusKnown && (
                        <span className="text-xs text-muted-foreground">{t('myJobs.statusActionsUnavailable')}</span>
                      )}
                      {canChangeVisibility(job) ? (
                        <select
                          value={job.visibility ?? ''}
                          onChange={event => patchVisibility(job, Number(event.target.value) as JobPostVisibility)}
                          disabled={isPending || job.visibility === 3}
                          className="mj-action-btn"
                          style={{ border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.04)', color: '#374151' }}
                        >
                          <option value={JobPostVisibility.Public}>{t('myJobs.visibility.public')}</option>
                          <option value={JobPostVisibility.Private}>{t('myJobs.visibility.private')}</option>
                          <option value={JobPostVisibility.InviteOnly}>{t('myJobs.visibility.inviteOnly')}</option>
                          {job.visibility === 3 && <option value={3}>{t('myJobs.visibility.lockedByAdmin')}</option>}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t('myJobs.visibilityActionsUnavailable')}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {inviteJobId && (
        <InviteFreelancersAfterPostModal
          jobPostId={inviteJobId}
          jobTitle={inviteJobTitle}
          onClose={() => {
            setInviteJobId(null);
            setInviteJobTitle(undefined);
          }}
        />
      )}
      {promoteTarget && <div className="premium-modal" onClick={() => setPromoteTarget(undefined)}><div className="premium-modal-box premium-modal-box-wide" onClick={event => event.stopPropagation()}><JobPromotionStudio entitled={premiumStatus.isPremium} initialJob={promoteTarget.job} onComplete={promotion => {
        setJobs(current => current.map(job => job.jobPostsId === promotion.jobPostId ? { ...job, isFeatured: true, featuredUntil: promotion.featuredUntil } : job));
        setPromoteTarget(undefined);
      }} onDeactivated={promotion => {
        setJobs(current => current.map(job => job.jobPostsId === promotion.jobPostId ? { ...job, isFeatured: false, featuredUntil: promotion.featuredUntil } : job));
        setPromoteTarget(undefined);
      }} /><div className="premium-modal-actions"><button className="premium-button secondary" onClick={() => setPromoteTarget(undefined)}>Close</button></div></div></div>}
    </AppLayout>
  );
}
