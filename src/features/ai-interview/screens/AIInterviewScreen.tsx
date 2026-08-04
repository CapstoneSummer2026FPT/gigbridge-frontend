import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  AlertCircle,
  BellRing,
  Bot,
  Bug,
  CheckCircle,
  ChevronRight,
  Headphones,
  LoaderCircle,
  Mail,
  Mic,
  RotateCcw,
  Send,
  Square,
  Video,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  aiInterviewAPI,
  type AiInterviewQuestionResponse,
} from '../../../api/externalAPI/aiInterviewAPI';
import '../styles/ai-interview-screen.css';

type InterviewStage = 'intro' | 'interview' | 'results';
type AnswerState = 'idle' | 'recording' | 'transcribing' | 'review' | 'submitting';
type TtsState = 'idle' | 'streaming' | 'ready' | 'playing' | 'failed';

interface InterviewRouteState {
  jobPostId?: string;
  jobTitle?: string;
  interviewDefinitionId?: string | null;
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

const splitSubtitleCues = (text: string) => {
  const displayText = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .trim();
  const sentences = displayText
    .split(/(?<=[.!?…])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean) ?? [];

  return sentences.length ? sentences : displayText ? [displayText] : [];
};

const subtitleCueWeight = (cue: string) => {
  const words = cue.match(/[\p{L}\p{N}]+(?:[.'\u2019-][\p{L}\p{N}]+)*/gu) ?? [];
  const spokenWeight = words.reduce(
    (total, word) => total + .72 + Math.min(word.length, 12) * .045,
    0
  );
  const shortPauseWeight = (cue.match(/[,;:]/g) ?? []).length * .18;
  const longPauseWeight = (cue.match(/[.!?\u2026]/g) ?? []).length * .34;

  return Math.max(1, spokenWeight + shortPauseWeight + longPauseWeight);
};

const detectSubtitleCueStarts = async (audioBlob: Blob, cues: string[]) => {
  if (cues.length < 2) return cues.length ? [0] : [];

  const AudioContextConstructor = window.AudioContext
    || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return [];

  const context = new AudioContextConstructor();
  try {
    const decoded = await context.decodeAudioData(await audioBlob.arrayBuffer());
    const frameSeconds = .02;
    const frameSize = Math.max(1, Math.floor(decoded.sampleRate * frameSeconds));
    const frameCount = Math.ceil(decoded.length / frameSize);
    const energy = new Float32Array(frameCount);

    for (let frame = 0; frame < frameCount; frame += 1) {
      const from = frame * frameSize;
      const to = Math.min(decoded.length, from + frameSize);
      let sumSquares = 0;
      let sampleCount = 0;
      for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
        const samples = decoded.getChannelData(channel);
        for (let sample = from; sample < to; sample += 4) {
          sumSquares += samples[sample] * samples[sample];
          sampleCount += 1;
        }
      }
      energy[frame] = sampleCount ? Math.sqrt(sumSquares / sampleCount) : 0;
    }

    const weights = cues.map(subtitleCueWeight);
    const totalWeight = weights.reduce((total, weight) => total + weight, 0) || 1;
    const starts = [0];
    let cumulativeWeight = 0;

    for (let cueIndex = 0; cueIndex < cues.length - 1; cueIndex += 1) {
      cumulativeWeight += weights[cueIndex];
      const expectedFrame = Math.round((cumulativeWeight / totalWeight) * frameCount);
      const searchRadius = Math.max(18, Math.min(65, Math.round(frameCount * .09)));
      const earliestFrame = Math.max(
        Math.round((starts[starts.length - 1] + .28) / frameSeconds),
        expectedFrame - searchRadius
      );
      const latestFrame = Math.min(frameCount - 2, expectedFrame + searchRadius);
      let quietestFrame = Math.max(earliestFrame, Math.min(latestFrame, expectedFrame));
      let bestScore = Number.POSITIVE_INFINITY;

      for (let frame = earliestFrame; frame <= latestFrame; frame += 1) {
        const smoothedEnergy = (
          (energy[frame - 1] ?? energy[frame])
          + energy[frame]
          + (energy[frame + 1] ?? energy[frame])
        ) / 3;
        const distancePenalty = Math.abs(frame - expectedFrame) / Math.max(1, searchRadius) * .012;
        const score = smoothedEnergy + distancePenalty;
        if (score < bestScore) {
          bestScore = score;
          quietestFrame = frame;
        }
      }

      // Move from the middle of the pause to the beginning of the next voice
      // onset so the new sentence appears when Alex actually starts saying it.
      const quietThreshold = Math.max(.006, Math.min(.018, energy[quietestFrame] * 2.4));
      let onsetFrame = quietestFrame;
      const onsetLimit = Math.min(latestFrame, quietestFrame + 12);
      while (onsetFrame < onsetLimit && energy[onsetFrame] <= quietThreshold) onsetFrame += 1;
      starts.push(Math.min(decoded.duration, onsetFrame * frameSeconds));
    }

    return starts;
  } catch {
    return [];
  } finally {
    if (context.state !== 'closed') void context.close();
  }
};

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
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
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
    setSubtitleCueIndex(-1);
    setTtsState(audioAccessToken ? 'idle' : 'failed');
    return clearQuestionAudio;
  }, [audioAccessToken, questionIndex, stage]);

