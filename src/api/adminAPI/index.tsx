export { adminGetAPI } from './GET';
export { adminPostAPI } from './POST';
export { adminPutAPI } from './PUT';
export { adminPatchAPI } from './PATCH';
export { adminDeleteAPI } from './DELETE';

// Combined admin API for convenience
import { adminGetAPI } from './GET';
import { adminPostAPI } from './POST';
import { adminPutAPI } from './PUT';
import { adminPatchAPI } from './PATCH';
import { adminDeleteAPI } from './DELETE';

export const adminAPI = {
  getUsers: adminGetAPI.getUsers,
  getAllUsers: adminGetAPI.getAllUsers,
  getFAQs: adminGetAPI.getFAQs,
  getFAQCategories: adminGetAPI.getFAQCategories,
  getCheatingEvents: adminGetAPI.getCheatingEvents,
  getCheatingViolations: adminGetAPI.getCheatingViolations,
  getCheatingViolationDetail: adminGetAPI.getCheatingViolationDetail,
  getWalletBalance: adminGetAPI.getWalletBalance,
  getWalletHistory: adminGetAPI.getWalletHistory,
  getJobPostDetail: adminGetAPI.getJobPostDetail,
  getProposalDetail: adminGetAPI.getProposalDetail,
  getContracts: adminGetAPI.getContracts,
  getTemplates: adminGetAPI.getTemplates,
  getTemplateById: adminGetAPI.getTemplateById,
  getAssets: adminGetAPI.getAssets,
  getContractMilestones: adminGetAPI.getContractMilestones,
  getWithdrawals: adminGetAPI.getWithdrawals,
  getWithdrawalDetail: adminGetAPI.getWithdrawalDetail,
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
  banUser: adminPutAPI.banUser,
  unbanUser: adminPutAPI.unbanUser,
  lockJobPost: adminPutAPI.lockJobPost,
  updateTemplate: adminPutAPI.updateTemplate,
  updateMilestone: adminPutAPI.updateMilestone,
  updateContract: adminPutAPI.updateContract,
  toggleUserActivity: adminPatchAPI.toggleUserActivity,
  suspendUser: adminPatchAPI.suspendUser,
  clearUserSuspension: adminPatchAPI.clearUserSuspension,
  toggleFAQActivity: adminPatchAPI.toggleFAQActivity,
  toggleFAQCategoryActivity: adminPatchAPI.toggleFAQCategoryActivity,
  reviewCheatingViolation: adminPatchAPI.reviewCheatingViolation,
  deleteUser: adminDeleteAPI.deleteUser,
  revokeUserPremium: adminDeleteAPI.revokeUserPremium,
  deleteFAQ: adminDeleteAPI.deleteFAQ,
  deleteFAQCategory: adminDeleteAPI.deleteFAQCategory,
  deleteJobPost: adminDeleteAPI.deleteJobPost,
  deleteProposal: adminDeleteAPI.deleteProposal,
  deleteTemplate: adminDeleteAPI.deleteTemplate,
  deleteMilestone: adminDeleteAPI.deleteMilestone,
};

