import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../types';
import ProposalsInboxScreen from '../screens/ProposalsInboxScreen';

let activeRole = UserRole.Client;

vi.mock('../../../app/providers/AppProvider', () => ({
  useApp: () => ({ role: activeRole }),
}));

vi.mock('../screens/ClientProposalsScreen', () => ({
  default: () => <div>Phase 2 proposal comparison</div>,
}));

vi.mock('../screens/FreelancerProposalsScreen', () => ({
  default: () => <div>Freelancer proposal inbox</div>,
}));

describe('ProposalsInboxScreen', () => {
  beforeEach(() => {
    activeRole = UserRole.Client;
  });

  it('renders the Phase 2 comparison workspace for clients', () => {
    render(<ProposalsInboxScreen />);

    expect(screen.getByText('Phase 2 proposal comparison')).toBeInTheDocument();
    expect(screen.queryByText('Freelancer proposal inbox')).not.toBeInTheDocument();
  });

  it('keeps the freelancer proposal inbox for freelancers', () => {
    activeRole = UserRole.Freelancer;
    render(<ProposalsInboxScreen />);

    expect(screen.getByText('Freelancer proposal inbox')).toBeInTheDocument();
    expect(screen.queryByText('Phase 2 proposal comparison')).not.toBeInTheDocument();
  });
});
