import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BROWSE_JOBS_VIEW } from '../utils/browseJobsView';
import { BrowseJobCategoryTags } from './BrowseJobCategoryTags';

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'jobs.forYou': 'For you',
      'jobs.all': 'All',
    }[key] || key),
  }),
}));

afterEach(cleanup);

describe('BrowseJobCategoryTags', () => {
  it('shows profile and all as separate controlled modes', () => {
    const onResetProfile = vi.fn();
    const onSelectAll = vi.fn();
    render(
      <BrowseJobCategoryTags
        view={BROWSE_JOBS_VIEW.Profile}
        categories={['Design', 'Engineering']}
        publicCategory="All"
        isFreelancer
        onResetProfile={onResetProfile}
        onSelectAll={onSelectAll}
        onSelectPublicCategory={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'For you' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'All' })).not.toHaveClass('active');
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(onSelectAll).toHaveBeenCalledOnce();
  });

  it('always treats category tags as public manual filters', () => {
    const onSelectPublicCategory = vi.fn();
    render(
      <BrowseJobCategoryTags
        view={BROWSE_JOBS_VIEW.Profile}
        categories={['Design', 'Engineering']}
        publicCategory="All"
        isFreelancer
        onResetProfile={vi.fn()}
        onSelectAll={vi.fn()}
        onSelectPublicCategory={onSelectPublicCategory}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Engineering' }));
    expect(onSelectPublicCategory).toHaveBeenCalledWith('Engineering');
  });
});
