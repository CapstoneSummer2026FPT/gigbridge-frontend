import { useMemo, useState } from 'react';
import {
  ArrowDownAZ,
  BriefcaseBusiness,
  ChevronDown,
  CirclePlus,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { GetMyJobPostDto } from '../../../types/models/Job';
import { CustomSelect } from '../../../shared/components/CustomSelect';

export type JobSort = 'proposals' | 'updated' | 'created' | 'title';
type JobStatusFilter = 'all' | '0' | '1' | '2' | '3';

interface ClientProposalJobSidebarProps {
  jobs: GetMyJobPostDto[];
  selectedJobId: string | null;
  onSelect: (jobPostId: string) => void;
  onCreateJob: () => void;
}

const focusClass =
  'outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const timestamp = (value?: string | null) => {
  const result = Date.parse(value || '');
  return Number.isNaN(result) ? 0 : result;
};

const compareTitle = (a: GetMyJobPostDto, b: GetMyJobPostDto) =>
  (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });

export const sortProposalReviewJobs = (
  jobs: GetMyJobPostDto[],
  sort: JobSort = 'proposals',
) => [...jobs].sort((a, b) => {
  const proposalDifference = Number(b.proposalCount || 0) - Number(a.proposalCount || 0);
  const updatedDifference = timestamp(b.updatedAt) - timestamp(a.updatedAt);
  const createdDifference = timestamp(b.createdAt) - timestamp(a.createdAt);

  if (sort === 'title') return compareTitle(a, b) || updatedDifference;
  if (sort === 'created') return createdDifference || proposalDifference || compareTitle(a, b);
  if (sort === 'updated') return updatedDifference || proposalDifference || compareTitle(a, b);
  return proposalDifference || updatedDifference || compareTitle(a, b);
});

const statusTone = (status: number) => {
  if (status === 1) return 'bg-emerald-600 text-white font-black shadow-xs border-none';
  if (status === 2) return 'bg-slate-600 text-white font-black shadow-xs border-none';
  if (status === 3) return 'bg-rose-600 text-white font-black shadow-xs border-none';
  return 'bg-amber-500 text-white font-black shadow-xs border-none';
};

