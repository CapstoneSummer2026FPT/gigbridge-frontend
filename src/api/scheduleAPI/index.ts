import { scheduleGetAPI, type ScheduleMeetingResponse, type ScheduleEvent, type ScheduleResponse, type OngoingScheduleResponse } from './GET';
import { schedulePostAPI, type ScheduleMutationResult } from './POST';
import { schedulePutAPI } from './PUT';

export type {
  ScheduleMeetingResponse,
  ScheduleEvent,
  ScheduleResponse,
  OngoingScheduleResponse,
  ScheduleMutationResult,
};

export { scheduleGetAPI, schedulePostAPI, schedulePutAPI };

export const scheduleAPI = {
  ...scheduleGetAPI,
  ...schedulePostAPI,
  ...schedulePutAPI,
};
