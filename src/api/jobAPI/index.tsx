export { jobGetAPI } from './GET';
export { jobPostAPI } from './POST';
export { jobPutAPI } from './PUT';
export { jobPatchAPI } from './PATCH';
export { jobDeleteAPI } from './DELETE';

import { jobGetAPI } from './GET';
import { jobPostAPI } from './POST';
import { jobPutAPI } from './PUT';
import { jobPatchAPI } from './PATCH';
import { jobDeleteAPI } from './DELETE';

export const jobAPI = {
  getMajors: jobGetAPI.getMajors,
  getMajorCategories: jobGetAPI.getMajorCategories,
  getCategoriesByMajor: jobGetAPI.getCategoriesByMajor,
  getSkillsByCategory: jobGetAPI.getSkillsByCategory,
  getPublicJobPosts: jobGetAPI.getPublicJobPosts,
  getPublicJobById: jobGetAPI.getPublicJobById,
  getJobPostDetail: jobGetAPI.getJobPostDetail,
  getMyJobPostById: jobGetAPI.getMyJobPostById,
  getAllJobPosts: jobGetAPI.getAllJobPosts,
  getMyJobPosts: jobGetAPI.getMyJobPosts,
  getMyDraftJobPosts: jobGetAPI.getMyDraftJobPosts,
  getMyAppliedJobPosts: jobGetAPI.getMyAppliedJobPosts,
  getJobPostQuestions: jobGetAPI.getJobPostQuestions,
  createJobPost: jobPostAPI.createJobPost,
  createDraftJobPost: jobPostAPI.createDraftJobPost,
  createJobPostQuestion: jobPostAPI.createJobPostQuestion,
  createBulkJobPostQuestions: jobPostAPI.createBulkJobPostQuestions,
  generateAIDescription: jobPostAPI.generateAIDescription,
  updateJobPost: jobPutAPI.updateJobPost,
  saveDraftJobPost: jobPutAPI.saveDraftJobPost,
  updateJobPostQuestion: jobPatchAPI.updateJobPostQuestion,
  updateJobPostQuestionRequired: jobPatchAPI.updateJobPostQuestionRequired,
  updateBulkJobPostQuestions: jobPatchAPI.updateBulkJobPostQuestions,
  updateJobPostStatus: jobPatchAPI.updateJobPostStatus,
  updateJobPostVisibility: jobPatchAPI.updateJobPostVisibility,
  deleteEmptyDraftJobPost: jobDeleteAPI.deleteEmptyDraftJobPost,
  deleteJobPostQuestion: jobDeleteAPI.deleteJobPostQuestion,
  put: jobPutAPI,
  patch: jobPatchAPI,
  delete: jobDeleteAPI,
};
