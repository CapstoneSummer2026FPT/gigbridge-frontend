import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EloAdjustmentMode } from '../../../types/elo';

const api = vi.hoisted(() => ({ applyAdminEloAdjustment: vi.fn() }));
const translate = vi.hoisted(() => (key: string) => key);
vi.mock('../../../hooks/useTranslation', () => ({ useTranslation: () => ({ t: translate, i18n: { language: 'en' } }) }));
vi.mock('../../../api/adminAPI/POST', () => ({ adminPostAPI: { applyAdminEloAdjustment: api.applyAdminEloAdjustment } }));

import { AdminEloAdjustmentModal } from './AdminEloAdjustmentModal';

const target = { userId: 'user-1', fullName: 'Client Nguyen' };

describe('AdminEloAdjustmentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.applyAdminEloAdjustment.mockResolvedValue({
      success: true,
      data: {
        transactionId: 'tx-2',
        userId: 'user-1',
        pointsDelta: 10,
        pointsBefore: 125,
        pointsAfter: 135,
        reason: 9,
        sourceType: 3,
        mode: 0,
        createdAt: '2026-08-01T12:00:00Z',
      },
    });
  });

  it('applies a fixed-point increase with an idempotency request id', async () => {
    const onApplied = vi.fn();
    const onClose = vi.fn();
    render(<AdminEloAdjustmentModal target={target} onApplied={onApplied} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('adminElo.adjustAmount'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/adminElo\.adjustReason/), { target: { value: 'Good review history' } });
    fireEvent.click(screen.getByRole('button', { name: 'adminElo.adjustSubmit' }));

    await waitFor(() =>
      expect(api.applyAdminEloAdjustment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          increase: true,
          mode: EloAdjustmentMode.FixedPoints,
          amount: 10,
          reason: 'Good review history',
        }),
      ),
    );
    expect(api.applyAdminEloAdjustment.mock.calls[0][0].requestId).toEqual(expect.any(String));
    await waitFor(() => expect(onApplied).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('applies a percentage decrease', async () => {
    render(<AdminEloAdjustmentModal target={target} onApplied={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'adminElo.adjustTypeDecrease' }));
    fireEvent.change(screen.getByLabelText('adminElo.adjustMode'), { target: { value: String(EloAdjustmentMode.Percentage) } });
    fireEvent.change(screen.getByLabelText('adminElo.adjustAmount'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'adminElo.adjustSubmit' }));

    await waitFor(() =>
      expect(api.applyAdminEloAdjustment).toHaveBeenCalledWith(
        expect.objectContaining({ increase: false, mode: EloAdjustmentMode.Percentage, amount: 10 }),
      ),
    );
  });

  it('rejects an invalid or zero amount', async () => {
    render(<AdminEloAdjustmentModal target={target} onApplied={vi.fn()} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('adminElo.adjustAmount'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'adminElo.adjustSubmit' }));

    expect(await screen.findByText('adminElo.adjustInvalidAmount')).toBeInTheDocument();
    expect(api.applyAdminEloAdjustment).not.toHaveBeenCalled();
  });

  it('shows the no-change notice without closing when the API reports no delta', async () => {
    api.applyAdminEloAdjustment.mockResolvedValue({ success: true, data: null });
    const onApplied = vi.fn();
    const onClose = vi.fn();
    render(<AdminEloAdjustmentModal target={target} onApplied={onApplied} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('adminElo.adjustAmount'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'adminElo.adjustSubmit' }));

    expect(await screen.findByText('adminElo.adjustNoChange')).toBeInTheDocument();
    expect(onApplied).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
