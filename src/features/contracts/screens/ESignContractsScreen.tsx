import { useRef } from 'react';
import { Link } from 'react-router';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  FileText,
  RotateCcw,
  Search,
  Sparkles,
  UserRoundCheck,
  X,
  Layers,
  Clock,
  Award,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import type {
  ESignDocumentDto,
  ESignDocumentListItemDto,
} from '../../../types/models/ESign';
import { ESignDocumentStatus } from '../../../types/models/ESign';
import { ContractAreaTabs } from '../components/ContractAreaTabs';
import { ContractPdfViewer } from '../components/ContractPdfViewer';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { useESignContracts, type StatusFilter } from '../hooks/useESignContracts';
import type { useTranslation } from '../../../hooks/useTranslation';
import '../styles/manage-contract-screen.css';
import '../styles/esign-contracts-screen.css';

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

const statusBadgeClass = (status: number) => {
  if (status === ESignDocumentStatus.FullySigned) return 'border border-emerald-500/40 bg-emerald-500/15 text-text-primary font-black';
  if (status === ESignDocumentStatus.PartiallySigned) return 'border border-blue-500/40 bg-blue-500/20 text-text-primary font-black';
  if (status === ESignDocumentStatus.PendingSignatures) return 'border border-amber-500/40 bg-amber-500/15 text-text-primary font-black';
  if (status === ESignDocumentStatus.Expired || status === ESignDocumentStatus.Voided) return 'border border-rose-500/40 bg-rose-500/15 text-text-primary font-black';
  return 'border border-border bg-slate-500/15 text-text-primary font-black';
};

interface DocumentRowProps {
  document: ESignDocumentListItemDto;
  isSelected: boolean;
  onSelect: (documentId: string) => void;
}

function DocumentRow({ document, isSelected, onSelect }: DocumentRowProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onSelect(document.documentId)}
      className={`w-full text-left rounded-2xl border p-4 transition cursor-pointer flex flex-col gap-2 ${
        isSelected
          ? 'border-brand bg-brand/5 shadow-sm'
          : 'border-border bg-background hover:border-brand/40 hover:bg-surface-muted/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <FileText size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="text-xs font-extrabold text-text-primary truncate">{document.title}</h3>
            <p className="text-[11px] font-semibold text-text-muted mt-0.5 truncate">
              {document.documentCode || 'No document code'} · Contract {getShortId(document.contractId ?? '')}
            </p>
          </div>
        </div>

        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${statusBadgeClass(document.documentStatus)}`}>
          {getStatusLabel(document.documentStatus)}
        </span>
      </div>

      {document.currentUserSignedAt && (
        <div className="text-[10px] font-bold text-text-muted border-t border-border/40 pt-1.5 flex items-center justify-between">
          <span>Signed at</span>
          <span>{formatDateTime(document.currentUserSignedAt)}</span>
        </div>
      )}
    </button>
  );
}

interface PreviewPanelProps {
  document: ESignDocumentDto | null;
  isLoading: boolean;
  error: string | null;
  fallbackItem: ESignDocumentListItemDto | null;
  isAdmin: boolean;
  t: ReturnType<typeof useTranslation>['t'];
  onRetry: () => void;
}

