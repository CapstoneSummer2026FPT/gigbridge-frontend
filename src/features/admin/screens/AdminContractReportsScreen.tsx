import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { adminGetAPI } from '../../../api/adminAPI/GET';
import type { AdminContractReportListItem } from '../../../types/models/AdminContractReport';
import '../styles/admin-phase-one.css';
import { AppLayout } from '../../../shared/components/AppLayout';

const statusNames = ['Open', 'Under review', 'Awaiting information', 'Closed', 'Dismissed', 'Escalated', 'Linked to dispute'];

export default function AdminContractReportsScreen() {
  const [items, setItems] = useState<AdminContractReportListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [issue, setIssue] = useState('');
  const [reporter, setReporter] = useState('');
  const [respondent, setRespondent] = useState('');
  const [client, setClient] = useState('');
  const [freelancer, setFreelancer] = useState('');
  const [contract, setContract] = useState('');
  const [job, setJob] = useState('');
  const [milestone, setMilestone] = useState('');
  const [assigned, setAssigned] = useState('');
  const [link, setLink] = useState('');
  const [attachments, setAttachments] = useState('');
  const [response, setResponse] = useState('');
  const [escalated, setEscalated] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [updatedFrom, setUpdatedFrom] = useState('');
  const [updatedTo, setUpdatedTo] = useState('');
  const [sort, setSort] = useState('createdAt-desc');

  const load = async (next = page) => {
    setError('');
    const [sortBy, direction] = sort.split('-');
    const r = await adminGetAPI.getContractReports({
      page: next,
      pageSize: 20,
      search: search || undefined,
      adminReviewStatus: status === '' ? undefined : Number(status),
      issueType: issue === '' ? undefined : Number(issue),
      reporterId: reporter || undefined,
      respondentId: respondent || undefined,
      clientId: client || undefined,
      freelancerId: freelancer || undefined,
      contractId: contract || undefined,
      jobPostId: job || undefined,
      milestoneId: milestone || undefined,
      assignedAdminId: assigned && assigned !== 'unassigned' ? assigned : undefined,
      unassignedOnly: assigned === 'unassigned',
      hasRelatedDispute: link === '' ? undefined : link === 'true',
      hasAttachments: attachments === '' ? undefined : attachments === 'true',
      hasResponse: response === '' ? undefined : response === 'true',
      escalated: escalated === '' ? undefined : escalated === 'true',
      createdFrom: createdFrom ? new Date(createdFrom).toISOString() : undefined,
      createdTo: createdTo ? new Date(`${createdTo}T23:59:59Z`).toISOString() : undefined,
      updatedFrom: updatedFrom ? new Date(updatedFrom).toISOString() : undefined,
      updatedTo: updatedTo ? new Date(`${updatedTo}T23:59:59Z`).toISOString() : undefined,
      sortBy,
      sortDescending: direction === 'desc',
    });

    if (r.success && r.data) {
      setItems(r.data.items);
      setPage(r.data.pageNumber);
      setPages(r.data.totalPages);
    } else {
      setError(r.message || 'Unable to load Contract Reports.');
    }
  };

  useEffect(() => {
    void load(1);
  }, []);

  return (
    <AppLayout>
      <main className="admin-phase">
        <div className="admin-phase__header">
          <div>
            <Link to="/admin/reports">← All Reports</Link>
            <h1>Contract Reports</h1>
            <p>Contract-execution investigations and safe escalation into Disputes.</p>
          </div>
        </div>
        {error && <div className="admin-phase__error">{error}</div>}

        <section className="admin-phase__panel">
          <div className="admin-phase__filters">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search contract, participant, or issue"
            />
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All Admin states</option>
              {statusNames.map((x, i) => (
                <option key={x} value={i}>{x}</option>
              ))}
            </select>
            <select value={issue} onChange={e => setIssue(e.target.value)}>
              <option value="">All issue types</option>
              {['Payment', 'Milestone', 'Delay', 'Poor quality', 'Communication', 'Scope change', 'Other'].map((x, i) => (
                <option key={x} value={i}>{x}</option>
              ))}
            </select>

            <select aria-label="Sort Contract Reports" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="createdAt-desc">Newest created</option>
              <option value="createdAt-asc">Oldest created</option>
              <option value="updatedAt-desc">Recently updated</option>
              <option value="status-asc">Admin state</option>
            </select>

            <input value={reporter} onChange={e => setReporter(e.target.value)} placeholder="Reporter user ID" />
            <input value={respondent} onChange={e => setRespondent(e.target.value)} placeholder="Respondent user ID" />
            <input value={client} onChange={e => setClient(e.target.value)} placeholder="Client user ID" />
            <input value={freelancer} onChange={e => setFreelancer(e.target.value)} placeholder="Freelancer user ID" />
            <input value={contract} onChange={e => setContract(e.target.value)} placeholder="Contract ID" />
            <input value={job} onChange={e => setJob(e.target.value)} placeholder="Job Post ID" />
            <input value={milestone} onChange={e => setMilestone(e.target.value)} placeholder="Milestone ID" />
            <input value={assigned} onChange={e => setAssigned(e.target.value)} placeholder="Assigned Admin ID or unassigned" />

            <select value={link} onChange={e => setLink(e.target.value)}>
              <option value="">Any dispute linkage</option>
              <option value="true">Has Dispute</option>
              <option value="false">No Dispute</option>
            </select>
            <select value={escalated} onChange={e => setEscalated(e.target.value)}>
              <option value="">Any escalation state</option>
              <option value="true">Escalated</option>
              <option value="false">Not escalated</option>
            </select>
            <select value={attachments} onChange={e => setAttachments(e.target.value)}>
              <option value="">Any evidence</option>
              <option value="true">Has attachments</option>
              <option value="false">No attachments</option>
            </select>
            <select value={response} onChange={e => setResponse(e.target.value)}>
              <option value="">Any response state</option>
              <option value="true">Has response</option>
              <option value="false">No response</option>
            </select>
            <input type="date" aria-label="Created from" value={createdFrom} onChange={e => setCreatedFrom(e.target.value)} />
            <input type="date" aria-label="Created to" value={createdTo} onChange={e => setCreatedTo(e.target.value)} />
            <input type="date" aria-label="Updated from" value={updatedFrom} onChange={e => setUpdatedFrom(e.target.value)} />
            <input type="date" aria-label="Updated to" value={updatedTo} onChange={e => setUpdatedTo(e.target.value)} />
            <button type="button" className="primary" onClick={() => load(1)}>Apply filters</button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Contract Report</th>
                <th>Participants</th>
                <th>Issue</th>
                <th>Admin state</th>
                <th>Evidence</th>
                <th>Dispute</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map(x => (
                <tr key={x.reportContractId}>
                  <td>
                    <Link to={`/admin/reports/contracts/${x.reportContractId}`}>{x.contractTitle}</Link>
                    <small>{x.jobPostTitle}</small>
                  </td>
                  <td>
                    {x.reporterName} ({x.reporterRole})
                    <small>{x.respondentName || 'No respondent'} {x.respondentRole && `(${x.respondentRole})`}</small>
                  </td>
                  <td>
                    Type {x.issueType}
                    {x.milestoneTitle && <small>{x.milestoneTitle}</small>}
                  </td>
                  <td>
                    <span className="admin-phase__badge">{statusNames[x.adminReviewStatus] || x.adminReviewStatus}</span>
                    <small>{x.assignedAdminName || 'Unassigned'}</small>
                  </td>
                  <td>{x.attachmentCount}</td>
                  <td>
                    {x.relatedDisputeId ? <Link to={`/admin/disputes/${x.relatedDisputeId}`}>Open Dispute</Link> : 'None'}
                  </td>
                  <td>{new Date(x.updatedAt || x.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!items.length && <p>No Contract Reports match these filters.</p>}

          <div className="admin-phase__actions">
            <button type="button" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button>
            <span>Page {page} of {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => load(page + 1)}>Next</button>
          </div>
        </section>
      </main>
    </AppLayout>
  );
}
