import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, Briefcase, CheckCircle2, Clock, Eye, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { jobInvitationAPI } from '../../../api/jobInvitationAPI';
import { UserRole } from '../../../types/models/User';
import { JobInvitationStatus, type JobInvitationDto } from '../../../types/jobInvitation';
import '../styles/browse-jobs-screen.css';
import { GigCoinBudget } from '../../../shared/components/GigCoinAmount';

type StatusFilter = 'all' | 'active' | 'applied' | 'declined' | 'cancelled';

const getInvitationId = (invitation: JobInvitationDto): string =>
  invitation.jobInvitationId ?? invitation.jobInvitationsId ?? '';

const getInvitationJobPostId = (invitation: JobInvitationDto): string =>
  invitation.jobPostId ?? invitation.jobPostsId ?? '';

const isActiveInvitation = (invitation: JobInvitationDto): boolean => {
  const status = Number(invitation.status);
  return status === JobInvitationStatus.Pending || status === JobInvitationStatus.Viewed;
};

const statusLabel = (status?: number): string => {
  switch (Number(status)) {
    case JobInvitationStatus.Pending:
      return 'Pending';
    case JobInvitationStatus.Viewed:
      return 'Viewed';
    case JobInvitationStatus.Applied:
      return 'Applied';
    case JobInvitationStatus.Declined:
      return 'Declined';
    case JobInvitationStatus.Expired:
      return 'Expired';
    case JobInvitationStatus.Cancelled:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};

const statusClass = (status?: number): string => {
  switch (Number(status)) {
    case JobInvitationStatus.Pending:
      return 'badge-cyan';
    case JobInvitationStatus.Viewed:
      return 'badge-purple';
    case JobInvitationStatus.Applied:
      return 'badge-green';
    case JobInvitationStatus.Declined:
    case JobInvitationStatus.Cancelled:
      return 'badge-red';
    default:
      return 'badge-cyan';
  }
};

const formatDate = (value?: string | null): string => {
  if (!value) return 'Not specified';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const skillNames = (invitation: JobInvitationDto): string[] => [
  ...(invitation.skills || []).map(skill => skill.name || '').filter(Boolean),
  ...(invitation.customSkillNames || []),
];

export default function JobInvitationsScreen() {
  const navigate = useNavigate();
  const { role } = useApp();
  const [invitations, setInvitations] = useState<JobInvitationDto[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningIds, setActioningIds] = useState<Set<string>>(new Set());
  const isFreelancer = role === UserRole.Freelancer;

  useEffect(() => {
    let isMounted = true;

    const loadInvitations = async () => {
      if (!isFreelancer) {
        setInvitations([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await jobInvitationAPI.getMyInvitations({ page: 1, pageSize: 100 });
        if (isMounted) setInvitations(data);
      } catch (err) {
        if (!isMounted) return;
        setInvitations([]);
        setError(err instanceof Error ? err.message : 'Job invitations could not be loaded.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInvitations();

    return () => {
      isMounted = false;
    };
  }, [isFreelancer]);

  const filteredInvitations = useMemo(() => {
    return invitations.filter(invitation => {
      const status = Number(invitation.status);
      if (statusFilter === 'active') return isActiveInvitation(invitation);
      if (statusFilter === 'applied') return status === JobInvitationStatus.Applied;
      if (statusFilter === 'declined') return status === JobInvitationStatus.Declined;
      if (statusFilter === 'cancelled') return status === JobInvitationStatus.Cancelled;
      return true;
    });
  }, [invitations, statusFilter]);

  const updateInvitation = (updated: JobInvitationDto) => {
    const updatedId = getInvitationId(updated);
    setInvitations(prev => prev.map(invitation =>
      getInvitationId(invitation) === updatedId ? { ...invitation, ...updated } : invitation
    ));
  };

  const withAction = async (invitationId: string, action: () => Promise<void>) => {
    setActioningIds(prev => new Set(prev).add(invitationId));
    try {
      await action();
    } finally {
      setActioningIds(prev => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  const viewJob = async (invitation: JobInvitationDto) => {
    const invitationId = getInvitationId(invitation);
    const jobPostId = getInvitationJobPostId(invitation);
    if (!jobPostId) {
      toast.error('This invitation is missing a job post id.');
      return;
    }

    await withAction(invitationId, async () => {
      try {
        if (isActiveInvitation(invitation) && Number(invitation.status) === JobInvitationStatus.Pending) {
          updateInvitation(await jobInvitationAPI.markViewed(invitationId));
        }
      } catch (err) {
        console.error('Failed to mark invitation viewed:', err);
        toast.error(err instanceof Error ? err.message : 'Invitation could not be marked as viewed.');
      } finally {
        navigate(`/jobs/${jobPostId}`);
      }
    });
  };

  const createProposal = async (invitation: JobInvitationDto) => {
    const invitationId = getInvitationId(invitation);
    const jobPostId = getInvitationJobPostId(invitation);
    if (!jobPostId) {
      toast.error('This invitation is missing a job post id.');
      return;
    }

    await withAction(invitationId, async () => {
      try {
        if (isActiveInvitation(invitation)) {
          updateInvitation(await jobInvitationAPI.markApplied(invitationId));
          toast.success('Invitation marked as applied.');
        }
        navigate(`/proposals/create/${jobPostId}?invitationId=${invitationId}`);
      } catch (err) {
        console.error('Failed to apply invitation:', err);
        toast.error(err instanceof Error ? err.message : 'Invitation could not be marked as applied.');
      }
    });
  };

  const declineInvitation = async (invitation: JobInvitationDto) => {
    const invitationId = getInvitationId(invitation);
    const reason = window.prompt('Reason for declining this invitation?') || '';

    await withAction(invitationId, async () => {
      try {
        updateInvitation(await jobInvitationAPI.declineInvitation(invitationId, { reason }));
        toast.success('Invitation declined.');
      } catch (err) {
        console.error('Failed to decline invitation:', err);
        toast.error(err instanceof Error ? err.message : 'Invitation could not be declined.');
      }
    });
  };

  if (!isFreelancer) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-20 text-center glass-card">
          <AlertCircle size={44} className="mx-auto mb-4 browse-jobs-job-meta" />
          <p className="text-primary font-semibold">Job invitations are available to freelancer accounts only.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            Job <span className="text-blue-600 black:text-blue-400 italic font-light">Invitations</span>
          </h1>
          <p className="browse-jobs-desc">Review invitations sent by clients and choose your next opportunity.</p>
        </div>

        <div className="glass-card p-4 mb-5 flex flex-wrap gap-2">
          {[
            ['active', 'Active'],
            ['all', 'All'],
            ['applied', 'Applied'],
            ['declined', 'Declined'],
            ['cancelled', 'Cancelled'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value as StatusFilter)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${statusFilter === value ? 'browse-jobs-ai-toggle-active' : 'browse-jobs-ai-toggle-inactive'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 glass-card">
            <p className="text-primary font-semibold mb-2">Loading job invitations...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 glass-card">
            <AlertCircle size={44} className="mx-auto mb-4 browse-jobs-job-meta" />
            <p className="text-primary font-semibold mb-2">{error}</p>
          </div>
        ) : filteredInvitations.length === 0 ? (
          <div className="text-center py-20 glass-card">
            <Briefcase size={44} className="mx-auto mb-4 browse-jobs-job-meta" />
            <p className="text-primary font-semibold mb-2">No job invitations found.</p>
            <button className="btn-cyan px-4 py-2 text-sm" onClick={() => navigate('/jobs/browse')}>Browse Jobs</button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInvitations.map(invitation => {
              const invitationId = getInvitationId(invitation);
              const isActioning = actioningIds.has(invitationId);
              const active = isActiveInvitation(invitation);
              return (
                <div key={invitationId} className="glass-card p-5 browse-jobs-job-card">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h2 className="text-primary font-semibold">{invitation.jobTitle || 'Job invitation'}</h2>
                        <span className={`${statusClass(invitation.status)} text-xs`}>{statusLabel(invitation.status)}</span>
                        {invitation.categoryName && <span className="badge-cyan text-xs">{invitation.categoryName}</span>}
                      </div>
                      <p className="text-sm browse-jobs-job-meta mb-3 line-clamp-2">{invitation.jobDescription || 'No description provided.'}</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {skillNames(invitation).slice(0, 8).map(skill => <span key={skill} className="tag-pill">{skill}</span>)}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs browse-jobs-job-meta">
                        <span className="flex items-center gap-1"><GigCoinBudget min={invitation.budgetMin} max={invitation.budgetMax} /></span>
                        <span className="flex items-center gap-1"><Clock size={12} />Invited {formatDate(invitation.createdAt)}</span>
                        <span>Client: {invitation.clientCompanyName || invitation.clientName || 'Client'}</span>
                        {invitation.message && <span>Message: {invitation.message}</span>}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                      <button
                        className="btn-ghost-cyan px-3 py-2 text-xs"
                        onClick={() => viewJob(invitation)}
                        disabled={isActioning}
                      >
                        <Eye size={14} /> View JobPost
                      </button>
                      <button
                        className="btn-cyan px-3 py-2 text-xs"
                        onClick={() => createProposal(invitation)}
                        disabled={isActioning || Number(invitation.status) === JobInvitationStatus.Declined || Number(invitation.status) === JobInvitationStatus.Cancelled}
                      >
                        {Number(invitation.status) === JobInvitationStatus.Applied ? <CheckCircle2 size={14} /> : <Send size={14} />}
                        Create Proposal
                      </button>
                      <button
                        className="btn-ghost-cyan px-3 py-2 text-xs disabled:opacity-50"
                        onClick={() => declineInvitation(invitation)}
                        disabled={isActioning || !active}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
