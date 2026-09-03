export const getProposalCreatePath = (jobPostId: string, invitationId?: string) => {
  const basePath = `/proposals/create/${encodeURIComponent(jobPostId)}`;
  return invitationId
    ? `${basePath}?invitationId=${encodeURIComponent(invitationId)}`
    : basePath;
};

/** Step 2 — the timed manual interview questions for a job post. */
export const getProposalQuestionsPath = (jobPostId: string, proposalId: string) =>
  `/proposals/create/${encodeURIComponent(jobPostId)}/questions?proposalId=${encodeURIComponent(proposalId)}`;

/** Step 3 — the review & submit screen, deep-linkable by proposal id alone. */
export const getProposalReviewPath = (proposalId: string) =>
  `/proposals/${encodeURIComponent(proposalId)}/review`;

/** The AI interview replaces step 2 when the job post runs one. */
export const getProposalAiInterviewPath = (jobPostId: string, proposalId: string) =>
  `/ai-interview/${encodeURIComponent(jobPostId)}?proposalId=${encodeURIComponent(proposalId)}`;
