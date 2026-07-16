import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Bot, CheckCircle2, Crown, RefreshCw, Sparkles, Users } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobAPI } from '../../../api/jobAPI';
import { premiumClientAPI } from '../api/premiumClientAPI';
import type { GetMyJobPostDetailDto } from '../../../types/models/Job';
import type { AiInterviewDefinition, AiInterviewResults, JobPostPromotion, TalentMatch } from '../types/premiumClient';
import '../styles/premium-client-workspace.css';

type Notice = { tone: 'error' | 'success'; text: string };

export default function PremiumClientJobWorkspaceScreen() {
  const { jobPostId = '' } = useParams<{ jobPostId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<GetMyJobPostDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [promotion, setPromotion] = useState<JobPostPromotion | null>(null);
  const [matches, setMatches] = useState<TalentMatch[] | null>(null);
  const [topK, setTopK] = useState(10);
  const [language, setLanguage] = useState('auto');
  const [mode, setMode] = useState('voice');
  const [questionCount, setQuestionCount] = useState(5);
  const [interview, setInterview] = useState<AiInterviewDefinition | null>(null);
  const [interviewId, setInterviewId] = useState('');
  const [results, setResults] = useState<AiInterviewResults | null>(null);
  const promotionKey = useRef(globalThis.crypto?.randomUUID?.() || `${jobPostId}-${Date.now()}`);

  useEffect(() => {
    let active = true;
    jobAPI.getMyJobPostById(jobPostId).then(response => {
      if (!active) return;
      if (response.success && response.data) setJob(response.data);
      else setNotice({ tone: 'error', text: response.message || 'Unable to load this job.' });
      setLoading(false);
    });
    return () => { active = false; };
  }, [jobPostId]);

  const execute = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setNotice(null);
    try { await action(); } finally { setBusy(null); }
  };

  const promote = () => execute('promote', async () => {
    const response = await premiumClientAPI.promoteJob(jobPostId, promotionKey.current);
    if (!response.success || !response.data) return setNotice({ tone: 'error', text: response.message || 'Promotion failed.' });
    setPromotion(response.data);
    promotionKey.current = globalThis.crypto?.randomUUID?.() || `${jobPostId}-${Date.now()}`;
    setNotice({ tone: 'success', text: response.message || 'Job post promoted.' });
  });

  const findTalent = () => execute('matches', async () => {
    const response = await premiumClientAPI.getTalentMatches(jobPostId, topK);
    if (!response.success || !response.data) {
      setMatches([]);
      return setNotice({ tone: 'error', text: response.message || 'Talent matching failed.' });
    }
    setMatches([...response.data.matches].sort((a, b) => b.matchPercentage - a.matchPercentage));
  });

  const createInterview = () => execute('interview', async () => {
    const response = await premiumClientAPI.createAiInterview(jobPostId, { language, mode, questionCount });
    if (!response.success || !response.data) return setNotice({ tone: 'error', text: response.message || 'Interview creation failed.' });
    setInterview(response.data);
    setInterviewId(response.data.interviewId);
    setNotice({ tone: 'success', text: 'AI interview definition created.' });
  });

  const loadResults = () => execute('results', async () => {
    if (!interviewId.trim()) return setNotice({ tone: 'error', text: 'Enter an interview ID first.' });
    const response = await premiumClientAPI.getAiInterviewResults(jobPostId, interviewId.trim());
    if (!response.success || !response.data) {
      setResults(null);
      return setNotice({ tone: 'error', text: response.message || 'Unable to load interview results.' });
    }
    setResults(response.data);
  });

  return (
    <AppLayout>
      <main className="pcw-page">
        <button className="pcw-back" onClick={() => navigate('/jobs/my-jobs')}><ArrowLeft size={17} />My job posts</button>
        <header className="pcw-hero">
          <div><span><Crown size={16} />Premium Client Workspace</span><h1>{loading ? 'Loading job…' : job?.title || 'Job tools'}</h1><p>Promote this job, rank current talent, and manage its AI interview.</p></div>
          <Sparkles size={38} />
        </header>
        {notice && <div className={`pcw-message ${notice.tone}`}>{notice.tone === 'success' && <CheckCircle2 size={17} />}{notice.text}</div>}

        <section className="pcw-grid">
          <article className="pcw-card">
            <div className="pcw-card-title"><Sparkles size={20} /><div><h2>Featured promotion</h2><p>Pin this open job ahead of standard listings.</p></div></div>
            <button className="pcw-primary" disabled={!!busy || loading} onClick={promote}>{busy === 'promote' ? 'Promoting…' : 'Promote job'}</button>
            {promotion && <div className="pcw-result"><strong>Featured until {new Date(promotion.featuredUntil).toLocaleString()}</strong><span>{promotion.tokenCost} tokens · Transaction {promotion.walletTransactionId}</span></div>}
          </article>

          <article className="pcw-card">
            <div className="pcw-card-title"><Users size={20} /><div><h2>Smart talent matching</h2><p>Recompute rankings using current profile data.</p></div></div>
            <div className="pcw-row"><label>Results<input type="number" min={1} max={50} value={topK} onChange={event => setTopK(Number(event.target.value))} /></label><button className="pcw-primary" disabled={!!busy} onClick={findTalent}><RefreshCw size={15} />{busy === 'matches' ? 'Matching…' : 'Find talent'}</button></div>
          </article>

          <article className="pcw-card pcw-wide">
            <div className="pcw-card-title"><Bot size={20} /><div><h2>AI interview</h2><p>Create a job-specific definition and retrieve owned results.</p></div></div>
            <div className="pcw-form-row">
              <label>Language<select value={language} onChange={event => setLanguage(event.target.value)}><option value="auto">Auto</option><option value="en">English</option><option value="vi">Vietnamese</option></select></label>
              <label>Mode<select value={mode} onChange={event => setMode(event.target.value)}><option value="voice">Voice</option><option value="text">Text</option></select></label>
              <label>Questions<input type="number" min={1} max={20} value={questionCount} onChange={event => setQuestionCount(Number(event.target.value))} /></label>
              <button className="pcw-primary" disabled={!!busy} onClick={createInterview}>{busy === 'interview' ? 'Creating…' : 'Create definition'}</button>
            </div>
            {interview && <div className="pcw-result"><strong>{interview.status} · {interview.questionCount} questions</strong><span>Interview ID: {interview.interviewId}</span>{!interview.externalReference && <em>External interview provisioning is not available yet; the definition is stored in GigBridge.</em>}</div>}
            <div className="pcw-results-search"><input value={interviewId} onChange={event => setInterviewId(event.target.value)} placeholder="Interview ID" /><button disabled={!!busy} onClick={loadResults}>{busy === 'results' ? 'Loading…' : 'Load results'}</button></div>
          </article>
        </section>

        {matches !== null && <section className="pcw-section"><h2>Ranked talent</h2>{matches.length === 0 ? <p>No matching freelancers found. Try adjusting your criteria.</p> : <div className="pcw-match-list">{matches.map(match => <article key={match.freelancerId}><div className="pcw-score">{match.matchPercentage}%</div><div><h3>{match.displayName}</h3><p>{match.title || 'Freelancer'}</p><div className="pcw-tags good">{match.matchedSkills.map(skill => <span key={skill}>{skill}</span>)}</div>{match.missingSkills.length > 0 && <div className="pcw-tags missing">{match.missingSkills.map(skill => <span key={skill}>Missing: {skill}</span>)}</div>}<ul>{match.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div></article>)}</div>}</section>}

        {results && <section className="pcw-section"><h2>Interview results · {results.status}</h2>{results.attempts.length === 0 ? <p>No attempts have been submitted yet.</p> : results.attempts.map(attempt => <article className="pcw-attempt" key={attempt.attemptId}><div className="pcw-attempt-head"><strong>{attempt.status}</strong><span>Overall {attempt.overallScore ?? '—'} · Compatibility {attempt.compatibilityScore ?? '—'}</span></div><p>{attempt.summary || 'No summary available.'}</p>{attempt.questions.map(question => <div className="pcw-question" key={question.questionIndex}><strong>Q{question.questionIndex}: {question.question || 'Question unavailable'}</strong><span>Score: {question.score ?? '—'}</span><p>{question.transcript || 'No transcript available.'}</p></div>)}</article>)}</section>}
      </main>
    </AppLayout>
  );
}
