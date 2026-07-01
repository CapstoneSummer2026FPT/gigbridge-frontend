import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  FileText,
  Loader,
  Search,
  UserRoundCheck,
  X,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { esignGetAPI } from '../../../api/esignAPI/GET';
import type {
  ESignDocumentDto,
  ESignDocumentListItemDto,
  ESignDocumentListPageDto,
} from '../../../types/models/ESign';
import { ESignerRole, ESignDocumentStatus } from '../../../types/models/ESign';
import { ContractAreaTabs } from '../components/ContractAreaTabs';
import '../styles/manage-contract-screen.css';
import '../styles/esign-contracts-screen.css';

type StatusFilter = 'all' | ESignDocumentStatus.FullySigned | ESignDocumentStatus.PartiallySigned;

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: ESignDocumentStatus.FullySigned, label: 'Fully signed' },
  { value: ESignDocumentStatus.PartiallySigned, label: 'Partially signed' },
];

const formatDateTime = (value?: string | null): string => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
};

const getStatusLabel = (status: number): string => {
  switch (status) {
    case ESignDocumentStatus.FullySigned:
      return 'Fully signed';
    case ESignDocumentStatus.PartiallySigned:
      return 'Partially signed';
    case ESignDocumentStatus.PendingSignatures:
      return 'Pending signatures';
    case ESignDocumentStatus.Expired:
      return 'Expired';
    case ESignDocumentStatus.Voided:
      return 'Voided';
    default:
      return 'Draft';
  }
};

const getSignerRoleLabel = (role: number): string => {
  switch (role) {
    case ESignerRole.Client:
      return 'Client';
    case ESignerRole.Freelancer:
      return 'Freelancer';
    default:
      return 'Signer';
  }
};

const getShortId = (value: string): string =>
  value ? `${value.slice(0, 8)}...${value.slice(-4)}` : 'N/A';

interface GroupedDocuments {
  jobPostId: string;
  documents: ESignDocumentListItemDto[];
}

interface DocumentRowProps {
  document: ESignDocumentListItemDto;
  isSelected: boolean;
  onSelect: (documentId: string) => void;
}

function DocumentRow({ document, isSelected, onSelect }: DocumentRowProps): JSX.Element {
  const handleSelect = (): void => {
    onSelect(document.documentId);
  };

  return (
    <button
      type="button"
      onClick={handleSelect}
      className={`esign-document-row ${isSelected ? 'active' : ''}`}
    >
      <div className="esign-document-row-main">
        <div className="esign-document-icon">
          <FileText size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3>{document.title}</h3>
          <div className="esign-document-meta">
            <span>{document.documentCode || 'No document code'}</span>
            <span>Contract {getShortId(document.contractId ?? '')}</span>
          </div>
        </div>
      </div>

      <div className="esign-document-row-side">
        <span className={`esign-status status-${document.documentStatus}`}>
          {getStatusLabel(document.documentStatus)}
        </span>
        <span className="esign-signed-date">{formatDateTime(document.currentUserSignedAt)}</span>
      </div>
    </button>
  );
}

interface PreviewPanelProps {
  document: ESignDocumentDto | null;
  isLoading: boolean;
  error: string | null;
  fallbackItem: ESignDocumentListItemDto | null;
}

function PreviewPanel({ document, isLoading, error, fallbackItem }: PreviewPanelProps): JSX.Element {
  const pdfUrl = document?.exportedPdfUrl ?? fallbackItem?.exportedPdfUrl ?? null;

  if (isLoading) {
    return (
      <div className="esign-preview-state">
        <Loader size={28} className="spinner" />
        <p>Loading e-sign contract...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="esign-preview-state error">
        <AlertCircle size={32} />
        <h3>Unable to load document</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="esign-preview-state">
        <Eye size={34} />
        <h3>Select an e-sign contract</h3>
        <p>Choose a signed contract from the list to preview the read-only document.</p>
      </div>
    );
  }

  return (
    <div className="esign-preview-content">
      <div className="esign-preview-header">
        <div>
          <span className="esign-eyebrow">Read-only preview</span>
          <h2>{fallbackItem?.title || document.documentCode}</h2>
          <p>Job Post {getShortId(document.jobPostId)} · Document {document.documentCode}</p>
        </div>
        {pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="esign-secondary-action"
          >
            <Download size={16} />
            View PDF
          </a>
        ) : null}
      </div>

      <div className="esign-signature-strip">
        <span className="esign-pill">
          <CheckCircle2 size={14} />
          {getStatusLabel(document.status)}
        </span>
        <span className="esign-pill">
          <UserRoundCheck size={14} />
          {document.signatures.length} signature(s)
        </span>
        <span className="esign-pill">
          <Calendar size={14} />
          Finalized {formatDateTime(document.finalizedAt)}
        </span>
      </div>

      <iframe
        title="Read-only e-sign contract document"
        className="esign-preview-frame"
        sandbox=""
        srcDoc={document.renderedHtmlContent}
      />
    </div>
  );
}

