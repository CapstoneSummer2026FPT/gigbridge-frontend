export type AIAssistantMessageRole = 'user' | 'assistant';
export type AIAssistantMessageType = 'text' | 'proposal' | 'analysis' | 'checklist';

export interface AIAssistantMessage {
  id: string;
  role: AIAssistantMessageRole;
  content: string;
  type: AIAssistantMessageType;
  createdAt: string;
  tokenEstimate: number;
}

export const AI_ASSISTANT_DISCLAIMER =
  'AI-generated content is for work guidance only. Review important details before sending or making decisions.';

export const estimateTokenUsage = (text: string): number =>
  Math.max(8, Math.ceil(text.trim().split(/\s+/).length * 1.35));
