import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, FileText, LoaderCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ESignDocumentDto } from '../../../types/models/ESign';
import {
  downloadESignPdfBlob,
  getESignPdfBlob,
  getESignPdfFileName,
} from '../hooks/useESignPdf';
import '../styles/contract-pdf-viewer.css';

interface ContractPdfViewerProps {
  document: ESignDocumentDto;
  title?: string;
  sourceBlob?: Blob;
  hideHeaderToolbar?: boolean;
}

export function ContractPdfViewer({ document, title, sourceBlob, hideHeaderToolbar = false }: ContractPdfViewerProps): JSX.Element {
  const { t } = useTranslation();
  const defaultPreviewError = t('contracts.pdfPreviewError');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadPdf = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const blob = sourceBlob ?? await getESignPdfBlob(document);
      if (requestId !== requestIdRef.current) return;
      setPdfBlob(blob);
      setPdfUrl(URL.createObjectURL(blob));
    } catch (reason) {
      if (requestId !== requestIdRef.current) return;
      setPdfBlob(null);
      setPdfUrl(null);
      setError(reason instanceof Error ? reason.message : defaultPreviewError);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [defaultPreviewError, document, sourceBlob]);

  useEffect(() => {
    void loadPdf();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadPdf]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const handleDownload = (): void => {
    if (!pdfBlob) return;
    downloadESignPdfBlob(pdfBlob, getESignPdfFileName(document));
  };

  const viewerTitle = title || t('contracts.generatedContractDoc');

  return (
    <div className="contract-pdf-viewer">
      {!hideHeaderToolbar && (
        <div className="contract-pdf-toolbar">
          <span className="contract-pdf-label">
            <FileText size={17} aria-hidden="true" />
            {t('contracts.pdfPreview')}
          </span>
          <div className="contract-pdf-actions">
            {pdfUrl ? (
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="contract-pdf-action">
                <ExternalLink size={16} aria-hidden="true" />
                <span>{t('contracts.openPdf')}</span>
              </a>
            ) : null}
            <button
              type="button"
              className="contract-pdf-action"
              onClick={handleDownload}
              disabled={!pdfBlob || isLoading}
            >
              <Download size={16} aria-hidden="true" />
              <span>{t('contracts.downloadPdf')}</span>
            </button>
          </div>
        </div>
      )}

      <div className="contract-pdf-viewport">
        {isLoading ? (
          <div className="contract-pdf-state" role="status">
            <LoaderCircle size={30} className="contract-pdf-spinner" aria-hidden="true" />
            <p>{t('contracts.loadingPdfPreview')}</p>
          </div>
        ) : error ? (
          <div className="contract-pdf-state contract-pdf-error" role="alert">
            <p>{error}</p>
            <button type="button" className="contract-pdf-retry" onClick={() => void loadPdf()}>
              <RefreshCw size={16} aria-hidden="true" />
              {t('contracts.retryPdfPreview')}
            </button>
          </div>
        ) : pdfUrl ? (
          <iframe
            title={viewerTitle}
            className="contract-pdf-frame"
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
          />
        ) : null}
      </div>
    </div>
  );
}
