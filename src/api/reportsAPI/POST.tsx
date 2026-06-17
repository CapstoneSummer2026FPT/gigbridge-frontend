import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { CreateReportPayload } from '../../types/models/Report';

const Reports_Api_Base_Url = '/reports';

export const reportsAPI = {
  createReport: async (payload: CreateReportPayload): Promise<ApiResponse<string>> => {
    return apiService.post<string>(Reports_Api_Base_Url, payload);
  },
};
