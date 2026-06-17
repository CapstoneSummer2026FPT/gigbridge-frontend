export { jobGetAPI } from './GET';
export { jobPostAPI } from './POST';
export { jobPutAPI } from './PUT';
export { jobQuestionAPI } from './QUESTIONS';

import { jobGetAPI } from './GET';
import { jobPostAPI } from './POST';
import { jobPutAPI } from './PUT';
import { jobQuestionAPI } from './QUESTIONS';

export const jobAPI = {
  getPublicJobPosts: jobGetAPI.getPublicJobPosts,
  getJobPostDetail: jobGetAPI.getJobPostDetail,
  getAllJobPosts: jobGetAPI.getAllJobPosts,
  getMyJobPosts: jobGetAPI.getMyJobPosts,
  getMyAppliedJobPosts: jobGetAPI.getMyAppliedJobPosts,
  createJobPost: jobPostAPI.createJobPost,
  put: jobPutAPI,
  questions: jobQuestionAPI,
};
