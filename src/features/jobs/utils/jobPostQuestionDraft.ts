import type { CreateJobPostQuestionRequest } from '../../../types/models/Job';

export const CREATE_JOB_QUESTIONS_STORAGE_KEY = 'gigbridge_create_job_questions';

export const normalizeCreateJobQuestions = (
  questions: CreateJobPostQuestionRequest[]
): CreateJobPostQuestionRequest[] =>
  questions.map((question, index) => ({
    questionText: question.questionText.trim(),
    orderIndex: index + 1,
    isRequired: Boolean(question.isRequired),
  }));

export const readStoredCreateJobQuestions = (): CreateJobPostQuestionRequest[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(CREATE_JOB_QUESTIONS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(question => typeof question?.questionText === 'string')
      .map((question, index) => ({
        questionText: question.questionText,
        orderIndex: typeof question.orderIndex === 'number' ? question.orderIndex : index + 1,
        isRequired: typeof question.isRequired === 'boolean' ? question.isRequired : true,
      }));
  } catch {
    return [];
  }
};

export const writeStoredCreateJobQuestions = (
  questions: CreateJobPostQuestionRequest[]
) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    CREATE_JOB_QUESTIONS_STORAGE_KEY,
    JSON.stringify(normalizeCreateJobQuestions(questions))
  );
};

export const clearStoredCreateJobQuestions = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(CREATE_JOB_QUESTIONS_STORAGE_KEY);
};
