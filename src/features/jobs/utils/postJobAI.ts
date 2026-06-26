import { JobPostVisibility, type GenerateJobDescriptionResponse, type GenerateJobDescriptionRequest } from '../../../types/models/Job';
import type { PostJobRouteJobData } from '../hooks/usePostJob';

const AI_DEFAULT_DURATION = '2 weeks';
const AI_DEFAULT_LOCATION = 'Remote';

export const buildDefaultAIDeadline = (now: Date = new Date()): string => {
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + 14);
  return deadline.toISOString().split('T')[0];
};

export const buildAIJobGenerateRequest = (prompt: string): GenerateJobDescriptionRequest => ({
  vettingQuestions: [prompt.trim()],
});

export const mapGeneratedJobDescriptionToJobData = (
  generatedData: GenerateJobDescriptionResponse,
  now: Date = new Date()
): PostJobRouteJobData => {
  const skillNameById = Object.fromEntries(
    generatedData.skills.map(skill => [skill.skillsId, skill.name])
  );

  return {
    title: generatedData.title,
    majorId: generatedData.majorId || '',
    majorCategoryId: generatedData.majorCategoryId || '',
    categoryId: generatedData.categoryId || '',
    skillIds: generatedData.skills.map(skill => skill.skillsId),
    customSkillNames: generatedData.customSkills || [],
    description: generatedData.description,
    currency: 'USD',
    estimatedDuration: AI_DEFAULT_DURATION,
    location: AI_DEFAULT_LOCATION,
    visibility: JobPostVisibility.Public,
    deadline: buildDefaultAIDeadline(now),
    isAigenerated: true,
    skillNameById,
    interviewQuestions: [],
  };
};
