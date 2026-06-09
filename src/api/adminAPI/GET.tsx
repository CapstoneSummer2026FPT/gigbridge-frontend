import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { FAQCategoryDto, FAQDto } from '../../types/models/FAQ';
import type { GetReportsParams, ReportDto, ReportsResponse } from '../../types/models/Report';
import type { GetUsersParams, PaginatedUsersResponse } from '../../types/models/User';

const Admin_Api_Base_Url = '/admin';
const Admin_Reports_Api_Base_Url = '/reports/admin';

export const adminGetAPI = {
  /**
   * GET /api/v1/admin/users
   * Returns a paginated, searchable list of users.
   * Backend Status: 1 = active, 0 = inactive (banned), null = all.
   */
  getUsers: async (params: GetUsersParams = {}): Promise<ApiResponse<PaginatedUsersResponse>> => {
    return apiService.get<PaginatedUsersResponse>(`${Admin_Api_Base_Url}/users`, params);
  },

  /**
   * Fetch all users matching the given search/filter by requesting page 1
   * with a high page size.
   */
  getAllUsers: async (search?: string, status?: number): Promise<ApiResponse<PaginatedUsersResponse>> => {
    return adminGetAPI.getUsers({
      Page: 1,
      PageSize: 200,
      Search: search,
      Status: status,
    });
  },

  getFAQs: async (categoryId?: number): Promise<ApiResponse<FAQDto[]>> => {
    return apiService.get<FAQDto[]>(`${Admin_Api_Base_Url}/faq`, categoryId ? { categoryId } : {});
  },

  getFAQCategories: async (): Promise<ApiResponse<FAQCategoryDto[]>> => {
    return apiService.get<FAQCategoryDto[]>(`${Admin_Api_Base_Url}/faq/categories`);
  },

  getReports: async (params: GetReportsParams = {}): Promise<ApiResponse<ReportsResponse>> => {
    return apiService.get<ReportsResponse>(Admin_Reports_Api_Base_Url, params);
  },

  getReportDetail: async (reportId: string): Promise<ApiResponse<ReportDto>> => {
    return apiService.get<ReportDto>(`${Admin_Reports_Api_Base_Url}/${reportId}`);
  },
};
