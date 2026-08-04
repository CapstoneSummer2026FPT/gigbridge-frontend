import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
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
import {
  ESignerRole,
  ESignDocumentStatus,
  SignatureStatus,
} from '../../../types/models/ESign';
import { ContractAreaTabs } from '../components/ContractAreaTabs';
import '../styles/manage-contract-screen.css';
import '../styles/esign-contracts-screen.css';

type StatusFilter = 'all' | ESignDocumentStatus;

const PAGE_SIZE = 20;

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: ESignDocumentStatus.Draft, label: 'Draft' },
  { value: ESignDocumentStatus.PendingSignatures, label: 'Pending' },
  { value: ESignDocumentStatus.PartiallySigned, label: 'Partially signed' },
  { value: ESignDocumentStatus.FullySigned, label: 'Fully signed' },
  { value: ESignDocumentStatus.Expired, label: 'Expired' },
  { value: ESignDocumentStatus.Voided, label: 'Voided' },
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
  isAdmin: boolean;
  isDownloading: boolean;
  downloadError: string | null;
  onDownload: () => void;
  onRetry: () => void;
}

function PreviewPanel({
  document,
  isLoading,
  error,
  fallbackItem,
  isAdmin,
  isDownloading,
  downloadError,
  onDownload,
  onRetry,
}: PreviewPanelProps): JSX.Element {
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
        <button type="button" className="esign-secondary-action" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="esign-preview-state">
        <Eye size={34} />
        <h3>Select an e-sign contract</h3>
        <p>Choose a contract from the list to preview the read-only document.</p>
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
        <div className="esign-preview-actions">
          {!isAdmin && fallbackItem?.canCurrentUserSign && fallbackItem.contractId ? (
            <Link className="esign-primary-action" to={`/contracts/${fallbackItem.contractId}/sign`}>
              Sign now
            </Link>
          ) : null}
          {!isAdmin && fallbackItem?.currentUserSignedAt && document.status !== ESignDocumentStatus.FullySigned ? (
            <span className="esign-waiting">Waiting for the other party</span>
          ) : null}
          {fallbackItem?.hasFinalArtifact ? (
            <button
              type="button"
              className="esign-secondary-action"
              onClick={onDownload}
              disabled={isDownloading}
            >
              {isDownloading ? <Loader size={16} className="spinner" /> : <Download size={16} />}
              {isDownloading ? 'Downloading...' : downloadError ? 'Retry DOCX' : 'Download DOCX'}
            </button>
          ) : null}
        </div>
      </div>

      {downloadError ? <p className="esign-download-error" role="alert">{downloadError}</p> : null}

      <div className="esign-signature-strip">
        <span className="esign-pill">
          <CheckCircle2 size={14} />
          {getStatusLabel(document.status)}
        </span>
        <span className={`esign-pill ${fallbackItem?.hasClientSigned ? '' : 'pending'}`}>
          <UserRoundCheck size={14} />
          Client: {fallbackItem?.hasClientSigned ? 'Signed' : 'Pending'}
        </span>
        <span className={`esign-pill ${fallbackItem?.hasFreelancerSigned ? '' : 'pending'}`}>
          <UserRoundCheck size={14} />
          Freelancer: {fallbackItem?.hasFreelancerSigned ? 'Signed' : 'Pending'}
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
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith('/admin');
  const requestedDocumentId = useMemo(
    () => new URLSearchParams(location.search).get('document'),
    [location.search]
  );
  const [page, setPage] = useState<ESignDocumentListPageDto | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<ESignDocumentDto | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);
  const listRequestId = useRef(0);
  const documentRequestId = useRef(0);

  const loadDocuments = useCallback(async (): Promise<void> => {
    const requestId = ++listRequestId.current;
    setLoadingList(true);
    setListError(null);

    const params = {
      page: pageNumber,
      pageSize: PAGE_SIZE,
      status: statusFilter === 'all' ? undefined : statusFilter,
      q: searchQuery.trim() || undefined,
    };
    const response = isAdmin
      ? await esignGetAPI.getAdminDocuments(params)
      : await esignGetAPI.getMyDocuments(params);

    if (requestId !== listRequestId.current) return;

    if (!response.success || !response.data) {
      setPage(null);
      setListError(response.message || 'Failed to load e-sign contracts.');
      setLoadingList(false);
      return;
    }

    setPage(response.data);
    setLoadingList(false);
  }, [isAdmin, pageNumber, searchQuery, statusFilter]);

  const loadDocument = useCallback(async (documentId: string): Promise<void> => {
    const requestId = ++documentRequestId.current;
    setSelectedDocumentId(documentId);
    setSelectedDocument(null);
    setDocumentError(null);
    setDownloadError(null);
    setLoadingDocument(true);

    const response = await esignGetAPI.getDocumentById(documentId);

    if (requestId !== documentRequestId.current) return;

    if (!response.success || !response.data) {
      setDocumentError(response.message || 'Failed to load e-sign document.');
      setLoadingDocument(false);
      return;
    }

    setSelectedDocument(response.data);
    setLoadingDocument(false);
  }, []);

  const handleSelectDocument = useCallback((documentId: string): void => {
    if (requestedDocumentId === documentId) {
      void loadDocument(documentId);
      return;
    }

    const params = new URLSearchParams(location.search);
    params.set('document', documentId);
    navigate(
      { pathname: location.pathname, search: params.toString() },
      { replace: true }
    );
  }, [loadDocument, location.pathname, location.search, navigate, requestedDocumentId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (requestedDocumentId) {
      void loadDocument(requestedDocumentId);
    }
  }, [loadDocument, requestedDocumentId]);

  useEffect(() => {
    const items = page?.items ?? [];
    const firstDocument = items[0];

    if (requestedDocumentId) {
      return;
    }

    if (!firstDocument) {
      documentRequestId.current += 1;
      setSelectedDocumentId(null);
      setSelectedDocument(null);
      setDocumentError(null);
      setLoadingDocument(false);
      return;
    }

    if (!selectedDocumentId || !items.some((item) => item.documentId === selectedDocumentId)) {
      void loadDocument(firstDocument.documentId);
    }
  }, [loadDocument, page?.items, requestedDocumentId, selectedDocumentId]);

  const groupedDocuments = useMemo<GroupedDocuments[]>(() => {
    const groups = new Map<string, ESignDocumentListItemDto[]>();
    for (const document of page?.items ?? []) {
      const group = groups.get(document.jobPostId) ?? [];
      group.push(document);
      groups.set(document.jobPostId, group);
    }

    return Array.from(groups, ([jobPostId, documents]) => ({ jobPostId, documents }));
  }, [page?.items]);

  const selectedItem = useMemo<ESignDocumentListItemDto | null>(() => {
    const listedDocument =
      page?.items.find(document => document.documentId === selectedDocumentId) ?? null;
    if (listedDocument || !selectedDocument) {
      return listedDocument;
    }

    const clientSignature = selectedDocument.signatures.find(
      signature => signature.signerRole === ESignerRole.Client
    );
    const freelancerSignature = selectedDocument.signatures.find(
      signature => signature.signerRole === ESignerRole.Freelancer
    );
    const currentUserSignature = selectedDocument.signatures.find(
      signature => signature.signerRole === selectedDocument.currentUserSignerRole
    );

    return {
      documentId: selectedDocument.documentId,
      jobPostId: selectedDocument.jobPostId,
      contractId: selectedDocument.contractId,
      documentCode: selectedDocument.documentCode,
      documentType: 'Contract',
      title: selectedDocument.documentCode || 'E-sign contract',
      documentStatus: selectedDocument.status,
      currentUserSignerRole: selectedDocument.currentUserSignerRole,
      currentUserSignedAt:
        currentUserSignature?.status === SignatureStatus.Signed
          ? currentUserSignature.signedAt ?? null
          : null,
      hasClientSigned: clientSignature?.status === SignatureStatus.Signed,
      hasFreelancerSigned: freelancerSignature?.status === SignatureStatus.Signed,
      canCurrentUserSign: selectedDocument.canCurrentUserSign,
      hasFinalArtifact: selectedDocument.hasFinalArtifact,
      finalizedDocumentFileName: selectedDocument.finalizedDocumentFileName ?? null,
      signatureCount: selectedDocument.signatures.length,
      finalizedAt: selectedDocument.finalizedAt ?? null,
      exportedPdfUrl: selectedDocument.exportedPdfUrl ?? null,
      createdAt: selectedDocument.createdAt,
      updatedAt: selectedDocument.updatedAt ?? null,
    };
  }, [page?.items, selectedDocument, selectedDocumentId]);

  const handleClearSearch = (): void => {
    setSearchQuery('');
    setPageNumber(1);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(event.target.value);
    setPageNumber(1);
  };

  const handleStatusChange = (event: MouseEvent<HTMLButtonElement>): void => {
    const value = event.currentTarget.value;
    setStatusFilter(value === 'all' ? 'all' : Number(value) as ESignDocumentStatus);
    setPageNumber(1);
  };

  const handlePreviousPage = (): void => {
    setPageNumber((current) => Math.max(1, current - 1));
  };

  const handleNextPage = (): void => {
    setPageNumber((current) => current + 1);
  };

  const handleDownload = async (): Promise<void> => {
    if (!selectedItem?.hasFinalArtifact) return;

    setDownloadingDocumentId(selectedItem.documentId);
    setDownloadError(null);
    const response = await esignGetAPI.downloadDocument(selectedItem.documentId);

    if (!response.success || !response.data) {
      setDownloadError(response.message || 'Failed to download the finalized contract.');
      setDownloadingDocumentId(null);
      return;
    }

    const url = URL.createObjectURL(response.data);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = selectedItem.finalizedDocumentFileName || `${selectedItem.documentCode || 'GigBridge-contract'}.docx`;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setDownloadingDocumentId(null);
  };

  const totalDocuments = page?.totalCount ?? 0;
  const fullySignedCount = page?.items.filter(
    (document) => document.documentStatus === ESignDocumentStatus.FullySigned
  ).length ?? 0;
  const artifactCount = page?.items.filter((document) => document.hasFinalArtifact).length ?? 0;

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
            <p>Review, sign, preview, and download your contract documents.</p>
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
              <span>DOCX ready</span>
              <strong>{artifactCount}</strong>
            </div>
          </div>
        </motion.header>

        <section className="esign-toolbar">
          <div className="esign-search">
            <Search size={16} />
            <input
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search e-sign contracts"
              placeholder={isAdmin
                ? 'Search by title, code, name, or email...'
                : 'Search by title or document code...'}
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
                value={String(option.value)}
                aria-selected={statusFilter === option.value}
                onClick={handleStatusChange}
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
            <button type="button" onClick={() => void loadDocuments()}>Try again</button>
          </div>
        ) : null}

        <div className="esign-content-grid">
          <section className="esign-list-panel" aria-label="E-sign contracts">
            {loadingList ? (
              <div className="esign-preview-state compact">
                <Loader size={26} className="spinner" />
                <p>Loading contracts...</p>
              </div>
            ) : groupedDocuments.length === 0 ? (
              <div className="esign-preview-state compact">
                <FileText size={32} />
                <h3>No e-sign contracts found</h3>
                <p>Your contract documents will appear here when they are ready for review.</p>
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
                        onSelect={handleSelectDocument}
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
              isAdmin={isAdmin}
              isDownloading={downloadingDocumentId === selectedDocumentId}
              downloadError={downloadError}
              onDownload={handleDownload}
              onRetry={() => {
                if (selectedDocumentId) void loadDocument(selectedDocumentId);
              }}
            />
          </section>
        </div>

        {page && page.totalPages > 1 ? (
          <nav className="esign-pagination" aria-label="E-sign contract pages">
            <button type="button" onClick={handlePreviousPage} disabled={!page.hasPreviousPage}>
              Previous
            </button>
            <span>Page {page.pageNumber} of {page.totalPages}</span>
            <button type="button" onClick={handleNextPage} disabled={!page.hasNextPage}>
              Next
            </button>
          </nav>
        ) : null}
      </div>
    </AppLayout>
  );
}
