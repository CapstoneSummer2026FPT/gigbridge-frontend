import { apiService } from '../../service/apiService';
import type { MessageResponse } from '../messageAPI/GET';
import type { ScheduleResponse } from './GET';

export interface ScheduleMutationResult {
  schedule: ScheduleResponse;
  message: MessageResponse;
}

export const schedulePostAPI = {
  create: (payload: { conversationId: string; title: string; details?: string; scheduledAt: string; timeZoneId: string; addGoogleMeet?: boolean; sendEmailNotification?: boolean }) =>
    apiService.post<ScheduleMutationResult>('schedules', payload),
  cancel: (id: string, payload: { reason: string; expectedVersion: number }) =>
    apiService.post<ScheduleMutationResult>(`schedules/${id}/cancel`, payload),
  accept: (id: string, expectedVersion: number) =>
    apiService.post<ScheduleMutationResult>(`schedules/${id}/accept`, { expectedVersion }),
  reject: (id: string, expectedVersion: number) =>
    apiService.post<ScheduleMutationResult>(`schedules/${id}/reject`, { expectedVersion }),
  createCounterProposal: (id: string, payload: { scheduledAt: string; expectedVersion: number; timeZoneId: string }) =>
    apiService.post<ScheduleMutationResult>(`schedules/${id}/counterproposal`, payload),
  retryMeeting: (id: string) =>
    apiService.post<ScheduleMutationResult>(`schedules/${id}/meeting/retry`),
};
