import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { CancelContractButton } from './CancelContractButton';
import { ContractStatus } from '../../../types/models/Contract';

const { cancelContractMock } = vi.hoisted(() => ({ cancelContractMock: vi.fn() }));

vi.mock('../../../api/contractAPI/POST', () => ({
  contractPostAPI: { cancelContract: cancelContractMock },
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string; seconds?: number }) =>
      options?.defaultValue?.replace('{{seconds}}', String(options?.seconds ?? '')) ?? _key,
  }),
}));

describe('CancelContractButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cancelContractMock.mockReset();
    cancelContractMock.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders nothing when the contract status is not cancellable', () => {
    const { container } = render(
      <CancelContractButton
        contractId="c1"
        contractStatus={ContractStatus.Active}
        contractCreatedAt={new Date().toISOString()}
        onCancelled={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('is disabled immediately after the contract is created', () => {
    render(
      <CancelContractButton
        contractId="c1"
        contractStatus={ContractStatus.PendingContractConfirmation}
        contractCreatedAt={new Date().toISOString()}
        onCancelled={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /cancel contract/i });
    expect(button).toBeDisabled();
  });

  it('becomes enabled after 60 seconds without a remount', () => {
    render(
      <CancelContractButton
        contractId="c1"
        contractStatus={ContractStatus.PendingContractConfirmation}
        contractCreatedAt={new Date().toISOString()}
        onCancelled={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /cancel contract/i });
    expect(button).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(button).toBeEnabled();
  });

  it('remains disabled and reflects remaining time when remounted mid-window (refresh cannot bypass)', () => {
    const createdAt = new Date(Date.now() - 30_000).toISOString();

    render(
      <CancelContractButton
        contractId="c1"
        contractStatus={ContractStatus.PendingContractConfirmation}
        contractCreatedAt={createdAt}
        onCancelled={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /cancel contract/i });
    expect(button).toBeDisabled();
    expect(screen.getByText(/available in 30s/i)).toBeInTheDocument();
  });

  it('calls the cancel API after confirmation once unlocked', async () => {
    const onCancelled = vi.fn();
    const createdAt = new Date(Date.now() - 60_000).toISOString();

    render(
      <CancelContractButton
        contractId="c1"
        contractStatus={ContractStatus.PendingContractConfirmation}
        contractCreatedAt={createdAt}
        onCancelled={onCancelled}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel contract/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, cancel/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(cancelContractMock).toHaveBeenCalledWith('c1');
    expect(onCancelled).toHaveBeenCalledTimes(1);
  });

  it('surfaces a server rejection without marking the contract cancelled', async () => {
    cancelContractMock.mockResolvedValue({ success: false, message: 'Cannot cancel yet.' });
    const onCancelled = vi.fn();
    const createdAt = new Date(Date.now() - 60_000).toISOString();

    render(
      <CancelContractButton
        contractId="c1"
        contractStatus={ContractStatus.PendingContractConfirmation}
        contractCreatedAt={createdAt}
        onCancelled={onCancelled}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel contract/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, cancel/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('Cannot cancel yet.')).toBeInTheDocument();
    expect(onCancelled).not.toHaveBeenCalled();
  });
});
