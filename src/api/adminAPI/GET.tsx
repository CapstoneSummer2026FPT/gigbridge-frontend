// import { adminHandlers } from '../../mock_backend';
import { apiService } from '../../service/apiService';
import { ApiResponse } from '../../types/common';




export const adminGetAPI = {
  getDashboardStats: async () => {
    return await adminHandlers.getDashboardStats();
  },

  getRecentUsers: async (limit?: number) => {
    return await adminHandlers.getRecentUsers(limit);
  },

  getRecentProjects: async (limit?: number) => {
    return await adminHandlers.getRecentProjects(limit);
  },

  getUserActivity: async (days?: number) => {
    return await adminHandlers.getUserActivity(days);
  },

  getRevenueData: async (months?: number) => {
    return await adminHandlers.getRevenueData(months);
  },
};
