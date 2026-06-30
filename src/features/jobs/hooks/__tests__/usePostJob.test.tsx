import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePostJob } from '../usePostJob';
import { jobAPI } from '../../../../api/jobAPI';

let mockLocationState: any = null;

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
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
    getMajors: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getCategoriesByMajor: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getSkillsByCategory: vi.fn(),
    getMyJobPostById: vi.fn(),
    getJobPostQuestions: vi.fn(),
    generateAIDescription: vi.fn(),
  },
}));

describe('usePostJob hook skills conversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationState = null;
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
        return Promise.resolve({ success: true, data: mockSkillsCategory1 });
      }
      return Promise.resolve({ success: true, data: mockSkillsCategory2 });
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
});
