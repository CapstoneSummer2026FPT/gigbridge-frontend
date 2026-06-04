export type FAQStatus = 'published' | 'draft';

export interface FAQCategoryRecord {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface FAQArticleRecord {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  status: FAQStatus;
  updatedAt: string;
}

export const FAQ_MANAGEMENT_CATEGORIES: FAQCategoryRecord[] = [
  { id: 'cat_getting_started', name: 'Getting Started', description: 'Account setup, onboarding, and first steps.', order: 1 },
  { id: 'cat_freelancers', name: 'For Freelancers', description: 'Guidance for finding work and getting paid.', order: 2 },
  { id: 'cat_clients', name: 'For Clients', description: 'Guidance for hiring and managing projects.', order: 3 },
  { id: 'cat_payments', name: 'Payments & Billing', description: 'Fees, refunds, escrow, and billing questions.', order: 4 },
  { id: 'cat_ai', name: 'AI Features', description: 'AI assistant, matching, interviews, and privacy.', order: 5 },
  { id: 'cat_security', name: 'Security & Support', description: 'Trust, safety, support, and account protection.', order: 6 },
];

export const FAQ_MANAGEMENT_ARTICLES: FAQArticleRecord[] = [
  {
    id: 'faq_001',
    categoryId: 'cat_getting_started',
    title: 'How do I create an account?',
    content: 'Click "Start as Freelancer" or "Hire Top Talent" on the homepage. You will be guided through signup, role selection, profile setup, and email verification.',
    status: 'published',
    updatedAt: '2026-05-20T09:00:00Z',
  },
  {
    id: 'faq_002',
    categoryId: 'cat_getting_started',
    title: 'Is GigBridge free to use?',
    content: 'Creating an account and browsing jobs or talent is free. GigBridge charges service fees when a project is successfully completed, and offers Pro features through subscription plans.',
    status: 'published',
    updatedAt: '2026-05-20T09:10:00Z',
  },
  {
    id: 'faq_003',
    categoryId: 'cat_freelancers',
    title: 'How do I get more job matches?',
    content: 'Complete your profile, add portfolio work, verify skills, and maintain strong ratings. Complete and high-quality profiles are prioritized in matching.',
    status: 'published',
    updatedAt: '2026-05-21T10:15:00Z',
  },
  {
    id: 'faq_004',
    categoryId: 'cat_freelancers',
    title: 'What is the AI Proposal Generator?',
    content: 'The AI Proposal Generator analyzes job descriptions and profile data to draft tailored proposals. Premium users can refine and reuse generated proposal formats.',
    status: 'draft',
    updatedAt: '2026-05-28T13:20:00Z',
  },
  {
    id: 'faq_005',
    categoryId: 'cat_clients',
    title: 'How do I find the right freelancer?',
    content: 'Post a clear job description, review AI-ranked candidates, compare profiles, and invite shortlisted freelancers to interview.',
    status: 'published',
    updatedAt: '2026-05-22T08:45:00Z',
  },
  {
    id: 'faq_006',
    categoryId: 'cat_clients',
    title: 'How does payment protection work?',
    content: 'Client funds are held in escrow and released when milestones are approved. Disputes can be raised if delivered work does not match contract requirements.',
    status: 'published',
    updatedAt: '2026-05-22T08:55:00Z',
  },
  {
    id: 'faq_007',
    categoryId: 'cat_payments',
    title: 'What payment methods do you accept?',
    content: 'GigBridge supports major cards, bank transfers, and configured local payment methods depending on region and account settings.',
    status: 'published',
    updatedAt: '2026-05-23T11:00:00Z',
  },
  {
    id: 'faq_008',
    categoryId: 'cat_ai',
    title: 'Is my data used to train the AI?',
    content: 'GigBridge uses privacy-preserving signals to improve AI workflows. Private messages and proprietary work are not exposed publicly.',
    status: 'draft',
    updatedAt: '2026-05-29T15:35:00Z',
  },
  {
    id: 'faq_009',
    categoryId: 'cat_security',
    title: 'How do I report a scam or fraud?',
    content: 'Use the report action on jobs, profiles, messages, or transactions. The trust and safety workflow will review the report and apply enforcement if needed.',
    status: 'published',
    updatedAt: '2026-05-24T14:25:00Z',
  },
];
