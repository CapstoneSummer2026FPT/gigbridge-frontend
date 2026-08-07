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
import { ESignDocumentStatus, SignatureStatus } from '../../../types/models/ESign';
import type { ContractESignDocumentState } from '../hooks/useContractESignDocument';
import { useESignPdf } from '../hooks/useESignPdf';

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
  const signerCount = document?.signatures.length ?? 0;
  const archivePath = document
    ? `/contracts/esign?document=${encodeURIComponent(document.documentId)}`
    : '/contracts/esign';
  const canSign =
    document?.canCurrentUserSign &&
    (
      document.status === ESignDocumentStatus.PendingSignatures ||
      document.status === ESignDocumentStatus.PartiallySigned
    );

  return (
    <section
      className="glass-card p-6 md:p-8 space-y-5"
      aria-labelledby={`contract-legal-heading-${contractId}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <div>
            <h2
              id={`contract-legal-heading-${contractId}`}
              className="text-lg font-black uppercase tracking-tight text-foreground font-zentry"
            >
              {t('contracts.legal.title')}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {t('contracts.legal.commercialTermsDescription')}
            </p>
          </div>
        </div>

        {document ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-primary">
            <FileCheck size={13} aria-hidden="true" />
            {t(`contracts.legal.status.${documentStatusKey[document.status]}`)}
          </span>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/40 bg-secondary/15 p-4 md:p-5">
        {documentState.isLoading ? (
          <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground" role="status">
            <LoaderCircle size={18} className="animate-spin text-primary" aria-hidden="true" />
            {t('contracts.legal.loadingDocument')}
          </div>
        ) : document ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">
                  {t('contracts.legal.esignDocument')}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {document.documentCode || t('contracts.legal.contractDocument')}
                </p>
              </div>
              {signerCount > 0 ? (
                <span className="text-xs font-bold text-muted-foreground">
                  {t('contracts.legal.signatureProgress', {
                    signed: signedCount,
                    total: signerCount,
                  })}
                </span>
              ) : null}
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {document.status === ESignDocumentStatus.FullySigned
                ? t('contracts.legal.signedDocumentDescription')
                : document.status === ESignDocumentStatus.Expired ||
                    document.status === ESignDocumentStatus.Voided
                  ? t('contracts.legal.readOnlyDocumentDescription')
                  : t('contracts.legal.documentDescription')}
            </p>
          </div>
        ) : documentState.error ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-sm text-destructive" role="alert">
              <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{t('contracts.legal.loadError')}</span>
            </div>
            <button
              type="button"
              onClick={documentState.retry}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-border/50 bg-secondary/60 px-4 py-2 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
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

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {document ? (
          canSign ? (
            <Link
              to={`/contracts/${contractId}/sign`}
              className="btn-primary-custom inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold"
            >
              <FileCheck size={17} aria-hidden="true" />
              {t('contracts.legal.viewAndSign')}
            </Link>
          ) : (
            <Link
              to={archivePath}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-5 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary/15"
            >
              <FileCheck size={17} aria-hidden="true" />
              {document.status === ESignDocumentStatus.FullySigned
                ? t('contracts.legal.viewSignedDocument')
                : t('contracts.legal.viewDocument')}
            </Link>
          )
        ) : null}

        {document ? (
          <button
            type="button"
            onClick={() => void pdf.download()}
            disabled={pdf.isPreparing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-secondary/60 px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pdf.isPreparing ? (
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Download size={16} aria-hidden="true" />
            )}
            {pdf.isPreparing ? 'Preparing PDF…' : 'Download PDF'}
          </button>
        ) : null}

        <a
          href="/policies"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-primary"
        >
          {t('contracts.legal.viewPlatformPolicy')}
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>

      {pdf.error ? (
        <p className="text-xs font-semibold text-destructive" role="alert">
          {pdf.error}{' '}
          <button type="button" onClick={() => void pdf.retry()} className="underline">Retry</button>
        </p>
      ) : null}

      <p className="border-t border-border/40 pt-4 text-[11px] leading-relaxed text-muted-foreground">
        {t('contracts.legal.policyDisclaimer')}
      </p>
    </section>
  );
}
