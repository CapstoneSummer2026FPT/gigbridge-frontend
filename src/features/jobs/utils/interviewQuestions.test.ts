import { describe, expect, it } from 'vitest';
import { hasAnsweredInterviewQuestions, resolveAiInterviewEnabled } from './interviewQuestions';

describe('interview question availability', () => {
  it('treats an empty or whitespace-only question list as unanswered', () => {
    expect(hasAnsweredInterviewQuestions([])).toBe(false);
    expect(hasAnsweredInterviewQuestions([
      { questionText: '' },
      { questionText: '   \n\t' },
    ])).toBe(false);
  });

  it('accepts a question when it has non-whitespace content', () => {
    expect(hasAnsweredInterviewQuestions([
      { questionText: '   ' },
      { questionText: '  Describe a similar project.  ' },
    ])).toBe(true);
  });

  it('never enables AI Interview without an answered question', () => {
    expect(resolveAiInterviewEnabled(true, [{ questionText: '   ' }])).toBe(false);
    expect(resolveAiInterviewEnabled(false, [{ questionText: 'A valid question' }])).toBe(false);
    expect(resolveAiInterviewEnabled(true, [{ questionText: 'A valid question' }])).toBe(true);
  });
});
