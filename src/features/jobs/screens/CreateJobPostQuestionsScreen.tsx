import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, CheckCircle, HelpCircle } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import type { CreateJobPostQuestionRequest } from '../../../types/models/Job';
import {
  normalizeCreateJobQuestions,
  readStoredCreateJobQuestions,
  writeStoredCreateJobQuestions,
} from '../utils/jobPostQuestionDraft';
import '../styles/PostJobScreen.css';

const QUESTION_OPTIONS = [6, 8, 10] as const;
type QuestionCount = typeof QUESTION_OPTIONS[number];

const isQuestionCount = (value: number): value is QuestionCount =>
  QUESTION_OPTIONS.includes(value as QuestionCount);

const createEmptyQuestions = (count: QuestionCount): CreateJobPostQuestionRequest[] =>
  Array.from({ length: count }, (_, index) => ({
    questionText: '',
    orderIndex: index + 1,
    isRequired: true,
  }));

export default function CreateJobPostQuestionsScreen() {
  const navigate = useNavigate();
  const storedQuestions = useMemo(() => readStoredCreateJobQuestions(), []);
  const storedCount = isQuestionCount(storedQuestions.length)
    ? storedQuestions.length
    : null;

  const [selectedCount, setSelectedCount] = useState<QuestionCount | null>(storedCount);
  const [questions, setQuestions] = useState<CreateJobPostQuestionRequest[]>(
    storedCount ? storedQuestions : []
  );

  const validationErrors = useMemo(() => {
    if (!selectedCount) {
      return ['Select 6, 8, or 10 questions to continue.'];
    }

    const errors: string[] = [];
    const orderIndexes = new Set<number>();

    questions.forEach((question, index) => {
      const label = `Question ${index + 1}`;

      if (!question.questionText.trim()) {
        errors.push(`${label} is required.`);
      }

      if (question.questionText.length > 1000) {
        errors.push(`${label} must not exceed 1000 characters.`);
      }

      if (question.orderIndex < 0) {
        errors.push(`${label} order must be greater than or equal to 0.`);
      }

      if (orderIndexes.has(question.orderIndex)) {
        errors.push('Question order indexes must be unique.');
      }

      orderIndexes.add(question.orderIndex);
    });

    return errors;
  }, [questions, selectedCount]);

  const canContinue = selectedCount !== null && validationErrors.length === 0;

  const handleSelectCount = (count: QuestionCount) => {
    setSelectedCount(count);
    setQuestions(createEmptyQuestions(count));
  };

  const handleQuestionTextChange = (index: number, questionText: string) => {
    setQuestions(prev =>
      prev.map((question, questionIndex) =>
        questionIndex === index ? { ...question, questionText } : question
      )
    );
  };

  const handleRequiredChange = (index: number, isRequired: boolean) => {
    setQuestions(prev =>
      prev.map((question, questionIndex) =>
        questionIndex === index ? { ...question, isRequired } : question
      )
    );
  };

  const handleNext = () => {
    if (!canContinue) return;

    const normalizedQuestions = normalizeCreateJobQuestions(questions);
    writeStoredCreateJobQuestions(normalizedQuestions);

    navigate('/jobs/post', {
      state: {
        questions: normalizedQuestions,
      },
    });
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="post-job-header-subtitle text-sm mb-1">Step 1 of 2</p>
          <h1 className="post-job-header text-3xl font-black text-primary">
            Create JobPost Questions
          </h1>
          <p className="post-job-header-description mt-2">
            Choose a fixed question set and write the screening questions freelancers must answer.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="glass-card p-5">
              <label className="text-primary text-sm font-semibold block mb-3">
                Number of questions
              </label>
              <div className="grid grid-cols-3 gap-3">
                {QUESTION_OPTIONS.map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => handleSelectCount(count)}
                    className={`experience-level-btn p-4 rounded-xl text-center transition-all ${
                      selectedCount === count ? 'active' : ''
                    }`}
                  >
                    <span className="text-2xl font-black text-primary block mb-1">
                      {count}
                    </span>
                    <span className="experience-level-sub">
                      Questions
                    </span>
                  </button>
                ))}
              </div>
              <p className="input-hint">
                Select one option. The form will render exactly that many required question fields.
              </p>
            </div>

            {selectedCount && (
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-primary font-semibold">
                      Questions ({selectedCount})
                    </h2>
                    <p className="input-hint">
                      All question text fields must be filled before continuing.
                    </p>
                  </div>
                  {canContinue && (
                    <span className="badge-green text-xs flex items-center gap-1">
                      <CheckCircle size={12} />
                      Ready
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <div key={question.orderIndex} className="p-4 rounded-xl glass-button border border-border">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-cyan/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-xs font-bold text-cyan">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="text-primary text-sm font-semibold block mb-2">
                            Question {index + 1}
                          </label>
                          <textarea
                            value={question.questionText}
                            onChange={event => handleQuestionTextChange(index, event.target.value)}
                            placeholder="Example: How many years of React experience do you have?"
                            rows={3}
                            className="input-gb w-full px-4 py-3 resize-none text-sm leading-relaxed"
                          />
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                            <label className="flex items-center gap-2 text-xs text-secondary">
                              <input
                                type="checkbox"
                                checked={question.isRequired}
                                onChange={event => handleRequiredChange(index, event.target.checked)}
                              />
                              Required answer
                            </label>
                            <span className={`text-xs ${
                              question.questionText.length > 1000 ? 'text-red' : 'text-muted'
                            }`}
                            >
                              {question.questionText.length}/1000
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="glass-card p-5 sticky top-24">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle size={18} className="text-cyan" />
                <p className="text-primary text-sm font-semibold">Question rules</p>
              </div>
              <div className="space-y-3 text-xs text-secondary">
                <p>Use 6, 8, or 10 questions.</p>
                <p>Every generated question field must be filled.</p>
                <p>Questions are saved after the JobPost is created while it is still Draft.</p>
              </div>
            </div>

            {validationErrors.length > 0 && selectedCount && (
              <div className="glass-card p-5">
                <p className="text-sm font-semibold text-primary mb-2">
                  Before continuing
                </p>
                <ul className="space-y-2 text-xs text-red">
                  {validationErrors.slice(0, 4).map(error => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={!canContinue}
              className="btn-cyan w-full px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next: JobPost Details
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
