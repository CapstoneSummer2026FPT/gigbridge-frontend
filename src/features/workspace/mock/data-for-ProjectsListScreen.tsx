import type { Project } from '../../../types/models/Project';

export const MOCK_PROJECTS_FOR_PROJECTS_LIST: Project[] = [
  {
    id: 'proj_mock_1',
    jobId: 'job_1',
    clientId: 'demo_client_001',
    freelancerId: 'demo_freelancer_001',
    title: 'SaaS Analytics Dashboard',
    description: 'Build role-based analytics dashboards, billing charts, and exportable reports.',
    totalBudget: 8500,
    paidAmount: 2500,
    status: 'active',
    startDate: '2026-05-05',
    endDate: '2026-07-01',
    conversationId: 'conv_mock_1',
    progress: 42,
    milestones: [
      { id: 'pm_1', title: 'Architecture & UX flows', description: 'Confirm product flows and database plan.', amount: 2500, dueDate: '2026-05-15', status: 'paid', completedAt: '2026-05-14' },
      { id: 'pm_2', title: 'Dashboard implementation', description: 'Build charts, filters, and admin panels.', amount: 3500, dueDate: '2026-06-08', status: 'in_progress' },
      { id: 'pm_3', title: 'QA and production release', description: 'Testing, deployment, and handoff.', amount: 2500, dueDate: '2026-06-25', status: 'pending' },
    ],
  },
];

