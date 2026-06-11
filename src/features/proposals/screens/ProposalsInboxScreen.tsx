import { useApp } from '../../../app/providers/AppProvider';
import ClientProposalsScreen from './ClientProposalsScreen';
import FreelancerProposalsScreen from './FreelancerProposalsScreen';

export default function ProposalsInboxScreen() {
  const { user, role } = useApp();
  const [proposals, setProposals] = useState<ProposalViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [managingJob, setManagingJob] = useState<JobProposalGroup | null>(null);
  const [proposalStatusFilter, setProposalStatusFilter] = useState<ProposalStatusFilter>('all');
  const [proposalSortBy, setProposalSortBy] = useState<ProposalSortBy>('interviewScore');
  const [proposalDetail, setProposalDetail] = useState<{ proposal: ProposalViewModel; mode: ProposalDetailMode } | null>(null);
  const [createContractProposal, setCreateContractProposal] = useState<ProposalViewModel | null>(null);
  const [isPremiumFreelancer] = useState(true);
  const [tokenBalance, setTokenBalance] = useState(120);
  const [boostAmount, setBoostAmount] = useState(10);
  const [boostError, setBoostError] = useState('');
  const [boostSuccess, setBoostSuccess] = useState('');
  const [competitionJob, setCompetitionJob] = useState<JobProposalGroup | null>(null);
  const [competitionError, setCompetitionError] = useState('');
  const [jobMenuOpen, setJobMenuOpen] = useState<string | null>(null);
  const [proposalsPerPage, setProposalsPerPage] = useState(10);
  const [currentProposalPage, setCurrentProposalPage] = useState(1);
  const [showToolbars, setShowToolbars] = useState(true);
  const proposalCardsRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);

  const isClient = role === 0;

  // Fetch proposals
  useEffect(() => {
    const fetchProposals = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const response = isClient
          ? await proposalGetAPI.getClientAllProposals()
          : await proposalGetAPI.getMyProposals();
        setProposals(response.data?.length ? response.data.map((proposal, index) => ({
          ...proposal,
          updatedAt: proposal.reviewedAt || proposal.submittedAt,
          isAIGenerated: index % 2 === 0,
          interviewScore: Math.max(58, 96 - index * 7),
          rankingScore: Math.max(58, 96 - index * 7),
          boostedTokenAmount: 0,
          attachments: [
            {
              propoAttach_ProposalAttachmentsId: `api_attach_${proposal.proposalsId}`,
              propo_ProposalsId: proposal.proposalsId,
              fileName: `${proposal.freelancerName || 'Freelancer'}_CV.pdf`,
              fileUrl: '#',
              fileSize: 700000 + index * 42000,
              createdAt: proposal.submittedAt,
            },
          ],
        })) : MOCK_PROPOSALS);
      } catch (error) {
        console.error('Failed to fetch proposals:', error);
        setProposals(MOCK_PROPOSALS);
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, [user, isClient]);

  // Scroll detection for showing/hiding toolbars
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      if (!target) return;

      const currentScrollY = target.scrollTop;
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      if (scrollDelta < -5) {
        setShowToolbars(true);
      } else if (scrollDelta > 5) {
        setShowToolbars(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    const element = proposalCardsRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [managingJob]);

  // Group proposals by job
  const jobGroups = useMemo<JobProposalGroup[]>(() => {
    const groups = new Map<string, JobProposalGroup>();

    proposals.forEach(proposal => {
      const id = proposal.jobPostsId || 'unknown-job';
      const current = groups.get(id);

      if (current) {
        current.proposals.push(proposal);
        return;
      }

      groups.set(id, {
        jobPostsId: id,
        jobTitle: proposal.jobTitle || 'Untitled JobPost',
        proposals: [proposal],
      });
    });

    return Array.from(groups.values()).sort((a, b) => b.proposals.length - a.proposals.length);
  }, [proposals]);

  // Update proposal status
  const updateProposalStatus = async (proposalId: string, status: ProposalStatusValue) => {
    try {
      await proposalPutAPI.updateProposalStatus(proposalId, Number(status));
      setProposals(prev =>
        prev.map(proposal =>
          proposal.proposalsId === proposalId
            ? { ...proposal, status, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            : proposal
        )
      );
    } catch (error) {
      console.error('Failed to update proposal status:', error);
    }
  };

  // Filter and sort managing proposals
  const visibleManagingProposals = useMemo(() => {
    const items = managingJob?.proposals || [];
    const filtered = proposalStatusFilter === 'all'
      ? items
      : items.filter(proposal => String(proposal.status) === proposalStatusFilter);

    return [...filtered].sort((a, b) => {
      if ((a.boostedTokenAmount || 0) !== (b.boostedTokenAmount || 0)) return (b.boostedTokenAmount || 0) - (a.boostedTokenAmount || 0);
      if (proposalSortBy === 'interviewScore') return (b.interviewScore || 0) - (a.interviewScore || 0);
      if (proposalSortBy === 'status') return Number(a.status) - Number(b.status);
      if (proposalSortBy === 'rate') return (b.proposedRate || 0) - (a.proposedRate || 0);
      return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
    });
  }, [managingJob, proposalSortBy, proposalStatusFilter]);

  // Paginate proposals
  const paginatedProposals = useMemo(() => {
    const start = (currentProposalPage - 1) * proposalsPerPage;
    const end = start + proposalsPerPage;
    return visibleManagingProposals.slice(start, end);
  }, [visibleManagingProposals, currentProposalPage, proposalsPerPage]);

  const totalProposalPages = Math.ceil(visibleManagingProposals.length / proposalsPerPage);

  const handleProposalsPerPageChange = (newValue: number) => {
    setProposalsPerPage(newValue);
    setCurrentProposalPage(1);
  };

  // Boost proposal logic
  const boostProposal = (proposal: ProposalViewModel) => {
    setBoostError('');
    setBoostSuccess('');

    if (!isPremiumFreelancer) {
      setBoostError('MSG45: This feature requires a Premium subscription');
      return;
    }

    if (getStatusLabel(proposal.status) !== 'Pending') {
      setBoostError('Only pending proposals can be boosted.');
      return;
    }

    if (tokenBalance < boostAmount) {
      setBoostError('MSG46: Insufficient balance. Please top up your wallet.');
      return;
    }

    setTokenBalance(prev => prev - boostAmount);
    setProposals(prev => prev.map(item => item.proposalsId === proposal.proposalsId
      ? {
          ...item,
          boostedTokenAmount: (item.boostedTokenAmount || 0) + boostAmount,
          rankingScore: (item.rankingScore || item.interviewScore || 0) + boostAmount,
          updatedAt: new Date().toISOString(),
        }
      : item
    ));
    setBoostSuccess(`Boost successful. ${boostAmount} tokens deducted and ranking score increased.`);
  };

  // Competition matrix logic
  const openCompetitionMatrix = (job: JobProposalGroup) => {
    setCompetitionError('');

    if (!isPremiumFreelancer) {
      setCompetitionError('MSG45: This feature requires a Premium subscription');
      return;
    }

    if (job.proposals.length < 3) {
      setCompetitionError('MSG74: Not enough data for analysis (minimum 3 proposals required)');
      return;
    }

    setCompetitionJob(job);
  };

  const competitionStats = useMemo(() => {
    if (!competitionJob) return null;
    const rates = competitionJob.proposals.map(proposal => proposal.proposedRate || 0);
    const scores = competitionJob.proposals.map(proposal => proposal.interviewScore || 0);
    return {
      minBid: Math.min(...rates),
      avgBid: Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length),
      maxBid: Math.max(...rates),
      proposalCount: competitionJob.proposals.length,
      highScore: scores.filter(score => score >= 85).length,
      midScore: scores.filter(score => score >= 70 && score < 85).length,
      lowScore: scores.filter(score => score < 70).length,
    };
  }, [competitionJob]);

  // Event handlers
  const handleViewDetail = (proposal: ProposalViewModel, mode: ProposalDetailMode) => {
    setProposalDetail({ proposal, mode });
  };

  const handleShortlist = (proposalId: string) => {
    updateProposalStatus(proposalId, 1);
  };

  const handleReject = (proposalId: string) => {
    updateProposalStatus(proposalId, 3);
  };

  const handleCreateContract = (proposal: ProposalViewModel) => {
    setCreateContractProposal(proposal);
  };

  const handleContractSubmit = async (contractData: ContractData) => {
    console.log('Creating contract:', contractData);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return <FreelancerProposalsScreen />;
}
