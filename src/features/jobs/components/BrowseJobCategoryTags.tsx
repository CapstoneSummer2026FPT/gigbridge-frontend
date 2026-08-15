import type { MouseEvent } from 'react';
import { Sparkles, UserRoundCheck } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  BROWSE_JOBS_VIEW,
  type BrowseCategoryTag,
  type BrowseJobsView,
} from '../utils/browseJobsView';

interface BrowseJobCategoryTagsProps {
  view: BrowseJobsView;
  tags: readonly BrowseCategoryTag[];
  selectedProfileCategoryIds: readonly string[];
  publicCategory: string;
  isFreelancer: boolean;
  onResetProfile: () => void;
  onSelectAll: () => void;
  onToggleProfileCategory: (majorCategoryId: string) => void;
  onSelectPublicCategory: (categoryName: string) => void;
}

export function BrowseJobCategoryTags({
  view,
  tags,
  selectedProfileCategoryIds,
  publicCategory,
  isFreelancer,
  onResetProfile,
  onSelectAll,
  onToggleProfileCategory,
  onSelectPublicCategory,
}: BrowseJobCategoryTagsProps) {
  const { t } = useTranslation();
  const selectedIds = new Set(selectedProfileCategoryIds.map(id => id.toLowerCase()));

  const handleCategoryClick = (event: MouseEvent<HTMLButtonElement>): void => {
    const majorCategoryId = event.currentTarget.dataset.majorCategoryId;
    const categoryName = event.currentTarget.value;
    if (!majorCategoryId) return;
    if (view === BROWSE_JOBS_VIEW.All) onSelectPublicCategory(categoryName);
    else onToggleProfileCategory(majorCategoryId);
  };

  return (
    <div className="browse-category-scroll-container">
      {isFreelancer ? (
        <button
          type="button"
          onClick={onResetProfile}
          className={`browse-category-pill ${view === BROWSE_JOBS_VIEW.Profile ? 'active' : ''}`}
        >
          <Sparkles size={14} />
          {t('jobs.forYou')}
        </button>
      ) : null}

      <button
        type="button"
        onClick={onSelectAll}
        className={`browse-category-pill ${
          view === BROWSE_JOBS_VIEW.All && publicCategory === 'All' ? 'active' : ''
        }`}
      >
        {t('jobs.all')}
      </button>

      {tags.map(tag => {
        const isActive = view === BROWSE_JOBS_VIEW.Profile
          ? selectedIds.has(tag.majorCategoryId.toLowerCase())
          : view === BROWSE_JOBS_VIEW.All && publicCategory === tag.name;
        return (
          <button
            key={tag.majorCategoryId}
            type="button"
            value={tag.name}
            data-major-category-id={tag.majorCategoryId}
            onClick={handleCategoryClick}
            title={tag.isFromProfile ? t('jobs.profileCategoryTag') : undefined}
            className={`browse-category-pill ${isActive ? 'active' : ''} ${
              tag.isFromProfile ? 'profile-category' : ''
            }`}
          >
            {tag.isFromProfile ? <UserRoundCheck size={14} aria-hidden="true" /> : null}
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
