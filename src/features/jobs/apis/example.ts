// Example API Structure for Jobs Feature

// features/jobs/apis/jobsApi.ts

import { Job } from '@/types/models/Job';

const API_BASE = '/api/jobs';

/**
 * GET - Fetch all jobs with filters
 */
export async function getJobs(params?: {
  category?: string;
  skills?: string[];
  minBudget?: number;
  maxBudget?: number;
}): Promise<Job[]> {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.set('category', params.category);
  if (params?.skills) queryParams.set('skills', params.skills.join(','));
  if (params?.minBudget) queryParams.set('minBudget', params.minBudget.toString());
  if (params?.maxBudget) queryParams.set('maxBudget', params.maxBudget.toString());

  const response = await fetch(`${API_BASE}?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch jobs');
  return response.json();
}

/**
 * GET - Fetch single job by ID
 */
export async function getJobById(id: string): Promise<Job> {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) throw new Error('Job not found');
  return response.json();
}

/**
 * POST - Create new job
 */
export async function createJob(data: Partial<Job>): Promise<Job> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create job');
  return response.json();
}

/**
 * PUT - Update existing job
 */
export async function updateJob(id: string, data: Partial<Job>): Promise<Job> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update job');
  return response.json();
}

/**
 * DELETE - Delete job
 */
export async function deleteJob(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete job');
}

// Usage in component:
// import { getJobs, createJob } from '@/features/jobs/apis/jobsApi';
