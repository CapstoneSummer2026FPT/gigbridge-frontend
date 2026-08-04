import { apiService } from '../../service/apiService';

export interface ScheduleMeetingResponse {
  provider: number;
  status: number;
  organizerUserId: string;
  joinUri?: string | null;
  failureCode?: string | null;
  canRetry: boolean;
}

export interface ScheduleEvent {
  schemaVersion: number;
  scheduleId: string;
  conversationId: string;
  scheduleMessageId: string;
  eventType: number;
  eventSequence: number;
  status: number;
  title: string;
  details?: string | null;
  scheduledAtUtc: string;
  timeZoneId: string;
  actorId: string;
  actorName: string;
  createdByUserId: string;
  editCount: number;
  remainingEdits: number;
  version: number;
  createdAt: string;
  cancellationReason?: string | null;
  cutoffUtc: string;
  graceExpiresAtUtc: string;
  canEdit: boolean;
  canCancel: boolean;
  agreementStatus: number;
  counterProposalCreatedAtUtc?: string | null;
  counterProposalEditExpiresAtUtc?: string | null;
  proposedScheduledAtUtc?: string | null;
  proposedTimeZoneId?: string | null;
  rescheduleRequestCount?: number;
  remainingRescheduleRequests?: number;
  canAccept: boolean;
  canReject: boolean;
  canProposeTime: boolean;
  canEditCounterProposal: boolean;
  meeting?: ScheduleMeetingResponse | null;
}

export interface ScheduleResponse extends Omit<ScheduleEvent, 'schemaVersion' | 'scheduleMessageId' | 'eventType' | 'eventSequence' | 'actorId' | 'actorName'> {
  createdByUserId: string;
  cancelledByUserId?: string | null;
  updatedAt?: string | null;
  cancelledAt?: string | null;
  meeting?: ScheduleMeetingResponse | null;
}

export interface OngoingScheduleResponse {
  hasOngoingSchedule: boolean;
  scheduleId?: string | null;
  scheduledAtUtc?: string | null;
}

export const scheduleGetAPI = {
  get: (id: string) => apiService.get<ScheduleResponse>(`schedules/${id}`),
  getOngoing: (conversationId: string) => apiService.get<OngoingScheduleResponse>(`schedules/conversation/${conversationId}/ongoing`),
};
