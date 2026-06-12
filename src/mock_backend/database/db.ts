import {
  DEMO_USERS,
  SEED_USERS, SEED_FREELANCER_PROFILES, SEED_CLIENT_PROFILES,
  SEED_JOBS, SEED_PROPOSALS, SEED_PROJECTS, SEED_MESSAGES,
  SEED_NOTIFICATIONS, SEED_REVIEWS, MARKET_INSIGHTS
} from './seed';
import type { User } from '../../types/models/User';
import type { FreelancerProfile, ClientProfile } from '../../types/models/Profile';
import type { Job, Proposal, Review } from '../types/legacy';
import type { Project } from '../../types/models/Project';
import type { Message, Notification } from '../../types/models/Message';

// In-memory database
const db = {
  users: [...DEMO_USERS, ...SEED_USERS] as User[],
  freelancerProfiles: [...SEED_FREELANCER_PROFILES] as FreelancerProfile[],
  clientProfiles: [...SEED_CLIENT_PROFILES] as ClientProfile[],
  jobs: [...SEED_JOBS] as Job[],
  proposals: [...SEED_PROPOSALS] as Proposal[],
  projects: [...SEED_PROJECTS] as Project[],
  messages: [...SEED_MESSAGES] as Message[],
  notifications: [...SEED_NOTIFICATIONS] as Notification[],
  reviews: [...SEED_REVIEWS] as Review[],
  marketInsights: MARKET_INSIGHTS,
};

export const DB = {
  // Users
  getUsers: () => db.users,
  getUserById: (id: string) => db.users.find(u => u.id === id),
  getUserByEmail: (email: string) => db.users.find(u => u.email === email),
  addUser: (user: User) => { db.users.push(user); return user; },

  // Freelancer Profiles
  getFreelancerProfile: (userId: string) => db.freelancerProfiles.find(p => p.user_id === userId),
  getAllFreelancerProfiles: () => db.freelancerProfiles,
  addFreelancerProfile: (profile: FreelancerProfile) => { db.freelancerProfiles.push(profile); return profile; },

  // Client Profiles
  getClientProfile: (userId: string) => db.clientProfiles.find(p => p.user_id === userId),
  addClientProfile: (profile: ClientProfile) => { db.clientProfiles.push(profile); return profile; },

  // Jobs
  getJobs: () => db.jobs,
  getJobById: (id: string) => db.jobs.find(j => j.id === id),
  getJobsByClient: (clientId: string) => db.jobs.filter(j => j.clientId === clientId),
  getOpenJobs: () => db.jobs.filter(j => j.status === 'open'),
  addJob: (job: Job) => { db.jobs.push(job); return job; },

  // Proposals
  getProposals: () => db.proposals,
  getProposalById: (id: string) => db.proposals.find(p => p.id === id),
  getProposalsByJob: (jobId: string) => db.proposals.filter(p => p.jobId === jobId),
  getProposalsByFreelancer: (freelancerId: string) => db.proposals.filter(p => p.freelancerId === freelancerId),
  addProposal: (proposal: Proposal) => { db.proposals.push(proposal); return proposal; },

  // Projects
  getProjects: () => db.projects,
  getProjectById: (id: string) => db.projects.find(p => p.id === id),
  getProjectsByClient: (clientId: string) => db.projects.filter(p => p.clientId === clientId),
  getProjectsByFreelancer: (freelancerId: string) => db.projects.filter(p => p.freelancerId === freelancerId),
  addProject: (project: Project) => { db.projects.push(project); return project; },

  // Messages
  getMessagesByConversation: (convId: string) => db.messages.filter(m => m.conversationId === convId),
  addMessage: (msg: Message) => { db.messages.push(msg); return msg; },

  // Notifications
  getNotificationsByUser: (userId: string) => db.notifications.filter(n => n.userId === userId),
  markNotificationRead: (id: string) => {
    const notif = db.notifications.find(n => n.id === id);
    if (notif) notif.isRead = true;
  },

  // Reviews
  getReviewsByUser: (userId: string) => {
    if (userId === 'all') return db.reviews;
    return db.reviews.filter(r => r.revieweeId === userId);
  },

  // Market Insights
  getMarketInsights: () => db.marketInsights,
};

export default DB;