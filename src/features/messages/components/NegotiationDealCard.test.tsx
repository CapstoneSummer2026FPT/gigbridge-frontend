import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NegotiationOfferDetailDto } from '../../../types/models/Message';
import { NegotiationDealCard } from './NegotiationDealCard';

const copy: Record<string, string> = {
  'messages.deal.title': 'Final offer',
  'messages.deal.subtitle': 'Contract proposal',
  'messages.deal.finalBudget': 'Final budget',
  'messages.deal.milestones': 'Milestones',
  'messages.deal.tasks': 'Tasks',
  'messages.deal.viewDetails': 'View offer details',
  'messages.deal.detailTitle': 'Final offer details',
  'messages.deal.detailSubtitle': 'Review the complete offer.',
  'messages.deal.close': 'Close',
  'messages.deal.accept': 'Accept offer',
  'messages.deal.decline': 'Decline',
  'messages.deal.previousOffer': 'Previous offer',
  'messages.deal.status.pending_freelancer': 'Awaiting response',
  'messages.deal.loadingDetails': 'Loading offer details...',
  'messages.deal.moreMilestones': '+{{count}} more milestones',
  'messages.deal.summaryCount': '{{milestones}} milestones · {{tasks}} tasks',
  'messages.deal.untitledMilestone': 'Untitled milestone',
  'messages.deal.untitledWorkItem': 'Untitled task',
  'messages.deal.noMilestones': 'No milestones',
  'messages.deal.description': 'Description',
  'messages.deal.deliverables': 'Deliverables',
  'messages.deal.acceptance': 'Acceptance criteria',
  'messages.deal.workBreakdown': 'Work breakdown',
  'messages.deal.duration': 'Duration',
  'messages.deal.noWorkItems': 'No tasks',
  'messages.deal.offeredOn': 'Offer created',
  'messages.deal.startDate': 'Expected start',
  'messages.deal.endDate': 'Expected completion',
  'messages.deal.scopeSummary': 'Scope summary',
  'messages.deal.clientNote': 'Client note',
  'messages.deal.deliveryPlan': 'Delivery plan',
  'messages.deal.deliveryPlanHint': 'Review each milestone.',
  'messages.deal.negotiationClosed': 'Negotiation closed.',
  'messages.deal.awaitingPartner': 'Waiting for the other party.',
};

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, number>) => {
      let value = copy[key] || key;
      Object.entries(values || {}).forEach(([name, replacement]) => {
        value = value.replace(`{{${name}}}`, String(replacement));
      });
      return value;
    },
    i18n: { language: 'en', resolvedLanguage: 'en' },
  }),
}));

const detail: NegotiationOfferDetailDto = {
  negotiationOfferId: 'offer-1',
  conversationId: 'conversation-1',
  finalPrice: 240,
  scopeSummary: 'Build a production-ready client portal.',
  clientNote: 'Coordinate releases with the product team.',
  status: 0,
  createdAt: '2026-07-28T00:00:00Z',
  startDate: '2026-08-01',
  endDate: '2026-08-31',
  milestones: [
    {
      id: 'milestone-1',
      title: 'Product foundation',
      description: 'This long milestone description belongs only in the detail modal.',
      amount: 140,
      estimatedDuration: '2 weeks',
      dueDate: '2026-08-15T00:00:00Z',
      deliverables: 'Responsive client dashboard',
      acceptanceCriteria: 'All acceptance tests pass',
      orderIndex: 0,
      workItems: [
        {
          id: 'work-1',
          title: 'Dashboard shell',
          description: 'Implement the authenticated layout.',
          estimatedDuration: '3 days',
          orderIndex: 0,
        },
      ],
    },
    {
      id: 'milestone-2',
      title: 'Production release',
      amount: 100,
      orderIndex: 1,
      workItems: [],
    },
  ],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NegotiationDealCard', () => {
  it('keeps the chat card compact and shows the full scope only in the modal', () => {
    render(
      <NegotiationDealCard
        offerId="offer-1"
        amount={240}
        detail={detail}
        status="pending_freelancer"
        isLatestOffer
        canRespond
        canNegotiate
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />,
    );

    expect(screen.getByText('Product foundation')).toBeInTheDocument();
    expect(screen.queryByText(detail.milestones[0].description!)).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: 'View offer details' });
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: 'Final offer details' })).toBeInTheDocument();
    expect(screen.getByText(detail.milestones[0].description!)).toBeInTheDocument();
    expect(screen.getByText('All acceptance tests pass')).toBeInTheDocument();
    expect(screen.getByText(/Dashboard shell/)).toBeInTheDocument();
    expect(screen.getByText('Offer created')).toBeInTheDocument();
    expect(screen.getByText('Expected start')).toBeInTheDocument();
    expect(screen.getByText('Expected completion')).toBeInTheDocument();
    expect(screen.getByText(/3 days/)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps accept and decline actions inside the modal and forwards the offer data', () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();

    render(
      <NegotiationDealCard
        offerId="offer-1"
        amount={10}
        detail={detail}
        status="pending_freelancer"
        isLatestOffer
        canRespond
        canNegotiate
        onAccept={onAccept}
        onDecline={onDecline}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Accept offer' })).not.toBeInTheDocument();
    const viewDetails = screen.getByRole('button', { name: 'View offer details' });
    fireEvent.click(viewDetails);
    fireEvent.click(screen.getByRole('button', { name: 'Accept offer' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(viewDetails);
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));

    expect(onAccept).toHaveBeenCalledWith('offer-1', 240);
    expect(onDecline).toHaveBeenCalledWith('offer-1');
  });

  it('renders historical offers as read-only', () => {
    render(
      <NegotiationDealCard
        offerId="offer-1"
        amount={240}
        detail={detail}
        status="pending_freelancer"
        isLatestOffer={false}
        canRespond
        canNegotiate
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />,
    );

    expect(screen.getByText('Previous offer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View offer details' }));
    expect(screen.queryByRole('button', { name: 'Accept offer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });
});
