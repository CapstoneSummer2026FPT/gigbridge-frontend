import { useNavigate } from 'react-router';
import { Briefcase, ChevronRight, FileText, Users, MoreVertical, Clock } from 'lucide-react';
import type { JobProposalGroup } from '../types';
import { getStatusLabel } from '../utils/statusHelpers';

interface ClientProposalSidebarProps {
  loading: boolean;
  jobGroups: JobProposalGroup[];
  managingJob: JobProposalGroup | null;
  jobMenuOpen: string | null;
  onJobSelect: (group: JobProposalGroup | null) => void;
  onJobMenuToggle: (jobId: string | null) => void;
}

export function ClientProposalSidebar({
  loading,
  jobGroups,
  managingJob,
  jobMenuOpen,
  onJobSelect,
  onJobMenuToggle,
}: ClientProposalSidebarProps) {
  const navigate = useNavigate();

  return (
    <div className={`proposals-sidebar ${managingJob ? 'collapsed' : ''}`}>
      <div className="proposals-table-card">
        <div className="proposals-table-header">
          <div>JobPost</div>
          <div>Count</div>
          {!managingJob && <div>Action</div>}
        </div>

        {loading ? (
          <div className="proposals-empty">
            <Clock size={28} />
            <p>Loading proposals...</p>
          </div>
        ) : jobGroups.length === 0 ? (
          <div className="proposals-empty">
            <Users size={32} />
            <p>No proposals found</p>
            <span>Jobs with submitted proposals will appear here.</span>
          </div>
        ) : (
          <div className="proposals-table-body">
            {jobGroups.map(group => (
              <div key={group.jobPostsId} className={`proposals-table-row ${managingJob?.jobPostsId === group.jobPostsId ? 'active' : ''}`}>
                <div className="proposal-job-row-content">
                  <button
                    className="proposal-job-cell"
                    onClick={() => {
                      if (managingJob?.jobPostsId === group.jobPostsId) {
                        onJobSelect(null);
                      } else {
                        onJobSelect(group);
                      }
                    }}
                  >
                    <span className="proposal-job-icon">
                      <Briefcase size={18} />
                    </span>
                    <span>
                      <strong>{group.jobTitle}</strong>
                      {!managingJob && <small>Click to manage</small>}
                    </span>
                    {managingJob?.jobPostsId === group.jobPostsId && (
                      <span className="proposal-chevron">
                        <ChevronRight size={16} />
                      </span>
                    )}
                  </button>

                  {/* Notification badge */}
                  {group.proposals.filter(p => getStatusLabel(p.status) === 'Pending').length > 0 && (
                    <span className="proposal-job-notification-dot">
                      <span className="notification-dot">{group.proposals.filter(p => getStatusLabel(p.status) === 'Pending').length}</span>
                    </span>
                  )}

                  {/* 3-dot menu for job actions */}
                  <div className="proposal-job-menu-wrapper">
                    <button
                      className="proposal-job-menu-trigger"
                      onClick={(e) => {
                        e.stopPropagation();
                        onJobMenuToggle(jobMenuOpen === group.jobPostsId ? null : group.jobPostsId);
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {jobMenuOpen === group.jobPostsId && (
                      <div className="proposal-job-menu-dropdown">
                        <button onClick={() => {
                          navigate(`/jobs/my-jobs/${group.jobPostsId}`);
                          onJobMenuToggle(null);
                        }}>
                          View JobPost Preview
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {!managingJob && (
                  <>
                    <div className="proposal-count-cell">
                      <strong>{group.proposals.length}</strong>
                    </div>

                    <div className="proposal-action-cell">
                      <button className="proposal-manage-btn" onClick={() => onJobSelect(group)}>
                        <FileText size={16} />
                        Manage
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
