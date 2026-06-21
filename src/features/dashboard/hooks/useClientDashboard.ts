import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { jobGetAPI } from '../../../api/jobAPI/GET';
import { projectGetAPI } from '../../../api/projectAPI/GET';
import { walletGetAPI, type WalletResponse } from '../../../api/walletAPI/GET';
import type { Job } from '../../../types/models/Job';
import { ProposalStatus, type ProposalDto } from '../../../types/models/Proposal';

// ── Static fallback chart data ─────────────────────────────────
const SPEND_DATA_FALLBACK = [
  { id: 'client-oct', month: 'Oct', spend: 0 },
  { id: 'client-nov', month: 'Nov', spend: 0 },
  { id: 'client-dec', month: 'Dec', spend: 0 },
  { id: 'client-jan', month: 'Jan', spend: 0 },
  { id: 'client-feb', month: 'Feb', spend: 0 },
  { id: 'client-mar', month: 'Mar', spend: 0 },
];

const AI_SUGGESTIONS = [
  { title: 'Senior React Developer', match: '96%', budget: '$5,000–$8,000', skills: ['React', 'TypeScript', 'Next.js'], urgency: 'High demand' },
  { title: 'DevOps Engineer', match: '88%', budget: '$4,000–$7,000', skills: ['Kubernetes', 'AWS', 'Docker'], urgency: 'Trending' },
];

const ELITE_MATCHES = [
  {
    id: 'candidate_1',
    name: 'Alex Johnson',
    title: 'Principal UX Architect',
    details: 'Former Google • 8+ years exp',
    match: '98%',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBaTivKd3JT7pc3eXVToN5dYaVNc4tdof8D-jlDZvD2PnJ4x7FO06wVprOq7IwvTzQ43gMMTDr6X8J-RkeGrHO0CrpIV-6rYF0e6cy33MDXlIXUTmPn_Egw_KU6u4B2ChCy85RHgbEDKhzCLmLdfxZbGYRQJhtxnA0e-5uA_dbZf4tpHj6TY0FPmNuCUf7A0Tk_1I5sk8iYDYMO6CkbAycrlLxmjIDuVy04wWVbQriekU_-4PrhL7GWDHU-S9NunzBDTqNFafavjPFk',
    tags: ['ELITE TALENT', 'READY TO INTERVIEW']
  },
  {
    id: 'candidate_2',
    name: 'Sarah Chen',
    title: 'Senior React Developer',
    details: 'Former Airbnb • Next.js Core Contributor',
    match: '96%',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCdLF72GSJAKTKAXQJTmZPrytHCNef0EG6PBa8RxPaGWZgX7RUdjbX130CZ1pIpbSfMGEx3KmopHX4jgiUbvhq6B5TXukEAT_AIiPOGs1SN4BRjDw61FLdp7frEThStyzCBbY7xelVeQlLA_EORhwu3gKWwfg9K26LgEOXbaWEpWdbw5ERIR1Eam3X2TJd6HMAqxsgwJuDdY-t9Dje5H0mM4kqDh2NfF7j8H4TnEPcCHTTrJnt8V3uQVeztENLHWLKKQk05XkftCx_j',
    tags: ['TOP 1%', 'DESIGN SYSTEMS']
  },
  {
    id: 'candidate_3',
    name: 'Marcus Rivera',
    title: 'Lead AI Engineer',
    details: 'Former OpenAI Researcher • PyTorch Expert',
    match: '94%',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCt226TXncFjd6zQyyFNqkOAKj-pTYClfBHUGbG7EsCTL5gzWQbF5K-mojkZ1u9U91izwjnV--bOtLgKPwMjODHfOuVpg5nOAxiXsve-4RdrP3GeYe6L9llw_G0e7TExXaCWHruulVFEUP-acilXdvARPO-JVC17ShH6ztqc9CUYzp9r2Duy95bm3YrKoT0XmazmW2mgGKr4H_BYRs6iYRH0ATn2UaEHxrBE1AFiTPLNgtYDGnskVHrXWmKPI5nDsP3KsJHRYgTs29I',
    tags: ['AI CHAMPION', 'FAST TRACK']
  },
];

