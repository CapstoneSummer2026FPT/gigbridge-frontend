import { describe, expect, it } from 'vitest';
import { projectPromotionQueue } from './promotionPolicy';

describe('promotion queue projection', () => {
  const queue = [
    { queuePosition: 1, boostWeight: 10, isCurrent: false },
    { queuePosition: 2, boostWeight: 6, isCurrent: false },
    { queuePosition: 3, boostWeight: 6, isCurrent: true },
  ];

  it('moves the current promotion ahead when its projected weight is greater', () => {
    const projected = projectPromotionQueue(queue, 11);

    expect(projected.find(entry => entry.isCurrent)?.queuePosition).toBe(1);
  });

  it('preserves current queue order when projected weights are equal', () => {
    const projected = projectPromotionQueue(queue, 6);

    expect(projected.find(entry => entry.isCurrent)?.queuePosition).toBe(3);
  });
});
