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
  createUser: adminPostAPI.createUser,
  updateUser: adminPutAPI.updateUser,
  banUser: adminPutAPI.banUser,
  unbanUser: adminPutAPI.unbanUser,
  toggleUserActivity: adminPatchAPI.toggleUserActivity,
  deleteUser: adminDeleteAPI.deleteUser,
};
