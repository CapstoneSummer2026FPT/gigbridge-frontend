import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  ConfirmResolutionInput,
  ReportContract,
  RespondToReportInput,
} from '../../types/models/ReportContract';
import type { Dispute, EscalateReportToDisputeInput } from '../../types/models/Dispute';
import { normalizeDispute } from '../disputeAPI/utils';
import { normalizeReportContract } from './utils';

const baseUrl = (contractId: string) => `contracts/${contractId}/reports`;

export const reportContractPostAPI = {
  /**
   * POST /api/contracts/{contractId}/reports
   * Create a new report with optional file attachments
   */
  createReport: async (
    contractId: string,
    input: {
      issueType: number;
      description: string;
      desiredResolution: string;
      milestoneId?: string | null;
      attachments?: File[];
    },
  ): Promise<ApiResponse<ReportContract>> => {
    const formData = new FormData();
    formData.append('issueType', String(input.issueType));
    formData.append('description', input.description);
    formData.append('desiredResolution', input.desiredResolution);
    if (input.milestoneId) {
      formData.append('milestoneId', input.milestoneId);
    }
    if (input.attachments) {
      for (const file of input.attachments) {
        formData.append('attachments', file);
      }
    }

    const response = await apiService.post<unknown>(baseUrl(contractId), formData);
    return {
      ...response,
      data: response.data ? normalizeReportContract(response.data) : undefined,
    };
  },

  /**
   * POST /api/contracts/{contractId}/reports/{reportId}/respond
   * Respondent action (accept, explain, propose, reject) with optional file attachments
   */
  respondToReport: async (
    contractId: string,
    reportId: string,
    input: RespondToReportInput,
  ): Promise<ApiResponse<ReportContract>> => {
    const formData = new FormData();
    formData.append('resolutionAction', String(input.resolutionAction));
    if (input.explanation) {
      formData.append('explanation', input.explanation);
    }
    if (input.proposedResolution) {
      formData.append('proposedResolution', input.proposedResolution);
    }
    if (input.rejectReason) {
      formData.append('rejectReason', input.rejectReason);
    }
    if (input.attachments) {
      for (const file of input.attachments) {
        formData.append('attachments', file);
      }
    }

    const response = await apiService.post<unknown>(
      `${baseUrl(contractId)}/${reportId}/respond`,
      formData,
    );
    return {
      ...response,
      data: response.data ? normalizeReportContract(response.data) : undefined,
    };
  },

  /**
   * POST /api/contracts/{contractId}/reports/{reportId}/confirm
   * Reporter confirms or declines the resolution
   */
  confirmResolution: async (
    contractId: string,
    reportId: string,
    input: ConfirmResolutionInput,
  ): Promise<ApiResponse<ReportContract>> => {
    const response = await apiService.post<unknown>(
      `${baseUrl(contractId)}/${reportId}/confirm`,
      input,
    );
    return {
      ...response,
      data: response.data ? normalizeReportContract(response.data) : undefined,
    };
  },

  /** POST /api/contracts/{contractId}/reports/{reportId}/escalate */
  escalateToDispute: async (
    contractId: string,
    reportId: string,
    input: EscalateReportToDisputeInput,
  ): Promise<ApiResponse<Dispute>> => {
    const formData = new FormData();
    formData.append('title', input.title);
    formData.append('description', input.description);
    formData.append('claimedAmount', String(input.claimedAmount));
    formData.append('requestedResolution', input.requestedResolution);
    formData.append('urgency', String(input.urgency));
    formData.append('declarationAccepted', String(input.declarationAccepted));
    for (const file of input.evidenceFiles ?? []) {
      formData.append('evidenceFiles', file);
    }

    const response = await apiService.post<unknown>(
      `${baseUrl(contractId)}/${reportId}/escalate`,
      formData,
    );
    return {
      ...response,
      data: response.data ? normalizeDispute(response.data) : undefined,
    };
  },
};
