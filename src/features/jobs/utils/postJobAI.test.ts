import { describe, expect, it } from 'vitest';
import { JobPostVisibility, type GenerateJobDescriptionResponse } from '../../../types/models/Job';
import { buildAIJobGenerateRequest, mapGeneratedJobDescriptionToJobData } from './postJobAI';

describe('postJobAI utilities', () => {
  it('builds the AI generation request with the prompt as one vetting question', () => {
    expect(buildAIJobGenerateRequest('  improve loadbalancer  ')).toEqual({
      vettingQuestions: ['improve loadbalancer'],
    });
  });

  it('maps generated job details into the shared post job route state shape', () => {
    const generated: GenerateJobDescriptionResponse = {
      title: 'Load Balancer Performance Engineer',
      majorId: 'major-1',
      categoryId: 'category-1',
      majorCategoryId: 'major-category-1',
      skills: [
        { skillsId: 'skill-1', name: 'Nginx' },
        { skillsId: 'skill-2', name: 'Kubernetes' },
      ],
      customSkills: ['HAProxy'],
      description: 'Optimize traffic routing and improve load balancer reliability.',
    };

    const jobData = mapGeneratedJobDescriptionToJobData(generated, new Date('2026-06-01T00:00:00.000Z'));

    expect(jobData).toMatchObject({
      title: generated.title,
      majorId: 'major-1',
      categoryId: 'category-1',
      majorCategoryId: 'major-category-1',
      skillIds: ['skill-1', 'skill-2'],
      customSkillNames: ['HAProxy'],
      description: generated.description,
      currency: 'USD',
      estimatedDuration: '2 weeks',
      location: 'Remote',
      visibility: JobPostVisibility.Public,
      deadline: '2026-06-15',
      isAigenerated: true,
      skillNameById: {
        'skill-1': 'Nginx',
        'skill-2': 'Kubernetes',
      },
      interviewQuestions: [],
    });
  });
});