export default function ClientProposalJobSidebar({
  jobs,
  selectedJobId,
  onSelect,
  onCreateJob,
}: ClientProposalJobSidebarProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<JobStatusFilter>('all');
  const [sort, setSort] = useState<JobSort>('created');
  const [mobileOpen, setMobileOpen] = useState(false);

  const selectedJob = jobs.find(job => job.jobPostsId === selectedJobId);
  const hasFilters = Boolean(search.trim()) || status !== 'all' || sort !== 'created';

  const jobSelectOptions = useMemo(() => {
    return jobs.map(job => ({
      value: job.jobPostsId,
      label: job.title || 'Dự án',
      badge: `${job.proposalCount || 0} đơn`,
    }));
  }, [jobs]);

  const statusLabel = (value: number) => {
    if (value === 1) return t('proposalReview.jobStatuses.open');
    if (value === 2) return t('proposalReview.jobStatuses.closed');
    if (value === 3) return t('proposalReview.jobStatuses.cancelled');
    return t('proposalReview.jobStatuses.draft');
  };

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return sortProposalReviewJobs(
      jobs.filter(job => {
        if (status !== 'all' && String(Number(job.status)) !== status) return false;
        return !query || (job.title || '').toLocaleLowerCase().includes(query);
      }),
      sort,
    );
  }, [jobs, search, sort, status]);

  const resetFilters = () => {
    setSearch('');
    setStatus('all');
    setSort('proposals');
  };

  const selectJob = (jobPostId: string) => {
    onSelect(jobPostId);
    setMobileOpen(false);
  };

  const formatUpdatedDate = (job: GetMyJobPostDto) => {
    const value = job.updatedAt || job.createdAt;
    if (!value) return t('proposalReview.projectSidebar.noDate');
    return new Intl.DateTimeFormat(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  };

  return (
    <aside
      aria-label={t('proposalReview.projectSidebar.label')}
      className="min-w-0 lg:sticky lg:top-20 lg:self-start"
    >
      <button
        type="button"
        aria-expanded={mobileOpen}
        aria-controls="proposal-project-list"
        onClick={() => setMobileOpen(current => !current)}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm lg:hidden ${focusClass}`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
            <BriefcaseBusiness size={19} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-muted-foreground">
              {t('proposalReview.projectSidebar.current')}
            </span>
            <span className="block truncate text-sm font-bold">
              {selectedJob?.title || t('proposalReview.noProjects')}
            </span>
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          size={18}
          className={`shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${mobileOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        id="proposal-project-list"
        className={`${mobileOpen ? 'mt-3 block' : 'hidden'} overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:mt-0 lg:flex lg:flex-col lg:max-h-[calc(100vh-8rem)]`}
      >
        <div className="border-b border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="text-cyan-600 dark:text-cyan-400" size={18} />
                <h2 className="font-bold">{t('proposalReview.projectSidebar.title')}</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('proposalReview.projectSidebar.count', {
                  visible: filteredJobs.length,
                  total: jobs.length,
                })}
              </p>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className={`inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-300 ${focusClass}`}
              >
                <RotateCcw size={13} />
                {t('proposalReview.projectSidebar.clear')}
              </button>
            )}
          </div>

          <div className="mt-3">
            <CustomSelect
              ariaLabel="Select job post"
              value={selectedJobId || ''}
              onChange={val => selectJob(val)}
              options={jobSelectOptions}
              leftIcon={<Search size={14} />}
              searchable={true}
              placeholder={t('proposalReview.projectSidebar.selectJobPlaceholder', { defaultValue: 'Tìm & chọn nhanh bài đăng...' })}
              searchPlaceholder={t('proposalReview.projectSidebar.searchPlaceholder', { defaultValue: 'Nhập tên bài đăng để tìm...' })}
            />
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <CustomSelect
              ariaLabel={t('proposalReview.projectSidebar.status')}
              value={status}
              onChange={val => setStatus(val as JobStatusFilter)}
              searchable={true}
              options={[
                { value: 'all', label: t('proposalReview.projectSidebar.statuses.all') },
                { value: '0', label: t('proposalReview.jobStatuses.draft') },
                { value: '1', label: t('proposalReview.jobStatuses.open') },
                { value: '2', label: t('proposalReview.jobStatuses.closed') },
                { value: '3', label: t('proposalReview.jobStatuses.cancelled') },
              ]}
            />
            <CustomSelect
              ariaLabel={t('proposalReview.projectSidebar.sort')}
              value={sort}
              onChange={val => setSort(val as JobSort)}
              leftIcon={<ArrowDownAZ size={15} />}
              options={[
                { value: 'proposals', label: t('proposalReview.projectSidebar.sorts.proposals') },
                { value: 'updated', label: t('proposalReview.projectSidebar.sorts.updated') },
                { value: 'created', label: t('proposalReview.projectSidebar.sorts.created') },
                { value: 'title', label: t('proposalReview.projectSidebar.sorts.title') },
              ]}
            />
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto p-2 lg:max-h-[520px] custom-scrollbar" aria-label={t('proposalReview.projectSidebar.navigation')}>
          {!jobs.length ? (
            <div className="px-3 py-10 text-center">
              <BriefcaseBusiness className="mx-auto text-muted-foreground" size={28} />
              <h3 className="mt-3 text-sm font-bold">{t('proposalReview.projectSidebar.emptyTitle')}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('proposalReview.projectSidebar.emptyBody')}</p>
              <button
                type="button"
                onClick={onCreateJob}
                className={`mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-cyan-700 ${focusClass}`}
              >
                <CirclePlus size={15} />
                {t('proposalReview.projectSidebar.create')}
              </button>
            </div>
          ) : !filteredJobs.length ? (
            <div className="px-3 py-10 text-center">
              <Search className="mx-auto text-muted-foreground" size={26} />
              <h3 className="mt-3 text-sm font-bold">{t('proposalReview.projectSidebar.noMatchesTitle')}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('proposalReview.projectSidebar.noMatchesBody')}</p>
              <button
                type="button"
                onClick={resetFilters}
                className={`mt-3 text-xs font-bold text-cyan-700 hover:underline dark:text-cyan-300 ${focusClass}`}
              >
                {t('proposalReview.projectSidebar.clear')}
              </button>
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredJobs.map(job => {
                const active = job.jobPostsId === selectedJobId;
                return (
                  <li key={job.jobPostsId}>
                    <button
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => selectJob(job.jobPostsId)}
                      className={`relative w-full overflow-hidden rounded-xl px-3 py-3 text-left transition ${focusClass} ${
                        active
                          ? 'bg-cyan-500/10 text-foreground'
                          : 'text-foreground hover:bg-muted/60'
                      }`}
                    >
                      {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-cyan-600" />}
                      <span className="line-clamp-2 text-sm font-bold leading-5">{job.title || t('proposalReview.notProvided')}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone(Number(job.status))}`}>
                          {statusLabel(Number(job.status))}
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {t('proposalReview.projectSidebar.proposalCount', { count: job.proposalCount ?? 0 })}
                        </span>
                      </span>
                      <span className="mt-2 block text-[11px] text-muted-foreground">
                        {t('proposalReview.projectSidebar.updated', { date: formatUpdatedDate(job) })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </div>
    </aside>
  );
}
