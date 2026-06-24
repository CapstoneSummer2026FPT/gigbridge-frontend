import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Award,
  Bot,
  CheckCircle2,
  ChevronDown,
  Heart,
  Info,
  Grid,
  List,
  MapPin,
  Rocket,
  Search,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { savedFreelancerAPI } from '../../../api/savedFreelancerAPI';
import { InviteFreelancerToJobModal } from '../../profile/components/InviteFreelancerToJobModal';
import type { FreelancerProfileDetailDto } from '../../../types/models/Profile';
import type { SavedFreelancerDto } from '../../../types/savedFreelancer';
import {
  MOCK_MATCHING_JOBS,
  rankTalentForJob,
  type RankedTalentMatch,
} from '../mock/data-for-SmartTalentMatchingScreen';
import '../styles/smart-talent-matching-screen.css';

// Metadata helper to retrieve rate, success rate, and earnings for each mockup designer/developer
const getTalentMetadata = (id: string) => {
  switch (id) {
    case 'u_freelancer_1':
      return { rate: 120, successRate: 98, earnings: '$200k+', successClass: 'text-purple-600 black:text-purple-400' };
    case 'u_freelancer_2':
      return { rate: 90, successRate: 96, earnings: '$75k+', successClass: 'text-blue-600 black:text-blue-400' };
    case 'u_freelancer_3':
      return { rate: 95, successRate: 100, earnings: '$85k+', successClass: 'text-purple-600 black:text-purple-400' };
    case 'u_freelancer_4':
      return { rate: 80, successRate: 94, earnings: '$50k+', successClass: 'text-amber-500' };
    case 'u_freelancer_5':
      return { rate: 75, successRate: 92, earnings: '$35k+', successClass: 'text-amber-500' };
    default:
      return { rate: 85, successRate: 95, earnings: '$45k+', successClass: 'text-blue-600 black:text-blue-400' };
  }
};

const getTalentAvatar = (id: string, defaultUrl: string) => {
  if (id === 'u_freelancer_1') {
    return 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWoUslxKKGeg3BdjHv9T29V5bOcc6UGu622ToGiOestOTQ_Ik8bk6kWC8-hZ1lzbYTIpin4__O_4YFuOmem8qbbChLC0LpbdIH4f6c5t2yZDSQnz_Ikri6ZCO8JDZbfbNg1ONNEtH47Y7CbpTyvd9bP9R3WgCpkUH5wMd_JdZS7PUzApIGE1AXcwLhk9JpjAxsAIM0-9JepFZryVaicbVd9rv-kNeXQ-lMuhXnfPPOeqIOtv_b6s7lMEoCoRZLmJrwKzEhJdYFS3Um';
  }
  if (id === 'u_freelancer_3') {
    return 'https://lh3.googleusercontent.com/aida-public/AB6AXuAosmjUZ4V4nFwq5m2khY-D4RCkgAnaPF_RIFbC_yRHj2bkFrK14ZG6GGtgAOTd7senX_9dhutwI-yeIJfQ56-jlLOKHBU5WOFW79Lv9S-MI7wCCm_uvgSc_OHNJiw2lyBAEm1lf8Xnxp3U_sWQxPHjxYjsCBalyVAcnyEXH7umNQ9kW9h80Cen56he7ife4aIwsTs0lL9D2al7CVJiLotU8dyyj9RToCV_P21f6Fxkwcl-z7OYFMV9NQoTrzU1LvwIC4AjrAdHkUSy';
  }
  return defaultUrl;
};

const FILTER_SKILL_TAGS = ['UX Design', 'React', 'Node.js', 'Figma', 'Three.js', 'TypeScript', 'Flutter'];

type ApiTalentMatch = RankedTalentMatch & {
  freelancerProfileId: string;
  userId: string;
  rating: number;
  eloPoints: number;
  profileCompletionScore?: number;
};

const getFreelancerProfileId = (freelancer: FreelancerProfileDetailDto): string =>
  freelancer.freelancerProfilesId ?? freelancer.freelancerProfileId ?? '';

const getSavedFreelancerProfileId = (freelancer: SavedFreelancerDto): string =>
  freelancer.freelancerProfileId ?? freelancer.freelancerProfilesId ?? '';

const formatAvailability = (availability?: number | null): string => {
  if (availability === 0) return 'Available full-time';
  if (availability === 1) return 'Available part-time';
  if (availability === 2) return 'Not currently available';
  return 'Availability not specified';
};

