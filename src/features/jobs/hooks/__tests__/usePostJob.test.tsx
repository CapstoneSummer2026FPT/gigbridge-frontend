import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePostJob, type PostJobRouteState } from '../usePostJob';
import { jobAPI } from '../../../../api/jobAPI';
import { JobPostStatus } from '../../../../types/models/Job';
import type { ApiResponse } from '../../../../types/common';

let mockLocationState: PostJobRouteState | null = null;
const mockNavigate = vi.fn();

const successResponse = <T,>(data?: T): ApiResponse<T> => ({
  success: true,
  statusCode: 200,
  message: 'OK',
  ...(data === undefined ? {} : { data }),
});

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: mockLocationState }),
  useBlocker: () => ({ state: 'unblocked', reset: vi.fn(), proceed: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../../../api/jobAPI', () => ({
  jobAPI: {
    getMajors: vi.fn().mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'OK',
      data: [],
    }),
    getCategoriesByMajor: vi.fn().mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'OK',
      data: [],
    }),
    getSkillsByCategory: vi.fn(),
    getMyJobPostById: vi.fn(),
    getJobPostQuestions: vi.fn(),
    generateAIDescription: vi.fn(),
    createDraftJobPost: vi.fn().mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'OK',
      data: { jobPostId: 'job-1', status: 0 },
    }),
    saveDraftJobPost: vi.fn().mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'OK',
    }),
    updateJobPostStatus: vi.fn().mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'OK',
      data: true,
    }),
  },
}));

describe('usePostJob hook skills conversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockLocationState = null;
    vi.mocked(jobAPI.createDraftJobPost).mockResolvedValue(successResponse({
      jobPostId: 'job-1',
      status: JobPostStatus.Draft,
    }));
    vi.mocked(jobAPI.saveDraftJobPost).mockResolvedValue(successResponse());
    vi.mocked(jobAPI.updateJobPostStatus).mockResolvedValue(successResponse(true));
  });

  it('keeps matching skills and converts mismatching skills to custom skills', async () => {
    const mockSkillsCategory1 = [
      { skillId: 'skill-1', name: 'Skill One' },
      { skillId: 'skill-3', name: 'Skill Three' },
    ];
    const mockSkillsCategory2 = [
      { skillId: 'skill-1', name: 'Skill One' },
      { skillId: 'skill-2', name: 'Skill Two' },
    ];

    vi.mocked(jobAPI.getSkillsByCategory).mockImplementation((categoryId) => {
      if (categoryId === 'category-1') {
        return Promise.resolve(successResponse(mockSkillsCategory1));
      }
      return Promise.resolve(successResponse(mockSkillsCategory2));
    });

    const initialJobData = {
      title: 'Test Title',
      majorId: 'major-1',
      majorCategoryId: 'category-1',
      categoryId: 'category-1',
      skillIds: ['skill-1', 'skill-3'],
      customSkillNames: ['Custom Skill 4'],
      estimatedDuration: '2-4 weeks',
      skillNameById: {
        'skill-1': 'Skill One',
        'skill-3': 'Skill Three',
      },
    };
    mockLocationState = { jobData: initialJobData };

    const { result } = renderHook(() => usePostJob());

    // Verify initial values
    expect(result.current.form.skillIds).toEqual(['skill-1', 'skill-3']);
    expect(result.current.form.customSkillNames).toEqual(['Custom Skill 4']);

    // Wait for the initial skills load for category-1 to complete
    await waitFor(() => {
      expect(jobAPI.getSkillsByCategory).toHaveBeenCalledWith('category-1');
    });

    // Clear call history so we can check next call
    vi.mocked(jobAPI.getSkillsByCategory).mockClear();

    // Now call setForm to change categoryId to 'category-2'
    act(() => {
      result.current.setForm(prev => ({
        ...prev,
        categoryId: 'category-2',
      }));
    });

    // Wait for the effect to resolve getSkillsByCategory('category-2')
    await waitFor(() => {
      expect(jobAPI.getSkillsByCategory).toHaveBeenCalledWith('category-2');
    });

    // Now verify form.skillIds and form.customSkillNames
    await waitFor(() => {
      // skill-1 should be kept (matches mockSkillsCategory2)
      // skill-3 should be converted to custom skill 'Skill Three'
      // Custom Skill 4 should be preserved
      expect(result.current.form.skillIds).toEqual(['skill-1']);
      expect(result.current.form.customSkillNames).toEqual(['Custom Skill 4', 'Skill Three']);
    });
  });

  it('publishes directly without requiring clarifying questions', async () => {
    vi.mocked(jobAPI.getSkillsByCategory).mockResolvedValue(successResponse([]));

    const { result } = renderHook(() => usePostJob());

    act(() => {
      result.current.setForm(prev => ({
        ...prev,
        title: 'Build vendor onboarding portal',
        majorId: 'major-1',
        majorCategoryId: 'major-category-1',
        categoryId: 'category-1',
        description: 'We need a portal for vendors to submit documents and track approval status.',
        estimatedDurationValue: '3',
      }));
      result.current.setQuestions([{ questionText: '', isRequired: false }]);
    });

    await act(async () => {
      await result.current.submitDraftFlow('publish');
    });

    expect(jobAPI.saveDraftJobPost).toHaveBeenCalledWith('job-1', expect.objectContaining({
      title: 'Build vendor onboarding portal',
      questions: [],
    }));
    expect(jobAPI.updateJobPostStatus).toHaveBeenCalledWith('job-1', { status: JobPostStatus.Open });
    expect(mockNavigate).toHaveBeenCalledWith('/jobs/my-jobs');
    expect(mockNavigate).not.toHaveBeenCalledWith('/jobs/post/contract', expect.anything());
  });
});
