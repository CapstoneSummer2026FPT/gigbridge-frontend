import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobPostVisibility, type GenerateJobDescriptionResponse } from '../../../../types/models/Job';
import { PostJobAIScreen } from '../PostJobAIScreen';
import { PostJobScreen } from '../PostJobScreen';
import { jobAPI } from '../../../../api/jobAPI';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../../../shared/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../../api/jobAPI', () => ({
  jobAPI: {
    getMyDraftJobPosts: vi.fn(),
    generateAIDescription: vi.fn(),
  },
}));

describe('PostJob SPA flow screens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes manual users to Job Details from the mode chooser', async () => {
    render(
      <MemoryRouter>
        <PostJobScreen />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole('button', { name: /manual/i }));

    expect(navigateMock).toHaveBeenCalledWith('/jobs/post/details', { state: null });
  });

  it('routes AI users to the AI requirement prompt from the mode chooser', async () => {
    render(
      <MemoryRouter>
        <PostJobScreen />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole('button', { name: /^ai/i }));

    expect(navigateMock).toHaveBeenCalledWith('/jobs/post/ai');
  });

  it('calls AI generation with the requirement and navigates to the shared Job Details screen', async () => {
    const generatedJob: GenerateJobDescriptionResponse = {
      title: 'Load Balancer Engineer',
      majorId: 'major-1',
      majorCategoryId: 'major-category-1',
      categoryId: 'category-1',
      skills: [{ skillsId: 'skill-1', name: 'Nginx' }],
      customSkills: ['HAProxy'],
      description: 'Improve load balancer reliability and performance.',
    };

    vi.mocked(jobAPI.generateAIDescription).mockResolvedValue({
      success: true,
      data: generatedJob,
      message: 'Success',
    });

    render(
      <MemoryRouter>
        <PostJobAIScreen />
      </MemoryRouter>
    );

    await userEvent.type(
      screen.getByLabelText(/requirement/i),
      'toi muon thue 1 nguoi de cai thien loadbalancer'
    );
    await userEvent.click(screen.getByRole('button', { name: /generate job details/i }));

    await waitFor(() => {
      expect(jobAPI.generateAIDescription).toHaveBeenCalledWith({
        vettingQuestions: ['toi muon thue 1 nguoi de cai thien loadbalancer'],
      });
    });

    expect(navigateMock).toHaveBeenCalledWith(
      '/jobs/post/details',
      expect.objectContaining({
        state: expect.objectContaining({
          jobData: expect.objectContaining({
            title: generatedJob.title,
            description: generatedJob.description,
            visibility: JobPostVisibility.Public,
            isAigenerated: true,
            interviewQuestions: [],
          }),
        }),
      })
    );
  });
});
