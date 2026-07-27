import { savedJobGetAPI } from './GET';
import { savedJobPostAPI } from './POST';
import { savedJobDeleteAPI } from './DELETE';

export const savedJobAPI = {
  getMySavedJobs: savedJobGetAPI.getMySavedJobs,
  checkSavedJob: savedJobGetAPI.checkSavedJob,
  saveJob: savedJobPostAPI.saveJob,
  unsaveJob: savedJobDeleteAPI.unsaveJob,
};
