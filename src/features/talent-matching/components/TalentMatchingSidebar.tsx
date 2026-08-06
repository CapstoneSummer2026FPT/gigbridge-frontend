import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { GetMyJobPostDto } from '../../../types/models/Job';
import type { ViewStage } from '../hooks/useSmartTalentMatching';

interface TalentMatchingSidebarProps {
  activeStage: ViewStage;
  jobs: GetMyJobPostDto[];
  selectedJobId: string;
  setSelectedJobId: (id: string) => void;
  selectedJob?: GetMyJobPostDto;
  loadingInitial: boolean;
  onCreateJob: () => void;
  majorCategoryId: string | null;
  setMajorCategoryId: (id: string | null) => void;
  categoryOptions: { id: string; name: string }[];
  skillIds: string[];
  toggleSkill: (skillId: string) => void;
  pageSize: 10 | 20 | 50 | 'all';
  setPageSize: (size: 10 | 20 | 50 | 'all') => void;
}

export function TalentMatchingSidebar({
  activeStage,
  jobs,
  selectedJobId,
  setSelectedJobId,
  selectedJob,
  loadingInitial,
  onCreateJob,
  majorCategoryId,
  setMajorCategoryId,
  categoryOptions,
  skillIds,
  toggleSkill,
  pageSize,
  setPageSize,
}: TalentMatchingSidebarProps) {
  const { t } = useTranslation();
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);

  return (
    <aside
      className="col-span-12 lg:col-span-3 rounded-2xl border border-border bg-surface-card/70 p-5 space-y-5 lg:sticky lg:top-24"
      style={{ backdropFilter: 'blur(14px)' }}
    >
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted mb-0.5">
          {t('talentMatching.refineTalent')}
        </div>
        <p className="text-xs text-text-muted">{t('talentMatching.refineTalentDesc')}</p>
      </div>

      {/* 1. Open Job Selection (Smart matching mode) */}
      {activeStage === 'smart' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">
            {t('talentMatching.openJob')}
          </label>
          <select
            value={selectedJobId}
            onChange={e => setSelectedJobId(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand/50 transition-colors font-semibold"
            disabled={loadingInitial || jobs.length === 0}
          >
            {jobs.length === 0 && <option value="">{t('talentMatching.noOpenJobs')}</option>}
            {jobs.map(job => (
              <option key={job.jobPostsId} value={job.jobPostsId}>
                {job.title}
              </option>
            ))}
          </select>
          {jobs.length === 0 && !loadingInitial && (
            <button
              onClick={onCreateJob}
              className="w-full rounded-xl bg-gradient-to-r from-[var(--brand)] to-indigo-500 text-white px-4 py-2.5 font-bold text-sm mt-1 hover:opacity-90 transition-opacity"
            >
              {t('talentMatching.createOpenJob')}
            </button>
          )}
        </div>
      )}

      {/* 2. Canonical Skills (Smart matching mode) */}
      {activeStage === 'smart' && (
        <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-surface-muted/50 border border-border/60">
          <div className="text-[10px] font-black uppercase tracking-widest text-text-muted">
            {t('talentMatching.canonicalSkills')}
          </div>
          <p className="text-xs text-text-muted">{t('talentMatching.canonicalSkillsDesc')}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {!selectedJob && (
              <span className="text-xs text-text-muted italic">
                {t('talentMatching.selectJob')}
              </span>
            )}
            {selectedJob && (selectedJob.skills?.length ?? 0) === 0 && (selectedJob.customSkillNames?.length ?? 0) === 0 && (
              <span className="text-xs text-text-muted">{t('talentMatching.noCanonicalSkills')}</span>
            )}
            {selectedJob?.skills?.map(skill => (
              <button
                key={skill.skillId}
                onClick={() => toggleSkill(skill.skillId)}
                className={`px-2.5 py-1 rounded-full border text-xs font-bold transition-all ${
                  skillIds.includes(skill.skillId)
                    ? 'bg-brand text-white border-brand shadow-xs'
                    : 'border-border bg-surface-card text-text-secondary hover:border-brand/40 hover:text-text-primary'
                }`}
              >
                {skill.name}
              </button>
            ))}
            {selectedJob?.customSkillNames?.map(skillName => (
              <span
                key={skillName}
                className="px-2.5 py-1 rounded-full border border-border bg-surface-card text-xs font-semibold text-text-muted"
              >
                {skillName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3. Collapsible Category Filter */}
      <div className="flex flex-col gap-2">
        <div
          className="flex items-center justify-between cursor-pointer select-none py-0.5 group"
          onClick={() => setIsCategoryOpen(prev => !prev)}
        >
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted cursor-pointer group-hover:text-text-primary transition-colors">
              {t('talentMatching.category')}
            </label>
            {majorCategoryId && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {majorCategoryId && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setMajorCategoryId(null);
                }}
                className="text-[10px] font-bold text-brand hover:underline"
              >
                {t('talentMatching.clear')}
              </button>
            )}
            <ChevronDown
              size={14}
              className={`text-text-muted group-hover:text-text-primary transition-transform duration-200 ${
                isCategoryOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {isCategoryOpen && (
          <div className="flex flex-col gap-1.5 pt-1">
            <button
              onClick={() => setMajorCategoryId(null)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                !majorCategoryId
                  ? 'bg-brand text-white shadow-sm shadow-brand/25'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted border border-border/50'
              }`}
            >
              {t('talentMatching.allCategories')}
            </button>
            {categoryOptions.map(option => (
              <button
                key={option.id}
                onClick={() => setMajorCategoryId(majorCategoryId === option.id ? null : option.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 ${
                  majorCategoryId === option.id
                    ? 'bg-brand/10 text-brand border border-brand/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted border border-transparent'
                }`}
              >
                <span className="truncate">{option.name}</span>
                {majorCategoryId === option.id && (
                  <span className="w-4 h-4 rounded-full bg-brand flex items-center justify-center shrink-0">
                    <Check size={10} className="text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Items Per Page Filter (Moved to the very bottom) */}
      <div className="flex flex-col gap-1.5 pt-3 border-t border-border/70">
        <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">
          {t('talentMatching.itemsPerPage')}
        </label>
        <div className="flex items-center rounded-xl border border-border bg-surface-muted p-1 gap-1">
          {([10, 20, 50, 'all'] as const).map(size => (
            <button
              key={size}
              type="button"
              onClick={() => setPageSize(size)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                pageSize === size
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {size === 'all' ? t('talentMatching.pageSizeAll') : size}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
