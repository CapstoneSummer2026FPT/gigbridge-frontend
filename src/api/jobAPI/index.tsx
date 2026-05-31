export { jobGetAPI } from './GET';
export { jobPostAPI } from './POST';
export { jobPutAPI } from './PUT';

import { jobGetAPI } from './GET';
import { jobPostAPI } from './POST';
import { jobPutAPI } from './PUT';

export const jobAPI = {
  getPublicJobPosts: jobGetAPI.getPublicJobPosts,
  getJobPostDetail: jobGetAPI.getJobPostDetail,
  getAllJobPosts: jobGetAPI.getAllJobPosts,
  getMyJobPosts: jobGetAPI.getMyJobPosts,
  getMyAppliedJobPosts: jobGetAPI.getMyAppliedJobPosts,
  createJobPost: jobPostAPI.createJobPost,
  put: jobPutAPI,
};
