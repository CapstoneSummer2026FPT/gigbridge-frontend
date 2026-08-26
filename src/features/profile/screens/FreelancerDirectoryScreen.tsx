import { useEffect, useState, useMemo, useRef, type FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import {
  Search,
  Star,
  MapPin,
  Briefcase,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  UsersRound,
  RotateCw,
  ArrowRight,
  LayoutGrid,
  List,
  SlidersHorizontal,
  PlusCircle,
  X,
  ChevronDown,
  Check,
  ArrowUpDown,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { profileGetAPI } from '../../../api/profileAPI';
import { useApp } from '../../../app/providers/AppProvider';
import { useLanguage } from '../../../hooks/useTranslation';
import { AuthInviteModal } from '../../../shared/components/AuthInviteModal';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import type { PublicFreelancerSummaryDto, FreelancerDirectorySort } from '../../../types/models/Profile';
import '../styles/freelancer-directory.css';

const DEFAULT_CATEGORIES = [
  'Lập trình Web & Phần mềm',
  'Thiết kế UI/UX & Đồ họa',
  'Trí tuệ nhân tạo & Data Science',
  'Ứng dụng Di động iOS & Android',
  'Blockchain & Web3',
  'Marketing số & Nội dung',
  'DevOps & Điện toán đám mây',
  'Game Development',
];

const POPULAR_SKILLS = [
  'React',
  'Figma',
  'TypeScript',
  'UI/UX',
  'Node.js',
  'Python',
  'Next.js',
  'Flutter',
  'Solidity',
  'AI / ML',
  'Tailwind CSS',
  'AWS',
];

export function FreelancerDirectoryScreen() {
  const { user, role, isAuthenticated } = useApp();
  const { currentLanguage } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isFreelancer = Boolean(user && role === 1);

  const initialSearch = searchParams.get('q')?.trim() ?? '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [sortBy] = useState<FreelancerDirectorySort>('featured');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(20);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'compact'>('grid');
  const [page, setPage] = useState<number>(1);

  const [freelancers, setFreelancers] = useState<readonly PublicFreelancerSummaryDto[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Category dropdown state
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Auth modal for guest actions
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [targetFreelancerName, setTargetFreelancerName] = useState('');

  // Close category popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync search input with URL params
  useEffect(() => {
    const q = searchParams.get('q')?.trim() ?? '';
    setSearchQuery(q);
  }, [searchParams]);

  // Load freelancers with debouncing
  useEffect(() => {
    let active = true;
    const fetchFreelancers = async () => {
      setLoading(true);
      setError(null);

      // Build effective search term
      let effectiveSearch = searchQuery.trim();
      if (!effectiveSearch && selectedSkill) {
        effectiveSearch = selectedSkill;
      } else if (!effectiveSearch && selectedCategory) {
        effectiveSearch = selectedCategory;
      }

      try {
        const response = await profileGetAPI.getPublicFreelancers({
          page,
          pageSize,
          sort: sortBy,
          search: effectiveSearch || undefined,
        });

        if (!active) return;

        if (response.success && response.data) {
          setFreelancers(response.data.items || []);
          setTotalCount(response.data.totalCount || 0);
        } else {
          setError(response.message || 'Không thể tải danh sách chuyên gia.');
        }
      } catch {
        if (active) setError('Đã có lỗi xảy ra khi kết nối máy chủ.');
      } finally {
        if (active) setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchFreelancers, 250);
    return () => {
      active = false;
      clearTimeout(debounceTimer);
    };
  }, [searchQuery, selectedCategory, selectedSkill, sortBy, page, pageSize]);

  // Generate category options from default list and data
  const categoryOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    freelancers.forEach((f) => {
      if (f.majorName) set.add(f.majorName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [freelancers]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      newParams.set('q', searchQuery.trim());
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  const handleCategorySelect = (catName: string | null) => {
    setSelectedCategory(catName);
    setIsCategoryOpen(false);
    setPage(1);
  };

  const handleSkillSelect = (skill: string) => {
    if (selectedSkill === skill) {
      setSelectedSkill(null);
    } else {
      setSelectedSkill(skill);
      setSearchQuery(skill);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('q', skill);
      setSearchParams(newParams);
    }
    setPage(1);
  };

  const handleInviteClick = (freelancer: PublicFreelancerSummaryDto) => {
    if (!isAuthenticated) {
      setTargetFreelancerName(freelancer.userFullName || 'freelancer');
      setAuthModalOpen(true);
      return;
    }
    navigate('/jobs/post');
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const isVietnamese = currentLanguage === 'vi';

  const resultTitle = searchQuery
    ? isVietnamese
      ? `Kết quả tìm kiếm cho “${searchQuery}”`
      : `Search results for “${searchQuery}”`
    : selectedCategory
      ? selectedCategory
      : isVietnamese
        ? 'Tất cả chuyên gia'
        : 'All Freelancers';

  const resultDescription = isVietnamese
    ? 'Duyệt danh sách hồ sơ chuyên gia đã xác thực năng lực, đánh giá và kỹ năng.'
    : 'Explore verified freelancer profiles, evaluate ratings and core skills.';

  return (
    <AppLayout>
      <div className="max-w-[1500px] mx-auto px-4 py-8">
        {/* Header (Talent Matching Style with Search/Directory Context) */}
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-brand text-[11px] font-black uppercase tracking-[0.2em] mb-2">
              <Sparkles size={14} />
              <span>
                {searchQuery
                  ? isVietnamese
                    ? 'KẾT QUẢ TÌM KIẾM FREELANCER'
                    : 'FREELANCER SEARCH RESULTS'
                  : isVietnamese
                    ? 'DANH BẠ CHUYÊN GIA FREELANCER'
                    : 'FREELANCER DIRECTORY'}
              </span>
            </div>
            <h1 className="text-3xl font-black text-text-primary leading-tight">
              {searchQuery ? (
                isVietnamese ? (
                  <>
                    Kết quả tìm kiếm cho “<span className="font-serif italic font-normal text-brand">{searchQuery}</span>”
                  </>
                ) : (
                  <>
                    Search results for “<span className="font-serif italic font-normal text-brand">{searchQuery}</span>”
                  </>
                )
              ) : isVietnamese ? (
                <>
                  Khám phá & Tìm kiếm <span className="font-serif italic font-normal text-brand">Freelancer Chuyên Nghiệp</span>
                </>
              ) : (
                <>
                  Explore & Discover <span className="font-serif italic font-normal text-brand">Professional Freelancers</span>
                </>
              )}
            </h1>
            <p className="text-text-secondary text-sm mt-1.5 max-w-xl">
              {isVietnamese
                ? 'Tìm kiếm hồ sơ nhân tài theo từ khóa, kỹ năng và danh mục chuyên môn để chọn đối tác phù hợp nhất.'
                : 'Search talent profiles by keywords, core skills, and industry categories to find your ideal match.'}
            </p>
          </div>

          {/* Post a Job Button for Clients/Guests only */}
          {!isFreelancer && (
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setAuthModalOpen(true);
                  return;
                }
                navigate('/jobs/post');
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--brand)] to-indigo-500 text-white text-sm font-bold shadow-md shadow-brand/25 hover:opacity-95 transition-all self-start xl:self-auto shrink-0"
            >
              <PlusCircle size={16} />
              <span>{isVietnamese ? 'Đăng tin tuyển dụng' : 'Post a Job'}</span>
            </button>
          )}
        </header>

        {/* 2-Column Layout (9 cols left + 3 cols right) */}
        <div className="grid grid-cols-12 gap-5 items-start">
          {/* Main Content Area (col-span-12 lg:col-span-9 space-y-4) */}
          <main className="col-span-12 lg:col-span-9 space-y-4">
            {/* Filter Bar Toolbar (Exact TalentMatchingFilterBar Style) */}
            <section
              className="sticky top-24 z-30 rounded-2xl border border-border bg-surface-card/95 p-4 sm:p-5 shadow-sm space-y-3.5 transition-all"
              style={{ backdropFilter: 'blur(16px)' }}
            >
              {/* Header Info Row */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-text-primary">{resultTitle}</h2>
                    <span className="rounded-full bg-brand/10 border border-brand/20 px-2.5 py-0.5 text-[10px] font-black text-brand">
                      {isVietnamese
                        ? `${totalCount} chuyên gia`
                        : `${totalCount} freelancers`}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-text-secondary">{resultDescription}</p>
                </div>
              </div>

              {/* Main Filter Controls Row */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* 1. Category Dropdown Popover */}
                <div className="relative w-52 sm:w-60 shrink-0" ref={categoryDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen(prev => !prev)}
                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all select-none cursor-pointer ${
                      selectedCategory
                        ? 'border-brand/40 bg-brand/10 text-brand shadow-xs'
                        : 'border-border bg-surface-muted text-text-primary hover:border-brand/30'
                    }`}
                  >
                    <span className="truncate flex-1 text-left">
                      {selectedCategory || (isVietnamese ? 'Tất cả danh mục' : 'All Categories')}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-text-muted shrink-0 transition-transform duration-200 ${isCategoryOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Category Dropdown Popover Menu */}
                  {isCategoryOpen && (
                    <div
                      className="absolute top-full left-0 right-0 mt-2 w-full min-w-full rounded-2xl border-2 border-brand/30 bg-[var(--card,#0f172a)] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 space-y-1 dropdown-menu animate-in fade-in zoom-in-95 duration-150"
                      style={{ backdropFilter: 'blur(24px)' }}
                    >
                      <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-text-muted border-b border-border/60 mb-1.5 flex items-center justify-between">
                        <span>{isVietnamese ? 'Danh mục' : 'Category'}</span>
                        <span className="text-[10px] font-semibold text-brand">{categoryOptions.length} danh mục</span>
                      </div>

                      {/* Option: All Categories */}
                      <button
                        type="button"
                        onClick={() => handleCategorySelect(null)}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                          !selectedCategory
                            ? 'bg-brand text-white shadow-md'
                            : 'text-text-primary hover:text-brand hover:bg-brand/10 bg-surface-muted/40'
                        }`}
                      >
                        <span>{isVietnamese ? 'Tất cả danh mục' : 'All Categories'}</span>
                        {!selectedCategory && <Check size={14} className="text-white shrink-0" />}
                      </button>

                      {/* List of Category Options */}
                      <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar pr-1 pt-1">
                        {categoryOptions.map(cat => {
                          const isSelected = selectedCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleCategorySelect(isSelected ? null : cat)}
                              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                                isSelected
                                  ? 'bg-brand text-white shadow-md border border-brand'
                                  : 'text-text-primary hover:text-brand hover:bg-brand/10 bg-surface-muted/40 border border-transparent'
                              }`}
                            >
                              <span className="truncate">{cat}</span>
                              {isSelected && (
                                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                  <Check size={10} className="text-white" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Page Size Selector */}
                <div className="flex items-center rounded-xl border border-border bg-surface-muted p-0.5 gap-0.5">
                  {([10, 20, 50] as const).map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPageSize(size)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        pageSize === size
                          ? 'bg-brand text-white shadow-xs'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                {/* 3. Layout Mode Toggle Button */}
                <button
                  type="button"
                  onClick={() => setLayoutMode(mode => (mode === 'grid' ? 'compact' : 'grid'))}
                  title={layoutMode === 'grid' ? 'Compact View' : 'Grid View'}
                  className={`p-2 rounded-xl border transition-all shrink-0 ${
                    layoutMode === 'compact'
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border bg-surface-muted text-text-muted hover:text-text-primary hover:border-brand/30'
                  }`}
                >
                  {layoutMode === 'grid' ? <LayoutGrid size={16} /> : <List size={16} />}
                </button>

                {/* 4. Sort Order Toggle Button */}
                <button
                  type="button"
                  onClick={() => setSortOrder(order => (order === 'desc' ? 'asc' : 'desc'))}
                  title={sortOrder === 'desc' ? 'Sort Ascending' : 'Sort Descending'}
                  className={`p-2 rounded-xl border transition-all shrink-0 ${
                    sortOrder === 'asc'
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border bg-surface-muted text-text-muted hover:text-text-primary hover:border-brand/30'
                  }`}
                >
                  <ArrowUpDown size={16} className={sortOrder === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>

                {/* 5. Shortened Search Bar placed on the right */}
                <form onSubmit={handleSearchSubmit} className="relative w-52 sm:w-64 ml-auto">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={
                      isVietnamese
                        ? 'Tìm kiếm theo tên, kỹ năng...'
                        : 'Search by keyword, skill...'
                    }
                    className="w-full rounded-xl border border-border bg-surface-muted py-2 pl-9 pr-7 text-xs font-medium outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10 text-text-primary placeholder:text-text-muted"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedSkill(null);
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('q');
                        setSearchParams(newParams);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted hover:text-destructive"
                    >
                      ✕
                    </button>
                  )}
                </form>
              </div>

              {/* Active Filters Summary Badges */}
              {(selectedCategory || selectedSkill || searchQuery) && (
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-border/50">
                  <span className="font-bold text-text-muted text-[11px]">
                    {isVietnamese ? 'Bộ lọc đang chọn:' : 'Active filters:'}
                  </span>

                  {selectedCategory && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 border border-brand/20 px-3 py-0.5 font-bold text-brand text-xs">
                      <span>{selectedCategory}</span>
                      <X
                        size={12}
                        className="cursor-pointer hover:opacity-75"
                        onClick={() => setSelectedCategory(null)}
                      />
                    </span>
                  )}

                  {selectedSkill && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-0.5 font-bold text-purple-500 text-xs">
                      <span>Kỹ năng: {selectedSkill}</span>
                      <X
                        size={12}
                        className="cursor-pointer hover:opacity-75"
                        onClick={() => {
                          setSelectedSkill(null);
                          setSearchQuery('');
                          const newParams = new URLSearchParams(searchParams);
                          newParams.delete('q');
                          setSearchParams(newParams);
                        }}
                      />
                    </span>
                  )}
                </div>
              )}
            </section>

            {/* Loading Skeletons */}
            {loading && (
              <div className={layoutMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-border bg-surface-card p-5 h-48 animate-pulse flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-surface-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-surface-muted rounded w-3/4" />
                        <div className="h-3 bg-surface-muted rounded w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-2 my-2">
                      <div className="h-3 bg-surface-muted rounded w-full" />
                      <div className="h-3 bg-surface-muted rounded w-4/5" />
                    </div>
                    <div className="h-8 bg-surface-muted rounded-lg" />
                  </div>
                ))}
              </div>
            )}

            {/* Error Message */}
            {!loading && error && (
              <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-8 text-center my-6">
                <p className="text-red-500 font-bold">{error}</p>
                <button
                  type="button"
                  onClick={() => setPage(p => p)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold"
                >
                  <RotateCw size={14} />
                  <span>{isVietnamese ? 'Thử lại' : 'Retry'}</span>
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && freelancers.length === 0 && (
              <div className="rounded-2xl border border-border bg-surface-card p-12 text-center my-6">
                <UsersRound size={44} className="mx-auto text-text-muted opacity-60 mb-3" />
                <h2 className="text-lg font-black text-text-primary">
                  {isVietnamese ? 'Không tìm thấy chuyên gia phù hợp' : 'No freelancers found'}
                </h2>
                <p className="mt-1 text-sm text-text-secondary max-w-md mx-auto">
                  {isVietnamese
                    ? 'Hãy thử tìm kiếm với từ khóa khác hoặc xóa bớt các bộ lọc danh mục và kỹ năng.'
                    : 'Try searching with different terms or clear some category & skill filters.'}
                </p>
                {(searchQuery || selectedCategory || selectedSkill) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory(null);
                      setSelectedSkill(null);
                      setPage(1);
                      setSearchParams(new URLSearchParams());
                    }}
                    className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    <span>{isVietnamese ? 'Xóa toàn bộ bộ lọc' : 'Clear all filters'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Freelancers Cards Display (Grid or Compact) */}
            {!loading && !error && freelancers.length > 0 && (
              <>
                <div className={layoutMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
                  {freelancers.map((freelancer) => {
                    const profileUrl = isAuthenticated
                      ? `/profile/freelancer/${encodeURIComponent(freelancer.userId)}`
                      : `/freelancers/${encodeURIComponent(freelancer.userId)}`;

                    return (
                      <article
                        key={freelancer.userId}
                        className="rounded-2xl border border-border bg-surface-card p-5 hover:border-brand/50 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                      >
                        <div>
                          {/* Header: Avatar, Name, Title, Rating */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <Link to={profileUrl} className="shrink-0">
                                <UserAvatar
                                  src={freelancer.userAvatar}
                                  name={freelancer.userFullName || 'Freelancer'}
                                  userId={freelancer.userId}
                                  size="md"
                                />
                              </Link>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <Link
                                    to={profileUrl}
                                    className="font-bold text-sm text-text-primary hover:text-brand truncate transition-colors"
                                  >
                                    {freelancer.userFullName || 'Freelancer'}
                                  </Link>
                                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                </div>
                                <p className="text-xs font-semibold text-brand truncate mt-0.5">
                                  {freelancer.title || freelancer.majorName || (isVietnamese ? 'Chuyên gia Freelancer' : 'Senior Specialist')}
                                </p>
                              </div>
                            </div>

                            {/* Rating Badge */}
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-muted border border-border text-xs font-bold text-text-primary shrink-0">
                              <Star size={12} className="text-amber-400 fill-amber-400" />
                              <span>{(freelancer.rating ?? 5.0).toFixed(1)}</span>
                            </div>
                          </div>

                          {/* Location & Major */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mt-3 pt-2.5 border-t border-border/50">
                            {freelancer.location && (
                              <div className="flex items-center gap-1 truncate">
                                <MapPin size={12} className="shrink-0" />
                                <span className="truncate">{freelancer.location}</span>
                              </div>
                            )}
                            {freelancer.majorName && (
                              <div className="flex items-center gap-1 truncate">
                                <Briefcase size={12} className="shrink-0" />
                                <span className="truncate">{freelancer.majorName}</span>
                              </div>
                            )}
                          </div>

                          {/* Bio */}
                          {freelancer.bio && (
                            <p className="text-xs text-text-secondary mt-2 line-clamp-2 leading-relaxed">
                              {freelancer.bio}
                            </p>
                          )}

                          {/* Skills Pills */}
                          {freelancer.skills && freelancer.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {freelancer.skills.slice(0, 4).map((skill, sIdx) => (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={() => handleSkillSelect(skill.skillName)}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-surface-muted hover:bg-brand/10 hover:text-brand border border-border text-text-secondary transition-colors"
                                >
                                  {skill.skillName}
                                </button>
                              ))}
                              {freelancer.skills.length > 4 && (
                                <span className="text-[10px] font-bold text-text-muted self-center px-1">
                                  +{freelancer.skills.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
                          <Link
                            to={profileUrl}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand/90 transition-colors"
                          >
                            <span>{isVietnamese ? 'Xem Hồ Sơ' : 'View Profile'}</span>
                            <ArrowRight size={13} />
                          </Link>

                          {!isFreelancer && (
                            <button
                              type="button"
                              onClick={() => handleInviteClick(freelancer)}
                              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl bg-surface-muted hover:bg-surface-hover border border-border text-text-primary text-xs font-bold transition-colors shrink-0"
                              title={isVietnamese ? 'Mời vào dự án' : 'Invite to Job'}
                            >
                              <Send size={13} />
                              <span>{isVietnamese ? 'Mời việc' : 'Invite'}</span>
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2.5 pt-6">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => {
                        setPage(p => Math.max(1, p - 1));
                        window.scrollTo({ top: 180, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-card border border-border text-xs font-bold text-text-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-muted transition-all"
                    >
                      <ChevronLeft size={15} />
                      <span>{isVietnamese ? 'Trang trước' : 'Previous'}</span>
                    </button>

                    <div className="px-3.5 py-1.5 rounded-xl bg-surface-muted border border-border text-xs font-bold text-text-primary">
                      {page} / {totalPages}
                    </div>

                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => {
                        setPage(p => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 180, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-card border border-border text-xs font-bold text-text-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-muted transition-all"
                    >
                      <span>{isVietnamese ? 'Trang sau' : 'Next'}</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>

          {/* Right Sidebar (col-span-12 lg:col-span-3 space-y-4) */}
          <aside className="col-span-12 lg:col-span-3 space-y-4">
            {/* Popular Skills Cloud Card */}
            <div className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <SlidersHorizontal size={15} className="text-brand" />
                <h3 className="font-bold text-sm text-text-primary">
                  {isVietnamese ? 'Kỹ Năng Phổ Biến' : 'Popular Skills'}
                </h3>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                {isVietnamese
                  ? 'Nhấp vào kỹ năng để lọc nhanh danh sách chuyên gia phù hợp:'
                  : 'Click a skill to filter freelancers instantly:'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_SKILLS.map((skill) => {
                  const isSkillActive = selectedSkill === skill;
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => handleSkillSelect(skill)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        isSkillActive
                          ? 'bg-brand text-white shadow-sm'
                          : 'bg-surface-muted hover:bg-surface-hover border border-border text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Safe Hire & Escrow Tips Card */}
            <div className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={16} className="text-emerald-500" />
                <h3 className="font-bold text-sm text-text-primary">
                  {isVietnamese ? 'Bảo đảm thanh toán' : 'Escrow Milestone'}
                </h3>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {isVietnamese
                  ? 'Ngân sách của bạn được bảo đảm an toàn qua Hợp đồng Escrow. Tiền chỉ được giải ngân khi bạn hài lòng và duyệt kết quả từng cột mốc.'
                  : 'Your project funds are secured in escrow milestones and only released upon your satisfaction and milestone approval.'}
              </p>
            </div>

            {/* Sidebar Action CTA Card (Different for Freelancers vs Clients/Guests) */}
            {isFreelancer ? (
              <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-brand" />
                  <h3 className="font-bold text-sm text-text-primary">
                    {isVietnamese ? 'Tìm Việc Làm Mới' : 'Find Jobs & Projects'}
                  </h3>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed mb-3.5">
                  {isVietnamese
                    ? 'Khám phá hàng trăm dự án mới mỗi ngày và gửi đề xuất chào giá đến khách hàng tiềm năng.'
                    : 'Explore hundreds of new job postings daily and submit competitive proposals to top clients.'}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/jobs')}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand/90 shadow-sm transition-all"
                >
                  <Briefcase size={14} />
                  <span>{isVietnamese ? 'Duyệt việc làm ngay' : 'Browse Jobs Now'}</span>
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-brand" />
                  <h3 className="font-bold text-sm text-text-primary">
                    {isVietnamese ? 'Cần tuyển dụng nhanh?' : 'Need to Hire Fast?'}
                  </h3>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed mb-3.5">
                  {isVietnamese
                    ? 'Đăng tin công việc để các freelancer hàng đầu tự gửi báo giá & đề xuất cho bạn trong vài giờ.'
                    : 'Post your job post to receive competitive proposals and quotes from top talent within hours.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      setAuthModalOpen(true);
                      return;
                    }
                    navigate('/jobs/post');
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand/90 shadow-sm transition-all"
                >
                  <PlusCircle size={14} />
                  <span>{isVietnamese ? 'Đăng việc ngay' : 'Post a Job Now'}</span>
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Guest Auth Invitation Modal */}
      <AuthInviteModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title={isVietnamese ? 'Tham gia GigBridge ngay' : 'Join GigBridge'}
        description={
          isVietnamese
            ? `Đăng nhập hoặc tạo tài khoản để kết nối trực tiếp và mời ${targetFreelancerName || 'chuyên gia'} vào dự án của bạn.`
            : `Sign in or register to connect directly and invite ${targetFreelancerName || 'freelancer'} to your project.`
        }
      />
    </AppLayout>
  );
}

export default FreelancerDirectoryScreen;
