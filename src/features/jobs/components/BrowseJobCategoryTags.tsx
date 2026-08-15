import type { MouseEvent } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  BROWSE_JOBS_VIEW,
  type BrowseJobsView,
} from '../utils/browseJobsView';

interface BrowseJobCategoryTagsProps {
  view: BrowseJobsView;
  categories: readonly string[];
  publicCategory: string;
  isFreelancer: boolean;
  onResetProfile: () => void;
  onSelectAll: () => void;
  onSelectPublicCategory: (categoryName: string) => void;
}

export function BrowseJobCategoryTags({
  view,
  categories,
  publicCategory,
  isFreelancer,
  onResetProfile,
  onSelectAll,
  onSelectPublicCategory,
}: BrowseJobCategoryTagsProps) {
  const { t } = useTranslation();

  const handleCategoryClick = (event: MouseEvent<HTMLButtonElement>): void => {
    const categoryName = event.currentTarget.value;
    onSelectPublicCategory(categoryName);
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

      {categories.map(categoryName => {
        const isActive = view === BROWSE_JOBS_VIEW.All && publicCategory === categoryName;
        return (
          <button
            key={categoryName}
            type="button"
            value={categoryName}
            onClick={handleCategoryClick}
            className={`browse-category-pill ${isActive ? 'active' : ''}`}
          >
            {categoryName}
          </button>
        );
      })}
    </div>
  );
}
