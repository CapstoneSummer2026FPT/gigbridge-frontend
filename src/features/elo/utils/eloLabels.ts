import {
  EloAdjustmentMode,
  EloAdjustmentSourceType,
  EloPointAppealStatus,
  UserEloPointReason,
} from '../../../types/elo';

/**
 * Maps persisted enum values to i18n key paths so the UI never hardcodes text.
 * The components resolve these through t() from useTranslation.
 */

export const eloReasonKey = (reason: number): string =>
  `elo.reasons.${reason}`;

export const eloSourceTypeKey = (sourceType?: number | null): string =>
  `elo.sourceTypes.${sourceType ?? EloAdjustmentSourceType.System}`;

export const eloModeKey = (mode?: number | null): string =>
  `elo.modes.${mode ?? EloAdjustmentMode.FixedPoints}`;

export const eloAppealStatusKey = (status: number): string =>
  `elo.appealStatus.${status}`;

export const eloAppealResolutionKey = (resolution: number): string =>
  `elo.resolutions.${resolution}`;

/** True when an Elo transaction can be appealed (not the initial grant). */
export const canAppealTransaction = (transaction: { reason: number }): boolean =>
  transaction.reason !== UserEloPointReason.InitialGrant;

/** True when an appeal is still open to evidence/edits by its owner. */
export const isAppealActionable = (status: number): boolean =>
  status === EloPointAppealStatus.Pending;

/** True when an admin can resolve an appeal (open or under review). */
export const canResolveAppeal = (status: number): boolean =>
  status === EloPointAppealStatus.Pending || status === EloPointAppealStatus.UnderReview;

/** Reasons shown in the "Reviews" filter bucket (backend EloHistoryFilter.Reviews). */
export const REVIEW_REASONS = [
  UserEloPointReason.JobCompletion,
  UserEloPointReason.ReviewRating,
  UserEloPointReason.ReviewModeration,
  UserEloPointReason.CompletedJobReview,
];
