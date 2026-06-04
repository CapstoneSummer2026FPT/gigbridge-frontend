import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  Award,
  Bot,
  Briefcase,
  CheckCircle2,
  Crown,
  DollarSign,
  MailPlus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import {
  MOCK_MATCHING_JOBS,
  MOCK_TALENT_POOL,
  rankTalentForJob,
  type RankedTalentMatch,
} from '../mock/data-for-SmartTalentMatchingScreen';
import '../styles/smart-talent-matching-screen.css';

export default function SmartTalentMatchingScreen() {
  const navigate = useNavigate();
  const { role } = useApp();
  const openJobs = MOCK_MATCHING_JOBS.filter(job => job.status === 'Open');
  const [selectedJobId, setSelectedJobId] = useState(openJobs[0]?.id || '');
  const [premiumEnabled, setPremiumEnabled] = useState(true);
  const [query, setQuery] = useState('');
  const [invitedIds, setInvitedIds] = useState<string[]>([]);

  const selectedJob = MOCK_MATCHING_JOBS.find(job => job.id === selectedJobId);
  const isClient = role === 0 || role === null;
  const isPremiumClient = isClient && premiumEnabled;

  const rankedMatches = useMemo<RankedTalentMatch[]>(() => {
    if (!selectedJob || !isPremiumClient) return [];
    return rankTalentForJob(selectedJob, MOCK_TALENT_POOL)
      .filter(match => {
        const sanitizedQuery = query.replace(/[<>]/g, '').trim().toLowerCase();
        if (!sanitizedQuery) return true;
        return [
          match.fullName,
          match.title,
          match.location,
          match.skills.join(' '),
          match.industryExperience.join(' '),
        ].join(' ').toLowerCase().includes(sanitizedQuery);
      });
  }, [selectedJob, isPremiumClient, query]);

  const averageScore = rankedMatches.length
    ? Math.round(rankedMatches.reduce((sum, match) => sum + match.matchScore, 0) / rankedMatches.length)
    : 0;

  const inviteTalent = (talentId: string) => {
    setInvitedIds(prev => prev.includes(talentId) ? prev : [...prev, talentId]);
  };

  return (
    <AppLayout>
      <div className="smart-match-page">
        <header className="smart-match-header">
          <div className="smart-match-title">
            <div className="smart-match-mark">
              <Bot size={25} />
            </div>
            <div>
              <p className="smart-match-kicker">Premium Client AI</p>
              <h1>Smart Talent Matching</h1>
              <p>Rank freelancers by job skills, budget fit, category, milestone history, and anonymous ratings.</p>
            </div>
          </div>

          <div className="smart-match-header-actions">
            <button
              type="button"
              className={`smart-match-premium-toggle ${premiumEnabled ? 'active' : ''}`}
              onClick={() => setPremiumEnabled(!premiumEnabled)}
            >
              <Crown size={16} />
              {premiumEnabled ? 'Premium Active' : 'Standard Mode'}
            </button>
            <button type="button" className="smart-match-secondary" onClick={() => navigate('/jobs/post')}>
              <Briefcase size={16} />
              Post Job
            </button>
          </div>
        </header>

        {!isPremiumClient && (
          <div className="smart-match-alert danger">
            <AlertTriangle size={18} />
            MSG45: This feature requires a Premium subscription
          </div>
        )}

        {openJobs.length === 0 && (
          <div className="smart-match-alert warning">
            <AlertTriangle size={18} />
            Please create an Open job post first.
          </div>
        )}

        <section className="smart-match-control-panel">
          <div className="smart-match-job-picker">
            <label htmlFor="matching-job-select">
              <SlidersHorizontal size={16} />
              Select Open Job Post
            </label>
            <select
              id="matching-job-select"
              value={selectedJobId}
              onChange={event => setSelectedJobId(event.target.value)}
            >
              {openJobs.map(job => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          </div>

          <div className="smart-match-search">
            <Search size={17} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Filter ranked freelancers by skill, name, location..."
            />
          </div>

          <button className="smart-match-refresh" type="button">
            <RefreshCw size={16} />
            Update Results
          </button>
        </section>

        {selectedJob && (
          <section className="smart-match-job-summary">
            <div>
              <span className="smart-match-summary-icon cyan"><Briefcase size={18} /></span>
              <strong>{selectedJob.title}</strong>
              <small>{selectedJob.category} · {selectedJob.industry} · {selectedJob.workType}</small>
            </div>
            <div>
              <span className="smart-match-summary-icon green"><DollarSign size={18} /></span>
              <strong>${selectedJob.budgetMin.toLocaleString()} - ${selectedJob.budgetMax.toLocaleString()}</strong>
              <small>Budget range</small>
            </div>
            <div>
              <span className="smart-match-summary-icon purple"><Sparkles size={18} /></span>
              <strong>{selectedJob.skills.length} skills</strong>
              <small>{selectedJob.skills.join(', ')}</small>
            </div>
            <div>
              <span className="smart-match-summary-icon amber"><TrendingUp size={18} /></span>
              <strong>{averageScore || 0}% avg</strong>
              <small>{rankedMatches.length} ranked matches</small>
            </div>
          </section>
        )}

        <section className="smart-match-layout">
          <aside className="smart-match-ai-panel">
            <div className="smart-match-ai-card">
              <div className="smart-match-ai-head">
                <ShieldCheck size={20} />
                <div>
                  <strong>AI Ranking Model</strong>
                  <span>Advanced Premium Matching</span>
                </div>
              </div>
              <ul>
                <li><CheckCircle2 size={15} /> Skills + budget + category analysis</li>
                <li><CheckCircle2 size={15} /> Milestone history included</li>
                <li><CheckCircle2 size={15} /> Anonymous ratings included</li>
                <li><CheckCircle2 size={15} /> Updates when talent profiles change</li>
              </ul>
            </div>

            <div className="smart-match-score-card">
              <strong>Scoring Formula</strong>
              <div><span>Skills</span><b>48 pts</b></div>
              <div><span>Category</span><b>18 pts</b></div>
              <div><span>Industry</span><b>10 pts</b></div>
              <div><span>Budget</span><b>12 pts</b></div>
              <div><span>Premium history</span><b>12 pts</b></div>
            </div>
          </aside>

          <main className="smart-match-results">
            <div className="smart-match-results-head">
              <div>
                <h2>Ranked Talent</h2>
                <p>Top candidates are sorted by compatibility score.</p>
              </div>
              <span>{rankedMatches.length} results</span>
            </div>

            {isPremiumClient && rankedMatches.length === 0 && (
              <div className="smart-match-empty">
                <AlertTriangle size={26} />
                <strong>MSG60: No matching freelancers found. Try adjusting your criteria.</strong>
                <p>Select a different job post or relax the required skill set.</p>
              </div>
            )}

            <div className="smart-match-list">
              {isPremiumClient && rankedMatches.map((talent, index) => {
                const invited = invitedIds.includes(talent.id);
                return (
                  <article key={talent.id} className="smart-match-card">
                    <div className="smart-match-rank">#{index + 1}</div>
                    <img src={talent.avatarUrl} alt={talent.fullName} />
                    <div className="smart-match-talent-main">
                      <div className="smart-match-talent-heading">
                        <div>
                          <h3>{talent.fullName}</h3>
                          <p>{talent.title}</p>
                        </div>
                        <div className="smart-match-score">
                          <strong>{talent.matchScore}%</strong>
                          <span>Match</span>
                        </div>
                      </div>

                      <div className="smart-match-meta-row">
                        <span><UserRound size={14} /> {talent.location}</span>
                        <span><DollarSign size={14} /> ${talent.hourlyRate}/hr</span>
                        <span><Star size={14} /> {talent.anonymousRating.toFixed(1)} anonymous rating</span>
                        <span><Award size={14} /> {talent.completedMilestones} milestones</span>
                      </div>

                      <p className="smart-match-recent">{talent.recentWork}</p>

                      <div className="smart-match-skills">
                        {talent.skills.slice(0, 7).map(skill => (
                          <span key={`${talent.id}-${skill}`} className={talent.matchedSkills.includes(skill) ? 'matched' : ''}>
                            {skill}
                          </span>
                        ))}
                      </div>

                      <div className="smart-match-breakdown">
                        <div><span>Skills</span><b>{talent.skillScore}</b></div>
                        <div><span>Budget</span><b>{talent.budgetScore}</b></div>
                        <div><span>Category</span><b>{talent.categoryScore}</b></div>
                        <div><span>Premium</span><b>{talent.advancedScore}</b></div>
                      </div>

                      <div className="smart-match-reasons">
                        {talent.matchReasons.slice(0, 3).map(reason => <span key={reason}>{reason}</span>)}
                      </div>
                    </div>

                    <div className="smart-match-actions">
                      <button type="button" onClick={() => navigate(`/profile/freelancer/${talent.id}`)}>
                        View Profile
                      </button>
                      <button
                        type="button"
                        className={invited ? 'invited' : 'primary'}
                        onClick={() => inviteTalent(talent.id)}
                      >
                        <MailPlus size={15} />
                        {invited ? 'Invited' : 'Invite'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </main>
        </section>
      </div>
    </AppLayout>
  );
}