const mapFreelancerProfileToTalent = (freelancer: FreelancerProfileDetailDto): ApiTalentMatch => {
  const skills = freelancer.skills?.map(skill => skill.skillName).filter(Boolean) || [];
  const firstSkill = skills[0] || 'General';
  const rating = freelancer.rating ?? 0;
  const completedMilestones = freelancer.workExperiences?.length || 0;

  return {
    id: getFreelancerProfileId(freelancer),
    freelancerProfileId: getFreelancerProfileId(freelancer),
    userId: freelancer.userId,
    fullName: freelancer.userFullName || 'Freelancer',
    title: freelancer.title || 'Freelancer',
    location: freelancer.location || 'Remote',
    avatarUrl: freelancer.userAvatar || `https://i.pravatar.cc/120?u=${freelancer.userId}`,
    projectBudget: 5000,
    category: firstSkill,
    industryExperience: freelancer.workExperiences?.map(exp => exp.companyName).filter(Boolean) || [],
    skills,
    completedMilestones,
    anonymousRating: rating || 4.5,
    responseTime: 'Responds soon',
    availability: formatAvailability(freelancer.availability),
    recentWork: freelancer.bio || 'No profile bio has been added yet.',
    matchScore: Math.min(99, Math.max(50, Math.round((freelancer.eloPoints ?? 100) / 10))),
    skillScore: Math.min(48, skills.length * 8),
    budgetScore: 10,
    categoryScore: 15,
    advancedScore: Math.min(12, Math.round(rating * 2)),
    matchedSkills: [],
    matchReasons: ['Backend freelancer profile'],
    rating,
    eloPoints: freelancer.eloPoints ?? 100,
    profileCompletionScore: freelancer.profileCompletionScore,
  };
};

