import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, Check, ChevronDown, HelpCircle, LayoutGrid, Rows, Search, Sparkles, X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { GetMyJobPostDto } from '../../../types/models/Job';
import type { ViewStage } from '../hooks/useSmartTalentMatching';

interface TalentMatchingFilterBarProps {
  activeStage: ViewStage;
  resultTitle: string;
  resultDescription: string;
  visibleResultCount: number;
  query: string;
  setQuery: (q: string) => void;
  jobs: GetMyJobPostDto[];
  selectedJobId: string;
  setSelectedJobId: (id: string) => void;
  selectedJob?: GetMyJobPostDto;
  loadingInitial: boolean;
  onCreateJob: () => void;
  majorCategoryId: string | null;
  setMajorCategoryId: (id: string | null) => void;
  categoryOptions: { id: string; name: string }[];
  selectedCategoryName?: string | null;
  skillIds: string[];
  toggleSkill: (skillId: string) => void;
  pageSize: 10 | 20 | 50 | 'all';
  setPageSize: (size: 10 | 20 | 50 | 'all') => void;
  layoutMode: 'grid' | 'compact';
  setLayoutMode: React.Dispatch<React.SetStateAction<'grid' | 'compact'>>;
  sortOrder: 'asc' | 'desc';
  setSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
}

