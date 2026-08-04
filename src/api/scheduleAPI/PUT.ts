import { apiService } from '../../service/apiService';
import type { ScheduleMutationResult } from './POST';

export const schedulePutAPI = {
  update: (id: string, payload: { title: string; details?: string; scheduledAt: string; expectedVersion: number }) =>
    apiService.put<ScheduleMutationResult>(`schedules/${id}`, payload),
  updateCounterProposal: (id: string, payload: { scheduledAt: string; expectedVersion: number; timeZoneId: string }) =>
    apiService.put<ScheduleMutationResult>(`schedules/${id}/counterproposal`, payload),
};