  const startInterview = async () => {
    if (!jobPostId) {
      setStartError(t('aiInterview.errors.chooseJob'));
      return;
    }

    setIsStarting(true);
    setStartError('');

    try {
      const preferredLanguage = (
        i18n.resolvedLanguage
        || i18n.language
        || user?.preferred_language
        || ''
      ).toLowerCase();
      const language = preferredLanguage.startsWith('vi')
        ? 'vi'
        : preferredLanguage.startsWith('en')
          ? 'en'
          : 'auto';
      const response = await aiInterviewAPI.start(jobPostId, language, interviewDefinitionId);
      const data = response.data;

      if (!response.success || !data) {
        if (response.message?.includes("does not have any predefined questions")) {
          setStartError(t('aiInterview.errors.noQuestions'));
        } else {
          setStartError(t('aiInterview.errors.startFailed'));
        }
        return;
      }

      const nextSessionId = responseValue<string>(data, 'sessionId', 'session_id');
      const nextQuestion = responseValue<string | null>(data, 'questionText', 'question_text');
      const nextQuestionIndex = responseValue<number>(data, 'questionIndex', 'question_index') ?? 1;
      const nextQuestionCount = responseValue<number>(data, 'questionCount', 'question_count') ?? 3;
      const nextAudioToken = responseValue<string | null>(data, 'audioAccessToken', 'audio_access_token');
      const nextTtsProvider = responseValue<string | null>(data, 'ttsProvider', 'tts_provider');
      const responseLanguage = data.language || language;

      if (!nextSessionId || !nextQuestion) {
        setStartError(t('aiInterview.errors.incompleteSession'));
        return;
      }

      setSessionId(nextSessionId);
      setAudioAccessToken(nextAudioToken || '');
      setQuestionText(nextQuestion);
      setQuestionIndex(nextQuestionIndex);
      setQuestionCount(Math.max(nextQuestionIndex, nextQuestionCount));
      setTtsProvider(nextTtsProvider || 'streaming');
      setInterviewLanguage(responseLanguage || 'auto');
      setAnswerState('idle');
      setStage('interview');
    } catch {
      setStartError(t('aiInterview.errors.startFailed'));
    } finally {
      setIsStarting(false);
    }
  };

