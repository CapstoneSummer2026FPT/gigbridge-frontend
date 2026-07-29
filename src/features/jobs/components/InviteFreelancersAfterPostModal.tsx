import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Search, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { jobInvitationAPI } from '../../../api/jobInvitationAPI';
import type { FreelancerSummaryDto } from '../../../types/models/Profile';

interface InviteFreelancersAfterPostModalProps {
  jobPostId: string;
  jobTitle?: string;
  onClose: () => void;
}

const getFreelancerProfileId = (freelancer: FreelancerSummaryDto): string =>
  freelancer.freelancerProfilesId;

const getFreelancerName = (freelancer: FreelancerSummaryDto): string =>
  freelancer.userFullName || freelancer.title || 'Freelancer';

export function InviteFreelancersAfterPostModal({
  jobPostId,
  jobTitle,
  onClose,
}: InviteFreelancersAfterPostModalProps) {
  const [freelancers, setFreelancers] = useState<FreelancerSummaryDto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadFreelancers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await profileGetAPI.getFreelancers({
          page: 1,
          pageSize: 50,
          search: query.trim() || undefined,
          sort: 'featured',
        });
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Unable to load freelancer profiles.');
        }

        if (isMounted) {
          setFreelancers(
            response.data.items.filter(freelancer => getFreelancerProfileId(freelancer)),
          );
        }
      } catch (err) {
        if (!isMounted) return;
        setFreelancers([]);
        setError(err instanceof Error ? err.message : 'Unable to load freelancer profiles.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadFreelancers();
    }, query.trim() ? 250 : 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const toggleFreelancer = (freelancerProfileId: string) => {
    setSelectedIds(prev =>
      prev.includes(freelancerProfileId)
        ? prev.filter(id => id !== freelancerProfileId)
        : [...prev, freelancerProfileId]
    );
    setError(null);
  };

  const submitInvites = async () => {
    if (!jobPostId || selectedIds.length === 0) {
      setError('Select at least one freelancer to invite.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const result = await jobInvitationAPI.bulkCreateInvitations({
        jobPostIds: [jobPostId],
        freelancerProfileIds: selectedIds,
        message: message.trim() || null,
      });

      if (result.created.length === 0) {
        setError(result.skipped[0]?.reason || 'No invitations were sent.');
        return;
      }

      toast.success(`${result.created.length} invitation${result.created.length === 1 ? '' : 's'} sent.`);
      setSuccess(true);
      setSelectedIds([]);
      setTimeout(onClose, 1300);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitations could not be sent.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[86vh] overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Invite freelancers</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Send invitations for {jobTitle || 'your new job post'}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-border bg-background hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 overflow-y-auto max-h-[64vh]">
          <div>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search freelancers by name, title, location, or skill..."
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/30"
              />
            </div>

            {loading ? (
              <div className="rounded-xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
                Loading freelancers...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500 flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            ) : freelancers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
                No freelancers found.
              </div>
            ) : (
              <div className="space-y-3">
                {freelancers.map(freelancer => {
                  const freelancerProfileId = getFreelancerProfileId(freelancer);
                  const checked = selectedIds.includes(freelancerProfileId);
                  const skillNames = (freelancer.skills || []).map(skill => skill.skillName).filter(Boolean);

                  return (
                    <label
                      key={freelancerProfileId}
                      className={`rounded-xl border p-4 bg-background cursor-pointer flex gap-3 transition-all ${checked ? 'border-[var(--gb-cyan)] ring-2 ring-[var(--gb-cyan)]/15' : 'border-border hover:border-[var(--gb-cyan)]/60'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFreelancer(freelancerProfileId)}
                        className="mt-1"
                        disabled={submitting || success}
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-foreground">{getFreelancerName(freelancer)}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{freelancer.title || 'Freelancer'} {freelancer.location ? `- ${freelancer.location}` : ''}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {skillNames.slice(0, 5).map(skill => (
                            <span key={skill} className="tag-pill">{skill}</span>
                          ))}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-background p-4 h-fit sticky top-0">
            <h3 className="text-sm font-bold text-foreground">Invitation message</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedIds.length} freelancer{selectedIds.length === 1 ? '' : 's'} selected.
            </p>
            <textarea
              value={message}
              onChange={event => setMessage(event.target.value.slice(0, 1000))}
              className="mt-4 w-full rounded-xl border border-border bg-card p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/30"
              rows={8}
              placeholder="Optional note for invited freelancers..."
              disabled={submitting || success}
            />
            <div className="text-right text-[10px] text-muted-foreground mt-1">{message.length}/1000</div>

            {success && (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-500 flex items-center gap-2">
                <CheckCircle2 size={16} />
                Invitations sent.
              </div>
            )}

            <button
              type="button"
              onClick={submitInvites}
              disabled={submitting || success || selectedIds.length === 0}
              className="mt-4 w-full rounded-full bg-[var(--gb-cyan)] text-white px-5 py-3 text-sm font-bold border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send size={16} />
              {submitting ? 'Sending...' : 'Send invitations'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
