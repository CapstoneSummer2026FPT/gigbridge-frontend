type InterviewQuestionText = {
  questionText?: string | null;
};

export const hasAnsweredInterviewQuestions = (
  questions: readonly InterviewQuestionText[],
): boolean => questions.some(question => Boolean(question.questionText?.trim()));

export const resolveAiInterviewEnabled = (
  requested: boolean | null | undefined,
  questions: readonly InterviewQuestionText[],
): boolean => Boolean(requested) && hasAnsweredInterviewQuestions(questions);
