import { portfolioGetAPI } from './GET';
import { portfolioPostAPI } from './POST';
import { portfolioPutAPI } from './PUT';
import { portfolioDeleteAPI } from './DELETE';

export { portfolioGetAPI, portfolioPostAPI, portfolioPutAPI, portfolioDeleteAPI };

export const portfolioAPI = {
  ...portfolioGetAPI,
  ...portfolioPostAPI,
  ...portfolioPutAPI,
  ...portfolioDeleteAPI,
};
