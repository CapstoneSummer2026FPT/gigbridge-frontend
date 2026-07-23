import { apiService } from '../service/apiService';

export const policyAPI = {
  getGigBridgeVietnamPolicy: () => apiService.get<string>('policies/gigbridge-vn'),
};
