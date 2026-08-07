import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, Check, ChevronDown, LayoutGrid, Rows, Search, X } from 'lucide-react';
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
      className="sticky top-24 z-10 rounded-2xl border border-border bg-surface-card/95 p-4 sm:p-5 shadow-sm space-y-3.5 transition-all"
      style={{ backdropFilter: 'blur(16px)' }}
    >
      {/* Header Info Row: Title, Result Count, Description */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-text-primary">{resultTitle}</h2>
            <span className="rounded-full bg-brand/10 border border-brand/20 px-2.5 py-0.5 text-[10px] font-black text-brand">
              {t(visibleResultCount === 1 ? 'talentMatching.resultsCount_one' : 'talentMatching.resultsCount_other', {
                count: visibleResultCount,
              })}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">{resultDescription}</p>
        </div>
      </div>

      {/* Main Filter Toolbar Row */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* 1. Custom Open Job Selection Dropdown (In Smart Matching Stage) - Placed BEFORE Categories */}
        {activeStage === 'smart' && (
          <div className="relative w-56 sm:w-64 shrink-0" ref={jobDropdownRef}>
            <button
              type="button"
              disabled={loadingInitial || jobs.length === 0}
              onClick={() => setIsJobOpen(prev => !prev)}
              className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all select-none cursor-pointer disabled:opacity-50 ${
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

            {/* Project Dropdown Popover Menu (Width matches container width) */}
            {isJobOpen && (
              <div
                className="absolute top-full left-0 right-0 mt-2 w-full min-w-full rounded-2xl border-2 border-brand/30 bg-[var(--card,#0f172a)] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 space-y-1 dropdown-menu animate-in fade-in zoom-in-95 duration-150"
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

        {/* 2. Custom Category Filter Dropdown Popover (Width matches container width) */}
        <div className="relative w-48 sm:w-56 shrink-0" ref={categoryDropdownRef}>
          <button
            type="button"
            onClick={() => setIsCategoryOpen(prev => !prev)}
            className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all select-none cursor-pointer ${
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
              className="absolute top-full left-0 right-0 mt-2 w-full min-w-full rounded-2xl border-2 border-brand/30 bg-[var(--card,#0f172a)] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 space-y-1 dropdown-menu animate-in fade-in zoom-in-95 duration-150"
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

        {/* 3. Page Size Selector */}
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

        {/* 4. Layout Mode Toggle Button */}
        <button
          type="button"
          onClick={() => setLayoutMode(mode => (mode === 'grid' ? 'compact' : 'grid'))}
          title={layoutMode === 'grid' ? t('talentMatching.layoutCompact') : t('talentMatching.layoutGrid')}
          className={`p-2 rounded-xl border transition-all shrink-0 ${
            layoutMode === 'compact'
              ? 'border-brand bg-brand/10 text-brand'
              : 'border-border bg-surface-muted text-text-muted hover:text-text-primary hover:border-brand/30'
          }`}
        >
          {layoutMode === 'grid' ? <LayoutGrid size={16} /> : <Rows size={16} />}
        </button>

        {/* 5. Sort Order Toggle Button */}
        <button
          type="button"
          onClick={() => setSortOrder(order => (order === 'desc' ? 'asc' : 'desc'))}
          title={sortOrder === 'desc' ? t('talentMatching.sortOrderAsc') : t('talentMatching.sortOrderDesc')}
          className={`p-2 rounded-xl border transition-all shrink-0 ${
            sortOrder === 'asc'
              ? 'border-brand bg-brand/10 text-brand'
              : 'border-border bg-surface-muted text-text-muted hover:text-text-primary hover:border-brand/30'
          }`}
        >
          <ArrowUpDown size={16} className={sortOrder === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>

        {/* 6. Shortened Search Bar placed on the right */}
        <div className="relative w-52 sm:w-64 ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={
              activeStage === 'smart'
                ? t('talentMatching.searchSmartPlaceholder')
                : t('talentMatching.searchDirectoryPlaceholder')
            }
            className="w-full rounded-xl border border-border bg-surface-muted py-2 pl-9 pr-3 text-xs font-medium outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10 text-text-primary placeholder:text-text-muted"
          />
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
