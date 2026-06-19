import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  CreateReportPayload,
  GetReportsParams,
  ReportDto,
  ReportsResponse,
  ReportStatus,
  ReportSummaryDto,
} from '../../types/models/Report';

export const reportAPI = {
  createReport: (payload: CreateReportPayload): Promise<ApiResponse<string>> =>
    apiService.post<string>('/Reports', payload),

  getAdminReports: (params: GetReportsParams = {}): Promise<ApiResponse<ReportsResponse>> =>
    apiService.get<ReportsResponse>('/reports/admin', params),

  getAdminReport: (reportId: string): Promise<ApiResponse<ReportDto>> =>
    apiService.get<ReportDto>(`/reports/admin/${reportId}`),

  getAdminSummary: (): Promise<ApiResponse<ReportSummaryDto>> =>
    apiService.get<ReportSummaryDto>('/reports/admin/summary'),

  updateStatus: (
    reportId: string,
    status: ReportStatus,
    adminNote?: string,
  ): Promise<ApiResponse<null>> =>
    apiService.put<null>(`/reports/admin/${reportId}/status`, { status, adminNote }),

  resolve: (
    reportId: string,
    takeAction: boolean,
    adminNote?: string,
  ): Promise<ApiResponse<null>> =>
    apiService.put<null>(`/reports/admin/${reportId}/resolve`, { adminNote, takeAction }),
};