  const transcribeRecording = async (audioBlob: Blob) => {
    const response = await aiInterviewAPI.transcribeAudio(sessionId, audioBlob, interviewLanguage);
    if (!response.success || !response.data) {
      setActionError(response.message || t('aiInterview.errors.transcriptionFailed'));
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
      setActionError(t('aiInterview.errors.unsupportedRecording'));
      return;
    }

    try {
      questionAudioRef.current?.pause();
      setSubtitleCueIndex(-1);
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
        setActionError(t('aiInterview.errors.recordingFailed'));
        setAnswerState('idle');
      };
      recorder.onstop = () => {
        clearRecordingTimers();
        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        });
        releaseMicrophone();
        if (!blob.size) {
          setActionError(t('aiInterview.errors.noAudioCaptured'));
          setAnswerState('idle');
          return;
        }
        void transcribeRecording(blob);
      };

      recorder.start(250);
      setRecordingSeconds(0);
      setSilenceCountdown(null);
      setAnswerState('recording');

      const AudioContextConstructor = window.AudioContext
        || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextConstructor) {
        const context = new AudioContextConstructor();
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        context.createMediaStreamSource(stream).connect(analyser);
        audioContextRef.current = context;
        const samples = new Uint8Array(analyser.fftSize);

        const monitorSilence = () => {
          if (recorder.state !== 'recording') return;
          analyser.getByteTimeDomainData(samples);
          let energy = 0;
          for (const sample of samples) {
            const normalized = (sample - 128) / 128;
            energy += normalized * normalized;
          }
          const volume = Math.sqrt(energy / samples.length);
          const now = performance.now();

          if (volume > 0.025) {
            speechDetectedRef.current = true;
            silenceStartedAtRef.current = null;
            setSilenceCountdown(null);
          } else if (speechDetectedRef.current) {
            silenceStartedAtRef.current ??= now;
            const silentFor = now - silenceStartedAtRef.current;
            setSilenceCountdown(Math.max(0, Math.ceil((3000 - silentFor) / 1000)));
            if (silentFor >= 3000) {
              setAnswerState('transcribing');
              recorder.stop();
              return;
            }
          }

          silenceFrameRef.current = requestAnimationFrame(monitorSilence);
        };
        silenceFrameRef.current = requestAnimationFrame(monitorSilence);
      }

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
          ? t('aiInterview.errors.microphoneDenied')
          : t('aiInterview.errors.microphoneUnavailable')
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
    setSilenceCountdown(null);
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
      setActionError(t('aiInterview.errors.noTranscript'));
      return;
    }

    setActionError('');
    setAnswerState('submitting');
    const response = await aiInterviewAPI.confirmAnswer(sessionId, correctedText);
    const data = response.data;
    if (!response.success || !data) {
      setActionError(t('aiInterview.errors.submitFailed'));
      setAnswerState('review');
      return;
    }

    const completed = responseValue<boolean>(data, 'isCompleted', 'is_completed') ?? false;
    if (completed) {
      setStage('results');
      setAnswerState('idle');
      return;
    }

    const nextQuestion = responseValue<string | null>(data, 'questionText', 'question_text');
    const nextQuestionIndex = responseValue<number>(data, 'questionIndex', 'question_index');
    const nextQuestionCount = responseValue<number>(data, 'questionCount', 'question_count');
    const nextTtsProvider = responseValue<string | null>(data, 'ttsProvider', 'tts_provider');
    if (!nextQuestion || !nextQuestionIndex) {
      setActionError(t('aiInterview.errors.nextQuestionMissing'));
      setAnswerState('review');
      return;
    }

    setQuestionText(nextQuestion);
    setQuestionIndex(nextQuestionIndex);
    if (nextQuestionCount) setQuestionCount(Math.max(nextQuestionIndex, nextQuestionCount));
    setTtsProvider(nextTtsProvider || 'streaming');
    setInterviewLanguage(data.language || interviewLanguage);
    setTranscript('');
    setSttProvider('');
    setSttConfidence(null);
    setRecordingSeconds(0);
    setSilenceCountdown(null);
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
        setActionError(t('aiInterview.errors.replayFailed'));
      }
      return;
    }

    if (!audioAccessToken) {
      setTtsState('failed');
      setActionError(t('aiInterview.errors.voiceUnavailable'));
      return;
    }

    clearQuestionAudio();
    const controller = new AbortController();
    questionAudioAbortRef.current = controller;
    setTtsState('streaming');

    const bindSubtitlePlayback = (player: HTMLAudioElement, detectedCueStarts: number[]) => {
      const cueWeights = subtitleCues.map(subtitleCueWeight);
      const totalWeight = cueWeights.reduce((total, weight) => total + weight, 0) || 1;
      const estimatedDuration = Math.max(2.5, totalWeight / 2.65);

      const stopSubtitleClock = () => {
        if (subtitleFrameRef.current !== null) cancelAnimationFrame(subtitleFrameRef.current);
        subtitleFrameRef.current = null;
      };

      const syncCue = () => {
        if (detectedCueStarts.length === subtitleCues.length) {
          const playbackTime = player.currentTime + .025;
          let detectedCue = 0;
          for (let index = 1; index < detectedCueStarts.length; index += 1) {
            if (playbackTime < detectedCueStarts[index]) break;
            detectedCue = index;
          }
          setSubtitleCueIndex(current => current === detectedCue ? current : detectedCue);
          return;
        }

        const duration = Number.isFinite(player.duration) && player.duration > 0
          ? player.duration
          : estimatedDuration;
        // MP3s often contain a small encoder delay. Keeping that lead-in and
        // the final breath outside the cue window prevents cumulative drift.
        const leadIn = Math.min(.16, duration * .025);
        const leadOut = Math.min(.14, duration * .02);
        const spokenDuration = Math.max(.5, duration - leadIn - leadOut);
        const spokenTime = Math.max(0, Math.min(spokenDuration, player.currentTime - leadIn));
        const progressWeight = (spokenTime / spokenDuration) * totalWeight;
        let cumulativeWeight = 0;
        let nextCue = Math.max(0, subtitleCues.length - 1);

        for (let index = 0; index < cueWeights.length; index += 1) {
          cumulativeWeight += cueWeights[index];
          if (progressWeight < cumulativeWeight) {
            nextCue = index;
            break;
          }
        }

        setSubtitleCueIndex(current => current === nextCue ? current : nextCue);
      };

      const runSubtitleClock = () => {
        syncCue();
        if (!player.paused && !player.ended) {
          subtitleFrameRef.current = requestAnimationFrame(runSubtitleClock);
        }
      };

      player.onplay = () => {
        stopSubtitleClock();
        setTtsState('playing');
        setSubtitleCueIndex(subtitleCues.length ? 0 : -1);
        subtitleFrameRef.current = requestAnimationFrame(runSubtitleClock);
      };
      player.onended = () => {
        stopSubtitleClock();
        setSubtitleCueIndex(-1);
        setTtsState('ready');
      };
      player.onerror = () => {
        stopSubtitleClock();
        setSubtitleCueIndex(-1);
        setTtsState('failed');
      };
    };

    try {
      const response = await aiInterviewAPI.streamQuestionAudio(
        sessionId,
        questionIndex,
        audioAccessToken,
        controller.signal
      );
      if (!response.body) throw new Error('audio_stream_unavailable');

      const contentType = (response.headers.get('Content-Type') || 'audio/mpeg').split(';')[0];
      // Buffer the complete clip before playback so its real duration is known.
      // Progressive playback made subtitle timing depend on a guessed duration.
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value?.byteLength) chunks.push(value);
      }
      if (!chunks.length) throw new Error('audio_stream_empty');
      const audioBlob = new Blob(chunks as BlobPart[], { type: contentType });
      const detectedCueStarts = await detectSubtitleCueStarts(audioBlob, subtitleCues);
      const objectUrl = URL.createObjectURL(audioBlob);
      questionAudioUrlRef.current = objectUrl;
      const player = new Audio(objectUrl);
      player.preload = 'auto';
      bindSubtitlePlayback(player, detectedCueStarts);
      questionAudioRef.current = player;
      await player.play();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setSubtitleCueIndex(-1);
      setTtsState('failed');
      setActionError(t('aiInterview.errors.audioStreamFailed'));
    } finally {
      if (questionAudioAbortRef.current === controller) questionAudioAbortRef.current = null;
    }
  };

  useEffect(() => {
    if (stage !== 'interview' || !audioAccessToken || autoPlayedQuestionRef.current === questionIndex) return;
    autoPlayedQuestionRef.current = questionIndex;
    void playQuestion();
  }, [audioAccessToken, questionIndex, stage]);

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-8rem)] flex flex-col">
        {stage === 'intro' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full text-center">
              <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center animate-orb bg-gradient-to-br from-purple to-cyan">
                <Video size={40} className="text-background" />
              </div>
              <h1 className="text-4xl font-black text-primary mb-4">{t('aiInterview.intro.title')}</h1>
              <p className="text-lg mb-8 text-secondary">
                {t('aiInterview.intro.description')}
              </p>

              {jobTitle && (
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple/30 bg-purple/10 px-4 py-2 text-sm text-primary">
                  <Bot size={15} className="text-purple" />
                  {t('aiInterview.intro.interviewingFor')} <span className="font-semibold">{jobTitle}</span>
                </div>
              )}

              <div className="glass-card p-6 mb-8 text-left">
                <h2 className="text-primary font-semibold mb-4">{t('aiInterview.intro.howItWorks')}</h2>
                <div className="space-y-3 text-sm text-secondary">
                  <p>{t('aiInterview.intro.steps.question')}</p>
                  <p>{t('aiInterview.intro.steps.answer')}</p>
                  <p>{t('aiInterview.intro.steps.finish')}</p>
                  <p>{t('aiInterview.intro.steps.review')}</p>
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
                {isStarting ? t('aiInterview.actions.starting') : t('aiInterview.actions.start')}
                {!isStarting && <ChevronRight size={20} />}
              </button>

              {!jobPostId && (
                <button className="mt-4 text-sm font-semibold text-cyan hover:underline" onClick={() => navigate('/jobs/browse')}>
                  {t('aiInterview.actions.browseToChoose')}
                </button>
              )}
            </div>
          </div>
        )}

        {stage === 'interview' && (
          <div className="ai-interview-room">
            <header className="ai-interview-topbar">
              <div className="ai-interview-heading">
                <span className="ai-live-dot" aria-hidden="true" />
                <div>
                  <p>{t('aiInterview.room.inProgress')}</p>
                  <h1>{jobTitle || t('aiInterview.room.defaultTitle')}</h1>
                </div>
              </div>
              <div className="ai-question-progress" aria-label={t('aiInterview.room.questionOf', { current: questionIndex, total: questionCount })}>
                <div className="ai-question-progress-copy">
                  <span>{t('aiInterview.room.currentQuestion')}</span>
                  <strong>{questionIndex}<small> / {questionCount}</small></strong>
                </div>
                <div className="ai-question-progress-track" role="progressbar" aria-valuemin={1} aria-valuemax={questionCount} aria-valuenow={questionIndex}>
                  <span style={{ width: `${Math.min(100, (questionIndex / questionCount) * 100)}%` }} />
                </div>
              </div>
            </header>

            {actionError && (
              <div role="alert" className="ai-interview-alert">
                <AlertCircle size={17} />
                <span>{actionError}</span>
              </div>
            )}

            <main className="ai-interview-conversation">
              <section className={`ai-interviewer-stage ${ttsState === 'playing' ? 'is-speaking' : ''}`} aria-label={t('aiInterview.interviewer.ariaLabel')}>
                <div className="ai-stage-glow ai-stage-glow-one" />
                <div className="ai-stage-glow ai-stage-glow-two" />
                <div className="ai-interviewer-identity">
                  <span className="ai-online-indicator" />
                  <span>{t('aiInterview.interviewer.identity')}</span>
                </div>

                <div className={`ai-avatar-shell ${ttsState === 'playing' ? 'is-speaking' : ''}`}>
                  <span className="ai-avatar-ring ai-avatar-ring-one" />
                  <span className="ai-avatar-ring ai-avatar-ring-two" />
                  <span className="ai-avatar-ring ai-avatar-ring-three" />
                  <div className="ai-avatar-face">
                    <Bot size={62} strokeWidth={1.7} />
                  </div>
                  <div className="ai-avatar-audio" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, index) => <span key={index} />)}
                  </div>
                </div>

                {ttsState === 'playing' && subtitleCueIndex >= 0 && (
                  <div key={subtitleCueIndex} className="ai-interviewer-subtitle" role="status" aria-live="polite">
                    <span>Alex</span>
                    <p>{subtitleCues[subtitleCueIndex]}</p>
                  </div>
                )}

                <div className="ai-interviewer-status" aria-live="polite">
                  <h2>
                    {ttsState === 'streaming' && t('aiInterview.interviewer.states.preparing')}
                    {ttsState === 'playing' && t('aiInterview.interviewer.states.speaking')}
                    {ttsState === 'ready' && t('aiInterview.interviewer.states.yourTurn')}
                    {ttsState === 'failed' && t('aiInterview.interviewer.states.failed')}
                    {ttsState === 'idle' && t('aiInterview.interviewer.states.ready')}
                  </h2>
                  <p>{t('aiInterview.interviewer.audioOnly')}</p>
                </div>

                <button
                  type="button"
                  onClick={playQuestion}
                  disabled={ttsState === 'streaming' || ttsState === 'playing' || !audioAccessToken}
                  className="ai-replay-button"
                >
                  {ttsState === 'streaming' ? <LoaderCircle size={17} className="animate-spin" /> : <Headphones size={17} />}
                  {ttsState === 'failed' ? t('aiInterview.actions.retryAudio') : t('aiInterview.actions.hearAgain')}
                </button>
              </section>

              <section className="ai-answer-panel" aria-label={t('aiInterview.answer.ariaLabel')}>
                <div className="ai-answer-panel-header">
                  <div>
                    <p>{t('aiInterview.answer.yourTurn')}</p>
                    <h2>
                      {answerState === 'idle' && t('aiInterview.answer.states.idle')}
                      {answerState === 'recording' && t('aiInterview.answer.states.recording')}
                      {answerState === 'transcribing' && t('aiInterview.answer.states.transcribing')}
                      {answerState === 'review' && t('aiInterview.answer.states.review')}
                      {answerState === 'submitting' && t('aiInterview.answer.states.submitting')}
                    </h2>
                  </div>
                  <span className={`ai-mic-status ${answerState === 'recording' ? 'is-live' : ''}`}>
                    <Mic size={13} /> {answerState === 'recording' ? t('aiInterview.answer.micOn') : t('aiInterview.answer.micOff')}
                  </span>
                </div>

                <div className="ai-answer-panel-body">
                {answerState === 'idle' && (
                  <div className="ai-answer-idle">
                    <button
                      type="button"
                      onClick={beginAnswer}
                      disabled={ttsState === 'streaming' || ttsState === 'playing'}
                      className="ai-record-button"
                    >
                      <span><Mic size={28} /></span>
                      {t('aiInterview.actions.answerQuestion')}
                    </button>
                    <p>{t('aiInterview.answer.microphoneHint')}</p>
                  </div>
                )}

                {answerState === 'recording' && (
                  <div className="ai-recording-state">
                    <div className="ai-recording-meta">
                      <span className="ai-recording-pill"><i /> {t('aiInterview.recording.label')}</span>
                      <time>{formatDuration(recordingSeconds)}</time>
                    </div>
                    <div className="ai-answer-waveform" aria-hidden="true">
                      {Array.from({ length: 28 }).map((_, index) => (
                        <span key={index} style={{ animationDelay: `${(index % 7) * -0.09}s` }} />
                      ))}
                    </div>
                    <p className="ai-silence-hint" aria-live="polite">
                      {silenceCountdown === null
                        ? t('aiInterview.recording.finishHint')
                        : t('aiInterview.recording.silenceCountdown', { count: silenceCountdown })}
                    </p>
                    <div className="ai-recording-actions">
                      <button type="button" onClick={cancelAnswer} className="ai-secondary-action">{t('aiInterview.actions.cancel')}</button>
                      <button type="button" onClick={finishAnswer} className="ai-primary-action">
                        <Square size={14} fill="currentColor" /> {t('aiInterview.actions.finishAnswer')}
                      </button>
                    </div>
                  </div>
                )}

                {answerState === 'transcribing' && (
                  <div className="ai-processing-state">
                    <div className="ai-processing-orb"><LoaderCircle size={30} className="animate-spin" /></div>
                    <strong>{t('aiInterview.transcribing.title')}</strong>
                    <p>{t('aiInterview.transcribing.description')}</p>
                  </div>
                )}

                {answerState === 'review' && (
                  <div className="ai-review-state">
                    <div className="ai-transcript-label">
                      <label htmlFor="interview-transcript">{t('aiInterview.review.whatWeHeard')}</label>
                      <span>{t('aiInterview.review.readOnly')}</span>
                    </div>
                    <textarea
                      id="interview-transcript"
                      value={transcript}
                      readOnly
                      aria-readonly="true"
                      rows={7}
                      className="ai-transcript-input"
                    />
                    <div className="ai-review-actions">
                      <button type="button" onClick={recordAgain} className="ai-secondary-action">
                        <RotateCcw size={15} /> {t('aiInterview.actions.speakAgain')}
                      </button>
                      <button type="button" onClick={confirmAnswer} className="ai-primary-action ai-submit-answer">
                        {t('aiInterview.actions.submitAnswer')} <Send size={15} />
                      </button>
                    </div>
                  </div>
                )}

                {answerState === 'submitting' && (
                  <div className="ai-processing-state">
                    <div className="ai-processing-orb is-purple"><LoaderCircle size={30} className="animate-spin" /></div>
                    <strong>{t('aiInterview.submitting.title')}</strong>
                    <p>{t('aiInterview.submitting.description')}</p>
                  </div>
                )}
                </div>

                <details className="ai-debug-console">
                  <summary><Bug size={13} /> {t('aiInterview.debug.title')}</summary>
                  <dl>
                    <div><dt>{t('aiInterview.debug.session')}</dt><dd>{sessionId ? `${sessionId.slice(0, 8)}…` : t('aiInterview.debug.notStarted')}</dd></div>
                    <div><dt>{t('aiInterview.debug.question')}</dt><dd>{questionIndex} / {questionCount}</dd></div>
                    <div><dt>{t('aiInterview.debug.language')}</dt><dd>{interviewLanguage}</dd></div>
                    <div><dt>TTS</dt><dd>{ttsProvider || t('aiInterview.debug.pending')} · {t(`aiInterview.debug.ttsStates.${ttsState}`)}</dd></div>
                    <div><dt>STT</dt><dd>{sttProvider || t('aiInterview.debug.notUsedYet')}</dd></div>
                    <div><dt>{t('aiInterview.debug.confidence')}</dt><dd>{sttConfidence === null ? '—' : `${Math.round(sttConfidence * 100)}%`}</dd></div>
                  </dl>
                </details>
              </section>
            </main>
          </div>
        )}

        {stage === 'results' && (
          <div className="ai-interview-complete-page">
            <section className="ai-interview-complete-card">
              <div className="ai-complete-icon"><CheckCircle size={34} /></div>
              <p className="ai-complete-eyebrow">{t('aiInterview.complete.eyebrow')}</p>
              <h1>{t('aiInterview.complete.title')}</h1>
              <p className="ai-complete-message">
                {t('aiInterview.complete.message')}
              </p>

              {jobTitle && <div className="ai-complete-job"><Bot size={15} /> {jobTitle}</div>}

              <div className="ai-complete-notice">
                <div><BellRing size={19} /><span><strong>{t('aiInterview.complete.inAppTitle')}</strong><small>{t('aiInterview.complete.inAppDescription')}</small></span></div>
                <div><Mail size={19} /><span><strong>{t('aiInterview.complete.emailTitle')}</strong><small>{t('aiInterview.complete.emailDescription')}</small></span></div>
              </div>

              <div className="ai-complete-actions">
                <button className="ai-secondary-action" onClick={() => navigate('/jobs/browse')}>{t('aiInterview.actions.browseMoreJobs')}</button>
                <button className="ai-primary-action" onClick={() => navigate('/freelancer/dashboard')}>{t('aiInterview.actions.goToDashboard')}</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
