import { apiService } from '../../service/apiService';

export const policyGetAPI = {
  getGigBridgeVietnamPolicy: () => apiService.get<string>('policies/gigbridge-vn'),
};
