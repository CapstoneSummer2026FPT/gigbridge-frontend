import { API_BASE_URL, apiService } from '../../service/apiService';

export interface AiInterviewFeedback {
  score: number;
  summary: string;
  technicalSkills?: string[];
  technical_skills?: string[];
  softSkills?: string[];
  soft_skills?: string[];
  recommendedHire?: boolean;
  recommended_hire?: boolean;
}

export interface AiInterviewQuestionResponse {
  sessionId?: string;
  session_id?: string;
  audioAccessToken?: string | null;
  audio_access_token?: string | null;
  questionIndex?: number;
  question_index?: number;
  questionCount?: number;
  question_count?: number;
  questionText?: string | null;
  question_text?: string | null;
  language?: string | null;
  audioBase64?: string | null;
  audio_base64?: string | null;
  audioMimeType?: string | null;
  audio_mime_type?: string | null;
  ttsProvider?: string | null;
  tts_provider?: string | null;
  fallbackUsed?: boolean;
  fallback_used?: boolean;
  isCompleted?: boolean;
  is_completed?: boolean;
  feedback?: AiInterviewFeedback | null;
}

export interface AiInterviewQuestionAudioResponse {
  sessionId?: string;
  session_id?: string;
  questionIndex?: number;
  question_index?: number;
  status: 'missing' | 'pending' | 'ready' | 'failed' | string;
  audioBase64?: string | null;
  audio_base64?: string | null;
  audioMimeType?: string | null;
  audio_mime_type?: string | null;
  ttsProvider?: string | null;
  tts_provider?: string | null;
  fallbackUsed?: boolean;
  fallback_used?: boolean;
  error?: string | null;
}

export interface AiInterviewDraftResponse {
  sessionId?: string;
  session_id?: string;
  draftId?: string;
  draft_id?: string;
  questionIndex?: number;
  question_index?: number;
  transcript: string;
  language: string;
  sttProvider?: string;
  stt_provider?: string;
  confidence: number;
  fallbackUsed?: boolean;
  fallback_used?: boolean;
  expiresAt?: string;
  expires_at?: string;
}

export const aiInterviewAPI = {
  start(jobPostId: string, language = 'auto', interviewDefinitionId?: string | null) {
    return apiService.post<AiInterviewQuestionResponse>('ai-interviews/start', {
      jobPostId,
      interviewDefinitionId: interviewDefinitionId || null,
      mode: 'voice',
      language,
    });
  },

  transcribeAudio(sessionId: string, audioBlob: Blob, language = 'auto') {
    const formData = new FormData();
    const extension = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
    formData.append('SessionId', sessionId);
    formData.append('Language', language);
    formData.append('AudioFile', audioBlob, `answer.${extension}`);
    return apiService.post<AiInterviewDraftResponse>('ai-interviews/transcribe-audio', formData);
  },

  confirmAnswer(sessionId: string, correctedText?: string) {
    return apiService.post<AiInterviewQuestionResponse>('ai-interviews/confirm-answer', {
      sessionId,
      correctedText: correctedText || null,
    });
  },

  getQuestionAudio(sessionId: string, questionIndex: number, audioAccessToken: string) {
    return apiService.get<AiInterviewQuestionAudioResponse>(
      `ai-interviews/${encodeURIComponent(sessionId)}/questions/${questionIndex}/audio`,
      {},
      { 'X-Session-Token': audioAccessToken }
    );
  },

  async streamQuestionAudio(
    sessionId: string,
    questionIndex: number,
    audioAccessToken: string,
    signal?: AbortSignal
  ) {
    const accessToken = localStorage.getItem('access_token');
    const endpoint = `${API_BASE_URL.replace(/\/$/, '')}/ai-interviews/${encodeURIComponent(sessionId)}/questions/${questionIndex}/audio/stream`;
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
      signal,
      headers: {
        'X-Session-Token': audioAccessToken,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

    if (!response.ok) {
      let message = `Question audio could not be streamed (${response.status}).`;
      try {
        const error = await response.json();
        message = error.message ?? error.Message ?? message;
      } catch {
        // The response may be plain text when the upstream stream fails early.
      }
      throw new Error(message);
    }

    return response;
  },
};
