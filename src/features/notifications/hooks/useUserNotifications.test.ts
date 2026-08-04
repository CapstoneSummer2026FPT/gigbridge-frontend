import { describe, expect, it } from 'vitest';
import { normalizeNotification } from './useUserNotifications';

describe('normalizeNotification', () => {
  it.each([
    [14, 'subscription', '/premium/client'],
    [15, 'subscription', '/premium/client'],
    [16, 'promotion', '/premium/freelancer/promotions'],
    [17, 'promotion', '/premium/freelancer/promotions'],
    [18, 'rank_protection', '/premium/freelancer/rank-protection'],
    [19, 'rank_protection', '/premium/freelancer/rank-protection'],
    [21, 'review', '/reviews/create'],
  ] as const)('maps backend type %i to %s', (type, expectedType, expectedUrl) => {
    const result = normalizeNotification(
      { notificationId: `notification-${type}`, type, title: 'Title', content: 'Body' },
      0,
    );

    expect(result.type).toBe(expectedType);
    expect(result.actionUrl).toBe(expectedUrl);
  });

  it('routes report updates to the referenced contract for a regular user', () => {
    const result = normalizeNotification(
      {
        notificationId: 'report-update',
        type: 20,
        referenceId: 'contract-id',
        title: 'Report updated',
      },
      1,
    );

    expect(result.type).toBe('report');
    expect(result.actionUrl).toBe('/contracts/contract-id');
  });

  it.each([9, 21])('routes review notification type %i to the referenced contract review', type => {
    const result = normalizeNotification({
      notificationId: `review-${type}`,
      type,
      referenceId: 'contract-id',
      referenceType: 'Contract',
      title: 'Review project partner',
    });

    expect(result.type).toBe('review');
    expect(result.actionUrl).toBe('/reviews/create?contractId=contract-id');
  });

  it('uses the broadcast recipient as the read target', () => {
    const result = normalizeNotification({
      notificationId: 'broadcast-notification',
      broadcastRecipientId: 'recipient-id',
      type: 10,
      title: 'System update',
    });

    expect(result.source).toBe('broadcast');
    expect(result.readTargetId).toBe('recipient-id');
  });
});
