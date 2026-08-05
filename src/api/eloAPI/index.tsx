export { eloGetAPI } from './GET';
export { eloPostAPI } from './POST';

// Combined Elo API for convenience.
import { eloGetAPI } from './GET';
import { eloPostAPI } from './POST';

export const eloAPI = {
  getEloSummary: eloGetAPI.getEloSummary,
  getEloHistory: eloGetAPI.getEloHistory,
  getEloTransactionDetail: eloGetAPI.getEloTransactionDetail,
  getMyEloAppeals: eloGetAPI.getMyEloAppeals,
  getEloAppealDetail: eloGetAPI.getEloAppealDetail,
  createEloAppeal: eloPostAPI.createEloAppeal,
  uploadEloAppealEvidence: eloPostAPI.uploadEloAppealEvidence,
  cancelEloAppeal: eloPostAPI.cancelEloAppeal,
};