function PreviewPanel({
  document,
  isLoading,
  error,
  fallbackItem,
  isAdmin,
  t,
  onRetry,
}: PreviewPanelProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 my-auto">
        <LemniscateBloomLoader label={t('contracts.legal.loadingDocument')} size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 my-auto space-y-3 text-center">
        <AlertCircle size={36} className="text-rose-500" />
        <h3 className="text-sm font-black text-text-primary">{t('contracts.legal.loadError')}</h3>
        <p className="text-xs font-semibold text-text-muted">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white hover:opacity-90 transition cursor-pointer"
        >
          <RotateCcw size={14} /> {t('contracts.legal.retry')}
        </button>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 my-auto space-y-2 text-center">
        <Eye size={40} className="text-text-muted/40" />
        <h3 className="text-sm font-black text-text-primary">{t('contracts.legal.viewDocument')}</h3>
        <p className="text-xs font-semibold text-text-muted">{t('contracts.legal.documentDescription')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header Info */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-brand">Read-only document</span>
          <h2 className="text-base font-extrabold text-text-primary mt-0.5">{fallbackItem?.title || document.documentCode}</h2>
          <p className="text-xs font-semibold text-text-muted">Job Post {getShortId(document.jobPostId)} · Code {document.documentCode}</p>
        </div>

        <div className="flex items-center gap-2">
          {!isAdmin && fallbackItem?.canCurrentUserSign && fallbackItem.contractId && (
            <Link
              to={`/contracts/${fallbackItem.contractId}/sign`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-white hover:bg-amber-600 transition cursor-pointer shadow-sm"
            >
              <CheckCircle2 size={14} /> {t('contracts.legal.viewAndSign')}
            </Link>
          )}

          {!isAdmin && fallbackItem?.currentUserSignedAt && document.status !== ESignDocumentStatus.FullySigned && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-extrabold text-amber-600 dark:text-amber-400">
              <Clock size={14} /> {t('contracts.legal.status.pending')}
            </span>
          )}

        </div>
      </div>

      {/* Signature Pill Indicators */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs ${statusBadgeClass(document.status)}`}>
          <CheckCircle2 size={13} />
          {getStatusLabel(document.status)}
        </span>
        <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold ${fallbackItem?.hasClientSigned ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
          <UserRoundCheck size={13} />
          Client: {fallbackItem?.hasClientSigned ? 'Signed' : 'Pending'}
        </span>
        <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold ${fallbackItem?.hasFreelancerSigned ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
          <UserRoundCheck size={13} />
          Freelancer: {fallbackItem?.hasFreelancerSigned ? 'Signed' : 'Pending'}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-muted/50 px-3 py-1 text-xs font-bold text-text-muted">
          <Calendar size={13} />
          {formatDateTime(document.finalizedAt)}
        </span>
      </div>

      <ContractPdfViewer
        key={document.documentId}
        document={document}
        title={fallbackItem?.title || document.documentCode}
      />
    </div>
  );
}

export default function ESignContractsScreen(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    t,
    isAdmin,
    page,
    selectedDocumentId,
    selectedDocument,
    searchQuery,
    statusFilter,
    loadingList,
    loadingDocument,
    listError,
    documentError,
    groupedDocuments,
    selectedItem,
    totalDocuments,
    fullySignedCount,
    artifactCount,
    loadDocuments,
    loadDocument,
    handleSelectDocument,
    handleClearSearch,
    handleSearchChange,
    handleStatusChange,
    handlePreviousPage,
    handleNextPage,
  } = useESignContracts();

  // GSAP Entrance Animation
  usePageGSAP({
    containerRef,
    loading: loadingList && !page,
    groups: [
      { selector: '.esign-gsap-header', y: 20, duration: 0.55 },
      { selector: '.esign-gsap-metrics', y: 16, duration: 0.5, stagger: 0.08 },
      { selector: '.esign-gsap-main', y: 24, duration: 0.5 },
    ],
  });

  const statusPills: Array<{ value: StatusFilter; label: string; icon: React.ReactNode; colorClass: string }> = [
    { value: 'all', label: t('contracts.allContracts'), icon: <Layers size={14} />, colorClass: 'bg-brand text-white shadow-sm' },
    { value: ESignDocumentStatus.Draft, label: t('contracts.legal.status.draft'), icon: <FileText size={14} />, colorClass: 'bg-slate-600 text-white shadow-sm' },
    { value: ESignDocumentStatus.PendingSignatures, label: t('contracts.legal.status.pending'), icon: <Clock size={14} />, colorClass: 'bg-amber-500 text-white shadow-sm' },
    { value: ESignDocumentStatus.PartiallySigned, label: t('contracts.legal.status.partial'), icon: <FileCheck size={14} />, colorClass: 'bg-blue-600 text-white shadow-sm' },
    { value: ESignDocumentStatus.FullySigned, label: t('contracts.legal.status.signed'), icon: <Award size={14} />, colorClass: 'bg-emerald-600 text-white shadow-sm' },
  ];

  return (
    <AppLayout fullWidth>
      <div ref={containerRef} className="min-h-[calc(100vh-4rem)] bg-background text-text-primary">
        
        {/* Top Header Bar */}
        <header className="esign-gsap-header sticky top-0 z-40 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-brand">
                <Sparkles size={14} />
                {t('contracts.legal.title')}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
                E-Sign <span className="text-brand italic font-light">Contracts</span>
              </h1>
              <p className="mt-0.5 text-xs font-semibold text-text-muted">{t('contracts.esignSubtitle')}</p>
            </div>

            {/* Navigation Tabs bar */}
            <ContractAreaTabs />
          </div>
        </header>

        {/* Main Workspace */}
        <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 lg:px-8">
          
          {/* Summary Metric Cards */}
          <section aria-label="E-sign Metrics" className="esign-gsap-metrics grid grid-cols-3 gap-3 xl:grid-cols-3">
            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">Total Documents</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-text-primary">{totalDocuments}</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <FileText size={20} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">{t('contracts.legal.status.signed')}</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-text-primary">{fullySignedCount}</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={20} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">PDF Ready</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-text-primary">{artifactCount}</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Download size={20} />
                </span>
              </div>
            </article>
          </section>

          {/* Controls & Grid Panel */}
          <section className="esign-gsap-main rounded-2xl border border-border bg-background shadow-sm overflow-hidden min-h-[640px] flex flex-col justify-between">
            
            {/* Search & Selectable Status Pills Toolbar */}
            <div className="border-b border-border p-4 space-y-4 shrink-0">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                
                {/* Horizontal Status Pills */}
                <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
                  {statusPills.map(pill => {
                    const isSelected = statusFilter === pill.value;
                    return (
                      <button
                        key={String(pill.value)}
                        type="button"
                        onClick={() => handleStatusChange(pill.value)}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? pill.colorClass
                            : 'border border-border bg-surface-muted/40 text-text-muted hover:border-brand/40 hover:text-text-primary'
                        }`}
                      >
                        {pill.icon}
                        {pill.label}
                      </button>
                    );
                  })}
                </div>

                {/* Search Bar */}
                <div className="flex items-center gap-2 sm:w-72 shrink-0">
                  <label className="relative flex-1">
                    <span className="sr-only">{t('contracts.searchPlaceholder')}</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <input
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder={isAdmin ? 'Search title, code, email...' : t('contracts.searchPlaceholder')}
                      className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs font-bold text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-sm"
                    />
                  </label>

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-muted/50 text-brand hover:bg-surface-muted transition cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content Grid: Left List (1/3) & Right Preview (2/3) */}
            <div className="grid gap-6 p-4 lg:grid-cols-12 flex-1 min-h-[500px]">
              
              {/* Document List Side */}
              <div className="lg:col-span-4 border-r border-border/60 pr-4 space-y-4 max-h-[640px] overflow-y-auto custom-scrollbar">
                {listError && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-500 flex items-center justify-between">
                    <span>{listError}</span>
                    <button type="button" onClick={() => void loadDocuments()} className="underline cursor-pointer">
                      {t('contracts.retry')}
                    </button>
                  </div>
                )}

                {loadingList ? (
                  <div className="flex min-h-[300px] items-center justify-center p-8">
                    <LemniscateBloomLoader label={t('contracts.loading')} size={40} />
                  </div>
                ) : groupedDocuments.length === 0 ? (
                  <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center space-y-2">
                    <FileText size={36} className="text-text-muted/40" />
                    <h3 className="text-xs font-extrabold text-text-primary">{t('contracts.noContractsFound')}</h3>
                    <p className="text-[11px] font-semibold text-text-muted">{t('contracts.contractsAppearHere')}</p>
                  </div>
                ) : (
                  groupedDocuments.map(group => (
                    <div key={group.jobPostId} className="space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-text-muted px-1 flex items-center justify-between">
                        <span>Job Post</span>
                        <span className="font-mono text-text-primary">{getShortId(group.jobPostId)}</span>
                      </div>
                      <div className="space-y-2">
                        {group.documents.map(doc => (
                          <DocumentRow
                            key={doc.documentId}
                            document={doc}
                            isSelected={doc.documentId === selectedDocumentId}
                            onSelect={handleSelectDocument}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Document Preview Side */}
              <div className="lg:col-span-8 pl-2">
                <PreviewPanel
                  document={selectedDocument}
                  isLoading={loadingDocument}
                  error={documentError}
                  fallbackItem={selectedItem}
                  isAdmin={isAdmin}
                  t={t}
                  onRetry={() => {
                    if (selectedDocumentId) void loadDocument(selectedDocumentId);
                  }}
                />
              </div>
            </div>

            {/* Pagination Controls Footer */}
            {page && page.totalPages > 1 && (
              <div className="border-t border-border p-4 bg-background flex items-center justify-between shrink-0">
                <div className="text-xs font-bold text-text-muted">
                  Page {page.pageNumber} of {page.totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!page.hasPreviousPage}
                    onClick={handlePreviousPage}
                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-extrabold text-text-primary hover:border-brand/40 hover:text-brand disabled:opacity-40 transition cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={!page.hasNextPage}
                    onClick={handleNextPage}
                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-extrabold text-text-primary hover:border-brand/40 hover:text-brand disabled:opacity-40 transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </AppLayout>
  );
}
