import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  NestedMilestonePlanEditor,
  type EditableMilestonePlan,
} from './NestedMilestonePlanEditor';

afterEach(cleanup);

const longTitle = 'Milestone title '.repeat(20).trim();

const milestone: EditableMilestonePlan = {
  title: longTitle,
  description: '',
  amount: 100,
  estimatedDuration: '',
  dueDate: null,
  deliverables: '',
  acceptanceCriteria: '',
  orderIndex: 0,
  workItems: [],
};

describe('NestedMilestonePlanEditor milestone title', () => {
  it('uses an auto-growing multiline field and wraps the summary title', () => {
    const onChange = vi.fn();
    const { container } = render(
      <NestedMilestonePlanEditor
        value={[milestone]}
        onChange={onChange}
        expandedIndex={0}
        showBudgetSummary={false}
        showWorkItems={false}
      />,
    );

    const titleField = container.querySelector<HTMLTextAreaElement>('[data-milestone-field="0.title"]');
    expect(titleField).not.toBeNull();
    expect(titleField?.tagName).toBe('TEXTAREA');
    expect(titleField).toHaveAttribute('rows', '1');
    expect(titleField).toHaveClass('resize-none', 'overflow-hidden', 'break-words');

    const summaryTitle = screen.getAllByText(longTitle).find(element => element.tagName === 'STRONG');
    if (!summaryTitle) throw new Error('Expected the milestone summary title to be rendered.');
    expect(summaryTitle).toHaveClass('whitespace-normal', 'break-words');
    expect(summaryTitle).not.toHaveClass('truncate');

    if (!titleField) return;
    Object.defineProperty(titleField, 'scrollHeight', { configurable: true, value: 72 });
    fireEvent.input(titleField, { target: { value: `${longTitle} updated` } });

    expect(titleField.style.height).toBe('72px');
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ title: `${longTitle} updated` }),
    ]);
  });
});
