import { Link } from 'react-router';
import {
  AlertCircle,
  Download,
  ExternalLink,
  FileCheck,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { ESignDocumentStatus, ESignerRole, SignatureStatus } from '../../../types/models/ESign';
import type { ContractESignDocumentState } from '../hooks/useContractESignDocument';
import { useESignPdf } from '../hooks/useESignPdf';

import '../styles/contract-legal-card.css';

interface ContractLegalCardProps {
  contractId: string;
  documentState: ContractESignDocumentState;
}

const documentStatusKey: Record<ESignDocumentStatus, string> = {
  [ESignDocumentStatus.Draft]: 'draft',
  [ESignDocumentStatus.PendingSignatures]: 'pending',
  [ESignDocumentStatus.PartiallySigned]: 'partial',
  [ESignDocumentStatus.FullySigned]: 'signed',
  [ESignDocumentStatus.Expired]: 'expired',
  [ESignDocumentStatus.Voided]: 'voided',
};

export function ContractLegalCard({
  contractId,
  documentState,
}: ContractLegalCardProps): JSX.Element {
  const { t } = useTranslation();
  const document = documentState.document;
  const pdf = useESignPdf(document);

  const signedCount = document?.signatures.filter(
    signature => signature.status === SignatureStatus.Signed
  ).length ?? 0;
  const validDraftCount = document?.signatures.filter(
    signature =>
      signature.status === SignatureStatus.Pending &&
      signature.isDraftValid === true
  ).length ?? 0;
  const signerCount = document ? Math.max(document.signatures.length, 2) : 0;
  const isFinalized = document?.status === ESignDocumentStatus.FullySigned;
  const currentUserSignature = document?.signatures.find(
    signature => signature.signerRole === document.currentUserSignerRole
  );
  const hasValidCurrentUserDraft =
    currentUserSignature?.status === SignatureStatus.Pending &&
    currentUserSignature.isDraftValid === true;
  const hasIncompleteCurrentUserDraft =
    currentUserSignature?.status === SignatureStatus.Pending &&
    currentUserSignature.isDraftValid !== true;
  const archivePath = document
    ? `/contracts/esign?document=${encodeURIComponent(document.documentId)}`
    : '/contracts/esign';
  const canSign =
    document?.canCurrentUserSign &&
    (
      document.status === ESignDocumentStatus.PendingSignatures ||
      document.status === ESignDocumentStatus.PartiallySigned
    );

  const isClientRole = document?.currentUserSignerRole === ESignerRole.Client;
  const waitingCounterpartLabel = isClientRole
    ? 'Đợi Freelancer ký'
    : 'Đợi Client ký';

  const getBadgeStyle = () => {
    if (isFinalized) return 'bg-emerald-600 text-white';
    if (hasValidCurrentUserDraft) return 'bg-amber-500 text-white';
    if (
      document?.status === ESignDocumentStatus.Expired ||
      document?.status === ESignDocumentStatus.Voided
    )
      return 'bg-rose-600 text-white';
    return 'bg-blue-600 text-white';
  };

  return (
    <section
      className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-5 shadow-md"
      aria-labelledby={`contract-legal-heading-${contractId}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-border pb-4">
        <div className="flex items-start gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)] text-white shadow-xs">
            <ShieldCheck size={24} aria-hidden="true" />
          </span>
          <div>
            <h2
              id={`contract-legal-heading-${contractId}`}
              className="text-lg font-black uppercase tracking-tight text-foreground font-zentry"
            >
              {t('contracts.legal.title')}
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground font-medium">
              {t('contracts.legal.commercialTermsDescription')}
            </p>
          </div>
        </div>

        {document ? (
          <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black uppercase tracking-wider shadow-xs ${getBadgeStyle()}`}>
            <FileCheck size={14} aria-hidden="true" />
            {hasValidCurrentUserDraft && document.status !== ESignDocumentStatus.FullySigned
              ? waitingCounterpartLabel
              : t(`contracts.legal.status.${documentStatusKey[document.status]}`)}
          </span>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 p-5">
        {documentState.isLoading && !document ? (
          <div className="flex items-center gap-3 text-xs font-extrabold text-muted-foreground" role="status">
            <LoaderCircle size={18} className="animate-spin text-[var(--brand)]" aria-hidden="true" />
            {t('contracts.legal.loadingDocument')}
          </div>
        ) : document ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-foreground">
                  {t('contracts.legal.esignDocument')}
                </p>
                <p className="mt-0.5 text-xs font-bold text-muted-foreground">
                  {t('contracts.legal.contractDocument')}
                </p>
              </div>
              <div className={`esign-poll-badge-wrapper ${documentState.isLoading ? 'is-polling' : ''}`}>
                {signerCount > 0 ? (
                  <span className="inline-flex items-center gap-1 px-3.5 py-1 rounded-full bg-[var(--brand)] text-white text-xs font-black shadow-xs">
                    {t(isFinalized
                      ? 'contracts.legal.signatureProgress'
                      : 'contracts.legal.draftProgress', {
                      signed: isFinalized ? signedCount : validDraftCount,
                      total: signerCount,
                    })}
                  </span>
                ) : null}
              </div>
            </div>

            <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
              {document.status === ESignDocumentStatus.FullySigned
                ? t('contracts.legal.signedDocumentDescription')
                : document.status === ESignDocumentStatus.Expired ||
                    document.status === ESignDocumentStatus.Voided
                  ? t('contracts.legal.readOnlyDocumentDescription')
                  : hasValidCurrentUserDraft
                    ? (isClientRole
                        ? 'Bạn đã hoàn tất ký tạm thời. Đang chờ Freelancer ký để chốt hợp đồng.'
                        : 'Bạn đã hoàn tất ký tạm thời. Đang chờ Client ký để chốt hợp đồng.')
                    : hasIncompleteCurrentUserDraft
                      ? t('contracts.legal.incompleteDraftDescription')
                      : t('contracts.legal.documentDescription')}
            </p>
          </div>
        ) : documentState.error ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-xs font-black text-rose-600 dark:text-rose-400" role="alert">
              <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{t('contracts.legal.loadError')}</span>
            </div>
            <button
              type="button"
              onClick={documentState.retry}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-rose-600 text-white px-4 py-2 text-xs font-black hover:bg-rose-700 transition cursor-pointer border-none shadow-xs"
            >
              <RefreshCw size={14} aria-hidden="true" />
              {t('contracts.legal.retry')}
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-foreground">
              {t('contracts.legal.documentNotCreated')}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('contracts.legal.documentNotCreatedDescription')}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center pt-1">
        {document ? (
          canSign ? (
            <Link
              to={`/contracts/${contractId}/sign`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-6 py-3 text-xs font-black shadow-md transition active:scale-[0.98]"
            >
              <FileCheck size={18} aria-hidden="true" />
              {hasValidCurrentUserDraft
                ? t('contracts.legal.viewSignedDocument', { defaultValue: 'View Signed Contract' })
                : t('contracts.legal.viewAndSign')}
            </Link>
          ) : (
            <Link
              to={archivePath}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-6 py-3 text-xs font-black shadow-md transition active:scale-[0.98]"
            >
              <FileCheck size={18} aria-hidden="true" />
              {document.status === ESignDocumentStatus.FullySigned || hasValidCurrentUserDraft
                ? t('contracts.legal.viewSignedDocument', { defaultValue: 'View Signed Contract' })
                : t('contracts.legal.viewDocument')}
            </Link>
          )
        ) : null}

        {document ? (
          <button
            type="button"
            onClick={() => void pdf.download()}
            disabled={pdf.isPreparing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-5 py-3 text-xs font-black shadow-sm transition active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 border-none"
          >
            {pdf.isPreparing ? (
              <LoaderCircle size={16} className="animate-spin text-white" aria-hidden="true" />
            ) : (
              <Download size={16} aria-hidden="true" />
            )}
            {pdf.isPreparing ? 'Preparing PDF…' : 'Download PDF'}
          </button>
        ) : null}
      </div>

      {pdf.error ? (
        <p className="text-xs font-bold text-rose-600 dark:text-rose-400" role="alert">
          {pdf.error}{' '}
          <button type="button" onClick={() => void pdf.retry()} className="underline font-black cursor-pointer">Retry</button>
        </p>
      ) : null}

      {/* Policy & Operating Rules Footer Box */}
      <div className="mt-4 pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-3.5 px-4 rounded-2xl border border-border/40">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <ShieldCheck size={18} className="text-[var(--brand)] shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-[11px] font-semibold text-muted-foreground leading-relaxed">
            {t('contracts.legal.policyDisclaimer')}
          </p>
        </div>

        <a
          href="/policies"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-background hover:bg-muted border border-border/80 text-foreground text-xs font-black shrink-0 transition shadow-2xs hover:text-[var(--brand)] hover:border-[var(--brand)]"
        >
          <span>{t('contracts.legal.viewPlatformPolicy')}</span>
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
