import type { ProposalDto } from '../../../types/models/Proposal';

export type ProposalAttachmentViewModel = {
  propoAttach_ProposalAttachmentsId: string;
  propo_ProposalsId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
};

export type ProposalViewModel = ProposalDto & {
  updatedAt?: string;
  isAIGenerated?: boolean;
  interviewScore?: number;
  rankingScore?: number;
  boostedTokenAmount?: number;
  attachments?: ProposalAttachmentViewModel[];
};

export const MOCK_PROPOSALS: ProposalViewModel[] = [
  {
    proposalsId: 'mock_prop_1',
    jobPostsId: 'job_1',
    jobTitle: 'Web Manage SaaS',
    freelancerProfilesId: 'freelancer_1',
    freelancerName: 'Alex Johnson',
    coverLetter: 'I can build the SaaS management dashboard with React, role-based access, billing analytics, and a clean admin workflow. I have shipped similar dashboards for B2B products.',
    proposedBudget: 5200,
    proposedDuration: '21',
    status: 0,
    submittedAt: '2026-06-01T09:30:00Z',
    updatedAt: '2026-06-01T10:10:00Z',
    isAIGenerated: true,
    interviewScore: 94,
    rankingScore: 94,
    boostedTokenAmount: 0,
    attachments: [
      {
        propoAttach_ProposalAttachmentsId: 'mock_attach_1',
        propo_ProposalsId: 'mock_prop_1',
        fileName: 'Alex_Johnson_CV.pdf',
        fileUrl: '#',
        fileSize: 820000,
        createdAt: '2026-06-01T09:31:00Z',
      },
    ],
  },
  {
    proposalsId: 'mock_prop_6',
    jobPostsId: 'job_2',
    jobTitle: 'Mobile App UI Design',
    freelancerProfilesId: 'freelancer_1',
    freelancerName: 'Alex Johnson',
    coverLetter: 'I would love to help design your fintech mobile application. I have experience designing over 10+ mobile apps using Figma and modern design systems.',
    proposedBudget: 3500,
    proposedDuration: '14',
    status: 2,
    submittedAt: '2026-06-03T10:00:00Z',
    updatedAt: '2026-06-04T09:00:00Z',
    isAIGenerated: false,
    interviewScore: 89,
    rankingScore: 89,
    boostedTokenAmount: 0,
    attachments: [],
  },
  {
    proposalsId: 'mock_prop_7',
    jobPostsId: 'job_3',
    jobTitle: 'Logo Design',
    freelancerProfilesId: 'freelancer_1',
    freelancerName: 'Alex Johnson',
    coverLetter: 'I can create a unique, modern logo for your brand. Check out my portfolio for samples.',
    proposedBudget: 800,
    proposedDuration: '5',
    status: 3,
    submittedAt: '2026-06-02T14:00:00Z',
    updatedAt: '2026-06-03T16:00:00Z',
    isAIGenerated: false,
    interviewScore: 72,
    rankingScore: 72,
    boostedTokenAmount: 0,
    attachments: [],
  },
  {
    proposalsId: 'mock_prop_2',
    jobPostsId: 'job_1',
    jobTitle: 'Web Manage SaaS',
    freelancerProfilesId: 'freelancer_2',
    freelancerName: 'Sarah Chen',
    coverLetter: 'My proposal focuses on UX polish, reusable components, and fast delivery. I can provide wireframes first, then implement the full responsive frontend.',
    proposedBudget: 4800,
    proposedDuration: '18',
    status: 2,
    submittedAt: '2026-06-01T13:45:00Z',
    updatedAt: '2026-06-01T14:00:00Z',
    isAIGenerated: false,
    interviewScore: 88,
    rankingScore: 98,
    boostedTokenAmount: 10,
    attachments: [
      {
        propoAttach_ProposalAttachmentsId: 'mock_attach_2',
        propo_ProposalsId: 'mock_prop_2',
        fileName: 'Sarah_Chen_Portfolio_CV.pdf',
        fileUrl: '#',
        fileSize: 640000,
        createdAt: '2026-06-01T13:46:00Z',
      },
    ],
  },
  {
    proposalsId: 'mock_prop_5',
    jobPostsId: 'job_1',
    jobTitle: 'Web Manage SaaS',
    freelancerProfilesId: 'freelancer_5',
    freelancerName: 'David Kim',
    coverLetter: 'I specialize in SaaS infrastructure and dashboard development. I can deliver a reliable admin panel with testing, deployment, and performance monitoring.',
    proposedBudget: 6100,
    proposedDuration: '24',
    status: 0,
    submittedAt: '2026-06-02T15:25:00Z',
    updatedAt: '2026-06-02T15:25:00Z',
    isAIGenerated: false,
    interviewScore: 82,
    rankingScore: 82,
    boostedTokenAmount: 0,
    attachments: [
      {
        propoAttach_ProposalAttachmentsId: 'mock_attach_5',
        propo_ProposalsId: 'mock_prop_5',
        fileName: 'David_Kim_CV.pdf',
        fileUrl: '#',
        fileSize: 760000,
        createdAt: '2026-06-02T15:26:00Z',
      },
    ],
  },
  {
    proposalsId: 'mock_prop_3',
    jobPostsId: 'job_2',
    jobTitle: 'Mobile App UI Design',
    freelancerProfilesId: 'freelancer_3',
    freelancerName: 'Marcus Rivera',
    coverLetter: 'I will create polished mobile app screens in Figma, including design tokens, interactive prototype, and developer handoff assets.',
    proposedBudget: 1600,
    proposedDuration: '10',
    status: 0,
    submittedAt: '2026-06-02T08:15:00Z',
    updatedAt: '2026-06-02T08:15:00Z',
    isAIGenerated: true,
    interviewScore: 76,
    rankingScore: 76,
    boostedTokenAmount: 0,
    attachments: [
      {
        propoAttach_ProposalAttachmentsId: 'mock_attach_3',
        propo_ProposalsId: 'mock_prop_3',
        fileName: 'Marcus_Rivera_CV.pdf',
        fileUrl: '#',
        fileSize: 910000,
        createdAt: '2026-06-02T08:16:00Z',
      },
    ],
  },
  {
    proposalsId: 'mock_prop_4',
    jobPostsId: 'job_3',
    jobTitle: 'Logo Design',
    freelancerProfilesId: 'freelancer_4',
    freelancerName: 'Priya Patel',
    coverLetter: 'I can deliver three logo directions, brand color options, and final vector files. My process includes quick discovery and two revision rounds.',
    proposedBudget: 750,
    proposedDuration: '7',
    status: 3,
    submittedAt: '2026-06-02T11:20:00Z',
    updatedAt: '2026-06-02T12:05:00Z',
    isAIGenerated: false,
    interviewScore: 62,
    rankingScore: 62,
    boostedTokenAmount: 0,
    attachments: [],
  },
];
