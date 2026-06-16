export interface MatchingJobPost {
  id: string;
  title: string;
  category: string;
  industry: string;
  skills: string[];
  budgetMin: number;
  budgetMax: number;
  status: 'Open' | 'Closed' | 'Draft';
  workType: 'Fixed Price';
}

export interface TalentMatchFreelancer {
  id: string;
  fullName: string;
  title: string;
  location: string;
  avatarUrl: string;
  projectBudget: number;
  category: string;
  industryExperience: string[];
  skills: string[];
  completedMilestones: number;
  anonymousRating: number;
  responseTime: string;
  availability: string;
  recentWork: string;
  invited?: boolean;
}

export interface RankedTalentMatch extends TalentMatchFreelancer {
  matchScore: number;
  skillScore: number;
  budgetScore: number;
  categoryScore: number;
  advancedScore: number;
  matchedSkills: string[];
  matchReasons: string[];
}

export const MOCK_MATCHING_JOBS: MatchingJobPost[] = [
  {
    id: 'match_job_1',
    title: 'Build SaaS Analytics Dashboard',
    category: 'Web Development',
    industry: 'SaaS',
    skills: ['React', 'TypeScript', 'Node.js', 'Chart.js', 'PostgreSQL'],
    budgetMin: 4500,
    budgetMax: 8500,
    status: 'Open',
    workType: 'Fixed Price',
  },
  {
    id: 'match_job_2',
    title: 'Mobile Booking App Redesign',
    category: 'Mobile',
    industry: 'Travel',
    skills: ['Flutter', 'Figma', 'Firebase', 'UX Research'],
    budgetMin: 3000,
    budgetMax: 6500,
    status: 'Open',
    workType: 'Fixed Price',
  },
  {
    id: 'match_job_3',
    title: 'Legacy COBOL Payroll Migration',
    category: 'Enterprise',
    industry: 'Finance',
    skills: ['COBOL', 'Mainframe', 'JCL'],
    budgetMin: 2000,
    budgetMax: 3500,
    status: 'Open',
    workType: 'Fixed Price',
  },
  {
    id: 'match_job_4',
    title: 'Closed Data Pipeline Audit',
    category: 'Data Science',
    industry: 'Logistics',
    skills: ['Python', 'Airflow', 'AWS'],
    budgetMin: 2500,
    budgetMax: 5000,
    status: 'Closed',
    workType: 'Fixed Price',
  },
];

export const MOCK_TALENT_POOL: TalentMatchFreelancer[] = [
  {
    id: 'u_freelancer_1',
    fullName: 'Alex Johnson',
    title: 'Senior React and Node.js Engineer',
    location: 'Austin, US',
    avatarUrl: 'https://i.pravatar.cc/120?img=12',
    projectBudget: 6200,
    category: 'Web Development',
    industryExperience: ['SaaS', 'FinTech', 'Analytics'],
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Chart.js', 'AWS'],
    completedMilestones: 48,
    anonymousRating: 4.9,
    responseTime: '1 hour',
    availability: 'Available this week',
    recentWork: 'Delivered BI dashboard used by 4 internal teams.',
  },
  {
    id: 'u_freelancer_2',
    fullName: 'Mina Tran',
    title: 'Product Designer and Flutter Specialist',
    location: 'Da Nang, VN',
    avatarUrl: 'https://i.pravatar.cc/120?img=32',
    projectBudget: 4800,
    category: 'Mobile',
    industryExperience: ['Travel', 'Marketplace', 'Booking'],
    skills: ['Flutter', 'Figma', 'Firebase', 'UX Research', 'Design Systems'],
    completedMilestones: 33,
    anonymousRating: 4.8,
    responseTime: '2 hours',
    availability: 'Available now',
    recentWork: 'Redesigned booking flow with 18% checkout lift.',
  },
  {
    id: 'u_freelancer_3',
    fullName: 'Marcus Rivera',
    title: 'Full-stack Analytics Developer',
    location: 'Toronto, CA',
    avatarUrl: 'https://i.pravatar.cc/120?img=15',
    projectBudget: 7600,
    category: 'Web Development',
    industryExperience: ['SaaS', 'Healthcare', 'Data Platforms'],
    skills: ['React', 'TypeScript', 'Python', 'PostgreSQL', 'D3.js', 'Node.js'],
    completedMilestones: 61,
    anonymousRating: 4.7,
    responseTime: '3 hours',
    availability: 'Starts next Monday',
    recentWork: 'Built revenue analytics workspace with role-based dashboards.',
  },
  {
    id: 'u_freelancer_4',
    fullName: 'Sarah Smith',
    title: 'Backend Engineer',
    location: 'Berlin, DE',
    avatarUrl: 'https://i.pravatar.cc/120?img=47',
    projectBudget: 5400,
    category: 'Web Development',
    industryExperience: ['E-commerce', 'SaaS'],
    skills: ['Node.js', 'PostgreSQL', 'Docker', 'Redis', 'REST API'],
    completedMilestones: 27,
    anonymousRating: 4.5,
    responseTime: '5 hours',
    availability: 'Limited availability',
    recentWork: 'Stabilized API performance for a high-traffic catalog.',
  },
  {
    id: 'u_freelancer_5',
    fullName: 'Emma Dev',
    title: 'Mobile App Engineer',
    location: 'Manila, PH',
    avatarUrl: 'https://i.pravatar.cc/120?img=25',
    projectBudget: 3900,
    category: 'Mobile',
    industryExperience: ['Travel', 'Education'],
    skills: ['Flutter', 'Firebase', 'React Native', 'Dart', 'API Integration'],
    completedMilestones: 29,
    anonymousRating: 4.6,
    responseTime: '1 day',
    availability: 'Available this week',
    recentWork: 'Launched cross-platform trip planner app.',
  },
];

export function rankTalentForJob(job: MatchingJobPost, talentPool: TalentMatchFreelancer[]): RankedTalentMatch[] {
  if (job.status !== 'Open') return [];

  return talentPool
    .map(freelancer => {
      const matchedSkills = freelancer.skills.filter(skill =>
        job.skills.some(required => required.toLowerCase() === skill.toLowerCase())
      );
      const skillScore = Math.round((matchedSkills.length / job.skills.length) * 48);
      const categoryScore = freelancer.category === job.category ? 18 : 0;
      const industryScore = freelancer.industryExperience.includes(job.industry) ? 10 : 0;
      const estimatedProjectCost = freelancer.projectBudget;
      const budgetScore = estimatedProjectCost >= job.budgetMin && estimatedProjectCost <= job.budgetMax
        ? 12
        : estimatedProjectCost < job.budgetMax * 1.2 ? 7 : 2;
      const advancedScore = Math.min(12, Math.round((freelancer.completedMilestones / 10) + freelancer.anonymousRating));
      const matchScore = Math.min(99, skillScore + categoryScore + industryScore + budgetScore + advancedScore);

      const matchReasons = [
        `${matchedSkills.length}/${job.skills.length} required skills matched`,
        freelancer.category === job.category ? 'Same delivery category' : 'Adjacent category fit',
        freelancer.industryExperience.includes(job.industry) ? `${job.industry} industry history` : 'No direct industry history',
        `${freelancer.completedMilestones} completed milestones`,
        `${freelancer.anonymousRating.toFixed(1)} anonymous rating`,
      ];

      return {
        ...freelancer,
        matchedSkills,
        skillScore,
        budgetScore,
        categoryScore,
        advancedScore,
        matchScore,
        matchReasons,
      };
    })
    .filter(match => match.matchScore >= 45 && match.matchedSkills.length > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
}
