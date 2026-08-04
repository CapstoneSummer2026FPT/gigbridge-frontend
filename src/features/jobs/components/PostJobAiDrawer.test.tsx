import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PostJobAiDrawer } from './PostJobAiDrawer';

describe('PostJobAiDrawer', () => {
  it('shows the Premium upgrade action for non-Premium clients', () => {
    const onUpgrade = vi.fn();
    render(
      <PostJobAiDrawer
        isOpen
        isPremium={false}
        isLoading={false}
        onClose={vi.fn()}
        onGenerate={vi.fn()}
        onUpgrade={onUpgrade}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'postJobWizard.ai.upgrade' }));
    expect(onUpgrade).toHaveBeenCalledOnce();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('generates a draft from the Premium AI drawer', async () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    render(
      <PostJobAiDrawer
        isOpen
        isPremium
        isLoading={false}
        onClose={vi.fn()}
        onGenerate={onGenerate}
        onUpgrade={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Build a client onboarding portal' } });
    fireEvent.click(screen.getByRole('button', { name: 'postJobWizard.ai.generate' }));

    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith('Build a client onboarding portal');
    });
  });
});
