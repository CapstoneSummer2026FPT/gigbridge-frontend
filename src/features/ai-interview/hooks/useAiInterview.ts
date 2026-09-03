import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  aiInterviewAPI,
  type AiInterviewQuestionResponse,
} from '../../../api/externalAPI/aiInterviewAPI';
import { getProposalReviewPath } from '../../proposals/utils/proposalRoutes';

// ─── Types ────────────────────────────────────────────────────────────────────
export type InterviewStage = 'intro' | 'interview' | 'results';
export type AnswerState = 'idle' | 'recording' | 'transcribing' | 'review' | 'submitting';
export type TtsState = 'idle' | 'streaming' | 'ready' | 'playing' | 'failed';

interface InterviewRouteState {
  jobPostId?: string;
  jobTitle?: string;
  interviewDefinitionId?: string | null;
  proposalId?: string;
  job?: { id?: string; jobPostsId?: string; title?: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const responseValue = <T,>(
  response: AiInterviewQuestionResponse,
  camelKey: keyof AiInterviewQuestionResponse,
  snakeKey: keyof AiInterviewQuestionResponse
) => (response[camelKey] ?? response[snakeKey]) as T | undefined;

export const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

export const splitSubtitleCues = (text: string) => {
  const displayText = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .trim();
  const sentences = displayText
    .split(/(?<=[.!?…])\s+/)
    .map(s => s.trim())
    .filter(Boolean) ?? [];
  return sentences.length ? sentences : displayText ? [displayText] : [];
};

const subtitleCueWeight = (cue: string) => {
  const words = cue.match(/[\p{L}\p{N}]+(?:[.'\u2019-][\p{L}\p{N}]+)*/gu) ?? [];
  const spokenWeight = words.reduce((t, w) => t + .72 + Math.min(w.length, 12) * .045, 0);
  const shortPauseWeight = (cue.match(/[,;:]/g) ?? []).length * .18;
  const longPauseWeight = (cue.match(/[.!?\u2026]/g) ?? []).length * .34;
  return Math.max(1, spokenWeight + shortPauseWeight + longPauseWeight);
};

const detectSubtitleCueStarts = async (audioBlob: Blob, cues: string[]) => {
  if (cues.length < 2) return cues.length ? [0] : [];
  const AudioContextCtor = window.AudioContext
    || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return [];
  const context = new AudioContextCtor();
  try {
    const decoded = await context.decodeAudioData(await audioBlob.arrayBuffer());
    const frameSeconds = .02;
    const frameSize = Math.max(1, Math.floor(decoded.sampleRate * frameSeconds));
    const frameCount = Math.ceil(decoded.length / frameSize);
    const energy = new Float32Array(frameCount);
    for (let frame = 0; frame < frameCount; frame++) {
      const from = frame * frameSize;
      const to = Math.min(decoded.length, from + frameSize);
      let sumSquares = 0, sampleCount = 0;
      for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
        const samples = decoded.getChannelData(ch);
        for (let s = from; s < to; s += 4) { sumSquares += samples[s] * samples[s]; sampleCount++; }
      }
      energy[frame] = sampleCount ? Math.sqrt(sumSquares / sampleCount) : 0;
    }
    const weights = cues.map(subtitleCueWeight);
    const totalWeight = weights.reduce((t, w) => t + w, 0) || 1;
    const starts = [0];
    let cumWeight = 0;
    for (let i = 0; i < cues.length - 1; i++) {
      cumWeight += weights[i];
      const expected = Math.round((cumWeight / totalWeight) * frameCount);
      const radius = Math.max(18, Math.min(65, Math.round(frameCount * .09)));
      const earliest = Math.max(Math.round((starts[starts.length - 1] + .28) / frameSeconds), expected - radius);
      const latest = Math.min(frameCount - 2, expected + radius);
      let quietest = Math.max(earliest, Math.min(latest, expected));
      let best = Number.POSITIVE_INFINITY;
      for (let f = earliest; f <= latest; f++) {
        const smoothed = ((energy[f - 1] ?? energy[f]) + energy[f] + (energy[f + 1] ?? energy[f])) / 3;
        const penalty = Math.abs(f - expected) / Math.max(1, radius) * .012;
        const score = smoothed + penalty;
        if (score < best) { best = score; quietest = f; }
      }
      const threshold = Math.max(.006, Math.min(.018, energy[quietest] * 2.4));
      let onset = quietest;
      const limit = Math.min(latest, quietest + 12);
      while (onset < limit && energy[onset] <= threshold) onset++;
      starts.push(Math.min(decoded.duration, onset * frameSeconds));
    }
    return starts;
  } catch { return []; }
  finally { if (context.state !== 'closed') void context.close(); }
};

const preferredRecorderMimeType = () => {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) || '';
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAiInterview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { jobPostId: routeJobPostId } = useParams<{ jobPostId?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useApp();
  const { t, i18n } = useTranslation();
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
  const interviewDefinitionId = searchParams.get('definitionId') || routeState.interviewDefinitionId;
  const proposalId = useMemo(() => (
    searchParams.get('proposalId') || routeState.proposalId || ''
  ), [searchParams, routeState.proposalId]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [stage, setStage] = useState<InterviewStage>('intro');
  const [sessionId, setSessionId] = useState('');
  const [audioAccessToken, setAudioAccessToken] = useState('');
  const [questionIndex, setQuestionIndex] = useState(1);
  const [questionCount, setQuestionCount] = useState(3);
  const [questionText, setQuestionText] = useState('');
  const [interviewLanguage, setInterviewLanguage] = useState('auto');
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [transcript, setTranscript] = useState('');
  const [sttProvider, setSttProvider] = useState('');
  const [sttConfidence, setSttConfidence] = useState<number | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [ttsState, setTtsState] = useState<TtsState>('idle');
  const [ttsProvider, setTtsProvider] = useState('');
  const [subtitleCueIndex, setSubtitleCueIndex] = useState(-1);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const [actionError, setActionError] = useState('');

  const subtitleCues = useMemo(() => splitSubtitleCues(questionText), [questionText]);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingLimitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const questionAudioUrlRef = useRef('');
  const questionAudioAbortRef = useRef<AbortController | null>(null);
  const subtitleFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceFrameRef = useRef<number | null>(null);
  const speechDetectedRef = useRef(false);
  const silenceStartedAtRef = useRef<number | null>(null);
  const autoPlayedQuestionRef = useRef(0);

  // ── Internal helpers ───────────────────────────────────────────────────────
  const stopSilenceDetection = () => {
    if (silenceFrameRef.current !== null) cancelAnimationFrame(silenceFrameRef.current);
    silenceFrameRef.current = null;
    speechDetectedRef.current = false;
    silenceStartedAtRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== 'closed') void context.close();
  };

  const clearRecordingTimers = () => {
    if (recordingTickerRef.current) clearInterval(recordingTickerRef.current);
    if (recordingLimitRef.current) clearTimeout(recordingLimitRef.current);
    recordingTickerRef.current = null;
    recordingLimitRef.current = null;
  };

  const releaseMicrophone = () => {
    stopSilenceDetection();
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  };

  const clearQuestionAudio = () => {
    if (subtitleFrameRef.current !== null) cancelAnimationFrame(subtitleFrameRef.current);
    subtitleFrameRef.current = null;
    questionAudioAbortRef.current?.abort();
    questionAudioAbortRef.current = null;
    questionAudioRef.current?.pause();
    questionAudioRef.current = null;
    if (questionAudioUrlRef.current) URL.revokeObjectURL(questionAudioUrlRef.current);
    questionAudioUrlRef.current = '';
  };

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!jobPostId) return;
    const saved = localStorage.getItem(`ai_interview_session_${jobPostId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.sessionId) {
          setSessionId(parsed.sessionId);
          setAudioAccessToken(parsed.audioAccessToken || '');
          setQuestionIndex(parsed.questionIndex || 1);
          setQuestionCount(parsed.questionCount || 3);
          setQuestionText(parsed.questionText || '');
          setInterviewLanguage(parsed.interviewLanguage || 'auto');
          setTtsProvider(parsed.ttsProvider || 'streaming');
          setStage('interview');
          setAnswerState('idle');
        }
      } catch {
        localStorage.removeItem(`ai_interview_session_${jobPostId}`);
      }
    }
  }, [jobPostId]);

  useEffect(() => () => {
    clearRecordingTimers();
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') { recorder.onstop = null; recorder.stop(); }
    releaseMicrophone();
    clearQuestionAudio();
  }, []);

  useEffect(() => {
    if (stage !== 'interview') return;
    clearQuestionAudio();
    setSubtitleCueIndex(-1);
    setTtsState(audioAccessToken ? 'idle' : 'failed');
    return clearQuestionAudio;
  }, [audioAccessToken, questionIndex, stage]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const startInterview = async () => {
    if (!jobPostId) { setStartError(t('aiInterview.errors.chooseJob')); return; }
    setIsStarting(true);
    setStartError('');
    try {
      const preferred = (i18n.resolvedLanguage || i18n.language || user?.preferred_language || '').toLowerCase();
      const language = preferred.startsWith('vi') ? 'vi' : preferred.startsWith('en') ? 'en' : 'auto';
      const response = await aiInterviewAPI.start(jobPostId, language, interviewDefinitionId);
      const data = response.data;
      if (!response.success || !data) {
        setStartError(response.message?.includes('does not have any predefined questions')
          ? t('aiInterview.errors.noQuestions')
          : t('aiInterview.errors.startFailed'));
        return;
      }
      const nextSessionId = responseValue<string>(data, 'sessionId', 'session_id');
      const nextQuestion = responseValue<string | null>(data, 'questionText', 'question_text');
      const nextIndex = responseValue<number>(data, 'questionIndex', 'question_index') ?? 1;
      const nextCount = responseValue<number>(data, 'questionCount', 'question_count') ?? 3;
      const nextToken = responseValue<string | null>(data, 'audioAccessToken', 'audio_access_token');
      const nextTts = responseValue<string | null>(data, 'ttsProvider', 'tts_provider');
      const lang = data.language || language;
      if (!nextSessionId || !nextQuestion) { setStartError(t('aiInterview.errors.incompleteSession')); return; }
      setSessionId(nextSessionId);
      setAudioAccessToken(nextToken || '');
      setQuestionText(nextQuestion);
      setQuestionIndex(nextIndex);
      setQuestionCount(Math.max(nextIndex, nextCount));
      setTtsProvider(nextTts || 'streaming');
      setInterviewLanguage(lang || 'auto');
      setAnswerState('idle');
      setStage('interview');
      localStorage.setItem(`ai_interview_session_${jobPostId}`, JSON.stringify({
        sessionId: nextSessionId, audioAccessToken: nextToken || '',
        questionIndex: nextIndex, questionCount: Math.max(nextIndex, nextCount),
        questionText: nextQuestion, interviewLanguage: lang || 'auto', ttsProvider: nextTts || 'streaming'
      }));
    } catch { setStartError(t('aiInterview.errors.startFailed')); }
    finally { setIsStarting(false); }
  };

  const transcribeRecording = async (audioBlob: Blob) => {
    const response = await aiInterviewAPI.transcribeAudio(sessionId, audioBlob, 'auto');
    if (!response.success || !response.data) {
      setActionError(response.message || t('aiInterview.errors.transcriptionFailed'));
      if (response.statusCode === 401 || response.statusCode === 404 || response.message?.includes('not found')) {
        localStorage.removeItem(`ai_interview_session_${jobPostId}`);
        setStage('intro');
      }
      setAnswerState('idle'); return;
    }
    const draft = response.data;
    setTranscript(draft.transcript);
    setSttProvider(draft.sttProvider ?? draft.stt_provider ?? 'speech-to-text');
    setSttConfidence(draft.confidence);
    setAnswerState('review');
  };

  const beginAnswer = async () => {
    setActionError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setActionError(t('aiInterview.errors.unsupportedRecording')); return;
    }
    try {
      questionAudioRef.current?.pause();
      setSubtitleCueIndex(-1);
      if (ttsState === 'playing') setTtsState('ready');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      mediaStreamRef.current = stream;
      recordingChunksRef.current = [];
      const mimeType = preferredRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      recorder.onerror = () => { clearRecordingTimers(); releaseMicrophone(); setActionError(t('aiInterview.errors.recordingFailed')); setAnswerState('idle'); };
      recorder.onstop = () => {
        clearRecordingTimers();
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
        releaseMicrophone();
        if (!blob.size) { setActionError(t('aiInterview.errors.noAudioCaptured')); setAnswerState('idle'); return; }
        void transcribeRecording(blob);
      };
      recorder.start(250);
      setRecordingSeconds(0);
      setSilenceCountdown(null);
      setAnswerState('recording');
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextCtor) {
        const context = new AudioContextCtor();
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        context.createMediaStreamSource(stream).connect(analyser);
        audioContextRef.current = context;
        const samples = new Uint8Array(analyser.fftSize);
        const monitorSilence = () => {
          if (recorder.state !== 'recording') return;
          analyser.getByteTimeDomainData(samples);
          let energy = 0;
          for (const s of samples) { const n = (s - 128) / 128; energy += n * n; }
          const volume = Math.sqrt(energy / samples.length);
          const now = performance.now();
          if (volume > 0.025) { speechDetectedRef.current = true; silenceStartedAtRef.current = null; setSilenceCountdown(null); }
          else if (speechDetectedRef.current) {
            silenceStartedAtRef.current ??= now;
            const silentFor = now - silenceStartedAtRef.current;
            setSilenceCountdown(Math.max(0, Math.ceil((3000 - silentFor) / 1000)));
            if (silentFor >= 3000) { setAnswerState('transcribing'); recorder.stop(); return; }
          }
          silenceFrameRef.current = requestAnimationFrame(monitorSilence);
        };
        silenceFrameRef.current = requestAnimationFrame(monitorSilence);
      }
      recordingTickerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
      recordingLimitRef.current = setTimeout(() => {
        if (recorder.state === 'recording') { setAnswerState('transcribing'); recorder.stop(); }
      }, 90_000);
    } catch (err) {
      clearRecordingTimers(); releaseMicrophone();
      setActionError(err instanceof DOMException && err.name === 'NotAllowedError'
        ? t('aiInterview.errors.microphoneDenied')
        : t('aiInterview.errors.microphoneUnavailable'));
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
    if (recorder?.state === 'recording') { recorder.onstop = null; recorder.stop(); }
    clearRecordingTimers(); releaseMicrophone(); recordingChunksRef.current = [];
    setRecordingSeconds(0); setSilenceCountdown(null); setAnswerState('idle');
  };

  const recordAgain = () => { setTranscript(''); setSttProvider(''); setSttConfidence(null); setActionError(''); setAnswerState('idle'); };

  const confirmAnswer = async () => {
    const correctedText = transcript.trim();
    if (!correctedText) { setActionError(t('aiInterview.errors.noTranscript')); return; }
    setActionError(''); setAnswerState('submitting');
    const response = await aiInterviewAPI.confirmAnswer(sessionId, correctedText);
    const data = response.data;
    if (!response.success || !data) {
      setActionError(t('aiInterview.errors.submitFailed'));
      if (response.statusCode === 401 || response.statusCode === 404 || response.message?.includes('not found')) {
        localStorage.removeItem(`ai_interview_session_${jobPostId}`); setStage('intro');
      }
      setAnswerState('review'); return;
    }
    const completed = responseValue<boolean>(data, 'isCompleted', 'is_completed') ?? false;
    if (completed) {
      localStorage.removeItem(`ai_interview_session_${jobPostId}`);
      // The AI interview is step 2 of the proposal flow. It never submits the proposal —
      // the freelancer confirms everything on the review step instead.
      if (proposalId) {
        setAnswerState('idle');
        navigate(getProposalReviewPath(proposalId), { replace: true });
        return;
      }
      setStage('results'); setAnswerState('idle'); return;
    }
    const nextQuestion = responseValue<string | null>(data, 'questionText', 'question_text');
    const nextIndex = responseValue<number>(data, 'questionIndex', 'question_index');
    const nextCount = responseValue<number>(data, 'questionCount', 'question_count');
    const nextTts = responseValue<string | null>(data, 'ttsProvider', 'tts_provider');
    if (!nextQuestion || !nextIndex) { setActionError(t('aiInterview.errors.nextQuestionMissing')); setAnswerState('review'); return; }
    setQuestionText(nextQuestion); setQuestionIndex(nextIndex);
    if (nextCount) setQuestionCount(Math.max(nextIndex, nextCount));
    setTtsProvider(nextTts || 'streaming'); setInterviewLanguage(data.language || interviewLanguage);
    setTranscript(''); setSttProvider(''); setSttConfidence(null); setRecordingSeconds(0); setSilenceCountdown(null); setAnswerState('idle');
    localStorage.setItem(`ai_interview_session_${jobPostId}`, JSON.stringify({
      sessionId, audioAccessToken, questionIndex: nextIndex,
      questionCount: nextCount ? Math.max(nextIndex, nextCount) : questionCount,
      questionText: nextQuestion, interviewLanguage: data.language || interviewLanguage, ttsProvider: nextTts || 'streaming'
    }));
  };

  const playQuestion = async () => {
    setActionError('');
    if (questionAudioRef.current && ttsState === 'ready') {
      try { questionAudioRef.current.currentTime = 0; await questionAudioRef.current.play(); }
      catch { setTtsState('failed'); setActionError(t('aiInterview.errors.replayFailed')); }
      return;
    }
    if (!audioAccessToken) { setTtsState('failed'); setActionError(t('aiInterview.errors.voiceUnavailable')); return; }
    clearQuestionAudio();
    const controller = new AbortController();
    questionAudioAbortRef.current = controller;
    setTtsState('streaming');
    const bindSubtitlePlayback = (player: HTMLAudioElement, detectedStarts: number[]) => {
      const cueWeights = subtitleCues.map(subtitleCueWeight);
      const totalWeight = cueWeights.reduce((t, w) => t + w, 0) || 1;
      const estimatedDuration = Math.max(2.5, totalWeight / 2.65);
      const stopClock = () => { if (subtitleFrameRef.current !== null) cancelAnimationFrame(subtitleFrameRef.current); subtitleFrameRef.current = null; };
      const syncCue = () => {
        if (detectedStarts.length === subtitleCues.length) {
          const t = player.currentTime + .025;
          let cue = 0;
          for (let i = 1; i < detectedStarts.length; i++) { if (t < detectedStarts[i]) break; cue = i; }
          setSubtitleCueIndex(c => c === cue ? c : cue); return;
        }
        const duration = Number.isFinite(player.duration) && player.duration > 0 ? player.duration : estimatedDuration;
        const leadIn = Math.min(.16, duration * .025); const leadOut = Math.min(.14, duration * .02);
        const spokenDuration = Math.max(.5, duration - leadIn - leadOut);
        const spokenTime = Math.max(0, Math.min(spokenDuration, player.currentTime - leadIn));
        const progressWeight = (spokenTime / spokenDuration) * totalWeight;
        let cum = 0; let nextCue = Math.max(0, subtitleCues.length - 1);
        for (let i = 0; i < cueWeights.length; i++) { cum += cueWeights[i]; if (progressWeight < cum) { nextCue = i; break; } }
        setSubtitleCueIndex(c => c === nextCue ? c : nextCue);
      };
      const runClock = () => { syncCue(); if (!player.paused && !player.ended) subtitleFrameRef.current = requestAnimationFrame(runClock); };
      player.onplay  = () => { stopClock(); setTtsState('playing'); setSubtitleCueIndex(subtitleCues.length ? 0 : -1); subtitleFrameRef.current = requestAnimationFrame(runClock); };
      player.onended = () => { stopClock(); setSubtitleCueIndex(-1); setTtsState('ready'); };
      player.onerror = () => { stopClock(); setSubtitleCueIndex(-1); setTtsState('failed'); };
    };
    try {
      const response = await aiInterviewAPI.streamQuestionAudio(sessionId, questionIndex, audioAccessToken, controller.signal);
      if (!response.body) throw new Error('audio_stream_unavailable');
      const contentType = (response.headers.get('Content-Type') || 'audio/mpeg').split(';')[0];
      const reader = response.body.getReader(); const chunks: Uint8Array[] = [];
      while (true) { const { done, value } = await reader.read(); if (done) break; if (value?.byteLength) chunks.push(value); }
      if (!chunks.length) throw new Error('audio_stream_empty');
      const audioBlob = new Blob(chunks as BlobPart[], { type: contentType });
      const detectedStarts = await detectSubtitleCueStarts(audioBlob, subtitleCues);
      const objectUrl = URL.createObjectURL(audioBlob);
      questionAudioUrlRef.current = objectUrl;
      const player = new Audio(objectUrl); player.preload = 'auto';
      bindSubtitlePlayback(player, detectedStarts);
      questionAudioRef.current = player;
      await player.play();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setSubtitleCueIndex(-1); setTtsState('failed');
      setActionError(t('aiInterview.errors.audioStreamFailed'));
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('401') || msg.includes('403') || msg.includes('404')) {
        localStorage.removeItem(`ai_interview_session_${jobPostId}`); setStage('intro');
      }
    } finally { if (questionAudioAbortRef.current === controller) questionAudioAbortRef.current = null; }
  };

  useEffect(() => {
    if (stage !== 'interview' || !audioAccessToken || autoPlayedQuestionRef.current === questionIndex) return;
    autoPlayedQuestionRef.current = questionIndex;
    void playQuestion();
  }, [audioAccessToken, questionIndex, stage]);

  return {
    // Context
    navigate, t,
    jobPostId, jobTitle, proposalId,
    // Stage
    stage,
    // Interview state
    sessionId, audioAccessToken,
    questionIndex, questionCount, interviewLanguage,
    answerState, transcript, sttProvider, sttConfidence,
    recordingSeconds, ttsState, ttsProvider,
    subtitleCueIndex, subtitleCues, silenceCountdown,
    // Intro state
    isStarting, startError,
    // Error
    actionError,
    // Actions
    startInterview,
    beginAnswer, finishAnswer, cancelAnswer, recordAgain, confirmAnswer,
    playQuestion,
  };
}