export default function SmartTalentMatchingScreen() {
  const navigate = useNavigate();
  const { role } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'saved' ? 'saved' : tabParam === 'all' ? 'all' : 'matches';

  const openJobs = MOCK_MATCHING_JOBS.filter(job => job.status === 'Open');
  const [selectedJobId, setSelectedJobId] = useState(openJobs[0]?.id || '');
  const [premiumEnabled, setPremiumEnabled] = useState(true);
  const [query, setQuery] = useState('');
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  const [inviteTalentTarget, setInviteTalentTarget] = useState<ApiTalentMatch | null>(null);
  const [talents, setTalents] = useState<ApiTalentMatch[]>([]);
  const [savedFreelancerIds, setSavedFreelancerIds] = useState<Set<string>>(new Set());
  const [savingFreelancerIds, setSavingFreelancerIds] = useState<Set<string>>(new Set());
  const [loadingTalents, setLoadingTalents] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'matches' | 'saved'>(initialTab);
  const [isCompact, setIsCompact] = useState(true);
  const [perPage, setPerPage] = useState(20);

  useEffect(() => {
    if (tabParam === 'saved') {
      setActiveTab('saved');
    } else if (tabParam === 'all') {
      setActiveTab('all');
    } else if (tabParam === 'matches') {
      setActiveTab('matches');
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'all' | 'matches' | 'saved') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Filters State
  const [jobTypes, setJobTypes] = useState<string[]>(['Fixed Price', 'Hourly Contract']);
  const [hourlyRate, setHourlyRate] = useState<number>(200);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [minSuccessRate, setMinSuccessRate] = useState<number | null>(null);

  const selectedJob = MOCK_MATCHING_JOBS.find(job => job.id === selectedJobId);
  const isClient = role === 0 || role === null;
  const canSaveFreelancers = role === 0;
  const isPremiumClient = isClient && premiumEnabled;

  useEffect(() => {
    let isMounted = true;

    const fetchTalents = async () => {
      try {
        setLoadingTalents(true);
        setLoadError(null);

        const freelancersResponse = await profileGetAPI.getAllFreelancers();
        const savedFreelancers = canSaveFreelancers
          ? await savedFreelancerAPI.getMySavedFreelancers()
          : [];

        if (!isMounted) return;

        if (!freelancersResponse.success) {
          throw new Error(freelancersResponse.message || 'Unable to load freelancer profiles.');
        }

        setTalents((freelancersResponse.data || [])
          .map(mapFreelancerProfileToTalent)
          .filter(talent => talent.freelancerProfileId));
        setSavedFreelancerIds(new Set(savedFreelancers.map(getSavedFreelancerProfileId).filter(Boolean)));
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : 'Unable to load freelancer profiles.';
        console.error('Failed to load talent matching data:', error);
        setLoadError(message);
        setTalents([]);
        setSavedFreelancerIds(new Set());
      } finally {
        if (isMounted) setLoadingTalents(false);
      }
    };

    fetchTalents();

    return () => {
      isMounted = false;
    };
  }, [canSaveFreelancers]);

  // Base list of candidates ranked for the job context
  const rankedMatches = useMemo<ApiTalentMatch[]>(() => {
    if (!selectedJob) return [];
    return rankTalentForJob(selectedJob, talents) as ApiTalentMatch[];
  }, [selectedJob, talents]);

  // Combine full pool and matching pool, adding dummy scores if needed
  const basePool = useMemo<ApiTalentMatch[]>(() => {
    if (activeTab === 'matches') {
      return isPremiumClient ? rankedMatches : [];
    }

    // Map full pool to match layout structures
    return talents.map(talent => {
      const matchInRanked = rankedMatches.find(r => r.id === talent.id);
      if (matchInRanked) return matchInRanked;
      return {
        ...talent,
        matchScore: 80,
        skillScore: 35,
        budgetScore: 10,
        categoryScore: 15,
        advancedScore: 10,
        matchedSkills: [],
        matchReasons: ['Generic fit context'],
      };
    });
  }, [activeTab, rankedMatches, isPremiumClient, talents]);

  // Apply visual filtering controls
  const filteredTalents = useMemo<ApiTalentMatch[]>(() => {
    return basePool.filter(talent => {
      const meta = getTalentMetadata(talent.id);

      // Tab filter
      if (activeTab === 'saved' && !savedFreelancerIds.has(talent.freelancerProfileId)) {
        return false;
      }

      // Search Query filter
      if (query.trim()) {
        const sanitized = query.toLowerCase();
        const matchesQuery = [
          talent.fullName,
          talent.title,
          talent.location,
          ...talent.skills,
        ].join(' ').toLowerCase().includes(sanitized);
        if (!matchesQuery) return false;
      }

      // Job Type filter (Simulate: fixed vs hourly rate bounds)
      const isHourly = meta.rate < 100;
      const isFixed = meta.rate >= 80;
      if (jobTypes.length > 0) {
        const hasFixedChecked = jobTypes.includes('Fixed Price');
        const hasHourlyChecked = jobTypes.includes('Hourly Contract');
        if (hasFixedChecked && !hasHourlyChecked && !isFixed) return false;
        if (hasHourlyChecked && !hasFixedChecked && !isHourly) return false;
      } else {
        return false; // nothing checked
      }

      // Hourly Rate range slider filter
      if (meta.rate > hourlyRate) {
        return false;
      }

      // Industry expertise (skills selection tags)
      if (selectedSkills.length > 0) {
        const hasSkill = selectedSkills.some(skill =>
          talent.skills.some(ts => ts.toLowerCase() === skill.toLowerCase())
        );
        if (!hasSkill) return false;
      }

      // Success rate buttons filter
      if (minSuccessRate !== null && meta.successRate < minSuccessRate) {
        return false;
      }

      return true;
    });
  }, [basePool, activeTab, savedFreelancerIds, query, jobTypes, hourlyRate, selectedSkills, minSuccessRate]);

  const inviteTalent = (talent: ApiTalentMatch) => {
    if (!isClient) {
      toast.error('Please log in as a client to invite freelancers.');
      return;
    }

    if (!talent.freelancerProfileId) {
      toast.error('This freelancer profile cannot be invited yet.');
      return;
    }

    setInviteTalentTarget(talent);
  };

  const toggleFavorite = async (talent: ApiTalentMatch) => {
    const freelancerProfileId = talent.freelancerProfileId;
    if (!freelancerProfileId) {
      toast.error('This freelancer profile cannot be saved yet.');
      return;
    }

    if (!canSaveFreelancers) {
      toast.error('Please log in as a client to save freelancers.');
      return;
    }

    setSavingFreelancerIds(prev => new Set(prev).add(freelancerProfileId));

    try {
      if (savedFreelancerIds.has(freelancerProfileId)) {
        await savedFreelancerAPI.unsaveFreelancer(freelancerProfileId);
        setSavedFreelancerIds(prev => {
          const next = new Set(prev);
          next.delete(freelancerProfileId);
          return next;
        });
        toast.success('Freelancer removed from saved talent.');
      } else {
        await savedFreelancerAPI.saveFreelancer(freelancerProfileId);
        setSavedFreelancerIds(prev => new Set(prev).add(freelancerProfileId));
        toast.success('Freelancer saved.');
      }
    } catch (error) {
      console.error('Failed to update saved freelancer:', error);
      toast.error(error instanceof Error ? error.message : 'Saved freelancer status could not be updated.');
    } finally {
      setSavingFreelancerIds(prev => {
        const next = new Set(prev);
        next.delete(freelancerProfileId);
        return next;
      });
    }
  };

  const toggleSkillFilter = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const clearAllFilters = () => {
    setQuery('');
    setJobTypes(['Fixed Price', 'Hourly Contract']);
    setHourlyRate(200);
    setSelectedSkills([]);
    setMinSuccessRate(null);
  };

  return (
    <AppLayout>
      <>
        {/* Header & Tabs Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8 relative z-50">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
              Discover the world's <span className="text-blue-600 black:text-blue-400 italic font-light">top creative</span> talent.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Connecting enterprise teams with elite freelancers. Precision matched, verified, and ready to scale your next big idea.
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-4 w-full md:w-auto shrink-0 font-sans">
            <div className="glass-panel p-1 rounded-full flex gap-1 shadow-sm w-full md:w-auto justify-center">
              <button
                onClick={() => handleTabChange('all')}
                className={`px-6 py-2.5 rounded-full text-xs font-semibold transition-all ${activeTab === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 black:text-gray-300 hover:bg-gray-100 black:hover:bg-gray-800'
                  }`}
              >
                All Freelancers
              </button>

              <div className="relative group z-[100]">
                <button
                  onClick={() => handleTabChange('matches')}
                  className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-sm hover:scale-105 ${activeTab === 'matches'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-100 black:bg-purple-950 text-purple-900 black:text-purple-100'
                    }`}
                >
                  <Sparkles size={14} className="fill-current" />
                  Best Matches: {selectedJob ? selectedJob.title : 'Select Job'}
                  <ChevronDown size={14} />
                </button>

                {/* Dropdown Options */}
                <div className="absolute right-0 top-full pt-2 w-56 hidden group-hover:block z-50">
                  <div className="glass-panel rounded-xl shadow-xl p-2">
                    <span className="block px-4 py-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      Select Project Context
                    </span>
                    {openJobs.map(job => (
                      <button
                        key={job.id}
                        onClick={() => {
                          setSelectedJobId(job.id);
                          handleTabChange('matches');
                        }}
                        className={`w-full text-left block px-4 py-3 hover:bg-gray-100 black:hover:bg-gray-800 rounded-lg text-sm transition-colors ${selectedJobId === job.id
                            ? 'bg-purple-50 black:bg-purple-900/30 text-purple-700 black:text-purple-300 font-medium'
                            : 'text-gray-700 black:text-gray-300'
                          }`}
                      >
                        {job.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleTabChange('saved')}
                className={`px-6 py-2.5 rounded-full text-xs font-semibold transition-all ${activeTab === 'saved'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 black:text-gray-300 hover:bg-gray-100 black:hover:bg-gray-800'
                  }`}
              >
                Saved Talent ({savedFreelancerIds.size})
              </button>
            </div>
          </div>
        </header>

        {/* Filters and main grid layout */}
        <div className="grid grid-cols-12 gap-6 items-start">

          {/* Left: Minimal Filters */}
          <aside className="col-span-12 lg:col-span-3 lg:sticky lg:top-24 space-y-8">
            <div className="glass-panel p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-foreground">Filters</h3>
                <button
                  onClick={clearAllFilters}
                  className="text-blue-600 hover:text-blue-700 black:text-blue-400 black:hover:text-blue-300 text-xs font-bold transition-all hover:underline"
                >
                  Clear all
                </button>
              </div>

              <div className="space-y-8">
                {/* Job Type Checkboxes */}
                <div>
                  <label className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-3 block">
                    Job Type
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={jobTypes.includes('Fixed Price')}
                        onChange={e => {
                          if (e.target.checked) {
                            setJobTypes(prev => [...prev, 'Fixed Price']);
                          } else {
                            setJobTypes(prev => prev.filter(t => t !== 'Fixed Price'));
                          }
                        }}
                        className="w-5 h-5 rounded border-gray-300 black:border-gray-700 text-blue-600 focus:ring-blue-500/20"
                      />
                      <span className="text-sm text-gray-700 black:text-gray-300 group-hover:text-blue-600 transition-colors">
                        Fixed Price
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={jobTypes.includes('Hourly Contract')}
                        onChange={e => {
                          if (e.target.checked) {
                            setJobTypes(prev => [...prev, 'Hourly Contract']);
                          } else {
                            setJobTypes(prev => prev.filter(t => t !== 'Hourly Contract'));
                          }
                        }}
                        className="w-5 h-5 rounded border-gray-300 black:border-gray-700 text-blue-600 focus:ring-blue-500/20"
                      />
                      <span className="text-sm text-gray-700 black:text-gray-300 group-hover:text-blue-600 transition-colors">
                        Hourly Contract
                      </span>
                    </label>
                  </div>
                </div>

                {/* Hourly Rate slider */}
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                      Max Hourly Rate
                    </label>
                    <span className="text-xs font-bold text-blue-600 black:text-blue-400">
                      ${hourlyRate}/hr
                    </span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="200"
                    step="5"
                    value={hourlyRate}
                    onChange={e => setHourlyRate(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 black:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>$40</span>
                    <span>$200+</span>
                  </div>
                </div>

                {/* Skills tags selection */}
                <div>
                  <label className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-3 block">
                    Industry Expertise
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FILTER_SKILL_TAGS.map(skill => {
                      const isSelected = selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          onClick={() => toggleSkillFilter(skill)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${isSelected
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-gray-100 black:bg-gray-800 text-gray-700 black:text-gray-300 hover:bg-gray-200 black:hover:bg-gray-700'
                            }`}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Min Success Rate buttons */}
                <div>
                  <label className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-3 block">
                    Min. Success Rate
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setMinSuccessRate(90)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all border ${minSuccessRate === 90
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 black:border-gray-800 hover:border-blue-600 black:hover:border-blue-400 text-gray-700 black:text-gray-300'
                        }`}
                    >
                      90%+
                    </button>
                    <button
                      onClick={() => setMinSuccessRate(95)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all border ${minSuccessRate === 95
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 black:border-gray-800 hover:border-blue-600 black:hover:border-blue-400 text-gray-700 black:text-gray-300'
                        }`}
                    >
                      95%+
                    </button>
                    <button
                      onClick={() => setMinSuccessRate(null)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all border ${minSuccessRate === null
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 black:border-gray-800 hover:border-blue-600 black:hover:border-blue-400 text-gray-700 black:text-gray-300'
                        }`}
                    >
                      Any
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Upgrade Banner */}
            <div className="bg-blue-600 p-6 rounded-2xl text-white relative overflow-hidden group shadow-md">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Sparkles size={120} />
              </div>
              <h4 className="text-lg font-bold mb-2 relative z-10 flex items-center gap-2">
                <Bot size={20} />
                Premium Access
              </h4>
              <p className="text-xs opacity-90 mb-4 relative z-10 leading-relaxed">
                Get priority matching with the top 1% of vetted experts on our premium ecosystem network.
              </p>
              <button
                type="button"
                onClick={() => setPremiumEnabled(!premiumEnabled)}
                className={`w-full py-3 font-bold rounded-xl relative z-10 transition-all text-xs hover:shadow-lg ${premiumEnabled
                    ? 'bg-white text-blue-600 hover:bg-gray-100'
                    : 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'
                  }`}
              >
                {premiumEnabled ? 'Premium Enabled' : 'Upgrade Now'}
              </button>
            </div>
          </aside>

          {/* Center: Talent List */}
          <section className={`col-span-12 lg:col-span-6 space-y-6 ${isCompact ? 'compact-layout' : ''}`}>

            {/* Top Toolbar */}
            <div className="flex items-center justify-between glass-panel p-3 rounded-2xl shadow-sm relative z-30">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                  Show per page
                </span>
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 black:bg-gray-800 rounded-lg text-xs font-semibold hover:bg-gray-200 black:hover:bg-gray-700 transition-colors text-gray-700 black:text-gray-300">
                    {perPage}
                    <ChevronDown size={12} />
                  </button>
                  <div className="absolute left-0 top-full pt-1 w-24 hidden group-hover:block z-50">
                    <div className="glass-panel rounded-xl shadow-xl p-1">
                      {[10, 20, 50].map(val => (
                        <button
                          key={val}
                          onClick={() => setPerPage(val)}
                          className={`w-full text-left block px-3 py-2 rounded-lg text-xs transition-colors ${perPage === val
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 black:text-gray-300 hover:bg-gray-100 black:hover:bg-gray-800'
                            }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Search input in toolbar */}
              <div className="relative max-w-xs w-48 hidden sm:block">
                <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Quick search..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full bg-gray-100 black:bg-gray-800 text-xs text-gray-700 black:text-gray-300 rounded-lg pl-8 pr-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/30"
                />
              </div>

              {/* Layout mode buttons */}
              <div className="flex items-center gap-2 bg-gray-100 black:bg-gray-800 p-1 rounded-xl font-sans">
                <button
                  onClick={() => setIsCompact(false)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!isCompact
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 black:text-gray-400 hover:bg-gray-200 black:hover:bg-gray-700'
                    }`}
                >
                  <Grid size={14} />
                  Default
                </button>
                <button
                  onClick={() => setIsCompact(true)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isCompact
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 black:text-gray-400 hover:bg-gray-200 black:hover:bg-gray-700'
                    }`}
                >
                  <List size={14} />
                  Compact
                </button>
              </div>
            </div>

            {/* Error notifications */}
            {!isPremiumClient && activeTab === 'matches' && (
              <div className="bg-red-50 black:bg-red-950/20 text-red-700 black:text-red-300 border border-red-200 black:border-red-800 p-4 rounded-2xl flex items-center gap-3 font-semibold text-sm shadow-sm">
                <AlertTriangle size={18} className="shrink-0" />
                <span>Talent matching ranking requires a Premium subscription active.</span>
              </div>
            )}

            {openJobs.length === 0 && (
              <div className="bg-yellow-50 black:bg-yellow-950/20 text-yellow-700 black:text-yellow-300 border border-yellow-200 black:border-yellow-800 p-4 rounded-2xl flex items-center gap-3 font-semibold text-sm shadow-sm">
                <AlertTriangle size={18} className="shrink-0" />
                <span>Please create an Open job post first.</span>
              </div>
            )}

            {loadingTalents && (
              <div className="glass-panel rounded-3xl p-12 text-center shadow-sm">
                <p className="text-primary font-semibold mb-2">Loading freelancer profiles...</p>
                <p className="text-sm text-muted-foreground">Finding available talent from your backend data.</p>
              </div>
            )}

            {!loadingTalents && loadError && (
              <div className="bg-red-50 black:bg-red-950/20 text-red-700 black:text-red-300 border border-red-200 black:border-red-800 p-4 rounded-2xl flex items-center gap-3 font-semibold text-sm shadow-sm">
                <AlertTriangle size={18} className="shrink-0" />
                <span>{loadError}</span>
              </div>
            )}

            {/* Empty state */}
            {!loadingTalents && !loadError && filteredTalents.length === 0 && (
              <div className="glass-panel rounded-3xl p-12 text-center shadow-sm">
                <AlertTriangle size={36} className="text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">
                  No matching freelancers found.
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Try adjusting your filter settings, selecting another job context, or adding more keywords to your search.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm hover:shadow-md transition-all"
                >
                  Reset All Filters
                </button>
              </div>
            )}

            {/* Talent cards rendering */}
            {!loadingTalents && !loadError && filteredTalents.slice(0, perPage).map((talent, index) => {
              const invited = invitedIds.includes(talent.id);
              const isFavorite = savedFreelancerIds.has(talent.freelancerProfileId);
              const isSaving = savingFreelancerIds.has(talent.freelancerProfileId);
              const meta = getTalentMetadata(talent.id);
              const avatar = getTalentAvatar(talent.id, talent.avatarUrl);
              const score = talent.matchScore || 85;

              return (
                <div
                  key={talent.id}
                  className="bento-card rounded-3xl p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden group"
                >
                  {/* Photo area */}
                  <div className="w-full md:w-48 h-64 md:h-auto rounded-2xl overflow-hidden relative shrink-0 bg-gray-100 black:bg-gray-800">
                    <img
                      alt={`${talent.fullName} Profile`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      src={avatar}
                      onError={e => {
                        // fallback if avatar fails
                        (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=${talent.id}`;
                      }}
                    />

                    {score >= 95 && (
                      <div className="verified-badge-top absolute top-3 left-3 px-3 py-1 bg-blue-600/90 backdrop-blur-md text-white rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm">
                        <CheckCircle2 size={12} className="fill-current" />
                        Top Rated
                      </div>
                    )}
                    {score >= 80 && score < 95 && (
                      <div className="verified-badge-top absolute top-3 left-3 px-3 py-1 bg-purple-600/90 backdrop-blur-md text-white rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm">
                        <Award size={12} className="fill-current" />
                        Rising Talent
                      </div>
                    )}
                  </div>

                  {/* Text details */}
                  <div className="flex-1 flex flex-col font-sans">
                    <div className="flex justify-between items-start mb-2 gap-4">
                      <div>
                        <h2 className="font-bold text-xl text-foreground leading-tight">
                          {talent.fullName}
                        </h2>
                        <p className="text-blue-600 black:text-blue-400 font-semibold text-sm">
                          {talent.title}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => toggleFavorite(talent)}
                          disabled={isSaving}
                          className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${isFavorite
                              ? 'bg-red-50 black:bg-red-950/20 border-red-200 black:border-red-800 text-red-500'
                              : 'border-gray-200 black:border-gray-800 text-gray-500 black:text-gray-400 hover:bg-gray-100 black:hover:bg-gray-800'
                            } ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <Heart size={18} className={isFavorite ? 'fill-current' : ''} />
                        </button>
                        <button
                          onClick={() => inviteTalent(talent)}
                          className={`px-5 py-2 rounded-full text-xs font-bold transition-all hover:scale-[1.02] ${invited
                              ? 'bg-green-100 black:bg-green-950/30 text-green-700 black:text-green-300 border border-green-200 black:border-green-800'
                              : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
                            }`}
                        >
                          {invited ? 'Invited' : 'Invite'}
                        </button>
                      </div>
                    </div>

                    <p className="text-muted-foreground text-sm mb-6 line-clamp-2 leading-relaxed">
                      {talent.recentWork}
                    </p>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-gray-50 black:bg-gray-900/40 rounded-xl p-3 border border-gray-100 black:border-gray-800/30 text-center">
                        <span className="block text-muted-foreground text-[10px] uppercase font-bold tracking-tighter mb-1">
                          Rate
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          ${meta.rate}/hr
                        </span>
                      </div>
                      <div className="bg-gray-50 black:bg-gray-900/40 rounded-xl p-3 border border-gray-100 black:border-gray-800/30 text-center">
                        <span className="block text-muted-foreground text-[10px] uppercase font-bold tracking-tighter mb-1">
                          Success
                        </span>
                        <span className={`text-sm font-bold ${meta.successClass}`}>
                          {meta.successRate}%
                        </span>
                      </div>
                      <div className="bg-gray-50 black:bg-gray-900/40 rounded-xl p-3 border border-gray-100 black:border-gray-800/30 text-center">
                        <span className="block text-muted-foreground text-[10px] uppercase font-bold tracking-tighter mb-1">
                          Earnings
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {meta.earnings}
                        </span>
                      </div>
                    </div>

                    {/* Metadata footer */}
                    <div className="flex items-center gap-3 mt-auto text-xs text-muted-foreground">
                      <MapPin size={14} className="text-gray-400" />
                      <span>{talent.location}</span>
                      <div className="h-1 w-1 bg-gray-300 black:bg-gray-700 rounded-full"></div>
                      <span>{talent.availability}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Load more button */}
            {!loadingTalents && !loadError && filteredTalents.length > perPage && (
              <button
                onClick={() => setPerPage(prev => prev + 10)}
                className="w-full py-4 border-2 border-dashed border-gray-300 black:border-gray-800 rounded-3xl text-gray-600 black:text-gray-400 font-bold hover:bg-gray-100 black:hover:bg-gray-900/40 hover:border-blue-500/40 transition-all flex items-center justify-center gap-2 group"
              >
                <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
                Explore More Experts
              </button>
            )}
          </section>

          {/* Right: Activity & Leaderboard */}
          <aside className="col-span-12 lg:col-span-3 space-y-6">

            {/* Boost Ad */}
            <div className="glass-panel rounded-3xl p-6 overflow-hidden bg-blue-50/20 black:bg-blue-950/5 relative group shadow-sm">
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <span className="px-2 py-0.5 bg-blue-100 black:bg-blue-900/30 text-blue-700 black:text-blue-300 rounded text-[10px] font-bold uppercase tracking-widest">
                    Sponsored
                  </span>
                  <Info size={14} className="text-gray-400 cursor-pointer hover:text-blue-600" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-900 black:text-white">
                  Boost Your Reach
                </h3>
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                  Get featured at the top of search results and connect with premium clients 2x faster.
                </p>
                <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl hover:shadow-lg transition-shadow text-xs">
                  Upgrade Now
                </button>
              </div>
              <div className="absolute -right-4 -top-4 opacity-[0.03] black:opacity-[0.05] group-hover:scale-105 transition-transform duration-500">
                <Rocket size={100} className="text-blue-900 black:text-white" />
              </div>
            </div>

            {/* Global Leaderboard */}
            <div className="glass-panel rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-foreground">
                  Leaderboard
                </h3>
                <span className="text-[10px] text-blue-600 black:text-blue-400 font-bold uppercase tracking-widest flex items-center gap-1">
                  <Trophy size={12} />
                  Global
                </span>
              </div>

              <div className="space-y-4">
                {/* User 1 */}
                <div className="flex items-center gap-4 group cursor-pointer hover:bg-gray-100 black:hover:bg-gray-800 p-2 rounded-xl transition-all">
                  <div className="w-10 h-10 rounded-full bg-blue-50 black:bg-blue-950/30 flex items-center justify-center font-bold text-blue-600 black:text-blue-400 group-hover:scale-95 transition-transform shrink-0">
                    1
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gray-100 black:bg-gray-800">
                    <img
                      alt="Sarah Chen"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_EwdhdovubczscFJZwiYSNyjkaOucTPKp17YDAhli8ybsFqAXEwvrDvhzBH9ecENXPrzLKZxi6CUqQZQ4z1GI2k51JFt8nEc34Lpg8M73pAVFl46XCcRgoKUqt5GqO4G7Ny2B471nSL-2E-unf9-JULwUClMg36b3rilTlcuFn5B4K56S0ClboT37CedwhAe_gN7zsaodqJUqlbmCQp4d4qDOH1GOQA8LiGK-h6W19F1K0D1f4hdqHIsyxcSdCV8Cw-MWUzFq4Z8R"
                    />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-sm font-bold text-foreground truncate">Sarah Chen</h4>
                    <div className="flex items-center gap-1 text-[10px] text-purple-600 black:text-purple-400 font-semibold uppercase">
                      <Star size={10} className="fill-current" />
                      <span>982 pts</span>
                    </div>
                  </div>
                </div>

                {/* User 2 */}
                <div className="flex items-center gap-4 group cursor-pointer hover:bg-gray-100 black:hover:bg-gray-800 p-2 rounded-xl transition-all">
                  <div className="w-10 h-10 rounded-full bg-gray-100 black:bg-gray-800 flex items-center justify-center font-bold text-gray-600 black:text-gray-400 group-hover:scale-95 transition-transform shrink-0">
                    2
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gray-100 black:bg-gray-800">
                    <img
                      alt="James Wilson"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYn70r5M68ELLrVYEDj5BDaxjEG29lmMnQErI_2MXOR2AALcUAHVPIbOZIZ6HPBfcSJAymaI1ZllpV12-Nzo5w_vaOpltwQmr5qz8NdhAaV7UEk5vGQEfMa8eXph3HWSoB_4ASAfiwPg7Wox43Tbbl_De2Dbsu1jWwdhjg5tpLl5Oov8_feSItQjOhARkXPQlxML0BLQ8m0gw7Ci398pbfG2L_anzwL9-50NFDGPSDZK65eERmzCb3Ucfeba4VT1IfCutwEOhNQrHN"
                    />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-sm font-bold text-foreground truncate">James Wilson</h4>
                    <div className="flex items-center gap-1 text-[10px] text-purple-600 black:text-purple-400 font-semibold uppercase">
                      <Star size={10} className="fill-current" />
                      <span>945 pts</span>
                    </div>
                  </div>
                </div>

                {/* User 3 */}
                <div className="flex items-center gap-4 group cursor-pointer hover:bg-gray-100 black:hover:bg-gray-800 p-2 rounded-xl transition-all">
                  <div className="w-10 h-10 rounded-full bg-gray-100 black:bg-gray-800 flex items-center justify-center font-bold text-gray-600 black:text-gray-400 group-hover:scale-95 transition-transform shrink-0">
                    3
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gray-100 black:bg-gray-800">
                    <img
                      alt="Elena Rodriguez"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqUC_Y1D5jpM7yNJGHGuc8VECN_SrWXHu93685yfwThAjEbG1QSxM6I5xDn7e_q8g1693Sj0Wc6nFnqtHzvRif_2AecYdwGtmJaDKYGWU4NoTxFUlHhWCn1noZQkCxEt4-HOSpdzLihAiYNYkHlCuP0qWNvDIJCPGKQKpC6TNRCqgwJZImTiQ0flfSd2lelms1vCyS6zriVLKiGCFfabJ7bCaTo7MQmLMGhnfDMS61LBWEGijw_k_1TXqfklOd6u8iE4Vvvd8crp6e"
                    />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-sm font-bold text-foreground truncate">Elena Rodriguez</h4>
                    <div className="flex items-center gap-1 text-[10px] text-purple-600 black:text-purple-400 font-semibold uppercase">
                      <Star size={10} className="fill-current" />
                      <span>912 pts</span>
                    </div>
                  </div>
                </div>
              </div>

              <button className="w-full mt-6 text-center text-xs text-blue-600 black:text-blue-400 font-bold hover:underline transition-colors">
                View All Rankings
              </button>
            </div>
          </aside>

        </div>

        {inviteTalentTarget && (
          <InviteFreelancerToJobModal
            freelancerName={inviteTalentTarget.fullName}
            freelancerId={inviteTalentTarget.freelancerProfileId}
            onClose={() => setInviteTalentTarget(null)}
            onInvited={() => {
              setInvitedIds(prev => prev.includes(inviteTalentTarget.id) ? prev : [...prev, inviteTalentTarget.id]);
              toast.success('Invitation sent.');
            }}
          />
        )}
      </>
    </AppLayout>
  );
}
