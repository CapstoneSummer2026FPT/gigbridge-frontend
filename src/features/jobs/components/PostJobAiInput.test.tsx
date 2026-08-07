import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PostJobAiInput } from './PostJobAiInput';

describe('PostJobAiInput', () => {
  it('shows the Premium upgrade action for non-Premium clients', () => {
    const onUpgrade = vi.fn();
    render(
      <PostJobAiInput
        isPremium={false}
        isLoading={false}
        onGenerate={vi.fn()}
        onUpgrade={onUpgrade}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'postJobWizard.ai.upgrade' }));
    expect(onUpgrade).toHaveBeenCalledOnce();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('generates a draft from the Premium AI input bar', async () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    render(
      <PostJobAiInput
        isPremium
        isLoading={false}
        onGenerate={onGenerate}
        onUpgrade={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Build a client onboarding portal' } });
    
    // Get generate button
    const generateBtn = screen.getByRole('button', { name: 'postJobWizard.ai.generate' });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith('Build a client onboarding portal');
    });
  });
});

