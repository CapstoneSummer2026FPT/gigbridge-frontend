import DB from '../database/db';
import type { Job } from '../../types/models/Job';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const jobHandlers = {
  async getJobs(filters?: { category?: string; search?: string; aiRecommended?: boolean }) {
    await delay(400);
    let jobs = DB.getOpenJobs();
    if (filters?.category) jobs = jobs.filter(j => j.category === filters.category);
    if (filters?.search) jobs = jobs.filter(j => j.title.toLowerCase().includes(filters.search!.toLowerCase()));
    if (filters?.aiRecommended) jobs = jobs.filter(j => j.isAiRecommended);
    return jobs;
  },

  async getJobById(id: string) {
    await delay(200);
    const job = DB.getJobById(id);
    if (!job) throw new Error('Job not found');
    const client = DB.getUserById(job.clientId);
    const clientProfile = DB.getClientProfile(job.clientId);
    return { job, client, clientProfile };
  },

  async getClientJobs(clientId: string) {
    await delay(300);
    return DB.getJobsByClient(clientId);
  },

  async createJob(data: Partial<Job>) {
    await delay(800);
    const newJob: Job = {
      id: `job_${Date.now()}`,
      clientId: data.clientId!,
      title: data.title || '',
      description: data.description || '',
      category: data.category || '',
      skills: data.skills || [],
      budgetMin: data.budgetMin || 0,
      budgetMax: data.budgetMax || 0,
      jobType: data.jobType || 'fixed',
      experienceLevel: data.experienceLevel || 'intermediate',
      status: 'open',
      proposalCount: 0,
      viewCount: 0,
      postedAt: new Date().toISOString(),
      isRemote: data.isRemote ?? true,
      deadline: data.deadline,
    };
    return DB.addJob(newJob);
  },

  async generateAIDescription(title: string, category: string, skills: string[]): Promise<string> {
    await delay(1200);
    return `We are seeking a talented and experienced ${title} to join our growing team on a project basis.

**About the Role:**
You will be responsible for delivering high-quality work in ${category}, leveraging your expertise in ${skills.slice(0, 3).join(', ')} to help us achieve our product goals.

**Key Responsibilities:**
- Architect and implement scalable solutions using ${skills[0] || 'relevant technologies'}
- Collaborate with our cross-functional team to define technical requirements
- Deliver clean, well-documented, and tested code
- Participate in code reviews and contribute to best practices
- Communicate proactively on progress and blockers

**Requirements:**
- Proven experience with ${skills.join(', ')}
- Strong problem-solving abilities and attention to detail
- Excellent communication and ability to work independently
- Portfolio demonstrating relevant previous work

**What We Offer:**
- Competitive compensation
- Flexible remote work
- Clear milestones and timely payments
- Long-term collaboration potential`;
  },

  async applyJob(jobId: string, freelancerId: string) {
    await delay(300);
    const job = DB.getJobById(jobId);
    if (!job) throw new Error('Job not found');
    
    const freelancer = DB.getUserById(freelancerId);
    if (!freelancer) throw new Error('Freelancer not found');
    
    const gigcoinCost = job.gigcoin_cost || 0;
    if (freelancer.gigcoin_balance < gigcoinCost) {
      throw new Error('Insufficient gigcoin balance');
    }
    
    // Deduct gigcoin
    freelancer.gigcoin_balance -= gigcoinCost;
    
    return {
      success: true,
      message: `Successfully applied to job. ${gigcoinCost} gigcoin deducted.`,
      remainingBalance: freelancer.gigcoin_balance,
    };
  },
};
