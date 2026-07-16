import { describe, expect, it } from 'vitest';
import {
  applyPremiumTalentMatches,
  prioritizePremiumTalents,
  resolveTalentTab,
  type ApiTalentMatch,
} from './SmartTalentMatchingScreen';
import type { TalentMatch } from '../../premium/types/premiumClient';

const createTalent = (id: string, fullName: string): ApiTalentMatch => ({
  id,
  freelancerProfileId: id,
  userId: `user-${id}`,
  fullName,
  title: 'Engineer',
  location: 'Remote',
  avatarUrl: '',
  projectBudget: 5_000,
  category: 'Software Development',
  industryExperience: [],
  skills: ['React', 'TypeScript'],
  completedMilestones: 2,
  anonymousRating: 4.8,
  responseTime: 'Responds soon',
  availability: 'Available full-time',
  recentWork: 'Built a marketplace.',
  matchScore: 50,
  skillScore: 0,
  budgetScore: 10,
  categoryScore: 15,
  advancedScore: 9,
  matchedSkills: [],
  matchReasons: [],
  rating: 4.8,
  eloPoints: 900,
  isPremium: false,
});

const createMatch = (
  freelancerId: string,
  matchPercentage: number,
  matchedSkills: string[],
  missingSkills: string[],
): TalentMatch => ({
  freelancerId,
  displayName: freelancerId,
  title: 'Engineer',
  matchPercentage,
  matchedSkills,
  missingSkills,
  reasons: [`${matchPercentage}% AI match`],
});

describe('applyPremiumTalentMatches', () => {
  it('orders live profiles by the AI score and applies the AI match details', () => {
    const talents = [
      createTalent('profile-low', 'Lower Match'),
      createTalent('profile-high', 'Higher Match'),
    ];
    const matches = [
      createMatch('profile-low', 72.4, ['React'], ['C#']),
      createMatch('profile-high', 94.6, ['React', 'TypeScript', 'C#'], ['Azure']),
    ];

    const result = applyPremiumTalentMatches(matches, talents);

    expect(result.map(talent => talent.freelancerProfileId)).toEqual([
      'profile-high',
      'profile-low',
    ]);
    expect(result[0]).toMatchObject({
      fullName: 'Higher Match',
      matchScore: 95,
      skillScore: 36,
      matchedSkills: ['React', 'TypeScript', 'C#'],
      matchReasons: ['94.6% AI match'],
    });
  });

  it('omits AI results that do not have a live freelancer profile', () => {
    const result = applyPremiumTalentMatches(
      [createMatch('missing-profile', 99, ['React'], [])],
      [createTalent('profile-1', 'Available Profile')],
    );

    expect(result).toEqual([]);
  });
});

describe('prioritizePremiumTalents', () => {
  it('places premium freelancers first while preserving each section order', () => {
    const regularFirst = createTalent('regular-first', 'Regular First');
    const premiumFirst = { ...createTalent('premium-first', 'Premium First'), isPremium: true };
    const regularSecond = createTalent('regular-second', 'Regular Second');
    const premiumSecond = { ...createTalent('premium-second', 'Premium Second'), isPremium: true };

    const result = prioritizePremiumTalents([
      regularFirst,
      premiumFirst,
      regularSecond,
      premiumSecond,
    ]);

    expect(result.map(talent => talent.freelancerProfileId)).toEqual([
      'premium-first',
      'premium-second',
      'regular-first',
      'regular-second',
    ]);
  });
});

describe('resolveTalentTab', () => {
  it('uses the freelancer directory by default', () => {
    expect(resolveTalentTab(null)).toBe('all');
    expect(resolveTalentTab('unknown')).toBe('all');
  });

  it('preserves explicit Smart Matches and saved tabs', () => {
    expect(resolveTalentTab('matches')).toBe('matches');
    expect(resolveTalentTab('saved')).toBe('saved');
  });
});
