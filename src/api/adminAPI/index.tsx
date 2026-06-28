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
  createUser: adminPostAPI.createUser,
  createFAQ: adminPostAPI.createFAQ,
  createFAQCategory: adminPostAPI.createFAQCategory,
  broadcastNotification: adminPostAPI.broadcastNotification,
  updateUser: adminPutAPI.updateUser,
  updateFAQ: adminPutAPI.updateFAQ,
  updateFAQCategory: adminPutAPI.updateFAQCategory,
  banUser: adminPutAPI.banUser,
  unbanUser: adminPutAPI.unbanUser,
  toggleUserActivity: adminPatchAPI.toggleUserActivity,
  toggleFAQActivity: adminPatchAPI.toggleFAQActivity,
  toggleFAQCategoryActivity: adminPatchAPI.toggleFAQCategoryActivity,
  reviewCheatingViolation: adminPatchAPI.reviewCheatingViolation,
  deleteUser: adminDeleteAPI.deleteUser,
  deleteFAQ: adminDeleteAPI.deleteFAQ,
  deleteFAQCategory: adminDeleteAPI.deleteFAQCategory,
};
