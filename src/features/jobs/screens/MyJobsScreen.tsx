import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertCircle,
  AlignJustify,
  Ban,
  Bot,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Crown,
  Eye,
  FileText,
  Filter,
  Globe,
  HelpCircle,
  LayoutGrid,
  Lock,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Target,
  UserRoundCheck,
  Users,
  XCircle,
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
import { GigCoinBudget } from '../../../shared/components/GigCoinAmount';
import { useApp } from '../../../app/providers/AppProvider';
import { usePremiumStatus } from '../../premium/hooks';
import { PremiumStatusBadge } from '../../premium/components/PremiumStatusBadge';
import '../../premium/styles/premium.css';
import { CustomSelect, type SelectOption } from '../../../shared/components/CustomSelect';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';

type StatusFilter = 'all' | 'draft' | 'open' | 'closed' | 'cancelled' | 'unknown';

const statusToFilter = (status?: number | null): StatusFilter => {
  if (status === JobPostStatus.Draft) return 'draft';
  if (status === JobPostStatus.Open) return 'open';
  if (status === JobPostStatus.Closed) return 'closed';
  if (status === JobPostStatus.Cancelled) return 'cancelled';
  return 'unknown';
};

const statusBadgeInfo = (status: number | null | undefined, t: any) => {
  if (status === JobPostStatus.Draft) {
    return {
      label: t('myJobs.status.draft', { defaultValue: 'Bản nháp' }),
      badgeClass: 'bg-amber-500 text-white font-black shadow-xs border-none',
    };
  }
  if (status === JobPostStatus.Open) {
    return {
      label: t('myJobs.status.open', { defaultValue: 'Đang tuyển' }),
      badgeClass: 'bg-emerald-600 text-white font-black shadow-xs border-none',
    };
  }
  if (status === JobPostStatus.Closed) {
    return {
      label: t('myJobs.status.closed', { defaultValue: 'Đã đóng' }),
      badgeClass: 'bg-slate-600 text-white font-black shadow-xs border-none',
    };
  }
  if (status === JobPostStatus.Cancelled) {
    return {
      label: t('myJobs.status.cancelled', { defaultValue: 'Đã hủy' }),
      badgeClass: 'bg-rose-600 text-white font-black shadow-xs border-none',
    };
  }
  return {
    label: t('myJobs.status.unknown', { defaultValue: 'Không rõ' }),
    badgeClass: 'bg-slate-500 text-white font-black shadow-xs border-none',
  };
};

