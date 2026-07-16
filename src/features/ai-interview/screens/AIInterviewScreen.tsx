import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  AlertCircle,
  Bot,
  CheckCircle,
  ChevronRight,
  LoaderCircle,
  Mic,
  Play,
  RotateCcw,
  Send,
  Square,
  Star,
  Video,
  Volume2,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import {
  aiInterviewAPI,
  type AiInterviewFeedback,
  type AiInterviewQuestionResponse,
} from '../../../api/externalAPI/aiInterviewAPI';
import '../styles/ai-interview-screen.css';

type InterviewStage = 'intro' | 'interview' | 'results';
type AnswerState = 'idle' | 'recording' | 'transcribing' | 'review' | 'submitting';
type TtsState = 'idle' | 'streaming' | 'ready' | 'playing' | 'failed';

interface InterviewRouteState {
  jobPostId?: string;
  jobTitle?: string;
  job?: {
    id?: string;
    jobPostsId?: string;
    title?: string;
  };
}

const responseValue = <T,>(
  response: AiInterviewQuestionResponse,
  camelKey: keyof AiInterviewQuestionResponse,
  snakeKey: keyof AiInterviewQuestionResponse
) => (response[camelKey] ?? response[snakeKey]) as T | undefined;

const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

const preferredRecorderMimeType = () => {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
};

