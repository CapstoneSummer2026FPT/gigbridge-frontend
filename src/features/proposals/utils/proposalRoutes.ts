export const getProposalCreatePath = (jobPostId: string, invitationId?: string) => {
  const basePath = `/proposals/create/${encodeURIComponent(jobPostId)}`;
  return invitationId
    ? `${basePath}?invitationId=${encodeURIComponent(invitationId)}`
    : basePath;
};