/**
 * Custom hook to abstract all data fetching, logic, and state management
 * for the Client Dashboard Screen.
 *
 * API Integrations:
 * - GET /api/JobPosts/my-jobs           → client's own job posts
 * - GET /api/Proposals (via job)        → pending proposals count
 * - GET /api/projects (mock)            → active projects
 * - GET /api/wallet                     → wallet balance for spend chart
 */
export function useClientDashboard() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { t } = useTranslation();

  // ── UI state ─────────────────────────────────────────────────
  const [chartPeriod, setChartPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // ── Remote data state ────────────────────────────────────────
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [proposals, setProposals] = useState<ProposalDto[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch all dashboard data ──────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      jobGetAPI.getClientJobs(),
      projectGetAPI.getProjects({ clientId: user?.id }),
      walletGetAPI.getMyWallet(),
    ]);

    // My job posts
    if (results[0].status === 'fulfilled') {
      setMyJobs(results[0].value);
    }

    // Projects (mock returns raw array)
    if (results[1].status === 'fulfilled') {
      const raw = results[1].value as any;
      const arr = Array.isArray(raw) ? raw : (raw?.data ?? []);
      setProjects(arr);
    }

    // Wallet
    if (results[2].status === 'fulfilled' && results[2].value.success && results[2].value.data) {
      setWallet(results[2].value.data);
    }

    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Derived / memoized values ─────────────────────────────────

  // Greeting by local hour
  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return t('dashboard.goodMorning', 'Good morning,');
    if (hours < 18) return t('dashboard.goodAfternoon', 'Good afternoon,');
    return t('dashboard.goodEvening', 'Good evening,');
  }, [t]);

  // Pending proposals derived from proposal list (populated lazily for each job)
  const pendingProposals = useMemo(() =>
    proposals.filter(p => p.status === ProposalStatus.Pending || p.status === 1)
  , [proposals]);

  // Spend chart — use wallet transaction history if available, else fallback
  const spendChartData = useMemo(() => {
    if (chartPeriod === 'yearly') {
      return [
        { id: 'y-2022', month: '2022', spend: 95000 },
        { id: 'y-2023', month: '2023', spend: 145000 },
        { id: 'y-2024', month: '2024', spend: 182000 },
        { id: 'y-2025', month: '2025', spend: 228000 },
        { id: 'y-2026', month: '2026 YTD', spend: wallet ? Math.floor(wallet.heldVnd / 100) : 98000 },
      ];
    }
    return SPEND_DATA_FALLBACK;
  }, [chartPeriod, wallet]);

  // Static activity feed (can be replaced with notification API later)
  const recentActivity = useMemo(() => [
    { id: 'act_1', text: 'Milestone submission received for review', time: '2h ago', iconType: 'CheckCircle' },
    { id: 'act_2', text: 'New proposal received on your job post', time: '5h ago', iconType: 'FileText' },
    { id: 'act_3', text: 'AI found 3 new talent matches', time: '8h ago', iconType: 'Bot' },
    { id: 'act_4', text: 'Payment released from escrow', time: '1d ago', iconType: 'DollarSign' },
  ], []);

  // Load proposals lazily when we have jobs (fetch per first job to get pending count)
  const loadProposalsForJobs = useCallback(async () => {
    if (myJobs.length === 0) return;
    const { proposalGetAPI: pAPI } = await import('../../../api/proposalAPI/GET');
    // Aggregate proposals from all jobs (first page only for perf)
    const allResults = await Promise.allSettled(
      myJobs.slice(0, 5).map(j => pAPI.getProposalsByJobPost(j.id))
    );
    const combined: ProposalDto[] = allResults
      .filter(r => r.status === 'fulfilled' && r.value.success && r.value.data)
      .flatMap(r => (r as PromiseFulfilledResult<any>).value.data);
    setProposals(combined);
  }, [myJobs]);

  useEffect(() => {
    if (myJobs.length > 0) {
      loadProposalsForJobs();
    }
  }, [myJobs, loadProposalsForJobs]);

  return {
    user,
    greeting,
    t,
    navigate,

    // Loading & error
    isLoading,
    error,
    refetch: fetchDashboardData,

    // Data
    wallet,
    chartPeriod,
    setChartPeriod,
    myJobs,
    pendingProposals,
    projects,
    spendChartData,
    recentActivity,
    aiSuggestions: AI_SUGGESTIONS,
    eliteMatches: ELITE_MATCHES,
  };
}
