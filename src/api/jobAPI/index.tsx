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
  getPublicJobPosts: jobGetAPI.getPublicJobPosts,
  getJobPostDetail: jobGetAPI.getJobPostDetail,
  getAllJobPosts: jobGetAPI.getAllJobPosts,
  getMyJobPosts: jobGetAPI.getMyJobPosts,
  getMyAppliedJobPosts: jobGetAPI.getMyAppliedJobPosts,
  getJobPostQuestions: jobGetAPI.getJobPostQuestions,
  createJobPost: jobPostAPI.createJobPost,
  createDraftJobPost: jobPostAPI.createDraftJobPost,
  createJobPostQuestion: jobPostAPI.createJobPostQuestion,
  createBulkJobPostQuestions: jobPostAPI.createBulkJobPostQuestions,
  updateJobPost: jobPutAPI.updateJobPost,
  updateJobPostQuestion: jobPatchAPI.updateJobPostQuestion,
  updateJobPostQuestionRequired: jobPatchAPI.updateJobPostQuestionRequired,
  updateBulkJobPostQuestions: jobPatchAPI.updateBulkJobPostQuestions,
  updateJobPostStatus: jobPatchAPI.updateJobPostStatus,
  updateJobPostVisibility: jobPatchAPI.updateJobPostVisibility,
  deleteJobPostQuestion: jobDeleteAPI.deleteJobPostQuestion,
  put: jobPutAPI,
  patch: jobPatchAPI,
  delete: jobDeleteAPI,
};
