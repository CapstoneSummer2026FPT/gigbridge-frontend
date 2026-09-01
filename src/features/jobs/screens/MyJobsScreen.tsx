import { useEffect, useMemo, useRef, useState } from 'react';
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
  ChevronRight,
  Crown,
  Eye,
  FileText,
  Filter,
  Globe,
  HelpCircle,
  LayoutGrid,
  Lock,
  Megaphone,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Target,
  UserRoundCheck,
  Users,
  X,
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
import '../styles/my-jobs-screen.css';
import { CustomSelect, type SelectOption } from '../../../shared/components/CustomSelect';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';
import { getAllowedJobPostVisibilities } from '../utils/jobPostEditing';

type StatusFilter = 'all' | 'open' | 'draft' | 'closed' | 'cancelled';

const statusToFilter = (status?: number | null): StatusFilter => {
  if (status === JobPostStatus.Draft) return 'draft';
  if (status === JobPostStatus.Open) return 'open';
  if (status === JobPostStatus.Closed) return 'closed';
  if (status === JobPostStatus.Cancelled) return 'cancelled';
  return 'open';
};

const statusBadgeInfo = (status: number | null | undefined, t: any) => {
  if (status === JobPostStatus.Draft) {
    return {
      label: t('myJobs.status.draft', { defaultValue: 'Bản nháp' }),
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      dotClass: 'bg-amber-500',
    };
  }
  if (status === JobPostStatus.Open) {
    return {
      label: t('myJobs.status.open', { defaultValue: 'Đang tuyển' }),
      badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      dotClass: 'bg-emerald-500 animate-pulse',
    };
  }
  if (status === JobPostStatus.Closed) {
    return {
      label: t('myJobs.status.closed', { defaultValue: 'Đã đóng' }),
      badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
      dotClass: 'bg-slate-500',
    };
  }
  if (status === JobPostStatus.Cancelled) {
    return {
      label: t('myJobs.status.cancelled', { defaultValue: 'Đã hủy' }),
      badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
      dotClass: 'bg-rose-500',
    };
  }
  return {
    label: t('myJobs.status.unknown', { defaultValue: 'Khác' }),
    badgeClass: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
    dotClass: 'bg-slate-400',
  };
};

