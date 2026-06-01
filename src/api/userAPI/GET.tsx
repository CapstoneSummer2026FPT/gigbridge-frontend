import { userHandlers } from '../../mock_backend';

export const userGetAPI = {
  getUserById: async (userId: string) => {
    return await userHandlers.getUserById(userId);
  },

  getGigcoinBalance: async (userId: string) => {
    return await userHandlers.getGigcoinBalance(userId);
  },
};
