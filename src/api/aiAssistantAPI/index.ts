import { aiAssistantPostAPI, type AIAssistantQueryRequest, type AIAssistantQueryResponse } from './POST';

export type { AIAssistantQueryRequest, AIAssistantQueryResponse };
export { aiAssistantPostAPI };

export const aiAssistantAPI = {
  ...aiAssistantPostAPI,
};
