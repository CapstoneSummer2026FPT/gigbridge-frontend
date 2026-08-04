export { adminGetAPI } from './GET';
export { adminPostAPI } from './POST';
export { adminPatchAPI } from './PATCH';

// Combined admin API for convenience
import { adminGetAPI } from './GET';
import { adminPostAPI } from './POST';
import { adminPutAPI } from './PUT';
import { adminPatchAPI } from './PATCH';
import { adminDeleteAPI } from './DELETE';

export const adminAPI = {
  getSystemTracking: adminGetAPI.getSystemTracking,
  getAllUsers: adminGetAPI.getAllUsers,
  getFAQs: adminGetAPI.getFAQs,
  getFAQCategories: adminGetAPI.getFAQCategories,
  getWalletBalance: adminGetAPI.getWalletBalance,
  getWalletHistory: adminGetAPI.getWalletHistory,
  getJobPostDetail: adminGetAPI.getJobPostDetail,
  getContracts: adminGetAPI.getContracts,
  getTemplates: adminGetAPI.getTemplates,
  getAssets: adminGetAPI.getAssets,
  getContractMilestones: adminGetAPI.getContractMilestones,
  getWithdrawals: adminGetAPI.getWithdrawals,
  createUser: adminPostAPI.createUser,
  grantUserPremium: adminPostAPI.grantUserPremium,
  createFAQ: adminPostAPI.createFAQ,
  createFAQCategory: adminPostAPI.createFAQCategory,
  broadcastNotification: adminPostAPI.broadcastNotification,
  creditWallet: adminPostAPI.creditWallet,
  debitWallet: adminPostAPI.debitWallet,
  createTemplate: adminPostAPI.createTemplate,
  overrideMilestone: adminPostAPI.overrideMilestone,
  createMilestone: adminPostAPI.createMilestone,
  syncWithdrawal: adminPostAPI.syncWithdrawal,
  retryWithdrawal: adminPostAPI.retryWithdrawal,
  updateUser: adminPutAPI.updateUser,
  updateFAQ: adminPutAPI.updateFAQ,
  updateFAQCategory: adminPutAPI.updateFAQCategory,
  lockJobPost: adminPutAPI.lockJobPost,
  updateTemplate: adminPutAPI.updateTemplate,
  updateMilestone: adminPutAPI.updateMilestone,
  updateContract: adminPutAPI.updateContract,
  toggleUserActivity: adminPatchAPI.toggleUserActivity,
  clearUserSuspension: adminPatchAPI.clearUserSuspension,
  toggleFAQActivity: adminPatchAPI.toggleFAQActivity,
  toggleFAQCategoryActivity: adminPatchAPI.toggleFAQCategoryActivity,
  revokeUserPremium: adminDeleteAPI.revokeUserPremium,
  deleteFAQ: adminDeleteAPI.deleteFAQ,
  deleteFAQCategory: adminDeleteAPI.deleteFAQCategory,
  deleteJobPost: adminDeleteAPI.deleteJobPost,
  deleteTemplate: adminDeleteAPI.deleteTemplate,
  deleteMilestone: adminDeleteAPI.deleteMilestone,
};

