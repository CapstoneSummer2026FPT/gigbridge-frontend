import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Video, VideoOff, Mic, MicOff, Bot, ChevronRight, Star, CheckCircle, BarChart2, Clock } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import '../styles/ai-interview-screen.css';

type InterviewStage = 'intro' | 'interview' | 'results';

const QUESTIONS = [
  { id: 1, question: 'Can you walk me through your experience with React and describe a challenging problem you solved?', category: 'technical', timeLimit: 120 },
  { id: 2, question: 'How do you handle a situation where a client changes requirements mid-project? Give a specific example.', category: 'behavioral', timeLimit: 90 },
  { id: 3, question: 'Describe your approach to optimizing a slow-loading web application.', category: 'technical', timeLimit: 120 },
  { id: 4, question: 'How do you prioritize tasks when working on multiple projects simultaneously?', category: 'situational', timeLimit: 90 },
];

const TRANSCRIPTION_SAMPLES = [
  'I have been working with React for over 7 years, building everything from e-commerce platforms to real-time dashboards...',
  'In a recent project, I faced a performance issue where our main bundle size was over 4MB...',
  'I solved it by implementing code splitting with React.lazy and dynamic imports, reducing the initial load to just 400KB...',
];

export default function AIInterviewScreen() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [stage, setStage] = useState<InterviewStage>('intro');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [timeLeft, setTimeLeft] = useState(QUESTIONS[0].timeLimit);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [transcriptionIdx, setTranscriptionIdx] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (stage === 'interview') {
      setTimeLeft(QUESTIONS[currentQuestion].timeLimit);
      setIsAISpeaking(true);
      const aiTimer = setTimeout(() => setIsAISpeaking(false), 3000);

      // Simulate live transcription
      setTranscription('');
      setTranscriptionIdx(0);
      const transcriptionTimer = setInterval(() => {
        setTranscriptionIdx(prev => {
          const sample = TRANSCRIPTION_SAMPLES[Math.floor(Math.random() * TRANSCRIPTION_SAMPLES.length)];
          if (prev < sample.length) {
            setTranscription(sample.slice(0, prev + 5));
            return prev + 5;
          }
          clearInterval(transcriptionTimer);
          return prev;
        });
      }, 100);

      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearTimeout(aiTimer);
        clearInterval(timerRef.current);
        clearInterval(transcriptionTimer);
      };
    }
  }, [stage, currentQuestion]);

  const nextQuestion = () => {
    clearInterval(timerRef.current);
    const score = 75 + Math.floor(Math.random() * 25);
    setScores(prev => [...prev, score]);

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setStage('results');
    }
  };

  const overallScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 88;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const waveformHeights = [0.3, 0.7, 0.4, 1.0, 0.6, 0.8, 0.3, 0.5, 0.9, 0.4, 0.7, 0.6, 0.8, 0.4, 0.5, 0.9, 0.3, 0.7];

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-8rem)] flex flex-col">

        {/* Intro Stage */}
        {stage === 'intro' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full text-center">
              <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center animate-orb bg-gradient-to-br from-purple to-cyan">
                <Video size={40} className="text-background" />
              </div>
              <h1 className="text-4xl font-black text-primary mb-4">AI Instant Interview</h1>
              <p className="text-lg mb-8 text-secondary">
                Our AI will conduct a structured interview, analyze your responses in real-time,
                and provide clients with a detailed suitability report.
              </p>

              <div className="glass-card p-6 mb-8 text-left">
                <h2 className="text-primary font-semibold mb-4">What to Expect</h2>
                <div className="space-y-3">
                  {[
                    { step: '1', text: `${QUESTIONS.length} questions across technical, behavioral & situational categories`, colorClass: 'cyan' },
                    { step: '2', text: 'Real-time AI transcription and sentiment analysis', colorClass: 'purple' },
                    { step: '3', text: 'Instant suitability score and detailed feedback report', colorClass: 'green' },
                    { step: '4', text: 'Interview shared with potential clients automatically', colorClass: 'amber-400' },
                  ].map(item => (
                    <div key={item.step} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-${item.colorClass}/10 border border-${item.colorClass}/40`}>
                        <span className={`text-xs font-bold text-${item.colorClass}`}>{item.step}</span>
                      </div>
                      <p className="text-sm text-secondary">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="glass-card p-4 text-center">
                  <p className="text-2xl font-black text-cyan">~8 min</p>
                  <p className="text-xs mt-1 text-secondary">Average Duration</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-2xl font-black text-green">94%</p>
                  <p className="text-xs mt-1 text-secondary">Candidate Satisfaction</p>
                </div>
              </div>

              <button className="btn-purple px-10 py-4 text-base flex items-center gap-2 mx-auto"
                onClick={() => setStage('interview')}>
                <Video size={20} /> Start AI Interview <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Interview Stage */}
        {stage === 'interview' && (
          <div className="flex-1 flex flex-col p-4">
            {/* Progress */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex gap-2 flex-1">
                {QUESTIONS.map((_, i) => (
                  <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${
                    i < currentQuestion ? 'bg-green' : i === currentQuestion ? 'bg-purple' : 'bg-border'
                  }`} />
                ))}
              </div>
              <span className="text-sm text-primary font-semibold">Q{currentQuestion + 1}/{QUESTIONS.length}</span>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${timeLeft < 30 ? 'bg-red-500/15 border border-red-500/30' : 'bg-cyan/10 border border-cyan/25'}`}>
                <Clock size={12} className={timeLeft < 30 ? 'text-red-500' : 'text-cyan'} />
                <span className={`text-xs font-bold ${timeLeft < 30 ? 'text-red-500' : 'text-cyan'}`}>{formatTime(timeLeft)}</span>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* AI Avatar Feed */}
              <div className="glass-card flex flex-col overflow-hidden">
                {/* AI Video */}
                <div className="flex-1 relative flex items-center justify-center p-8 bg-gradient-to-br from-purple/10 to-cyan/10">
                  {/* Animated AI avatar */}
                  <div className="relative">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center ${isAISpeaking ? 'animate-orb' : ''} bg-gradient-to-br from-purple to-cyan`}>
                      <Bot size={56} className="text-background" />
                    </div>
                    {isAISpeaking && (
                      <div className="absolute -inset-4 rounded-full border-2 border-purple/30 animate-ping" />
                    )}
                  </div>

                  {/* AI Waveform */}
                  {isAISpeaking && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
                      {waveformHeights.slice(0, 12).map((h, i) => (
                        <div key={i} className="waveform-bar"
                          style={{ height: `${h * 100}%`, animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                  )}

                  {/* AI Label */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple/20 border border-purple/40">
                    <Bot size={12} className="text-purple" />
                    <span className="text-xs font-medium text-primary">GigBridge AI Interviewer</span>
                    <div className="w-2 h-2 rounded-full bg-purple animate-pulse" />
                  </div>
                </div>

                {/* Current Question */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge-${QUESTIONS[currentQuestion].category === 'technical' ? 'cyan' : 'purple'} text-xs capitalize`}>
                      {QUESTIONS[currentQuestion].category}
                    </span>
                  </div>
                  <p className="text-primary text-sm font-medium leading-relaxed">
                    {QUESTIONS[currentQuestion].question}
                  </p>
                </div>
              </div>

              {/* Candidate Feed + Transcription */}
              <div className="flex flex-col gap-4">
                {/* Candidate Video */}
                <div className="glass-card flex-1 relative flex items-center justify-center bg-gradient-to-br from-surface to-background min-h-[180px]">
                  {isCameraOn ? (
                    <div className="w-20 h-20 rounded-full flex items-center justify-center bg-surface">
                      <img src={user?.avatar} alt="" className="w-20 h-20 rounded-full" />
                    </div>
                  ) : (
                    <VideoOff size={32} className="text-secondary" />
                  )}

                  <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/50 border border-border">
                    <span className="text-xs text-primary">{user?.full_name || 'You'}</span>
                  </div>

                  {/* Controls */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                    <button onClick={() => setIsMicOn(!isMicOn)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isMicOn ? 'bg-cyan/20 border border-cyan/40' : 'bg-red-500/30 border border-red-500/50'
                      }`}>
                      {isMicOn ? <Mic size={14} className="text-cyan" /> : <MicOff size={14} className="text-red-500" />}
                    </button>
                    <button onClick={() => setIsCameraOn(!isCameraOn)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCameraOn ? 'bg-cyan/20 border border-cyan/40' : 'bg-red-500/30 border border-red-500/50'
                      }`}>
                      {isCameraOn ? <Video size={14} className="text-cyan" /> : <VideoOff size={14} className="text-red-500" />}
                    </button>
                  </div>
                </div>

                {/* Live Transcription */}
                <div className="glass-card p-4 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="notif-dot" />
                    <p className="text-xs font-semibold text-primary">Live Transcription</p>
                    <span className="badge-cyan text-[10px] ml-auto">AI Powered</span>
                  </div>
                  <p className="text-sm leading-relaxed text-secondary">
                    {transcription || <span className="opacity-50 italic">Listening for your answer...</span>}
                    {transcription && <span className="animate-blink">|</span>}
                  </p>
                </div>

                {/* Next Question Button */}
                <button onClick={nextQuestion} className="btn-purple py-3 text-sm flex items-center justify-center gap-2">
                  {currentQuestion < QUESTIONS.length - 1 ? (
                    <>Next Question <ChevronRight size={16} /></>
                  ) : (
                    <>Finish Interview ✓</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Stage */}
        {stage === 'results' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-3xl w-full">
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-green/20 border-2 border-green">
                  <CheckCircle size={36} className="text-green" />
                </div>
                <h1 className="text-3xl font-black text-primary mb-2">Interview Complete!</h1>
                <p className="text-secondary">Your AI interview has been processed. Here's your performance summary:</p>
              </div>

              {/* Score */}
              <div className="glass-card neon-border-green p-8 mb-6 text-center">
                <p className="text-sm mb-2 text-secondary">Overall Suitability Score</p>
                <p className="text-7xl font-black mb-2 text-green">{overallScore}%</p>
                <p className="text-lg text-primary font-semibold">Excellent Candidate</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={18} fill={i < 5 ? '#F59E0B' : 'none'} className="text-amber" />
                  ))}
                </div>
              </div>

              {/* Category Scores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {['Technical', 'Communication', 'Behavioral', 'Problem-Solving'].map((cat, i) => {
                  const score = 75 + Math.floor(Math.random() * 25);
                  return (
                    <div key={cat} className="glass-card p-4 text-center">
                      <BarChart2 size={20} className="mx-auto mb-2 text-cyan" />
                      <p className="text-xl font-black text-primary">{score}%</p>
                      <p className="text-xs mt-1 text-secondary">{cat}</p>
                    </div>
                  );
                })}
              </div>

              {/* AI Summary */}
              <div className="glass-card p-6 mb-6 bg-cyan/5 border border-cyan/15">
                <div className="flex items-center gap-2 mb-3">
                  <Bot size={16} className="text-purple" />
                  <p className="text-primary font-semibold">AI Assessment Summary</p>
                </div>
                <p className="text-sm leading-relaxed text-secondary">
                  The candidate demonstrates strong technical proficiency in React and modern frontend development.
                  Communication is clear and articulate, with excellent ability to structure technical explanations.
                  Problem-solving approach is methodical and shows deep understanding of performance optimization.
                  Highly recommended for senior-level React positions with immediate availability.
                </p>
              </div>

              {/* Success Message */}
              <div className="glass-card p-6 mb-6 bg-green/5 border border-green/15">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-green" />
                  <p className="text-primary font-semibold">Interview Submitted</p>
                </div>
                <p className="text-sm text-secondary">
                  Your AI interview results have been sent to the employer. They will review your performance and may contact you if interested.
                </p>
              </div>

              <div className="flex gap-4">
                <button className="btn-cyan flex-1 py-3 text-sm" onClick={() => navigate('/jobs/browse')}>
                  Back to Job Search
                </button>
                <button className="btn-ghost-cyan flex-1 py-3 text-sm" onClick={() => navigate('/freelancer/dashboard')}>
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}