import { savedFreelancerGetAPI } from './GET';
import { savedFreelancerPostAPI } from './POST';
import { savedFreelancerDeleteAPI } from './DELETE';

export const savedFreelancerAPI = {
  getMySavedFreelancers: savedFreelancerGetAPI.getMySavedFreelancers,
  checkSavedFreelancer: savedFreelancerGetAPI.checkSavedFreelancer,
  saveFreelancer: savedFreelancerPostAPI.saveFreelancer,
  unsaveFreelancer: savedFreelancerDeleteAPI.unsaveFreelancer,
};
