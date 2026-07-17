import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  ConfirmResolutionInput,
  ContractReportResolutionAction,
  ReportContract,
  RespondToReportInput,
} from '../../types/models/ReportContract';
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
   * Respondent action (accept, explain, propose, reject)
   */
  respondToReport: async (
    contractId: string,
    reportId: string,
    input: RespondToReportInput,
  ): Promise<ApiResponse<ReportContract>> => {
    const response = await apiService.post<unknown>(
      `${baseUrl(contractId)}/${reportId}/respond`,
      input,
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
};