const visibilityInfo = (visibility: number | null | undefined, t: any) => {
  if (visibility === JobPostVisibility.Public) {
    return { label: t('myJobs.visibility.public', { defaultValue: 'Công khai' }), icon: <Globe size={11} /> };
  }
  if (visibility === JobPostVisibility.InviteOnly) {
    return { label: t('myJobs.visibility.inviteOnly', { defaultValue: 'Chỉ mời' }), icon: <UserRoundCheck size={11} /> };
  }
  if (visibility === 3) {
    return { label: t('myJobs.visibility.lockedByAdmin', { defaultValue: 'Khóa' }), icon: <Lock size={11} className="text-rose-500" /> };
  }
  return { label: t('myJobs.visibility.unknown', { defaultValue: 'Khác' }), icon: <HelpCircle size={11} /> };
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
  const [premiumActionBusy, setPremiumActionBusy] = useState(false);
  const [activeMenuJobId, setActiveMenuJobId] = useState<string | null>(null);
  const [activeAiMenuJobId, setActiveAiMenuJobId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    job?: GetMyJobPostDto;
    actionType?: 'close' | 'cancel';
  }>({ isOpen: false });

  // Mouse Drag-to-Scroll for Status Ribbon
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingTabsRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  const handleTabsMouseDown = (e: React.MouseEvent) => {
    if (!tabsContainerRef.current) return;
    isDraggingTabsRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - tabsContainerRef.current.offsetLeft;
    scrollLeftRef.current = tabsContainerRef.current.scrollLeft;
  };

  const handleTabsMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingTabsRef.current || !tabsContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - tabsContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
    }
    tabsContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleTabsMouseUpOrLeave = () => {
    isDraggingTabsRef.current = false;
  };

  const handleTabsWheel = (e: React.WheelEvent) => {
    if (!tabsContainerRef.current) return;
    if (e.deltaY !== 0) {
      tabsContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  // Close menus on outside click
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-action-menu]') && !target.closest('[data-ai-menu]')) {
        setActiveMenuJobId(null);
        setActiveAiMenuJobId(null);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

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

  /* AI Interview can now only be enabled while creating a job post.
  const createAiInterview = async (job: GetMyJobPostDto) => {
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
    updateLocalJob(job.jobPostsId, { hasAiInterview: true });
    toast.success(t('myJobs.aiInterviewEnabled', { defaultValue: 'Đã bật phỏng vấn AI.' }));
  };
  */

  const disableAiInterview = async (job: GetMyJobPostDto) => {
    setPremiumActionBusy(true);
    const response = await jobAPI.disableAiInterview(job.jobPostsId);
    setPremiumActionBusy(false);
    if (!response.success) {
      return toast.error(response.message || t('myJobs.disableAiInterviewFailed', { defaultValue: 'Không thể tắt phỏng vấn AI.' }));
    }
    updateLocalJob(job.jobPostsId, { hasAiInterview: false });
    toast.success(t('myJobs.aiInterviewDisabled', { defaultValue: 'Đã tắt phỏng vấn AI.' }));
  };

  const counts = useMemo(() => {
    const base = {
      all: jobs.length,
      open: 0,
      draft: 0,
      closed: 0,
      cancelled: 0,
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
        value: String(JobPostVisibility.InviteOnly),
        label: t('myJobs.visibility.inviteOnly', { defaultValue: 'Chỉ mời' }),
        icon: <UserRoundCheck size={14} />,
      },
    ],
    [t]
  );

  const getVisibilitySelectOptions = (job: GetMyJobPostDto): SelectOption[] => {
    const allowed = new Set(getAllowedJobPostVisibilities(job.visibility));
    return visibilitySelectOptions.filter(option => allowed.has(Number(option.value) as JobPostVisibility));
  };

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
  const canChangeVisibility = (job: GetMyJobPostDto) => job.visibility !== undefined;

  // Status Tab List for Mobile
  const statusTabs: { key: StatusFilter; label: string; count: number; icon: any }[] = [
    { key: 'open', label: 'Đang tuyển', count: counts.open, icon: CheckCircle2 },
    { key: 'draft', label: 'Bản nháp', count: counts.draft, icon: FileText },
    { key: 'closed', label: 'Đã đóng', count: counts.closed, icon: Ban },
    { key: 'cancelled', label: 'Đã hủy', count: counts.cancelled, icon: XCircle },
    { key: 'all', label: 'Tất cả', count: counts.all, icon: Briefcase },
  ];

  return (
    <AppLayout>
      <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 min-w-0">
        {/* ── TOP HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-border/60 pb-4 sm:pb-5">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-black uppercase tracking-wider">
                <Sparkles size={12} /> {t('myJobs.management', { defaultValue: 'Quản Lý Tuyển Dụng' })}
              </span>
              <h1 className="text-lg sm:text-3xl font-black text-text-primary tracking-tight truncate">
                {t('myJobs.title', { defaultValue: 'Tin Tuyển Dụng Của Tôi' })}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-[10px] font-black shrink-0 sm:hidden">
                {jobs.length}
              </span>
              {!premiumStatus.loading && <PremiumStatusBadge active={premiumStatus.isPremium} compact />}
            </div>
            <p className="text-xs text-text-muted font-medium leading-relaxed hidden sm:block">
              {t('myJobs.subtitle', { defaultValue: 'Tổng quan và quản lý toàn bộ các dự án, tin đăng tuyển dụng và ứng viên.' })}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/jobs/post')}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl bg-brand text-xs font-black text-white shadow-md shadow-brand/20 hover:bg-brand-hover active:scale-95 transition-all cursor-pointer shrink-0 self-end sm:self-auto"
          >
            <Plus size={15} />
            <span className="hidden xs:inline">{t('myJobs.postNewJob', { defaultValue: 'Đăng Tin Tuyển Dụng Mới' })}</span>
            <span className="xs:hidden">Tạo tin</span>
          </button>
        </div>

        {/* ── DESKTOP ONLY: 4 EXECUTIVE METRIC TILES ── */}
        <div className="hidden md:grid md:grid-cols-4 gap-4">
          <div className="rounded-2xl sm:rounded-3xl border border-border/80 bg-surface-card p-4 sm:p-5 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5 truncate">
                <Briefcase size={13} className="text-brand shrink-0" /> {t('myJobs.metrics.totalJobs', { defaultValue: 'Tổng Số Tin Đăng' })}
              </span>
            </div>
            <div className="text-3xl font-black text-text-primary tracking-tight">{counts.all}</div>
            <p className="text-[11px] font-semibold text-text-muted truncate">{t('myJobs.metrics.totalJobsDesc', { defaultValue: 'Tin tuyển dụng trên hệ thống' })}</p>
          </div>

          <div className="rounded-2xl sm:rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 truncate">
                <CheckCircle2 size={13} className="shrink-0" /> {t('myJobs.metrics.openJobs', { defaultValue: 'Đang Tuyển Dụng' })}
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            </div>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{counts.open}</div>
            <p className="text-[11px] font-semibold text-emerald-600/80 dark:text-emerald-400/80 truncate">{t('myJobs.metrics.openJobsDesc', { defaultValue: 'Sẵn sàng nhận ứng tuyển' })}</p>
          </div>

          <div className="rounded-2xl sm:rounded-3xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5 truncate">
                <FileText size={13} className="shrink-0" /> {t('myJobs.metrics.draftJobs', { defaultValue: 'Bản Nháp' })}
              </span>
            </div>
            <div className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{counts.draft}</div>
            <p className="text-[11px] font-semibold text-amber-600/80 dark:text-amber-400/80 truncate">{t('myJobs.metrics.draftJobsDesc', { defaultValue: 'Cần đăng hoàn tất' })}</p>
          </div>

          <div className="rounded-2xl sm:rounded-3xl border border-border/80 bg-surface-card p-4 sm:p-5 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5 truncate">
                <Ban size={13} className="shrink-0" /> {t('myJobs.metrics.closedCancelled', { defaultValue: 'Đã Đóng / Hủy' })}
              </span>
            </div>
            <div className="text-3xl font-black text-text-primary tracking-tight">{counts.closed + counts.cancelled}</div>
            <p className="text-[11px] font-semibold text-text-muted truncate">{t('myJobs.metrics.closedCancelledDesc', { defaultValue: 'Dự án đã kết thúc' })}</p>
          </div>
        </div>

        {/* ── DESKTOP FILTER BAR ── */}
        <div className="hidden md:block rounded-2xl sm:rounded-3xl border border-border/80 bg-surface-card p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 min-w-0">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder={t('myJobs.searchPlaceholder', { defaultValue: 'Tìm theo tên công việc, kỹ năng, chuyên ngành...' })}
                className="w-full h-11 rounded-2xl border border-border/80 bg-surface-muted/40 pl-10 pr-4 text-xs font-bold text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-56 shrink-0">
                <CustomSelect
                  value={statusFilter}
                  onChange={val => setStatusFilter(val as StatusFilter)}
                  options={statusSelectOptions}
                  placeholder={t('myJobs.filterByStatus', { defaultValue: 'Lọc theo trạng thái' })}
                  leftIcon={<Filter size={13} />}
                  searchable={false}
                  ariaLabel={t('myJobs.filterByStatus', { defaultValue: 'Lọc theo trạng thái' })}
                />
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl border border-border/60 bg-surface-muted/40 shrink-0">
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
          </div>

          <div className="text-[11px] font-bold text-text-muted px-1 flex items-center justify-between">
            <span>{t('myJobs.showingCount', { defaultValue: 'Hiển thị {{count}} / {{total}} tin đăng', count: filteredJobs.length, total: jobs.length })}</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-brand hover:underline cursor-pointer text-[10.5px]"
              >
                Xóa tìm kiếm
              </button>
            )}
          </div>
        </div>

        {/* ── MOBILE ONLY: STATUS TABS & SEARCH INPUT BAR ── */}
        <div className="md:hidden space-y-3">
          {/* Status Ribbon with Mouse Drag-to-Scroll */}
          <div
            ref={tabsContainerRef}
            onMouseDown={handleTabsMouseDown}
            onMouseMove={handleTabsMouseMove}
            onMouseUp={handleTabsMouseUpOrLeave}
            onMouseLeave={handleTabsMouseUpOrLeave}
            onWheel={handleTabsWheel}
            className="w-full max-w-full overflow-x-auto pb-1.5 scrollbar-none flex items-center gap-2 min-w-0 mj-tabs-scroll-ribbon"
          >
            {statusTabs.map(tab => {
              const isActive = statusFilter === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    if (hasMovedRef.current) return;
                    setStatusFilter(tab.key);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 border select-none ${
                    isActive
                      ? 'bg-brand text-white border-brand shadow-sm shadow-brand/25 ring-2 ring-brand/20'
                      : 'bg-surface-card text-text-muted hover:text-text-primary border-border/70 hover:border-brand/40'
                  }`}
                >
                  <Icon size={13} className={isActive ? 'text-white' : 'text-text-muted'} />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-surface-muted text-text-muted'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder={t('myJobs.searchPlaceholder', { defaultValue: 'Tìm theo tiêu đề, kỹ năng...' })}
              className="w-full h-10 rounded-xl border border-border/80 bg-surface-card pl-10 pr-9 text-xs font-bold text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── JOB POSTS CONTAINER ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <RefreshCw size={28} className="animate-spin text-brand" />
            <span className="text-xs font-bold text-text-muted">{t('myJobs.loading', { defaultValue: 'Đang tải tin tuyển dụng...' })}</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center space-y-3">
            <XCircle size={32} className="mx-auto text-rose-500" />
            <div>
              <h3 className="text-sm font-black text-text-primary">{t('myJobs.unableToLoad', { defaultValue: 'Không thể tải tin tuyển dụng' })}</h3>
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
          <div className="rounded-2xl border border-border/80 bg-surface-card p-8 sm:p-10 text-center space-y-3 shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto text-brand">
              <Briefcase size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-text-primary">{t('myJobs.noJobs', { defaultValue: 'Chưa có tin tuyển dụng nào' })}</h3>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'Không tìm thấy tin đăng phù hợp với từ khóa.'
                  : 'Hãy bắt đầu tạo tin tuyển dụng đầu tiên của bạn để tìm freelancer xuất sắc!'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/jobs/post')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-xs font-black text-white hover:bg-brand-hover transition cursor-pointer shadow-md"
            >
              <Plus size={15} />
              {t('myJobs.postNewJob', { defaultValue: 'Đăng Tin Tuyển Dụng Mới' })}
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredJobs.map(job => {
              const isPending = pendingJobId === job.jobPostsId;
              const statusInfo = statusBadgeInfo(job.status, t);
              const visInfo = visibilityInfo(job.visibility, t);
              const isMenuOpen = activeMenuJobId === job.jobPostsId;
              const isAiMenuOpen = activeAiMenuJobId === job.jobPostsId;

              return (
                <article
                  key={job.jobPostsId}
                  className="rounded-2xl sm:rounded-3xl border border-border/80 bg-surface-card p-3.5 sm:p-6 shadow-xs hover:border-brand/40 hover:shadow-md transition-all space-y-3 sm:space-y-4 w-full min-w-0 max-w-full relative overflow-visible focus-within:z-30 hover:z-20"
                >
                  {/* 1. DESKTOP & MOBILE TOP ROW / HEADER */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Status Badges & Creation Date */}
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusInfo.badgeClass}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`} />
                          {statusInfo.label}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-surface-muted border border-border text-text-muted">
                          {visInfo.icon}
                          {visInfo.label}
                        </span>

                        {job.hasAiInterview && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-brand/15 text-brand border border-brand/25">
                            <Bot size={12} /> AI Interview
                          </span>
                        )}

                        {job.isFeatured && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-2xs">
                            <Crown size={12} /> {t('myJobs.featured', { defaultValue: 'Nổi bật' })}
                          </span>
                        )}

                        {/* Mobile creation date */}
                        <span className="text-[10px] font-medium text-text-muted ml-auto sm:hidden">
                          {formatDate(job.createdAt)}
                        </span>
                      </div>

                      {/* Title */}
                      <h2
                        onClick={() => navigate(`/jobs/my-jobs/${job.jobPostsId}`)}
                        className="text-sm sm:text-lg font-black text-text-primary hover:text-brand transition cursor-pointer leading-snug break-words [overflow-wrap:anywhere]"
                      >
                        {job.title}
                      </h2>

                      {/* Description (Desktop respects isCompact) */}
                      {(!isCompact || false) && job.description && (
                        <p className="text-xs text-text-muted font-medium line-clamp-2 leading-relaxed break-words">
                          {job.description}
                        </p>
                      )}

                      {/* Draft Warning Banner */}
                      {job.status === JobPostStatus.Draft && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 sm:p-3 flex items-center justify-between gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                          <div className="flex items-center gap-2 min-w-0">
                            <AlertCircle size={15} className="shrink-0" />
                            <span className="leading-snug text-[11px] sm:text-xs">
                              {t('myJobs.draftBanner', { defaultValue: 'Tin đăng ở trạng thái bản nháp. Bấm "Phát Hành Đăng Tin" để công khai.' })}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => patchStatus(job, JobPostStatus.Open, t('myJobs.publishSuccess', { defaultValue: 'Đã phát hành tin tuyển dụng công khai!' }))}
                            disabled={isPending}
                            className="sm:hidden px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-black shrink-0 hover:bg-amber-600 cursor-pointer shadow-xs active:scale-95"
                          >
                            Phát hành
                          </button>
                        </div>
                      )}

                      {/* Tags Row */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {job.majorName && (
                          <span className="px-2.5 py-0.5 sm:py-1 rounded-xl bg-brand/10 border border-brand/20 text-brand text-[9.5px] sm:text-[10px] font-extrabold">
                            {job.majorName}
                          </span>
                        )}
                        {job.categoryName && (
                          <span className="px-2.5 py-0.5 sm:py-1 rounded-xl bg-surface-muted border border-border text-text-muted text-[9.5px] sm:text-[10px] font-bold">
                            {job.categoryName}
                          </span>
                        )}
                        {(job.skills || []).slice(0, 5).map(skill => (
                          <span key={skill.skillId} className="px-2 py-0.5 rounded-lg bg-surface-muted/60 border border-border/50 text-[9.5px] sm:text-[10px] font-semibold text-text-muted">
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Desktop Budget Box */}
                    <div className="hidden sm:block text-right shrink-0 bg-surface-muted/50 border border-border/60 rounded-2xl p-3 space-y-0.5 min-w-[160px]">
                      <span className="block text-[9px] font-black uppercase tracking-wider text-text-muted">{t('myJobs.projectBudget', { defaultValue: 'Ngân sách dự án' })}</span>
                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        <GigCoinBudget min={job.budgetMin} max={job.budgetMax} />
                      </div>
                    </div>
                  </div>

                  {/* Mobile Fluid Key Stats Box */}
                  <div className="sm:hidden grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-surface-muted/40 border border-border/60 text-xs w-full min-w-0">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-text-muted truncate">Ngân sách</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs truncate">
                        <GigCoinBudget min={job.budgetMin} max={job.budgetMax} />
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 min-w-0 text-right">
                      <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-text-muted truncate">Đề xuất</span>
                      <span className="font-black text-brand flex items-center justify-end gap-1 text-xs truncate">
                        <Users size={12} className="shrink-0" />
                        <span>{job.proposalCount} hồ sơ</span>
                      </span>
                    </div>
                  </div>

                  {/* Desktop Metadata Row */}
                  <div className="hidden sm:flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/60 text-xs text-text-muted font-medium">
                    <div className="flex items-center gap-6 flex-wrap">
                      <span className="flex items-center gap-1.5 font-bold text-text-primary text-xs">
                        <Users size={14} className="text-brand shrink-0" />
                        {t('myJobs.proposalsCount', { defaultValue: '{{count}} Đề xuất / Ứng viên', count: job.proposalCount })}
                      </span>

                      <span className="flex items-center gap-1.5 text-xs">
                        <Calendar size={14} className="shrink-0" />
                        {t('myJobs.postedDate', { defaultValue: 'Ngày đăng: {{date}}', date: formatDate(job.createdAt) })}
                      </span>
                    </div>
                  </div>

                  {/* ── DESKTOP ACTION BAR (ORIGINAL RICH WORKFLOW) ── */}
                  <div className="hidden sm:flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 w-full pt-2 border-t border-border/40">
                    {/* Left Group: Primary Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/jobs/my-jobs/${job.jobPostsId}`)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-hover transition-all text-xs font-black cursor-pointer shadow-md active:scale-95"
                      >
                        <Eye size={14} /> {t('myJobs.actions.viewDetails', { defaultValue: 'View Details & Proposals' })}
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
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-brand/30 bg-brand/10 text-brand hover:bg-brand/20 transition-all text-xs font-bold cursor-pointer disabled:opacity-50 active:scale-95"
                          >
                            <Users size={14} /> {t('myJobs.actions.inviteFreelancer', { defaultValue: 'Mời Freelancer' })}
                          </button>

                          {/* Desktop AI Tools Details Dropdown */}
                          <details className="relative inline-block focus-within:z-50">
                            <summary className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:border-amber-500/70 hover:shadow-lg transition-all text-xs font-black cursor-pointer list-none select-none active:scale-95">
                              <Sparkles size={13} className="text-amber-500 animate-pulse shrink-0" />
                              <span>{t('myJobs.actions.aiFeatures', { defaultValue: 'Tính Năng AI' })}</span>
                              <ChevronDown size={13} className="opacity-80 shrink-0" />
                            </summary>
                            <div className="mj-ai-dropdown-panel animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-between px-2.5 py-1 border-b border-border/50 pb-1.5 mb-0.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                                  <Sparkles size={12} /> {t('myJobs.actions.aiToolsHeader', { defaultValue: 'Công Cụ AI Nâng Cao' })}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-[9px] font-black uppercase">VIP</span>
                              </div>

                              <button
                                type="button"
                                onClick={event => {
                                  event.currentTarget.closest('details')?.removeAttribute('open');
                                  openPremiumPath(() => navigate(`/talent-matching?job=${job.jobPostsId}&tab=smart`));
                                }}
                                className="mj-ai-dropdown-item"
                              >
                                <div className="h-8 w-8 rounded-lg bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0">
                                  <Target size={15} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-black text-foreground flex items-center justify-between">
                                    <span>{t('myJobs.actions.aiCandidateSuggestion', { defaultValue: 'Gợi ý ứng viên AI' })}</span>
                                    {!premiumStatus.isPremium && <Crown size={12} className="text-amber-500 shrink-0 ml-1" />}
                                  </div>
                                  <div className="text-[10px] font-medium text-text-muted truncate">{t('myJobs.actions.aiCandidateSuggestionDesc', { defaultValue: 'Ghép nối freelancer phù hợp' })}</div>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={event => {
                                  event.currentTarget.closest('details')?.removeAttribute('open');
                                  if (!premiumStatus.isPremium) {
                                    navigate('/premium/client/pricing');
                                  } else {
                                    navigate('/premium/client#job-promotions', { state: { activeTab: 'promotions' } });
                                  }
                                }}
                                className="mj-ai-dropdown-item"
                              >
                                <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                                  <Megaphone size={15} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-black text-foreground flex items-center justify-between">
                                    <span>{job.isFeatured ? t('myJobs.actions.managePromotion', { defaultValue: 'Quản lý quảng bá' }) : t('myJobs.actions.promoteFeatured', { defaultValue: 'Quảng bá tin nổi bật' })}</span>
                                    {!premiumStatus.isPremium && !job.isFeatured && <Crown size={12} className="text-amber-500 shrink-0 ml-1" />}
                                  </div>
                                  <div className="text-[10px] font-medium text-text-muted truncate">{t('myJobs.actions.promoteDesc', { defaultValue: 'Ghim vị trí ưu tiên trang chủ' })}</div>
                                </div>
                              </button>

                              {job.hasAiInterview && (
                                <button
                                  type="button"
                                  onClick={event => {
                                    event.currentTarget.closest('details')?.removeAttribute('open');
                                    void disableAiInterview(job);
                                  }}
                                  disabled={premiumActionBusy}
                                  className="mj-ai-dropdown-item text-rose-500 hover:bg-rose-500/10"
                                >
                                  <div className="h-8 w-8 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
                                    <Bot size={15} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-black">{t('myJobs.actions.turnOffAiInterview', { defaultValue: 'Tắt phỏng vấn AI' })}</div>
                                    <div className="text-[10px] font-medium text-rose-400/80 truncate">{t('myJobs.actions.turnOffAiInterviewDesc', { defaultValue: 'Tạm dừng sàng lọc tự động' })}</div>
                                  </div>
                                </button>
                              )}
                              {/* AI Interview must be enabled in the job-post wizard.
                                <button
                                  type="button"
                                  onClick={event => {
                                    event.currentTarget.closest('details')?.removeAttribute('open');
                                    openPremiumPath(() => void createAiInterview(job));
                                  }}
                                  disabled={premiumActionBusy}
                                  className="mj-ai-dropdown-item hover:bg-emerald-500/10"
                                >
                                  <div className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                                    <Bot size={15} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-black text-foreground flex items-center justify-between">
                                      <span>{t('myJobs.actions.turnOnAiInterview', { defaultValue: 'Bật phỏng vấn AI' })}</span>
                                      {!premiumStatus.isPremium && <Crown size={12} className="text-amber-500 shrink-0 ml-1" />}
                                    </div>
                                    <div className="text-[10px] font-medium text-text-muted truncate">{t('myJobs.actions.turnOnAiInterviewDesc', { defaultValue: 'Phỏng vấn & chấm điểm AI' })}</div>
                                  </div>
                                </button>
                              */}
                            </div>
                          </details>
                        </>
                      )}

                      {canPublish(job) && (
                        <button
                          type="button"
                          onClick={() => patchStatus(job, JobPostStatus.Open, t('myJobs.publishSuccess', { defaultValue: 'Đã phát hành tin tuyển dụng công khai!' }))}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all text-xs font-black cursor-pointer shadow-md disabled:opacity-50 active:scale-95"
                        >
                          <Send size={14} /> {t('myJobs.actions.publish', { defaultValue: 'Phát Hành Đăng Tin' })}
                        </button>
                      )}
                    </div>

                    {/* Right Group: Configuration & State Management */}
                    <div className="flex items-center gap-2 flex-wrap lg:justify-end">
                      <button
                        type="button"
                        onClick={() => navigate(`/client/job-posts/${job.jobPostsId}/questions`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-muted hover:bg-border/60 text-text-primary transition-all text-xs font-bold cursor-pointer active:scale-95"
                      >
                        <HelpCircle size={13} /> {t('myJobs.actions.screeningQuestions', { defaultValue: 'Câu Hỏi Sàng Lọc' })}
                      </button>

                      {canClose(job) && (
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ isOpen: true, job, actionType: 'close' })}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-muted text-text-muted hover:text-text-primary transition-all text-xs font-bold cursor-pointer disabled:opacity-50 active:scale-95"
                        >
                          <Ban size={13} /> {t('myJobs.actions.closeJob', { defaultValue: 'Đóng Tin' })}
                        </button>
                      )}

                      {canCancel(job) && (
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ isOpen: true, job, actionType: 'cancel' })}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all text-xs font-bold cursor-pointer disabled:opacity-50 active:scale-95"
                        >
                          <XCircle size={13} /> {t('myJobs.actions.cancelJob', { defaultValue: 'Hủy Tin' })}
                        </button>
                      )}

                      {canChangeVisibility(job) && (
                        <div className="w-36 shrink-0">
                          <CustomSelect
                            value={String(job.visibility ?? JobPostVisibility.Public)}
                            onChange={val => void patchVisibility(job, Number(val) as JobPostVisibility)}
                            options={getVisibilitySelectOptions(job)}
                            disabled={isPending || job.visibility === 3}
                            searchable={false}
                            ariaLabel={t('myJobs.visibility.ariaLabel', { defaultValue: 'Quyền riêng tư' })}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── MOBILE ACTION BAR (COMPACT & ERGONOMIC) ── */}
                  <div className="sm:hidden flex items-center gap-1.5 pt-2.5 border-t border-border/50 w-full min-w-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/jobs/my-jobs/${job.jobPostsId}`)}
                      className="flex-1 min-w-0 inline-flex items-center justify-center gap-1 h-9 px-2.5 py-1.5 rounded-xl bg-brand text-white text-[11px] xs:text-xs font-black hover:bg-brand-hover active:scale-95 transition-all shadow-xs cursor-pointer truncate"
                    >
                      <Eye size={13} className="shrink-0" />
                      <span className="truncate">{t('myJobs.actions.viewDetails', { defaultValue: 'View Details & Proposals' })}</span>
                      <ChevronRight size={12} className="opacity-70 shrink-0 hidden xs:inline ml-auto" />
                    </button>

                    {job.status === JobPostStatus.Open && (
                      <button
                        type="button"
                        onClick={() => {
                          setInviteJobId(job.jobPostsId);
                          setInviteJobTitle(job.title);
                        }}
                        disabled={isPending}
                        title="Mời ứng viên"
                        className="inline-flex items-center justify-center gap-1 h-9 px-2.5 rounded-xl bg-brand/10 text-brand border border-brand/25 text-xs font-black hover:bg-brand/20 active:scale-95 transition-all cursor-pointer shrink-0"
                      >
                        <Users size={13} />
                        <span className="hidden xs:inline">Mời</span>
                      </button>
                    )}

                    {/* AI Menu Button */}
                    <div className="relative shrink-0" data-ai-menu>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveAiMenuJobId(isAiMenuOpen ? null : job.jobPostsId);
                          setActiveMenuJobId(null);
                        }}
                        title="Tính năng AI"
                        className={`inline-flex items-center justify-center gap-1 h-9 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                          isAiMenuOpen || job.hasAiInterview
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                        }`}
                      >
                        <Sparkles size={13} className="animate-pulse" />
                        <span>AI</span>
                      </button>

                      {isAiMenuOpen && (
                        <div className="mj-ai-menu-bottom animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
                          <div className="px-2 py-1.5 border-b border-border/50 text-[10px] font-black uppercase text-amber-500 flex items-center justify-between">
                            <span>Công cụ AI Nâng cao</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/15 text-[9px]">VIP</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveAiMenuJobId(null);
                              openPremiumPath(() => navigate(`/talent-matching?job=${job.jobPostsId}&tab=smart`));
                            }}
                            className="mj-ai-dropdown-item"
                          >
                            <Target size={14} className="text-indigo-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="truncate">Gợi ý ứng viên AI</div>
                              <div className="text-[10px] text-text-muted font-medium truncate">Ghép nối freelancer phù hợp</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveAiMenuJobId(null);
                              if (!premiumStatus.isPremium) {
                                navigate('/premium/client/pricing');
                              } else {
                                navigate('/premium/client#job-promotions', { state: { activeTab: 'promotions' } });
                              }
                            }}
                            className="mj-ai-dropdown-item"
                          >
                            <Megaphone size={14} className="text-amber-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="truncate">{job.isFeatured ? 'Quản lý quảng bá' : 'Quảng bá tin nổi bật'}</div>
                              <div className="text-[10px] text-text-muted font-medium truncate">Ghim vị trí ưu tiên trang chủ</div>
                            </div>
                          </button>

                          {job.hasAiInterview && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveAiMenuJobId(null);
                                void disableAiInterview(job);
                              }}
                              disabled={premiumActionBusy}
                              className="mj-ai-dropdown-item text-rose-500 hover:bg-rose-500/10"
                            >
                              <Bot size={14} className="shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="truncate">Tắt phỏng vấn AI</div>
                                <div className="text-[10px] text-rose-400 font-medium truncate">Tạm dừng sàng lọc tự động</div>
                              </div>
                            </button>
                          )}
                          {/* AI Interview must be enabled in the job-post wizard.
                            <button
                              type="button"
                              onClick={() => {
                                setActiveAiMenuJobId(null);
                                openPremiumPath(() => void createAiInterview(job));
                              }}
                              disabled={premiumActionBusy}
                              className="mj-ai-dropdown-item hover:bg-emerald-500/10"
                            >
                              <Bot size={14} className="text-emerald-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="truncate">Bật phỏng vấn AI</div>
                                <div className="text-[10px] text-text-muted font-medium truncate">Phỏng vấn & chấm điểm AI</div>
                              </div>
                            </button>
                          */}
                        </div>
                      )}
                    </div>

                    {/* More Options Menu Button (⋯) */}
                    <div className="relative shrink-0" data-action-menu>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuJobId(isMenuOpen ? null : job.jobPostsId);
                          setActiveAiMenuJobId(null);
                        }}
                        title="Tùy chọn khác"
                        className={`h-9 w-9 flex items-center justify-center rounded-xl border transition-all cursor-pointer ${
                          isMenuOpen
                            ? 'bg-surface-muted text-text-primary border-brand'
                            : 'bg-surface-muted/60 text-text-muted border-border/70 hover:text-text-primary'
                        }`}
                      >
                        <MoreVertical size={14} />
                      </button>

                      {isMenuOpen && (
                        <div className="mj-options-menu-bottom animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuJobId(null);
                              navigate(`/client/job-posts/${job.jobPostsId}/questions`);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted text-xs font-bold text-foreground text-left cursor-pointer"
                          >
                            <HelpCircle size={14} className="text-brand shrink-0" />
                            <span>Câu hỏi sàng lọc</span>
                          </button>

                          {/* Visibility toggle options */}
                          <div className="px-3 py-1.5 border-t border-border/50 text-[10px] font-extrabold uppercase text-text-muted">
                            Quyền riêng tư
                          </div>
                          {getVisibilitySelectOptions(job).map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setActiveMenuJobId(null);
                                void patchVisibility(job, Number(opt.value) as JobPostVisibility);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-left cursor-pointer ${
                                String(job.visibility) === opt.value
                                  ? 'bg-brand/10 text-brand'
                                  : 'hover:bg-muted text-text-muted'
                              }`}
                            >
                              {opt.icon}
                              <span>{opt.label}</span>
                              {String(job.visibility) === opt.value && <span className="ml-auto text-[10px]">✓</span>}
                            </button>
                          ))}

                          {/* Close & Cancel Action Buttons */}
                          {(canClose(job) || canCancel(job)) && <div className="border-t border-border/50 my-1" />}

                          {canClose(job) && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuJobId(null);
                                setConfirmAction({ isOpen: true, job, actionType: 'close' });
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted text-xs font-bold text-text-muted hover:text-foreground text-left cursor-pointer"
                            >
                              <Ban size={14} className="text-amber-500 shrink-0" />
                              <span>Đóng tin tuyển dụng</span>
                            </button>
                          )}

                          {canCancel(job) && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuJobId(null);
                                setConfirmAction({ isOpen: true, job, actionType: 'cancel' });
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-xs font-bold text-rose-500 text-left cursor-pointer"
                            >
                              <XCircle size={14} className="shrink-0" />
                              <span>Hủy tin tuyển dụng</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
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
