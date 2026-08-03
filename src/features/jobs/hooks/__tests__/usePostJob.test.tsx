import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePostJob, type PostJobRouteState } from '../usePostJob';
import { jobAPI } from '../../../../api/jobAPI';
import { JobPostStatus, type GenerateJobHiringPlanResponse } from '../../../../types/models/Job';
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
    generateAIDetails: vi.fn(),
    generateAIHiringPlan: vi.fn(),
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
    uploadJobPostAttachment: vi.fn(),
    deleteJobPostAttachment: vi.fn(),
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
    vi.mocked(jobAPI.uploadJobPostAttachment).mockResolvedValue(successResponse({
      jobPostAttachmentsId: 'attachment-1',
      fileUrl: 'https://files.example/project.png',
      fileName: 'project.png',
    }));
    vi.mocked(jobAPI.deleteJobPostAttachment).mockResolvedValue(successResponse(true));
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

  it('returns the project field that blocks publication', async () => {
    const { result } = renderHook(() => usePostJob());
    let submissionResult: Awaited<ReturnType<typeof result.current.submitDraftFlow>> | undefined;

    await act(async () => {
      submissionResult = await result.current.submitDraftFlow('publish');
    });

    expect(submissionResult).toEqual({
      status: 'validation-error',
      section: 'project',
      fieldSelector: '#job-title',
    });
    expect(jobAPI.saveDraftJobPost).not.toHaveBeenCalled();
  });

  it('returns the milestone field that blocks publication', async () => {
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
      result.current.setMilestonePlans([{
        title: '',
        description: '',
        amount: 12,
        estimatedDuration: '2 weeks',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        deliverables: 'Working onboarding workflow',
        acceptanceCriteria: 'A vendor can complete every onboarding step',
        orderIndex: 0,
        workItems: [],
      }]);
    });

    let submissionResult: Awaited<ReturnType<typeof result.current.submitDraftFlow>> | undefined;
    await act(async () => {
      submissionResult = await result.current.submitDraftFlow('publish');
    });

    expect(submissionResult).toEqual({
      status: 'validation-error',
      section: 'hiringPlan',
      fieldSelector: '[data-milestone-field="0.title"]',
    });
    expect(jobAPI.saveDraftJobPost).not.toHaveBeenCalled();
  });

  it('saves the first step before navigating to milestone setup', async () => {
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
    });

    await act(async () => {
      await result.current.submitDraftFlow('plan');
    });

    expect(jobAPI.saveDraftJobPost).toHaveBeenCalledWith('job-1', expect.objectContaining({
      title: 'Build vendor onboarding portal',
    }));
    expect(mockNavigate).toHaveBeenCalledWith('/jobs/post/plan', expect.objectContaining({
      state: expect.objectContaining({ jobPostId: 'job-1' }),
    }));
    expect(jobAPI.updateJobPostStatus).not.toHaveBeenCalled();
  });

  it('does not create an empty draft during autosave', async () => {
    vi.useFakeTimers();
    try {
      renderHook(() => usePostJob());

      await act(async () => {
        vi.advanceTimersByTime(1500);
        await Promise.resolve();
      });

      expect(jobAPI.createDraftJobPost).not.toHaveBeenCalled();
      expect(jobAPI.saveDraftJobPost).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('autosaves meaningful changes after the debounce window', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => usePostJob());

      act(() => {
        result.current.setForm(prev => ({ ...prev, title: 'Autosaved project request' }));
      });

      expect(jobAPI.saveDraftJobPost).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1200);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(jobAPI.createDraftJobPost).toHaveBeenCalledTimes(1);
      expect(jobAPI.saveDraftJobPost).toHaveBeenCalledWith('job-1', expect.objectContaining({
        title: 'Autosaved project request',
      }));
      expect(result.current.autosaveStatus).toBe('saved');
      expect(result.current.isDirty).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('retries a failed autosave with the latest draft data', async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(jobAPI.saveDraftJobPost)
        .mockResolvedValueOnce({ success: false, statusCode: 500, message: 'Network unavailable' })
        .mockResolvedValueOnce(successResponse());
      const { result } = renderHook(() => usePostJob());

      act(() => {
        result.current.setForm(prev => ({ ...prev, title: 'Retry this draft' }));
      });

      await act(async () => {
        vi.advanceTimersByTime(1200);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(result.current.autosaveStatus).toBe('error');

      await act(async () => {
        await result.current.retryAutosave();
      });

      expect(jobAPI.saveDraftJobPost).toHaveBeenLastCalledWith('job-1', expect.objectContaining({
        title: 'Retry this draft',
      }));
      expect(result.current.autosaveStatus).toBe('saved');
    } finally {
      vi.useRealTimers();
    }
  });

  it('serializes overlapping saves and creates only one draft', async () => {
    let activeRequests = 0;
    let peakRequests = 0;
    vi.mocked(jobAPI.saveDraftJobPost).mockImplementation(async () => {
      activeRequests += 1;
      peakRequests = Math.max(peakRequests, activeRequests);
      await Promise.resolve();
      activeRequests -= 1;
      return successResponse();
    });
    const { result } = renderHook(() => usePostJob());

    act(() => {
      result.current.setForm(prev => ({ ...prev, title: 'Sequential draft saves' }));
    });

    await act(async () => {
      await Promise.all([
        result.current.flushAutosave(),
        result.current.flushAutosave(),
      ]);
    });

    expect(jobAPI.createDraftJobPost).toHaveBeenCalledTimes(1);
    expect(jobAPI.saveDraftJobPost).toHaveBeenCalledTimes(2);
    expect(peakRequests).toBe(1);
  });

  it('uploads only an accepted image to JobPostAttachment', async () => {
    const { result } = renderHook(() => usePostJob());
    const file = new File(['png'], 'project.png', { type: 'image/png' });

    await act(async () => {
      await result.current.uploadAttachment(file);
    });

    expect(jobAPI.createDraftJobPost).toHaveBeenCalledTimes(1);
    expect(jobAPI.uploadJobPostAttachment).toHaveBeenCalledWith('job-1', file);
    expect(result.current.attachments).toEqual([{
      jobPostAttachmentsId: 'attachment-1',
      fileUrl: 'https://files.example/project.png',
      fileName: 'project.png',
    }]);
  });

  it('rejects a non-image attachment before making an API request', async () => {
    const { result } = renderHook(() => usePostJob());
    const file = new File(['pdf'], 'requirements.pdf', { type: 'application/pdf' });

    await act(async () => {
      await result.current.uploadAttachment(file);
    });

    expect(jobAPI.createDraftJobPost).not.toHaveBeenCalled();
    expect(jobAPI.uploadJobPostAttachment).not.toHaveBeenCalled();
    expect(result.current.attachments).toEqual([]);
    expect(result.current.attachmentError).toBeTruthy();
  });

  it('preserves the selected required status in the draft payload', async () => {
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
      result.current.setQuestions([{
        questionText: 'How would you approach the onboarding workflow?',
        isRequired: false,
      }]);
    });

    await act(async () => {
      await result.current.submitDraftFlow('publish');
    });

    expect(jobAPI.saveDraftJobPost).toHaveBeenCalledWith('job-1', expect.objectContaining({
      questions: [{
        questionText: 'How would you approach the onboarding workflow?',
        orderIndex: 0,
        isRequired: false,
      }],
    }));
  });

  it('preserves optional questions from route state', () => {
    mockLocationState = {
      jobData: {
        interviewQuestions: [{
          questionText: 'Share any additional context if useful.',
          isRequired: false,
        }],
      },
    };

    const { result } = renderHook(() => usePostJob());

    expect(result.current.questions).toEqual([{
      questionText: 'Share any additional context if useful.',
      isRequired: false,
    }]);
  });

  it('publishes a client baseline milestone without sending work breakdown items', async () => {
    vi.mocked(jobAPI.getSkillsByCategory).mockResolvedValue(successResponse([]));
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

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
      result.current.setMilestonePlans([{
        title: 'Vendor onboarding workflow',
        description: '',
        amount: 12,
        estimatedDuration: '2 weeks',
        dueDate: futureDate,
        deliverables: 'Working onboarding workflow',
        acceptanceCriteria: 'A vendor can complete every onboarding step',
        orderIndex: 0,
        workItems: [{
          title: 'Implement onboarding form',
          description: 'Build the vendor-facing form',
          deliverables: 'Working form',
          estimatedDuration: '1 week',
          orderIndex: 0,
        }],
      }]);
    });

    await act(async () => {
      await result.current.submitDraftFlow('publish');
    });

    expect(jobAPI.saveDraftJobPost).toHaveBeenCalledWith('job-1', expect.objectContaining({
      milestonePlans: [
        expect.objectContaining({
          title: 'Vendor onboarding workflow',
          workItems: [],
        }),
      ],
    }));
    expect(jobAPI.updateJobPostStatus).toHaveBeenCalledWith('job-1', { status: JobPostStatus.Open });
  });

  describe('background hiring plan generation delusional flow', () => {
    it('immediately triggers generateAIHiringPlan in the background and processes correctly on resolve/success', async () => {
      let resolvePlanPromise!: (value: ApiResponse<GenerateJobHiringPlanResponse>) => void;
      const planPromise = new Promise<ApiResponse<GenerateJobHiringPlanResponse>>((resolve) => {
        resolvePlanPromise = resolve;
      });
      vi.mocked(jobAPI.generateAIHiringPlan).mockImplementation(() => planPromise);
      vi.mocked(jobAPI.getSkillsByCategory).mockResolvedValue(successResponse([]));

      const mockPendingDetails = {
        title: 'Background Generated SaaS Dashboard',
        description: 'Need a dashboard',
        majorId: 'major-1',
        majorCategoryId: 'category-1',
        categoryId: 'category-1',
        majorName: 'Software',
        categoryName: 'Web Dev',
        skills: [],
        customSkills: [],
      };

      vi.mocked(jobAPI.generateAIDetails).mockResolvedValue(successResponse(mockPendingDetails));

      const { result } = renderHook(() => usePostJob());

      await act(async () => {
        await result.current.handleGenerateInstantJob('Build a SaaS Dashboard');
      });

      expect(result.current.isReviewModalOpen).toBe(true);
      expect(result.current.pendingGeneratedDetails).toEqual(mockPendingDetails);

      await act(async () => {
        await result.current.handleApproveDetails();
      });

      expect(result.current.isReviewModalOpen).toBe(false);
      expect(result.current.form.title).toBe('Background Generated SaaS Dashboard');

      expect(jobAPI.generateAIHiringPlan).toHaveBeenCalledWith({
        clientPrompt: 'Build a SaaS Dashboard',
        title: 'Background Generated SaaS Dashboard',
        description: 'Need a dashboard',
      });

      let submitPromise: any;
      act(() => {
        submitPromise = result.current.submitDraftFlow('plan');
      });

      expect(result.current.isGeneratingPlan).toBe(true);

      await act(async () => {
        resolvePlanPromise(successResponse({
          milestones: [{ title: 'Milestone 1', amount: 100, estimatedDuration: '1 week', dueDate: '2026-08-15', deliverables: 'd', acceptanceCriteria: 'a' }],
          questionRecruitment: ['Question 1'],
        }));
      });

      await act(async () => {
        await submitPromise;
      });

      expect(result.current.isGeneratingPlan).toBe(false);
      expect(result.current.milestonePlans).toEqual([{ title: 'Milestone 1', amount: 100, estimatedDuration: '1 week', dueDate: '2026-08-15', deliverables: 'd', acceptanceCriteria: 'a', workItems: [] }]);
    });
  });
});