export function TalentMatchingFilterBar({
  activeStage,
  resultTitle,
  resultDescription,
  visibleResultCount,
  query,
  setQuery,
  jobs,
  selectedJobId,
  setSelectedJobId,
  selectedJob,
  loadingInitial,
  onCreateJob,
  majorCategoryId,
  setMajorCategoryId,
  categoryOptions,
  selectedCategoryName,
  skillIds,
  toggleSkill,
  pageSize,
  setPageSize,
  layoutMode,
  setLayoutMode,
  sortOrder,
  setSortOrder,
}: TalentMatchingFilterBarProps) {
  const { t } = useTranslation();
  const [isJobOpen, setIsJobOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const jobDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (jobDropdownRef.current && !jobDropdownRef.current.contains(e.target as Node)) {
        setIsJobOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <section
      className="relative lg:sticky lg:top-24 z-20 rounded-2xl border border-border bg-surface-card/95 p-3.5 sm:p-5 shadow-sm space-y-3 sm:space-y-3.5 transition-all"
      style={{ backdropFilter: 'blur(16px)' }}
    >
      {/* Header Info Row: Title, Result Count, Description */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-text-primary">{resultTitle}</h2>
            <span className="rounded-full bg-brand/10 border border-brand/20 px-2.5 py-0.5 text-[10px] font-black text-brand">
              {t(visibleResultCount === 1 ? 'talentMatching.resultsCount_one' : 'talentMatching.resultsCount_other', {
                count: visibleResultCount,
              })}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] sm:text-xs text-text-secondary leading-normal">{resultDescription}</p>
        </div>

        {/* How Ranking Works Hover Tooltip placed at farthest right */}
        <div className="relative group inline-flex items-center shrink-0">
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-muted hover:bg-brand/10 border border-border hover:border-brand/30 text-text-muted hover:text-brand transition-all cursor-pointer"
            aria-label={t('talentMatching.howRankingWorksTitle')}
          >
            <HelpCircle size={15} />
            <span className="text-[11px] font-bold hidden sm:inline">{t('talentMatching.howRankingWorksTitle')}</span>
          </button>

          <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 w-80 sm:w-84 rounded-2xl bg-white dark:bg-slate-900 text-text-primary p-4 text-xs shadow-2xl border border-brand/40 opacity-100 text-left">
            <div className="font-bold text-text-primary flex items-center gap-2 mb-2 border-b border-border/50 pb-2">
              <Sparkles size={16} className="text-purple-500 shrink-0" />
              <span className="font-black text-sm">{t('talentMatching.howRankingWorksTitle')}</span>
            </div>
            <p className="text-xs text-text-secondary mb-3">{t('talentMatching.howRankingWorksSub')}</p>

            <div
              className="flex h-2.5 overflow-hidden rounded-full mb-3.5 bg-surface-muted"
              role="img"
              aria-label="Ranking weights"
            >
              <span className="bg-brand h-full" style={{ width: '45%' }} title="Skill match: 45%" />
              <span className="bg-purple-500 h-full" style={{ width: '35%' }} title="Track record: 35%" />
              <span className="bg-emerald-500 h-full" style={{ width: '20%' }} title="Activity: 20%" />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                    <span>{t('talentMatching.skillMatch')}</span>
                    <span className="text-brand font-black">45%</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-text-muted">{t('talentMatching.factorSkillDesc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-purple-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                    <span>{t('talentMatching.trackRecord')}</span>
                    <span className="text-purple-500 font-black">35%</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-text-muted">{t('talentMatching.factorTrackDesc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                    <span>{t('talentMatching.activity')}</span>
                    <span className="text-emerald-500 font-black">20%</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-text-muted">{t('talentMatching.factorActivityDesc')}</p>
                </div>
              </div>
            </div>

            <p className="mt-3 pt-2.5 border-t border-border text-[11px] text-text-muted leading-relaxed">
              {t('talentMatching.rankingFootnote')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Filter Toolbar: Mobile-first responsive hierarchy */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
        {/* 1. Search Bar - Full width on mobile, right-aligned on tablet/desktop */}
        <div className="relative w-full sm:w-56 lg:w-64 sm:order-last sm:ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={
              activeStage === 'smart'
                ? t('talentMatching.searchSmartPlaceholder')
                : t('talentMatching.searchDirectoryPlaceholder')
            }
            className="w-full rounded-xl border border-border bg-surface-muted py-2 pl-9 pr-3 text-xs font-medium outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10 text-text-primary placeholder:text-text-muted min-h-[38px]"
          />
        </div>

        {/* 2. Dropdown Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-1 min-w-0">
          {/* Custom Open Job Selection Dropdown (In Smart Matching Stage) */}
          {activeStage === 'smart' && (
            <div className="relative flex-1 sm:flex-initial sm:w-56 lg:w-64 min-w-[130px]" ref={jobDropdownRef}>
              <button
                type="button"
                disabled={loadingInitial || jobs.length === 0}
                onClick={() => setIsJobOpen(prev => !prev)}
                className={`w-full flex items-center justify-between gap-1.5 sm:gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all select-none cursor-pointer min-h-[38px] disabled:opacity-50 ${
                  selectedJobId
                    ? 'border-brand/40 bg-brand/10 text-brand shadow-xs'
                    : 'border-border bg-surface-muted text-text-primary hover:border-brand/30'
                }`}
              >
                <span className="truncate flex-1 text-left">
                  {selectedJob ? selectedJob.title : jobs.length === 0 ? t('talentMatching.noOpenJobs') : t('talentMatching.openJob')}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-text-muted shrink-0 transition-transform duration-200 ${isJobOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Project Dropdown Popover Menu */}
              {isJobOpen && (
                <div
                  className="absolute top-full left-0 mt-2 w-full min-w-[260px] sm:min-w-full rounded-2xl border-2 border-brand/30 bg-[var(--card,#0f172a)] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 space-y-1 dropdown-menu animate-in fade-in zoom-in-95 duration-150"
                  style={{ backdropFilter: 'blur(24px)' }}
                >
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-text-muted border-b border-border/60 mb-1.5 flex items-center justify-between">
                    <span>{t('talentMatching.openJob')}</span>
                    <span className="text-[10px] font-semibold text-brand">{jobs.length} jobs</span>
                  </div>

                  {/* List of Open Jobs */}
                  <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                    {jobs.length === 0 ? (
                      <div className="p-3 text-center text-xs text-text-muted">
                        {t('talentMatching.noOpenJobs')}
                      </div>
                    ) : (
                      jobs.map(job => {
                        const isSelected = selectedJobId === job.jobPostsId;
                        return (
                          <button
                            key={job.jobPostsId}
                            type="button"
                            onClick={() => {
                              setSelectedJobId(job.jobPostsId);
                              setIsJobOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                              isSelected
                                ? 'bg-brand text-white shadow-md border border-brand'
                                : 'text-text-primary hover:text-brand hover:bg-brand/10 bg-surface-muted/40 border border-transparent'
                            }`}
                          >
                            <span className="truncate">{job.title}</span>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                <Check size={10} className="text-white" />
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Create Open Job Link */}
                  <div className="pt-1.5 border-t border-border/60 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsJobOpen(false);
                        onCreateJob();
                      }}
                      className="w-full rounded-xl bg-brand/10 border border-brand/20 text-brand py-2 text-xs font-bold hover:bg-brand/20 transition-all text-center"
                    >
                      + {t('talentMatching.createOpenJob')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Category Filter Dropdown Popover */}
          <div className="relative flex-1 sm:flex-initial sm:w-48 lg:w-56 min-w-[130px]" ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCategoryOpen(prev => !prev)}
              className={`w-full flex items-center justify-between gap-1.5 sm:gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all select-none cursor-pointer min-h-[38px] ${
                majorCategoryId
                  ? 'border-brand/40 bg-brand/10 text-brand shadow-xs'
                  : 'border-border bg-surface-muted text-text-primary hover:border-brand/30'
              }`}
            >
              <span className="truncate flex-1 text-left">
                {selectedCategoryName || t('talentMatching.allCategories')}
              </span>
              <ChevronDown
                size={14}
                className={`text-text-muted shrink-0 transition-transform duration-200 ${isCategoryOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Category Dropdown Popover Menu */}
            {isCategoryOpen && (
              <div
                className="absolute top-full left-0 mt-2 w-full min-w-[260px] sm:min-w-full rounded-2xl border-2 border-brand/30 bg-[var(--card,#0f172a)] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 space-y-1 dropdown-menu animate-in fade-in zoom-in-95 duration-150"
                style={{ backdropFilter: 'blur(24px)' }}
              >
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-text-muted border-b border-border/60 mb-1.5 flex items-center justify-between">
                  <span>{t('talentMatching.category')}</span>
                  <span className="text-[10px] font-semibold text-brand">{categoryOptions.length} categories</span>
                </div>

                {/* Option 1: All Categories */}
                <button
                  type="button"
                  onClick={() => {
                    setMajorCategoryId(null);
                    setIsCategoryOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    !majorCategoryId
                      ? 'bg-brand text-white shadow-md'
                      : 'text-text-primary hover:text-brand hover:bg-brand/10 bg-surface-muted/40'
                  }`}
                >
                  <span>{t('talentMatching.allCategories')}</span>
                  {!majorCategoryId && <Check size={14} className="text-white shrink-0" />}
                </button>

                {/* List of Category Options */}
                <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar pr-1 pt-1">
                  {categoryOptions.map(option => {
                    const isSelected = majorCategoryId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setMajorCategoryId(isSelected ? null : option.id);
                          setIsCategoryOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-brand text-white shadow-md border border-brand'
                            : 'text-text-primary hover:text-brand hover:bg-brand/10 bg-surface-muted/40 border border-transparent'
                        }`}
                      >
                        <span className="truncate">{option.name}</span>
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
        </div>

        {/* 3. Utility Tools Row (Page size, Layout toggle, Sort) */}
        <div className="flex items-center justify-between sm:justify-start gap-2 pt-1 sm:pt-0">
          {/* Page Size Selector */}
          <div className="flex items-center rounded-xl border border-border bg-surface-muted p-0.5 gap-0.5">
            {([10, 20, 50] as const).map(size => (
              <button
                key={size}
                type="button"
                onClick={() => setPageSize(size)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold min-h-[34px] min-w-[34px] flex items-center justify-center transition-all ${
                  pageSize === size
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Layout Mode Toggle Button */}
            <button
              type="button"
              onClick={() => setLayoutMode(mode => (mode === 'grid' ? 'compact' : 'grid'))}
              title={layoutMode === 'grid' ? t('talentMatching.layoutCompact') : t('talentMatching.layoutGrid')}
              className={`p-2 rounded-xl border transition-all shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center ${
                layoutMode === 'compact'
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border bg-surface-muted text-text-muted hover:text-text-primary hover:border-brand/30'
              }`}
            >
              {layoutMode === 'grid' ? <LayoutGrid size={16} /> : <Rows size={16} />}
            </button>

            {/* Sort Order Toggle Button */}
            <button
              type="button"
              onClick={() => setSortOrder(order => (order === 'desc' ? 'asc' : 'desc'))}
              title={sortOrder === 'desc' ? t('talentMatching.sortOrderAsc') : t('talentMatching.sortOrderDesc')}
              className={`p-2 rounded-xl border transition-all shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center ${
                sortOrder === 'asc'
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border bg-surface-muted text-text-muted hover:text-text-primary hover:border-brand/30'
              }`}
            >
              <ArrowUpDown size={16} className={sortOrder === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Canonical Skills Pill Row (In Smart Matching Stage) */}
      {activeStage === 'smart' && selectedJob && (
        <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-text-muted mr-1">
            {t('talentMatching.canonicalSkills')}:
          </span>
          {(selectedJob.skills?.length ?? 0) === 0 && (selectedJob.customSkillNames?.length ?? 0) === 0 && (
            <span className="text-xs text-text-muted italic">{t('talentMatching.noCanonicalSkills')}</span>
          )}
          {selectedJob.skills?.map(skill => {
            const isSelected = skillIds.includes(skill.skillId);
            return (
              <button
                key={skill.skillId}
                type="button"
                onClick={() => toggleSkill(skill.skillId)}
                className={`px-2.5 py-1 rounded-full border text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-brand text-white border-brand shadow-xs'
                    : 'border-border bg-surface-muted text-text-secondary hover:border-brand/40 hover:text-text-primary'
                }`}
              >
                {skill.name}
              </button>
            );
          })}
          {selectedJob.customSkillNames?.map(skillName => (
            <span
              key={skillName}
              className="px-2.5 py-1 rounded-full border border-border bg-surface-muted text-xs font-semibold text-text-muted"
            >
              {skillName}
            </span>
          ))}
        </div>
      )}

      {/* Row 3: Active Filters Summary Badges */}
      {(selectedCategoryName || skillIds.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
          <span className="font-bold text-text-muted text-[11px]">{t('talentMatching.activeFilters')}:</span>
          {selectedCategoryName && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 border border-brand/20 px-3 py-0.5 font-bold text-brand">
              {selectedCategoryName}
              <X
                size={12}
                className="cursor-pointer hover:opacity-75"
                onClick={() => setMajorCategoryId(null)}
              />
            </span>
          )}
          {skillIds.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-0.5 font-bold text-purple-500">
              {t(skillIds.length === 1 ? 'talentMatching.skillFilterCount_one' : 'talentMatching.skillFilterCount_other', {
                count: skillIds.length,
              })}
              <X
                size={12}
                className="cursor-pointer hover:opacity-75"
                onClick={() => skillIds.forEach(id => toggleSkill(id))}
              />
            </span>
          )}
        </div>
      )}
    </section>
  );
}
