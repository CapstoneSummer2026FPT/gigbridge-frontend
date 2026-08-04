import { workExperienceGetAPI } from './GET';
import { workExperiencePostAPI } from './POST';
import { workExperiencePutAPI } from './PUT';
import { workExperienceDeleteAPI } from './DELETE';

export { workExperienceGetAPI, workExperiencePostAPI, workExperiencePutAPI, workExperienceDeleteAPI };

export const workExperienceAPI = {
  ...workExperienceGetAPI,
  ...workExperiencePostAPI,
  ...workExperiencePutAPI,
  ...workExperienceDeleteAPI,
};
