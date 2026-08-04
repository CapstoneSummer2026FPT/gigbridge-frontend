import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ReportContract, ReportContractListItem } from '../../types/models/ReportContract';
import { normalizeReportContract, normalizeReportContractListItem } from './utils';

const baseUrl = (contractId: string) => `contracts/${contractId}/reports`;

export const reportContractGetAPI = {
  getAttachmentDownload: (contractId:string, reportId:string, attachmentId:string): Promise<ApiResponse<{attachmentId:string;fileName:string;downloadUrl:string}>> =>
    apiService.get(`${baseUrl(contractId)}/${reportId}/attachments/${attachmentId}/download`),
  /**
   * GET /api/contracts/{contractId}/reports
   * List all reports for a contract
   */
  getContractReports: async (
    contractId: string,
  ): Promise<ApiResponse<ReportContractListItem[]>> => {
    const response = await apiService.get<unknown[]>(baseUrl(contractId));
    return {
      ...response,
      data: response.data?.map(normalizeReportContractListItem) ?? [],
    };
  },

  /**
   * GET /api/contracts/{contractId}/reports/{reportId}
   * Get report details
   */
  getReportById: async (
    contractId: string,
    reportId: string,
  ): Promise<ApiResponse<ReportContract>> => {
    const response = await apiService.get<unknown>(
      `${baseUrl(contractId)}/${reportId}`,
    );
    return {
      ...response,
      data: response.data ? normalizeReportContract(response.data) : undefined,
    };
  },
};