export default function AIInterviewScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { jobPostId: routeJobPostId } = useParams<{ jobPostId?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useApp();
  const routeState = (location.state || {}) as InterviewRouteState;
  const jobPostId = useMemo(() => (
    routeJobPostId
    || searchParams.get('jobPostId')
    || searchParams.get('job')
    || routeState.jobPostId
    || routeState.job?.jobPostsId
    || routeState.job?.id
    || ''
  ), [routeJobPostId, routeState.job?.id, routeState.job?.jobPostsId, routeState.jobPostId, searchParams]);
  const jobTitle = routeState.jobTitle || routeState.job?.title;

  const [stage, setStage] = useState<InterviewStage>('intro');
  const [sessionId, setSessionId] = useState('');
  const [audioAccessToken, setAudioAccessToken] = useState('');
  const [questionIndex, setQuestionIndex] = useState(1);
  const [questionText, setQuestionText] = useState('');
  const [interviewLanguage, setInterviewLanguage] = useState('auto');
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [transcript, setTranscript] = useState('');
  const [sttProvider, setSttProvider] = useState('');
  const [sttConfidence, setSttConfidence] = useState<number | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [ttsState, setTtsState] = useState<TtsState>('idle');
  const [feedback, setFeedback] = useState<AiInterviewFeedback | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const [actionError, setActionError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingLimitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const questionAudioUrlRef = useRef('');
  const questionAudioAbortRef = useRef<AbortController | null>(null);

  const clearRecordingTimers = () => {
    if (recordingTickerRef.current) clearInterval(recordingTickerRef.current);
    if (recordingLimitRef.current) clearTimeout(recordingLimitRef.current);
    recordingTickerRef.current = null;
    recordingLimitRef.current = null;
  };

  const releaseMicrophone = () => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  };

  const clearQuestionAudio = () => {
    questionAudioAbortRef.current?.abort();
    questionAudioAbortRef.current = null;
    questionAudioRef.current?.pause();
    questionAudioRef.current = null;
    if (questionAudioUrlRef.current) URL.revokeObjectURL(questionAudioUrlRef.current);
    questionAudioUrlRef.current = '';
  };

  useEffect(() => () => {
    clearRecordingTimers();
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.onstop = null;
      recorder.stop();
    }
    releaseMicrophone();
    clearQuestionAudio();
  }, []);

  useEffect(() => {
    if (stage !== 'interview') return;
    clearQuestionAudio();
    setTtsState(audioAccessToken ? 'idle' : 'failed');
    return clearQuestionAudio;
  }, [audioAccessToken, questionIndex, stage]);

  const startInterview = async () => {
    if (!jobPostId) {
      setStartError('Choose a job before starting an AI interview.');
      return;
    }

    setIsStarting(true);
    setStartError('');

    try {
      const preferredLanguage = user?.preferred_language?.toLowerCase() || '';
      const language = preferredLanguage.startsWith('vi')
        ? 'vi'
        : preferredLanguage.startsWith('en')
          ? 'en'
          : 'auto';
      const response = await aiInterviewAPI.start(jobPostId, language);
      const data = response.data;

      if (!response.success || !data) {
        setStartError(response.message || 'The AI interview could not be started. Please try again.');
        return;
      }

      const nextSessionId = responseValue<string>(data, 'sessionId', 'session_id');
      const nextQuestion = responseValue<string | null>(data, 'questionText', 'question_text');
      const nextQuestionIndex = responseValue<number>(data, 'questionIndex', 'question_index') ?? 1;
      const nextAudioToken = responseValue<string | null>(data, 'audioAccessToken', 'audio_access_token');
      const responseLanguage = data.language || language;

      if (!nextSessionId || !nextQuestion) {
        setStartError('The interview service returned an incomplete session. Please try again.');
        return;
      }

      setSessionId(nextSessionId);
      setAudioAccessToken(nextAudioToken || '');
      setQuestionText(nextQuestion);
      setQuestionIndex(nextQuestionIndex);
      setInterviewLanguage(responseLanguage || 'auto');
      setAnswerState('idle');
      setStage('interview');
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'The AI interview could not be started. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const transcribeRecording = async (audioBlob: Blob) => {
    const response = await aiInterviewAPI.transcribeAudio(sessionId, audioBlob, interviewLanguage);
    if (!response.success || !response.data) {
      setActionError(response.message || 'Your answer could not be transcribed. Please record it again.');
      setAnswerState('idle');
      return;
    }

    const draft = response.data;
    setTranscript(draft.transcript);
    setInterviewLanguage(draft.language || interviewLanguage);
    setSttProvider(draft.sttProvider ?? draft.stt_provider ?? 'speech-to-text');
    setSttConfidence(draft.confidence);
    setAnswerState('review');
  };

  const beginAnswer = async () => {
    setActionError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setActionError('This browser does not support microphone recording. Please use a current Chrome, Edge, Firefox, or Safari browser.');
      return;
    }

    try {
      questionAudioRef.current?.pause();
      if (ttsState === 'playing') setTtsState('ready');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      recordingChunksRef.current = [];
      const mimeType = preferredRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = event => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        clearRecordingTimers();
        releaseMicrophone();
        setActionError('The browser could not record your answer. Please try again.');
        setAnswerState('idle');
      };
      recorder.onstop = () => {
        clearRecordingTimers();
        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        });
        releaseMicrophone();
        if (!blob.size) {
          setActionError('No audio was captured. Please record your answer again.');
          setAnswerState('idle');
          return;
        }
        void transcribeRecording(blob);
      };

      recorder.start(250);
      setRecordingSeconds(0);
      setAnswerState('recording');
      recordingTickerRef.current = setInterval(
        () => setRecordingSeconds(seconds => seconds + 1),
        1000
      );
      recordingLimitRef.current = setTimeout(() => {
        if (recorder.state === 'recording') {
          setAnswerState('transcribing');
          recorder.stop();
        }
      }, 90_000);
    } catch (error) {
      clearRecordingTimers();
      releaseMicrophone();
      setActionError(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Allow microphone access and try again.'
          : 'The microphone could not be opened. Please check your device and try again.'
      );
      setAnswerState('idle');
    }
  };

  const finishAnswer = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state !== 'recording') return;
    setAnswerState('transcribing');
    recorder.stop();
  };

  const cancelAnswer = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.onstop = null;
      recorder.stop();
    }
    clearRecordingTimers();
    releaseMicrophone();
    recordingChunksRef.current = [];
    setRecordingSeconds(0);
    setAnswerState('idle');
  };

  const recordAgain = () => {
    setTranscript('');
    setSttProvider('');
    setSttConfidence(null);
    setActionError('');
    setAnswerState('idle');
  };

  const confirmAnswer = async () => {
    const correctedText = transcript.trim();
    if (!correctedText) {
      setActionError('Review your transcript and enter an answer before submitting.');
      return;
    }

    setActionError('');
    setAnswerState('submitting');
    const response = await aiInterviewAPI.confirmAnswer(sessionId, correctedText);
    const data = response.data;
    if (!response.success || !data) {
      setActionError(response.message || 'Your answer could not be submitted. Please try again.');
      setAnswerState('review');
      return;
    }

    const completed = responseValue<boolean>(data, 'isCompleted', 'is_completed') ?? false;
    if (completed) {
      setFeedback(data.feedback || null);
      setStage('results');
      setAnswerState('idle');
      return;
    }

    const nextQuestion = responseValue<string | null>(data, 'questionText', 'question_text');
    const nextQuestionIndex = responseValue<number>(data, 'questionIndex', 'question_index');
    if (!nextQuestion || !nextQuestionIndex) {
      setActionError('The interview service did not return the next question. Please try again.');
      setAnswerState('review');
      return;
    }

    setQuestionText(nextQuestion);
    setQuestionIndex(nextQuestionIndex);
    setInterviewLanguage(data.language || interviewLanguage);
    setTranscript('');
    setSttProvider('');
    setSttConfidence(null);
    setRecordingSeconds(0);
    setAnswerState('idle');
  };

  const playQuestion = async () => {
    setActionError('');
    if (questionAudioRef.current && ttsState === 'ready') {
      try {
        questionAudioRef.current.currentTime = 0;
        await questionAudioRef.current.play();
      } catch {
        setTtsState('failed');
        setActionError('Question audio could not be replayed. You can continue using the question text.');
      }
      return;
    }

    if (!audioAccessToken) {
      setTtsState('failed');
      setActionError('The interview audio token is unavailable. You can continue using the question text.');
      return;
    }

    clearQuestionAudio();
    const controller = new AbortController();
    questionAudioAbortRef.current = controller;
    setTtsState('streaming');

    try {
      const response = await aiInterviewAPI.streamQuestionAudio(
        sessionId,
        questionIndex,
        audioAccessToken,
        controller.signal
      );
      if (!response.body) throw new Error('The browser did not expose the audio response stream.');

      const contentType = (response.headers.get('Content-Type') || 'audio/mpeg').split(';')[0];
      const supportsMediaSource = typeof MediaSource !== 'undefined'
        && MediaSource.isTypeSupported(contentType);

      if (supportsMediaSource) {
        const mediaSource = new MediaSource();
        const objectUrl = URL.createObjectURL(mediaSource);
        questionAudioUrlRef.current = objectUrl;
        const player = new Audio(objectUrl);
        player.onplay = () => setTtsState('playing');
        player.onended = () => setTtsState('ready');
        player.onerror = () => setTtsState('failed');
        questionAudioRef.current = player;

        const playPromise = player.play();
        await new Promise<void>((resolve, reject) => {
          mediaSource.addEventListener('sourceopen', () => resolve(), { once: true });
          mediaSource.addEventListener('error', () => reject(new Error('Audio stream could not be opened.')), { once: true });
        });

        const sourceBuffer = mediaSource.addSourceBuffer(contentType);
        const reader = response.body.getReader();
        let receivedAudio = false;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value?.byteLength) continue;
          receivedAudio = true;
          const audioBytes = value.buffer.slice(
            value.byteOffset,
            value.byteOffset + value.byteLength
          ) as ArrayBuffer;
          await new Promise<void>((resolve, reject) => {
            sourceBuffer.addEventListener('updateend', () => resolve(), { once: true });
            sourceBuffer.addEventListener('error', () => reject(new Error('Audio chunk could not be appended.')), { once: true });
            sourceBuffer.appendBuffer(audioBytes);
          });
        }
        if (!receivedAudio) throw new Error('The TTS provider returned no audio.');
        if (mediaSource.readyState === 'open' && !sourceBuffer.updating) mediaSource.endOfStream();
        await playPromise;
      } else {
        // Safari and older browsers without MP3 MediaSource support retain a
        // complete-file fallback while modern browsers play progressively.
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value?.byteLength) chunks.push(value);
        }
        if (!chunks.length) throw new Error('The TTS provider returned no audio.');
        const objectUrl = URL.createObjectURL(new Blob(chunks as BlobPart[], { type: contentType }));
        questionAudioUrlRef.current = objectUrl;
        const player = new Audio(objectUrl);
        player.onplay = () => setTtsState('playing');
        player.onended = () => setTtsState('ready');
        player.onerror = () => setTtsState('failed');
        questionAudioRef.current = player;
        await player.play();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setTtsState('failed');
      setActionError(
        error instanceof Error
          ? error.message
          : 'Question audio could not be streamed. You can continue using the question text.'
      );
    } finally {
      if (questionAudioAbortRef.current === controller) questionAudioAbortRef.current = null;
    }
  };

  const score = feedback?.score ?? 0;
  const technicalSkills = feedback?.technicalSkills ?? feedback?.technical_skills ?? [];
  const softSkills = feedback?.softSkills ?? feedback?.soft_skills ?? [];
  const recommendedHire = feedback?.recommendedHire ?? feedback?.recommended_hire ?? false;

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-8rem)] flex flex-col">
        {stage === 'intro' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full text-center">
              <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center animate-orb bg-gradient-to-br from-purple to-cyan">
                <Video size={40} className="text-background" />
              </div>
              <h1 className="text-4xl font-black text-primary mb-4">AI Instant Interview</h1>
              <p className="text-lg mb-8 text-secondary">
                Answer one question at a time. Your microphone is only active while you are recording an answer.
              </p>

              {jobTitle && (
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple/30 bg-purple/10 px-4 py-2 text-sm text-primary">
                  <Bot size={15} className="text-purple" />
                  Interviewing for <span className="font-semibold">{jobTitle}</span>
                </div>
              )}

              <div className="glass-card p-6 mb-8 text-left">
                <h2 className="text-primary font-semibold mb-4">How it works</h2>
                <div className="space-y-3 text-sm text-secondary">
                  <p>1. Listen to or read the AI-generated interview question.</p>
                  <p>2. Press <span className="font-semibold text-primary">Answer question</span> when you are ready.</p>
                  <p>3. Press <span className="font-semibold text-primary">Finish answer</span> to stop recording and transcribe your response.</p>
                  <p>4. Review the transcript, then submit it for the next question.</p>
                </div>
              </div>

              {startError && (
                <div role="alert" className="mb-5 flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                  <AlertCircle size={16} />
                  <span>{startError}</span>
                </div>
              )}

              <button
                className="btn-purple px-10 py-4 text-base flex items-center gap-2 mx-auto disabled:cursor-not-allowed disabled:opacity-60"
                onClick={startInterview}
                disabled={isStarting}
              >
                {isStarting ? <LoaderCircle size={20} className="animate-spin" /> : <Video size={20} />}
                {isStarting ? 'Starting Interview...' : 'Start AI Interview'}
                {!isStarting && <ChevronRight size={20} />}
              </button>

              {!jobPostId && (
                <button className="mt-4 text-sm font-semibold text-cyan hover:underline" onClick={() => navigate('/jobs/browse')}>
                  Browse jobs to choose an interview role
                </button>
              )}
            </div>
          </div>
        )}

        {stage === 'interview' && (
          <div className="flex-1 flex flex-col p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-secondary">AI interview</p>
                <h1 className="text-xl font-bold text-primary">Question {questionIndex}</h1>
              </div>
              <span className="badge-cyan text-[10px]">Session active</span>
            </div>

            {actionError && (
              <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                <AlertCircle size={16} className="shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-2">
              <section className="glass-card flex flex-col overflow-hidden">
                <div className="relative flex min-h-[220px] flex-1 items-center justify-center bg-gradient-to-br from-purple/10 to-cyan/10 p-8">
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center bg-gradient-to-br from-purple to-cyan ${ttsState === 'playing' ? 'animate-orb' : ''}`}>
                    <Bot size={56} className="text-background" />
                  </div>
                  <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-purple/40 bg-purple/20 px-3 py-1.5">
                    <Bot size={12} className="text-purple" />
                    <span className="text-xs font-medium text-primary">GigBridge AI Interviewer</span>
                  </div>
                </div>

                <div className="p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple">Current question</p>
                  <p className="text-base font-medium leading-relaxed text-primary">{questionText}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={playQuestion}
                      disabled={ttsState === 'streaming' || ttsState === 'playing' || !audioAccessToken}
                      className="btn-ghost-cyan flex items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {ttsState === 'streaming' ? (
                        <LoaderCircle size={15} className="animate-spin" />
                      ) : ttsState === 'playing' ? (
                        <Volume2 size={15} />
                      ) : (
                        <Play size={15} />
                      )}
                      {ttsState === 'streaming'
                        ? 'Streaming voice...'
                        : ttsState === 'playing'
                          ? 'Playing question'
                          : ttsState === 'failed'
                            ? 'Retry voice'
                            : 'Play question'}
                    </button>
                    <span className="text-xs text-secondary">You can replay the question before answering.</span>
                  </div>
                </div>
              </section>

              <section className="glass-card flex flex-col p-5 md:p-6">
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan">Your answer</p>
                  <h2 className="mt-1 text-lg font-bold text-primary">
                    {answerState === 'review' ? 'Review your transcript' : 'Record when you are ready'}
                  </h2>
                </div>

                {answerState === 'idle' && (
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-cyan/30 bg-cyan/10">
                      <Mic size={30} className="text-cyan" />
                    </div>
                    <p className="mb-6 max-w-sm text-sm text-secondary">
                      Your microphone is currently off. Press the button only when you are ready to answer this question.
                    </p>
                    <button onClick={beginAnswer} className="btn-purple flex items-center gap-2 px-8 py-3 text-sm">
                      <Mic size={17} />
                      Answer question
                    </button>
                  </div>
                )}

                {answerState === 'recording' && (
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <div className="mb-4 flex h-20 w-20 animate-pulse items-center justify-center rounded-full border border-red-500/40 bg-red-500/15">
                      <Mic size={30} className="text-red-500" />
                    </div>
                    <p className="text-2xl font-black text-primary">{formatDuration(recordingSeconds)}</p>
                    <p className="mb-6 mt-2 text-sm text-secondary">Recording your answer · 90 seconds maximum</p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button onClick={finishAnswer} className="btn-purple flex items-center gap-2 px-6 py-3 text-sm">
                        <Square size={15} fill="currentColor" />
                        Finish answer
                      </button>
                      <button onClick={cancelAnswer} className="btn-ghost-cyan px-6 py-3 text-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {answerState === 'transcribing' && (
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <LoaderCircle size={38} className="mb-4 animate-spin text-cyan" />
                    <p className="font-semibold text-primary">Transcribing your answer...</p>
                    <p className="mt-2 text-sm text-secondary">The speech-to-text service is processing your recording.</p>
                  </div>
                )}

                {answerState === 'review' && (
                  <div className="flex flex-1 flex-col">
                    <label htmlFor="interview-transcript" className="mb-2 text-sm font-semibold text-primary">
                      Transcript
                    </label>
                    <textarea
                      id="interview-transcript"
                      value={transcript}
                      onChange={event => setTranscript(event.target.value)}
                      rows={9}
                      className="w-full flex-1 resize-none rounded-xl border border-border bg-background/60 p-4 text-sm leading-relaxed text-primary outline-none transition focus:border-cyan"
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-secondary">
                      <span>Provider: {sttProvider}</span>
                      {sttConfidence !== null && <span>· Confidence: {Math.round(sttConfidence * 100)}%</span>}
                      <span>· Edit any transcription mistakes before submitting.</span>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button onClick={recordAgain} className="btn-ghost-cyan flex items-center gap-2 px-5 py-3 text-sm">
                        <RotateCcw size={15} />
                        Record again
                      </button>
                      <button onClick={confirmAnswer} className="btn-purple flex flex-1 items-center justify-center gap-2 px-5 py-3 text-sm">
                        <Send size={15} />
                        Submit answer
                      </button>
                    </div>
                  </div>
                )}

                {answerState === 'submitting' && (
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <LoaderCircle size={38} className="mb-4 animate-spin text-purple" />
                    <p className="font-semibold text-primary">Generating the next question...</p>
                    <p className="mt-2 text-sm text-secondary">The AI interviewer is reviewing your answer.</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {stage === 'results' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-3xl w-full">
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-green/20 border-2 border-green">
                  <CheckCircle size={36} className="text-green" />
                </div>
                <h1 className="text-3xl font-black text-primary mb-2">Interview Complete</h1>
                <p className="text-secondary">Your answers were evaluated from the completed interview transcript.</p>
              </div>

              <div className="glass-card neon-border-green p-8 mb-6 text-center">
                <p className="text-sm mb-2 text-secondary">Overall Suitability Score</p>
                <p className="text-7xl font-black mb-2 text-green">{score}%</p>
                <p className="text-lg text-primary font-semibold">
                  {recommendedHire ? 'Recommended candidate' : 'Further review recommended'}
                </p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      size={18}
                      fill={index < Math.round(score / 20) ? '#F59E0B' : 'none'}
                      className="text-amber"
                    />
                  ))}
                </div>
              </div>

              <div className="glass-card p-6 mb-6 bg-cyan/5 border border-cyan/15">
                <div className="flex items-center gap-2 mb-3">
                  <Bot size={16} className="text-purple" />
                  <p className="text-primary font-semibold">AI assessment</p>
                </div>
                <p className="text-sm leading-relaxed text-secondary">
                  {feedback?.summary || 'Automated feedback is temporarily unavailable.'}
                </p>
              </div>

              {(technicalSkills.length > 0 || softSkills.length > 0) && (
                <div className="mb-6 grid gap-4 md:grid-cols-2">
                  <div className="glass-card p-5">
                    <p className="mb-3 font-semibold text-primary">Technical skills</p>
                    <div className="flex flex-wrap gap-2">
                      {technicalSkills.map(skill => <span key={skill} className="badge-cyan">{skill}</span>)}
                    </div>
                  </div>
                  <div className="glass-card p-5">
                    <p className="mb-3 font-semibold text-primary">Soft skills</p>
                    <div className="flex flex-wrap gap-2">
                      {softSkills.map(skill => <span key={skill} className="badge-purple">{skill}</span>)}
                    </div>
                  </div>
                </div>
              )}

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
