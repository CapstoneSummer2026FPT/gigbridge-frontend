import type React from 'react';
import { BarChart2, Code, FileText, Lightbulb, ShieldCheck } from 'lucide-react';

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

export interface AIAssistantCapability {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: React.ReactNode;
  accent: 'cyan' | 'purple' | 'green' | 'amber';
}

export const AI_ASSISTANT_DISCLAIMER =
  'AI-generated content is for work guidance only. Review important details before sending or making decisions.';

export const AI_ASSISTANT_CAPABILITIES: AIAssistantCapability[] = [
  {
    id: 'proposal',
    title: 'Proposal Writer',
    description: 'Draft concise proposals with scope, timeline, and value points.',
    prompt: 'Write a polished proposal for a React dashboard project with a 3-week timeline.',
    icon: <FileText size={18} />,
    accent: 'cyan',
  },
  {
    id: 'code',
    title: 'Code Review',
    description: 'Find risks, edge cases, and clearer implementation options.',
    prompt: 'Review this frontend implementation plan and list the highest-risk issues.',
    icon: <Code size={18} />,
    accent: 'purple',
  },
  {
    id: 'insights',
    title: 'Work Insights',
    description: 'Summarize progress, blockers, and next actions for active work.',
    prompt: 'Create a project status update for a client, including progress, blockers, and next steps.',
    icon: <BarChart2 size={18} />,
    accent: 'green',
  },
  {
    id: 'advisor',
    title: 'Skill Advisor',
    description: 'Suggest practical skills and portfolio improvements.',
    prompt: 'Suggest the next 3 skills I should learn as a freelance frontend developer.',
    icon: <Lightbulb size={18} />,
    accent: 'amber',
  },
  {
    id: 'quality',
    title: 'Quality Guard',
    description: 'Check tone, professionalism, and missing contract details.',
    prompt: 'Improve this message so it is professional, clear, and ready to send to a client.',
    icon: <ShieldCheck size={18} />,
    accent: 'cyan',
  },
];

export const AI_ASSISTANT_STARTER_PROMPTS = [
  'Draft a client-friendly project update for this week.',
  'Help me compare two freelancer proposals objectively.',
  'Write a job post for a senior React and Node.js developer.',
  'Improve my proposal cover letter and make it more specific.',
  'Create interview questions for a mobile developer candidate.',
];

export function createInitialAssistantMessage(firstName: string): AIAssistantMessage {
  return {
    id: 'ai_welcome',
    role: 'assistant',
    type: 'text',
    content: `Hi ${firstName}. I can help with proposals, job posts, project updates, interview questions, code review, and work decisions. Share what you are working on and I will keep the context during this session.`,
    createdAt: new Date().toISOString(),
    tokenEstimate: 44,
  };
}

export function estimateTokenUsage(text: string): number {
  return Math.max(8, Math.ceil(text.trim().split(/\s+/).length * 1.35));
}

export function buildMockAIResponse(prompt: string, userRole: string): Pick<AIAssistantMessage, 'content' | 'type'> {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('proposal')) {
    return {
      type: 'proposal',
      content: `Here is a stronger proposal draft:\n\nHello, I reviewed your project requirements and I can help deliver a clean, reliable solution with clear milestones.\n\nMy approach:\n1. Confirm scope, user flows, and success criteria.\n2. Build the core experience first, then refine performance and responsive behavior.\n3. Share progress frequently so feedback is handled early.\n\nEstimated delivery: 2-3 weeks depending on final scope.\n\nI would be glad to discuss the details and suggest the most practical implementation path.`,
    };
  }

  if (lowerPrompt.includes('job post') || lowerPrompt.includes('hiring') || lowerPrompt.includes('candidate')) {
    return {
      type: 'checklist',
      content: `Recommended hiring structure:\n\n1. Start with the business outcome, not only the tech stack.\n2. List 4-6 required skills and separate nice-to-have skills.\n3. Add deliverables, timeline, budget range, and communication expectations.\n4. Ask applicants for one relevant example and a short implementation plan.\n\nFor a ${userRole}, this keeps the post clear enough to attract qualified freelancers and filter weak proposals faster.`,
    };
  }

  if (lowerPrompt.includes('status') || lowerPrompt.includes('update') || lowerPrompt.includes('progress')) {
    return {
      type: 'analysis',
      content: `Client-ready update:\n\nProgress: The main workflow is moving forward and the current implementation is focused on the highest-impact user path.\n\nCompleted: Core layout, key states, and initial validation logic.\n\nNext steps: Polish edge cases, test responsive behavior, and verify the final flow against requirements.\n\nRisk: Any scope change should be confirmed early so timeline and budget stay realistic.`,
    };
  }

  if (lowerPrompt.includes('skill') || lowerPrompt.includes('learn') || lowerPrompt.includes('career')) {
    return {
      type: 'analysis',
      content: `Practical skill plan:\n\n1. AI API integration: prompt design, streaming responses, token tracking, and error handling.\n2. Production frontend quality: accessibility, performance, state management, and test coverage.\n3. Backend collaboration: API contracts, authentication flow, file upload, and real-time events.\n\nThese skills make your portfolio stronger because they map directly to paid product work.`,
    };
  }

  return {
    type: 'text',
    content: `Based on the current context, I recommend turning the request into a small decision-ready plan:\n\n1. Define the user outcome.\n2. Identify the data needed and the validation rules.\n3. Choose the smallest UI flow that completes the task.\n4. Add clear error states and a review step before final delivery.\n\nSend me the exact job, proposal, contract, or message you are working on and I can make it more specific.`,
  };
}