const visibilityInfo = (visibility: number | null | undefined, t: any) => {
  if (visibility === JobPostVisibility.Public) {
    return { label: t('myJobs.visibility.public', { defaultValue: 'Công khai' }), icon: <Globe size={13} /> };
  }
  if (visibility === JobPostVisibility.Private) {
    return { label: t('myJobs.visibility.private', { defaultValue: 'Riêng tư' }), icon: <Lock size={13} /> };
  }
  if (visibility === JobPostVisibility.InviteOnly) {
    return { label: t('myJobs.visibility.inviteOnly', { defaultValue: 'Chỉ mời' }), icon: <UserRoundCheck size={13} /> };
  }
  if (visibility === 3) {
    return { label: t('myJobs.visibility.lockedByAdmin', { defaultValue: 'Khóa bởi Admin' }), icon: <Lock size={13} className="text-rose-500" /> };
  }
  return { label: t('myJobs.visibility.unknown', { defaultValue: 'Khác' }), icon: <HelpCircle size={13} /> };
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function MyJobsScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role } = useApp();
  const premiumStatus = usePremiumStatus(role);

  const [jobs, setJobs] = useState<GetMyJobPostDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [isCompact, setIsCompact] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [inviteJobId, setInviteJobId] = useState<string | null>(null);
  const [inviteJobTitle, setInviteJobTitle] = useState<string | undefined>(undefined);
  const [interviewTarget, setInterviewTarget] = useState<GetMyJobPostDto>();
  const [premiumActionBusy, setPremiumActionBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    job?: GetMyJobPostDto;
    actionType?: 'close' | 'cancel';
  }>({ isOpen: false });

  const handleConfirmAction = async () => {
    if (!confirmAction.job || !confirmAction.actionType) return;
    const targetJob = confirmAction.job;
    const action = confirmAction.actionType;
    setConfirmAction({ isOpen: false });

    if (action === 'close') {
      await patchStatus(
        targetJob,
        JobPostStatus.Closed,
        t('myJobs.closeSuccess', { defaultValue: 'Đã đóng tin tuyển dụng.' })
      );
    } else if (action === 'cancel') {
      await patchStatus(
        targetJob,
        JobPostStatus.Cancelled,
        t('myJobs.cancelSuccess', { defaultValue: 'Đã hủy tin tuyển dụng.' })
      );
    }
  };

  const loadJobs = async () => {
    setIsLoading(true);
    setError(null);

    const response = await jobAPI.getMyJobPosts({ pageIndex: 1, pageSize: 100 });
    if (!response.success || !response.data) {
      setError(response.message || t('myJobs.unableToLoad', { defaultValue: 'Không thể tải danh sách tin tuyển dụng.' }));
      setJobs([]);
      setIsLoading(false);
      return;
    }

    setJobs(response.data);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadJobs();
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
    if (!response.success || !response.data) {
      return toast.error(response.message || t('myJobs.enableAiInterviewFailed', { defaultValue: 'Không thể thiết lập phỏng vấn AI.' }));
    }
    setInterviewTarget(undefined);
    updateLocalJob(job.jobPostsId, { hasAiInterview: true });
    toast.success(t('myJobs.aiInterviewEnabled', { defaultValue: 'Đã bật phỏng vấn AI.' }));
  };

  const disableAiInterview = async (job: GetMyJobPostDto) => {
    setInterviewTarget(job);
    setPremiumActionBusy(true);
    const response = await jobAPI.disableAiInterview(job.jobPostsId);
    setPremiumActionBusy(false);
    if (!response.success) {
      return toast.error(response.message || t('myJobs.disableAiInterviewFailed', { defaultValue: 'Không thể tắt phỏng vấn AI.' }));
    }
    setInterviewTarget(undefined);
    updateLocalJob(job.jobPostsId, { hasAiInterview: false });
    toast.success(t('myJobs.aiInterviewDisabled', { defaultValue: 'Đã tắt phỏng vấn AI.' }));
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
      const filterKey = statusToFilter(job.status);
      if (filterKey in base) {
        base[filterKey as keyof typeof base] += 1;
      }
    }

    return base;
  }, [jobs]);

  const statusSelectOptions: SelectOption[] = useMemo(
    () => [
      {
        value: 'open',
        label: t('myJobs.filter.open', { defaultValue: 'Đang tuyển' }),
        badge: String(counts.open),
      },
      {
        value: 'draft',
        label: t('myJobs.filter.draft', { defaultValue: 'Bản nháp' }),
        badge: String(counts.draft),
      },
      {
        value: 'closed',
        label: t('myJobs.filter.closed', { defaultValue: 'Đã đóng' }),
        badge: String(counts.closed),
      },
      {
        value: 'cancelled',
        label: t('myJobs.filter.cancelled', { defaultValue: 'Đã hủy' }),
        badge: String(counts.cancelled),
      },
      {
        value: 'all',
        label: t('myJobs.filter.all', { defaultValue: 'Tất cả trạng thái' }),
        badge: String(counts.all),
      },
    ],
    [counts, t]
  );

  const visibilitySelectOptions: SelectOption[] = useMemo(
    () => [
      {
        value: String(JobPostVisibility.Public),
        label: t('myJobs.visibility.public', { defaultValue: 'Công khai' }),
        icon: <Globe size={14} />,
      },
      {
        value: String(JobPostVisibility.Private),
        label: t('myJobs.visibility.private', { defaultValue: 'Riêng tư' }),
        icon: <Lock size={14} />,
      },
      {
        value: String(JobPostVisibility.InviteOnly),
        label: t('myJobs.visibility.inviteOnly', { defaultValue: 'Chỉ mời' }),
        icon: <UserRoundCheck size={14} />,
      },
    ],
    [t]
  );

  const filteredJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return jobs.filter(job => {
      const matchesSearch =
        !query ||
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
    setJobs(prev => prev.map(job => (job.jobPostsId === jobPostId ? { ...job, ...patch } : job)));
  };

  const patchStatus = async (job: GetMyJobPostDto, status: JobPostStatus, successMessage: string) => {
    setPendingJobId(job.jobPostsId);
    const response = await jobAPI.updateJobPostStatus(job.jobPostsId, { status });
    setPendingJobId(null);

    if (!response.success) {
      toast.error(response.message || t('myJobs.unableUpdateStatus', { defaultValue: 'Không thể cập nhật trạng thái tin.' }));
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
      toast.error(response.message || t('myJobs.unableUpdateVisibility', { defaultValue: 'Không thể cập nhật quyền riêng tư.' }));
      return;
    }

    updateLocalJob(job.jobPostsId, { visibility });
    toast.success(t('myJobs.visibilityUpdated', { defaultValue: 'Đã cập nhật quyền riêng tư tin tuyển dụng.' }));
  };

  const canPublish = (job: GetMyJobPostDto) => job.status === JobPostStatus.Draft;
  const canClose = (job: GetMyJobPostDto) => job.status === JobPostStatus.Open;
  const canCancel = (job: GetMyJobPostDto) => job.status === JobPostStatus.Open || job.status === JobPostStatus.Draft;
  const canChangeVisibility = (job: GetMyJobPostDto) => job.visibility !== undefined && job.visibility !== null;

  return (
    <AppLayout>
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-black uppercase tracking-wider">
                <Sparkles size={12} /> {t('myJobs.management', { defaultValue: 'Quản Lý Tuyển Dụng' })}
              </span>
              {!premiumStatus.loading && <PremiumStatusBadge active={premiumStatus.isPremium} compact />}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              {t('myJobs.title', { defaultValue: 'Tin Tuyển Dụng Của Tôi' })}
            </h1>
            <p className="text-xs text-text-muted font-medium">
              {t('myJobs.subtitle', { defaultValue: 'Tổng quan và quản lý toàn bộ các dự án, tin đăng tuyển dụng và ứng viên.' })}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/jobs/post')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand text-xs font-black text-white shadow-lg hover:bg-brand-hover transition-all cursor-pointer"
          >
            <Plus size={16} />
            {t('myJobs.postNewJob', { defaultValue: 'Đăng Tin Tuyển Dụng Mới' })}
          </button>
        </div>

        {/* Executive Metric Cards (4 Grid Tiles) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-border/80 bg-surface-card p-5 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Briefcase size={14} className="text-brand" /> {t('myJobs.metrics.totalJobs', { defaultValue: 'Tổng Số Tin Đăng' })}
              </span>
            </div>
            <div className="text-3xl font-black text-text-primary tracking-tight">{counts.all}</div>
            <p className="text-[11px] font-semibold text-text-muted">{t('myJobs.metrics.totalJobsDesc', { defaultValue: 'Tin tuyển dụng trên hệ thống' })}</p>
          </div>

          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> {t('myJobs.metrics.openJobs', { defaultValue: 'Đang Tuyển Dụng' })}
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{counts.open}</div>
            <p className="text-[11px] font-semibold text-emerald-600/80 dark:text-emerald-400/80">{t('myJobs.metrics.openJobsDesc', { defaultValue: 'Sẵn sàng nhận ứng tuyển' })}</p>
          </div>

          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <FileText size={14} /> {t('myJobs.metrics.draftJobs', { defaultValue: 'Bản Nháp' })}
              </span>
            </div>
            <div className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{counts.draft}</div>
            <p className="text-[11px] font-semibold text-amber-600/80 dark:text-amber-400/80">{t('myJobs.metrics.draftJobsDesc', { defaultValue: 'Cần đăng hoàn tất' })}</p>
          </div>

          <div className="rounded-3xl border border-border/80 bg-surface-card p-5 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Ban size={14} /> {t('myJobs.metrics.closedCancelled', { defaultValue: 'Đã Đóng / Hủy' })}
              </span>
            </div>
            <div className="text-3xl font-black text-text-primary tracking-tight">{counts.closed + counts.cancelled}</div>
            <p className="text-[11px] font-semibold text-text-muted">{t('myJobs.metrics.closedCancelledDesc', { defaultValue: 'Dự án đã kết thúc' })}</p>
          </div>
        </div>

        {/* Filter Bar & View Options */}
        <div className="rounded-3xl border border-border/80 bg-surface-card p-5 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder={t('myJobs.searchPlaceholder', { defaultValue: 'Tìm theo tên công việc, kỹ năng, chuyên ngành hoặc địa điểm...' })}
                className="w-full h-11 rounded-2xl border border-border/80 bg-surface-muted/40 pl-11 pr-4 text-xs font-bold text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {/* Status CustomSelect Dropdown */}
            <div className="w-full sm:w-64 shrink-0">
              <CustomSelect
                value={statusFilter}
                onChange={val => setStatusFilter(val as StatusFilter)}
                options={statusSelectOptions}
                placeholder={t('myJobs.filterByStatus', { defaultValue: 'Lọc theo trạng thái' })}
                leftIcon={<Filter size={14} />}
                searchable={false}
                ariaLabel={t('myJobs.filterByStatus', { defaultValue: 'Lọc theo trạng thái' })}
              />
            </div>

            {/* Compact vs Grid View Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-xl border border-border/60 bg-surface-muted/40">
              <button
                type="button"
                onClick={() => setIsCompact(false)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  !isCompact ? 'bg-brand text-white shadow-2xs' : 'text-text-muted hover:text-text-primary'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsCompact(true)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isCompact ? 'bg-brand text-white shadow-2xs' : 'text-text-muted hover:text-text-primary'
                }`}
                title="Compact View"
              >
                <AlignJustify size={15} />
              </button>
            </div>
          </div>

          {/* Results Counter */}
          <div className="text-[11px] font-bold text-text-muted px-1">
            {t('myJobs.showingCount', { defaultValue: 'Hiển thị {{count}} / {{total}} tin đăng', count: filteredJobs.length, total: jobs.length })}
          </div>
        </div>

        {/* Job Posts Container */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw size={32} className="animate-spin text-brand" />
            <span className="text-xs font-bold text-text-muted">{t('myJobs.loading', { defaultValue: 'Đang tải tin tuyển dụng...' })}</span>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-center space-y-4">
            <XCircle size={36} className="mx-auto text-rose-500" />
            <div>
              <h3 className="text-base font-black text-text-primary">{t('myJobs.unableToLoad', { defaultValue: 'Không thể tải tin tuyển dụng' })}</h3>
              <p className="text-xs text-text-muted mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadJobs()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-xs font-black text-white hover:bg-brand-hover transition cursor-pointer"
            >
              {t('myJobs.retry', { defaultValue: 'Thử lại' })}
            </button>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-3xl border border-border/80 bg-surface-card p-12 text-center space-y-4 shadow-sm">
            <div className="h-16 w-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto text-brand">
              <Briefcase size={32} />
            </div>
            <div>
              <h3 className="text-base font-black text-text-primary">{t('myJobs.noJobs', { defaultValue: 'Chưa tìm thấy tin đăng phù hợp' })}</h3>
              <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
                {searchQuery
                  ? t('myJobs.noJobsDesc', { defaultValue: 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.' })
                  : t('myJobs.noJobsPostFirst', { defaultValue: 'Bạn chưa có tin tuyển dụng nào. Hãy bắt đầu tạo tin đăng đầu tiên!' })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/jobs/post')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-xs font-black text-white hover:bg-brand-hover transition cursor-pointer shadow-md"
            >
              <Plus size={16} />
              {t('myJobs.postNewJob', { defaultValue: 'Đăng Tin Tuyển Dụng Mới' })}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map(job => {
              const isPending = pendingJobId === job.jobPostsId;
              const statusInfo = statusBadgeInfo(job.status, t);
              const visInfo = visibilityInfo(job.visibility, t);

              return (
                <div
                  key={job.jobPostsId}
                  className="rounded-3xl border border-border/80 bg-surface-card p-6 shadow-md hover:border-brand/40 transition-all space-y-4"
                >
                  {/* Card Header Row */}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-[260px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black text-text-primary hover:text-brand transition cursor-pointer" onClick={() => navigate(`/jobs/my-jobs/${job.jobPostsId}`)}>
                          {job.title}
                        </h2>

                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-surface-muted border border-border text-text-muted">
                          {visInfo.icon}
                          {visInfo.label}
                        </span>

                        {job.hasAiInterview && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-brand text-white shadow-2xs">
                            <Bot size={12} /> AI Interview
                          </span>
                        )}

                        {job.isFeatured && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-2xs">
                            <Crown size={12} /> {t('myJobs.featured', { defaultValue: 'Nổi bật' })}
                          </span>
                        )}
                      </div>

                      {!isCompact && job.description && (
                        <p className="text-xs text-text-muted font-medium line-clamp-2 leading-relaxed">
                          {job.description}
                        </p>
                      )}

                      {/* Draft Warning Banner */}
                      {job.status === JobPostStatus.Draft && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                          <AlertCircle size={15} className="shrink-0" />
                          <span>{t('myJobs.draftBanner', { defaultValue: 'Tin đăng ở trạng thái bản nháp. Bấm "Phát Hành Đăng Tin" bên dưới để phát hành công khai.' })}</span>
                        </div>
                      )}

                      {/* Tags Row */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {job.majorName && (
                          <span className="px-2.5 py-1 rounded-xl bg-brand/10 border border-brand/20 text-brand text-[10px] font-extrabold">
                            {job.majorName}
                          </span>
                        )}
                        {job.categoryName && (
                          <span className="px-2.5 py-1 rounded-xl bg-surface-muted border border-border text-text-muted text-[10px] font-bold">
                            {job.categoryName}
                          </span>
                        )}
                        {(job.skills || []).slice(0, 5).map(skill => (
                          <span key={skill.skillId} className="px-2 py-0.5 rounded-lg bg-surface-muted/60 border border-border/50 text-[10px] font-semibold text-text-muted">
                            {skill.name}
                          </span>
                        ))}
                        {(job.customSkillNames || []).slice(0, 3).map(skill => (
                          <span key={skill} className="px-2 py-0.5 rounded-lg bg-surface-muted/60 border border-border/50 text-[10px] font-semibold text-text-muted">
                            {skill} (Custom)
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Budget Badge Box */}
                    <div className="text-right shrink-0 bg-surface-muted/50 border border-border/60 rounded-2xl p-3 space-y-0.5">
                      <span className="block text-[9px] font-black uppercase tracking-wider text-text-muted">{t('myJobs.projectBudget', { defaultValue: 'Ngân sách dự án' })}</span>
                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        <GigCoinBudget min={job.budgetMin} max={job.budgetMax} />
                      </div>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/60 text-xs text-text-muted font-medium">
                    <div className="flex items-center gap-6 flex-wrap">
                      <span className="flex items-center gap-1.5 font-bold text-text-primary">
                        <Users size={14} className="text-brand" />
                        {t('myJobs.proposalsCount', { defaultValue: '{{count}} Đề xuất / Ứng viên', count: job.proposalCount })}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {t('myJobs.postedDate', { defaultValue: 'Ngày đăng: {{date}}', date: formatDate(job.createdAt) })}
                      </span>
                    </div>

                    {/* Well-structured Logical Action Workflow Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 w-full pt-2">
                      {/* Left Group: Primary Workflow & Candidate Sourcing */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/jobs/my-jobs/${job.jobPostsId}`)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-hover transition-all text-xs font-black cursor-pointer shadow-md"
                        >
                          <Eye size={14} /> {t('myJobs.actions.viewDetails', { defaultValue: 'Xem Chi Tiết & Đề Xuất' })}
                        </button>

                        {job.status === JobPostStatus.Open && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setInviteJobId(job.jobPostsId);
                                setInviteJobTitle(job.title);
                              }}
                              disabled={isPending}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-brand/30 bg-brand/10 text-brand hover:bg-brand/20 transition-all text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                              <Users size={14} /> {t('myJobs.actions.inviteFreelancer', { defaultValue: 'Mời Freelancer' })}
                            </button>

                             {/* Premium & AI Features Dropdown */}
                            <details style={{ position: 'relative', display: 'inline-block' }}>
                              <summary className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:border-amber-500/70 hover:shadow-lg hover:shadow-amber-500/15 transition-all text-xs font-black cursor-pointer list-none select-none">
                                <Sparkles size={14} className="text-amber-500 animate-pulse" />
                                <span className="text-amber-500">{t('myJobs.actions.aiFeatures', { defaultValue: 'Tính Năng AI' })}</span>
                                <ChevronDown size={14} className="text-amber-500 opacity-80" />
                              </summary>
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 'calc(100% + 8px)',
                                  left: 0,
                                  width: '280px',
                                  padding: '10px',
                                  borderRadius: '20px',
                                  background: 'var(--card, #ffffff)',
                                  color: 'var(--text-primary, #0f0f1a)',
                                  border: '1px solid var(--border, rgba(255,255,255,0.15))',
                                  boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(245, 158, 11, 0.15)',
                                  zIndex: 99999,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px'
                                }}
                                onClick={e => e.stopPropagation()}
                              >
                                {/* Dropdown Header */}
                                <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/50 pb-2 mb-0.5">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                                    <Sparkles size={12} /> {t('myJobs.actions.aiToolsHeader', { defaultValue: 'Công Cụ AI Nâng Cao' })}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-[9px] font-black uppercase">
                                    VIP
                                  </span>
                                </div>

                                {/* Item 1: AI Candidate Suggestions */}
                                <button
                                  type="button"
                                  onClick={event => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    event.currentTarget.closest('details')?.removeAttribute('open');
                                    openPremiumPath(() => navigate(`/talent-matching?job=${job.jobPostsId}&tab=smart`));
                                  }}
                                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all text-left group cursor-pointer border-0 bg-transparent"
                                >
                                  <div className="h-9 w-9 rounded-xl bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <Target size={16} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-black color-[var(--text-primary)] flex items-center justify-between">
                                      <span>{t('myJobs.actions.aiCandidateSuggestion', { defaultValue: 'Gợi ý ứng viên AI' })}</span>
                                      {!premiumStatus.isPremium && <Crown size={12} className="text-amber-500 shrink-0 ml-1" />}
                                    </div>
                                    <div className="text-[10px] font-medium text-text-muted truncate">{t('myJobs.actions.aiCandidateSuggestionDesc', { defaultValue: 'Ghép nối freelancer phù hợp' })}</div>
                                  </div>
                                </button>

                                {/* Item 2: Job Promotion */}
                                <button
                                  type="button"
                                  onClick={event => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    event.currentTarget.closest('details')?.removeAttribute('open');
                                    if (!premiumStatus.isPremium) {
                                      navigate('/premium/client/pricing');
                                    } else {
                                      navigate('/premium/client#job-promotions', { state: { activeTab: 'promotions' } });
                                    }
                                  }}
                                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all text-left group cursor-pointer border-0 bg-transparent"
                                >
                                  <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <Megaphone size={16} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-black color-[var(--text-primary)] flex items-center justify-between">
                                      <span>{job.isFeatured ? t('myJobs.actions.managePromotion', { defaultValue: 'Quản lý quảng bá' }) : t('myJobs.actions.promoteFeatured', { defaultValue: 'Quảng bá tin nổi bật' })}</span>
                                      {!premiumStatus.isPremium && !job.isFeatured && <Crown size={12} className="text-amber-500 shrink-0 ml-1" />}
                                    </div>
                                    <div className="text-[10px] font-medium text-text-muted truncate">{t('myJobs.actions.promoteDesc', { defaultValue: 'Ghim vị trí ưu tiên trang chủ Feed' })}</div>
                                  </div>
                                </button>

                                {/* Item 3: AI Interview Screener */}
                                {job.hasAiInterview ? (
                                  <button
                                    type="button"
                                    onClick={event => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      event.currentTarget.closest('details')?.removeAttribute('open');
                                      void disableAiInterview(job);
                                    }}
                                    disabled={premiumActionBusy}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-500/10 transition-all text-left group cursor-pointer border-0 bg-transparent"
                                  >
                                    <div className="h-9 w-9 rounded-xl bg-rose-500/15 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                      <Bot size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-black text-rose-500 dark:text-rose-400">
                                        {premiumActionBusy && interviewTarget?.jobPostsId === job.jobPostsId ? t('myJobs.actions.turningOff', { defaultValue: 'Đang tắt...' }) : t('myJobs.actions.turnOffAiInterview', { defaultValue: 'Tắt phỏng vấn AI' })}
                                      </div>
                                      <div className="text-[10px] font-medium text-rose-400/80 truncate">{t('myJobs.actions.turnOffAiInterviewDesc', { defaultValue: 'Tạm dừng sàng lọc tự động' })}</div>
                                    </div>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={event => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      event.currentTarget.closest('details')?.removeAttribute('open');
                                      openPremiumPath(() => void createAiInterview(job));
                                    }}
                                    disabled={premiumActionBusy}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all text-left group cursor-pointer border-0 bg-transparent"
                                  >
                                    <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                      <Bot size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-black color-[var(--text-primary)] flex items-center justify-between">
                                        <span>{premiumActionBusy && interviewTarget?.jobPostsId === job.jobPostsId ? t('myJobs.actions.turningOn', { defaultValue: 'Đang bật...' }) : t('myJobs.actions.turnOnAiInterview', { defaultValue: 'Bật phỏng vấn AI' })}</span>
                                        {!premiumStatus.isPremium && <Crown size={12} className="text-amber-500 shrink-0 ml-1" />}
                                      </div>
                                      <div className="text-[10px] font-medium text-text-muted truncate">{t('myJobs.actions.turnOnAiInterviewDesc', { defaultValue: 'Phỏng vấn & chấm điểm AI' })}</div>
                                    </div>
                                  </button>
                                )}
                              </div>
                            </details>
                          </>
                        )}

                        {canPublish(job) && (
                          <button
                            type="button"
                            onClick={() => patchStatus(job, JobPostStatus.Open, t('myJobs.publishSuccess', { defaultValue: 'Đã phát hành tin tuyển dụng công khai!' }))}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all text-xs font-black cursor-pointer shadow-md disabled:opacity-50"
                          >
                            <Send size={14} /> {t('myJobs.actions.publish', { defaultValue: 'Phát Hành Đăng Tin' })}
                          </button>
                        )}
                      </div>

                      {/* Right Group: Configuration & State Management (CustomSelect moved to end) */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/client/job-posts/${job.jobPostsId}/questions`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-muted hover:bg-border/60 text-text-primary transition-all text-xs font-bold cursor-pointer"
                        >
                          <HelpCircle size={14} /> {t('myJobs.actions.screeningQuestions', { defaultValue: 'Câu Hỏi Sàng Lọc' })}
                        </button>

                        {canClose(job) && (
                          <button
                            type="button"
                            onClick={() => setConfirmAction({ isOpen: true, job, actionType: 'close' })}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-muted text-text-muted hover:text-text-primary transition-all text-xs font-bold cursor-pointer disabled:opacity-50"
                          >
                            <Ban size={14} /> {t('myJobs.actions.closeJob', { defaultValue: 'Đóng Tin' })}
                          </button>
                        )}

                        {canCancel(job) && (
                          <button
                            type="button"
                            onClick={() => setConfirmAction({ isOpen: true, job, actionType: 'cancel' })}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all text-xs font-bold cursor-pointer disabled:opacity-50"
                          >
                            <XCircle size={14} /> {t('myJobs.actions.cancelJob', { defaultValue: 'Hủy Tin' })}
                          </button>
                        )}

                        {canChangeVisibility(job) && (
                          <div className="w-36 shrink-0">
                            <CustomSelect
                              value={String(job.visibility)}
                              onChange={val => void patchVisibility(job, Number(val) as JobPostVisibility)}
                              options={visibilitySelectOptions}
                              disabled={isPending || job.visibility === 3}
                              searchable={false}
                              ariaLabel={t('myJobs.visibility.ariaLabel', { defaultValue: 'Quyền riêng tư' })}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite Modal */}
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

      {/* Confirmation Modal for Close & Cancel Actions */}
      <ConfirmationModal
        isOpen={confirmAction.isOpen}
        onClose={() => setConfirmAction({ isOpen: false })}
        onConfirm={() => void handleConfirmAction()}
        isLoading={pendingJobId === confirmAction.job?.jobPostsId}
        variant={confirmAction.actionType === 'cancel' ? 'danger' : 'warning'}
        icon={confirmAction.actionType === 'cancel' ? <XCircle size={22} /> : <Ban size={22} />}
        title={
          confirmAction.actionType === 'cancel'
            ? t('myJobs.confirmCancelTitle', { defaultValue: 'Xác nhận hủy tin tuyển dụng' })
            : t('myJobs.confirmCloseTitle', { defaultValue: 'Xác nhận đóng tin tuyển dụng' })
        }
        description={
          confirmAction.actionType === 'cancel'
            ? t('myJobs.confirmCancelDesc', {
                defaultValue: 'Bạn có chắc chắn muốn hủy tin tuyển dụng "{{title}}"? Hành động hủy tin tuyển dụng không thể hoàn tác.',
                title: confirmAction.job?.title || '',
              })
            : t('myJobs.confirmCloseDesc', {
                defaultValue: 'Bạn có chắc chắn muốn đóng tin tuyển dụng "{{title}}"? Sau khi đóng, freelancer sẽ không thể nộp đề xuất mới.',
                title: confirmAction.job?.title || '',
              })
        }
        confirmText={
          confirmAction.actionType === 'cancel'
            ? t('myJobs.actions.cancelJob', { defaultValue: 'Hủy Tin' })
            : t('myJobs.actions.closeJob', { defaultValue: 'Đóng Tin' })
        }
      />
    </AppLayout>
  );
}
