import { apiService } from '../service/apiService';
import type { ApiResponse } from '../types/common';

export interface AIAssistantQueryRequest {
  question: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  collectionName?: string;
  style?: 'precision' | 'fast';
}

export interface AIAssistantQueryResponse {
  answer: string;
}

export const aiAssistantAPI = {
  query: async (payload: AIAssistantQueryRequest): Promise<ApiResponse<AIAssistantQueryResponse>> => {
    return apiService.post<AIAssistantQueryResponse>('ai-assistant/query', payload);
  },
};
