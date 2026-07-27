import { jobGetAPI } from './GET';
import { jobPostAPI } from './POST';
import { jobPutAPI } from './PUT';
import { jobPatchAPI } from './PATCH';
import { jobDeleteAPI } from './DELETE';

export const jobAPI = {
  getMajors: jobGetAPI.getMajors,
  getCategoriesByMajor: jobGetAPI.getCategoriesByMajor,
  getSkillsByCategory: jobGetAPI.getSkillsByCategory,
  getMyJobPostById: jobGetAPI.getMyJobPostById,
  getMyJobPosts: jobGetAPI.getMyJobPosts,
  getJobPromotionPolicy: jobGetAPI.getJobPromotionPolicy,
  getJobPromotionFeed: jobGetAPI.getJobPromotionFeed,
  getMyDraftJobPosts: jobGetAPI.getMyDraftJobPosts,
  getJobPostQuestions: jobGetAPI.getJobPostQuestions,
  createDraftJobPost: jobPostAPI.createDraftJobPost,
  createJobPostQuestion: jobPostAPI.createJobPostQuestion,
  generateAIDescription: jobPostAPI.generateAIDescription,
  promoteJobPost: jobPostAPI.promoteJobPost,
  uploadJobPromotionImage: jobPostAPI.uploadJobPromotionImage,
  trackJobPromotionImpression: jobPostAPI.trackJobPromotionImpression,
  trackJobPromotionClick: jobPostAPI.trackJobPromotionClick,
  createAiInterview: jobPostAPI.createAiInterview,
  updateJobPost: jobPutAPI.updateJobPost,
  saveDraftJobPost: jobPutAPI.saveDraftJobPost,
  updateJobPostQuestionRequired: jobPatchAPI.updateJobPostQuestionRequired,
  updateBulkJobPostQuestions: jobPatchAPI.updateBulkJobPostQuestions,
  updateJobPostStatus: jobPatchAPI.updateJobPostStatus,
  updateJobPostVisibility: jobPatchAPI.updateJobPostVisibility,
  deleteEmptyDraftJobPost: jobDeleteAPI.deleteEmptyDraftJobPost,
  deleteJobPostQuestion: jobDeleteAPI.deleteJobPostQuestion,
};