export default function ESignContractsScreen(): JSX.Element {
  const [page, setPage] = useState<ESignDocumentListPageDto | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<ESignDocumentDto | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);

  const loadDocuments = useCallback(async (): Promise<void> => {
    setLoadingList(true);
    setListError(null);

    const response = await esignGetAPI.getMySignedDocuments({
      page: 1,
      pageSize: 50,
      documentType: 'contract',
      status: statusFilter === 'all' ? undefined : statusFilter,
      q: searchQuery.trim() || undefined,
    });

    if (!response.success || !response.data) {
      setPage(null);
      setListError(response.message || 'Failed to load e-sign contracts.');
      setLoadingList(false);
      return;
    }

    setPage(response.data);
    setLoadingList(false);
  }, [searchQuery, statusFilter]);

  const loadDocument = useCallback(async (documentId: string): Promise<void> => {
    setSelectedDocumentId(documentId);
    setSelectedDocument(null);
    setDocumentError(null);
    setLoadingDocument(true);

    const response = await esignGetAPI.getDocumentById(documentId);

    if (!response.success || !response.data) {
      setDocumentError(response.message || 'Failed to load e-sign document.');
      setLoadingDocument(false);
      return;
    }

    setSelectedDocument(response.data);
    setLoadingDocument(false);
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    const firstDocument = page?.items[0];
    if (!selectedDocumentId && firstDocument) {
      void loadDocument(firstDocument.documentId);
    }
  }, [loadDocument, page?.items, selectedDocumentId]);

  const groupedDocuments = useMemo<GroupedDocuments[]>(() => {
    const groups = new Map<string, ESignDocumentListItemDto[]>();
    for (const document of page?.items ?? []) {
      const group = groups.get(document.jobPostId) ?? [];
      group.push(document);
      groups.set(document.jobPostId, group);
    }

    return Array.from(groups, ([jobPostId, documents]) => ({ jobPostId, documents }));
  }, [page?.items]);

  const selectedItem = useMemo(
    () => page?.items.find((document) => document.documentId === selectedDocumentId) ?? null,
    [page?.items, selectedDocumentId]
  );

  const handleClearSearch = (): void => {
    setSearchQuery('');
  };

  const totalDocuments = page?.totalCount ?? 0;
  const fullySignedCount = page?.items.filter(
    (document) => document.documentStatus === ESignDocumentStatus.FullySigned
  ).length ?? 0;
  const pdfCount = page?.items.filter((document) => Boolean(document.exportedPdfUrl)).length ?? 0;

  return (
    <AppLayout>
      <div className="esign-contracts-page">
        <ContractAreaTabs />

        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="esign-contracts-header"
        >
          <div>
            <span className="esign-eyebrow">
              <FileCheck size={14} />
              Contract archive
            </span>
            <h1>E-sign Contracts</h1>
            <p>Review signed e-sign contract documents by job post and contract.</p>
          </div>

          <div className="esign-summary-grid">
            <div>
              <span>Total</span>
              <strong>{totalDocuments}</strong>
            </div>
            <div>
              <span>Fully signed</span>
              <strong>{fullySignedCount}</strong>
            </div>
            <div>
              <span>PDF ready</span>
              <strong>{pdfCount}</strong>
            </div>
          </div>
        </motion.header>

        <section className="esign-toolbar">
          <div className="esign-search">
            <Search size={16} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title or document code..."
            />
            {searchQuery ? (
              <button type="button" onClick={handleClearSearch} title="Clear search">
                <X size={14} />
              </button>
            ) : null}
          </div>

          <div className="esign-status-tabs" role="tablist" aria-label="E-sign document status">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={String(option.value)}
                type="button"
                role="tab"
                aria-selected={statusFilter === option.value}
                onClick={() => setStatusFilter(option.value)}
                className={statusFilter === option.value ? 'active' : ''}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {listError ? (
          <div className="esign-list-error">
            <AlertCircle size={18} />
            <span>{listError}</span>
          </div>
        ) : null}

        <div className="esign-content-grid">
          <section className="esign-list-panel" aria-label="Signed e-sign contracts">
            {loadingList ? (
              <div className="esign-preview-state compact">
                <Loader size={26} className="spinner" />
                <p>Loading signed contracts...</p>
              </div>
            ) : groupedDocuments.length === 0 ? (
              <div className="esign-preview-state compact">
                <FileText size={32} />
                <h3>No e-sign contracts found</h3>
                <p>Signed contract documents will appear here after you sign a contract.</p>
              </div>
            ) : (
              groupedDocuments.map((group) => (
                <div key={group.jobPostId} className="esign-job-group">
                  <div className="esign-job-group-header">
                    <span>Job Post</span>
                    <strong>{getShortId(group.jobPostId)}</strong>
                  </div>

                  <div className="esign-document-list">
                    {group.documents.map((document) => (
                      <DocumentRow
                        key={document.documentId}
                        document={document}
                        isSelected={document.documentId === selectedDocumentId}
                        onSelect={loadDocument}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="esign-preview-panel" aria-label="E-sign contract preview">
            <PreviewPanel
              document={selectedDocument}
              isLoading={loadingDocument}
              error={documentError}
              fallbackItem={selectedItem}
            />
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
