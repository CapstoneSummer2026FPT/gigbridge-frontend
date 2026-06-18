export { jobGetAPI } from './GET';
export { jobPostAPI } from './POST';
export { jobPutAPI } from './PUT';
export { jobQuestionAPI } from './QUESTIONS';
export { jobPatchAPI } from './PATCH';
export { jobDeleteAPI } from './DELETE';

import { jobGetAPI } from './GET';
import { jobPostAPI } from './POST';
import { jobPutAPI } from './PUT';
import { jobQuestionAPI } from './QUESTIONS';
import { jobPatchAPI } from './PATCH';
import { jobDeleteAPI } from './DELETE';

export const jobAPI = {
  getPublicJobPosts: jobGetAPI.getPublicJobPosts,
  getPublicJobById: jobGetAPI.getPublicJobById,
  getJobPostDetail: jobGetAPI.getJobPostDetail,
  getMyJobPostById: jobGetAPI.getMyJobPostById,
  getAllJobPosts: jobGetAPI.getAllJobPosts,
  getMyJobPosts: jobGetAPI.getMyJobPosts,
  getMyAppliedJobPosts: jobGetAPI.getMyAppliedJobPosts,
  getJobPostQuestions: jobGetAPI.getJobPostQuestions,
  getJobs: jobGetAPI.getJobs,
  getJobById: jobGetAPI.getJobById,
  getClientJobById: jobGetAPI.getClientJobById,
  getClientJobs: jobGetAPI.getClientJobs,
  createJobPost: jobPostAPI.createJobPost,
  createDraftJobPost: jobPostAPI.createDraftJobPost,
  createJobPostQuestion: jobPostAPI.createJobPostQuestion,
  createBulkJobPostQuestions: jobPostAPI.createBulkJobPostQuestions,
  createJob: jobPostAPI.createJob,
  generateAIDescription: jobPostAPI.generateAIDescription,
  applyJob: jobPostAPI.applyJob,
  updateJobPost: jobPutAPI.updateJobPost,
  updateJobPostQuestion: jobPatchAPI.updateJobPostQuestion,
  updateJobPostQuestionRequired: jobPatchAPI.updateJobPostQuestionRequired,
  updateBulkJobPostQuestions: jobPatchAPI.updateBulkJobPostQuestions,
  updateJobPostStatus: jobPatchAPI.updateJobPostStatus,
  updateJobPostVisibility: jobPatchAPI.updateJobPostVisibility,
  deleteJobPostQuestion: jobDeleteAPI.deleteJobPostQuestion,
  put: jobPutAPI,
  questions: jobQuestionAPI,
  patch: jobPatchAPI,
  delete: jobDeleteAPI,
};