import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NestedMilestonePlanEditor, type EditableMilestonePlan } from './NestedMilestonePlanEditor';

const plan: EditableMilestonePlan[] = [{
  title: '',
  description: '',
  amount: 0,
  estimatedDuration: '1 week',
  dueDate: null,
  deliverables: '',
  acceptanceCriteria: '',
  orderIndex: 0,
  workItems: [{
    title: '',
    description: '',
    deliverables: '',
    estimatedDuration: '',
    orderIndex: 0,
  }],
}];

describe('NestedMilestonePlanEditor field guidance', () => {
  it('renders opt-in helper text and connects it to its field', () => {
    const hint = 'Name a measurable milestone outcome.';
    const { container, rerender } = render(
      <NestedMilestonePlanEditor
        value={plan}
        onChange={vi.fn()}
        fieldHints={{ milestoneTitle: hint }}
        fieldPlaceholders={{ milestoneTitle: 'e.g. UI design approved' }}
      />,
    );

    const titleInput = container.querySelector<HTMLInputElement>('[data-milestone-field="0.title"]');
    const hintId = titleInput?.getAttribute('aria-describedby');

    expect(titleInput).toHaveAttribute('placeholder', 'e.g. UI design approved');
    expect(hintId).toBeTruthy();
    expect(document.getElementById(hintId!)).toHaveTextContent(hint);

    rerender(<NestedMilestonePlanEditor value={plan} onChange={vi.fn()} />);

    expect(screen.queryByText(hint)).not.toBeInTheDocument();
    expect(container.querySelector('[data-milestone-field="0.title"]')).not.toHaveAttribute('aria-describedby');
  });

  it('serializes duration units and exposes the milestone deadline', () => {
    const onChange = vi.fn();
    const { container } = render(
      <NestedMilestonePlanEditor
        value={plan}
        onChange={onChange}
        showDueDate
        durationUnits={[
          { value: 'weeks', label: 'Weeks' },
          { value: 'months', label: 'Months' },
          { value: 'years', label: 'Years' },
        ]}
        fieldHints={{ deadline: 'Final submission date.' }}
      />,
    );

    fireEvent.change(container.querySelector('[data-milestone-field="0.estimatedDuration"]')!, {
      target: { value: '2' },
    });
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ estimatedDuration: '2 weeks' }),
    ]);

    fireEvent.change(screen.getByLabelText('Duration unit'), { target: { value: 'years' } });
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ estimatedDuration: '1 year' }),
    ]);

    const deadline = container.querySelector<HTMLInputElement>('[data-milestone-field="0.dueDate"]');
    expect(deadline).toHaveAttribute('type', 'date');
    expect(document.getElementById(deadline!.getAttribute('aria-describedby')!))
      .toHaveTextContent('Final submission date.');
  });

  it('keeps every field required for publication visible', () => {
    render(
      <NestedMilestonePlanEditor
        value={plan}
        onChange={vi.fn()}
        showDueDate
      />,
    );

    expect(screen.getByText('Deliverables')).toBeInTheDocument();
    expect(screen.getByText('Acceptance criteria')).toBeInTheDocument();
    expect(screen.getByText('Work Breakdown Structure')).toBeInTheDocument();
    expect(screen.getByLabelText('Work item 1 title')).toBeInTheDocument();
    expect(screen.getByLabelText('Work item 1 description')).toBeInTheDocument();
  });

  it('matches proposal plan input limits enforced by the database', () => {
    const { container } = render(
      <NestedMilestonePlanEditor
        value={plan}
        onChange={vi.fn()}
        showDueDate
        milestoneTitleMaxLength={200}
        workItemTitleMaxLength={200}
        durationMaxLength={100}
      />,
    );

    expect(container.querySelector('[data-milestone-field="0.title"]'))
      .toHaveAttribute('maxlength', '200');
    expect(screen.getByLabelText('Work item 1 title'))
      .toHaveAttribute('maxlength', '200');
    expect(screen.getByLabelText('Estimated duration'))
      .toHaveAttribute('maxlength', '100');
  });
});
