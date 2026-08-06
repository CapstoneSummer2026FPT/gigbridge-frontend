import { useCallback, useState } from 'react';
import { esignGetAPI } from '../../../api/esignAPI/GET';
import { esignPostAPI } from '../../../api/esignAPI/POST';
import type { ESignDocumentDto } from '../../../types/models/ESign';
import { SignatureStatus } from '../../../types/models/ESign';

const safeFileName = (document: ESignDocumentDto): string =>
  document.contractId
    ? 'Gigbridge-Client-Freelancer-Contract.pdf'
    : `${(document.documentCode || 'GigBridge-document').replace(/[^a-z0-9._-]+/gi, '-')}.pdf`;

const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

interface PdfSource {
  host: HTMLDivElement;
  content: HTMLDivElement;
}

const buildPdfSource = (document: ESignDocumentDto): PdfSource => {
  const host = window.document.createElement('div');
  host.style.cssText = 'position:fixed;left:-100000px;top:0;width:794px;pointer-events:none;';
  const root = window.document.createElement('div');
  root.style.cssText = 'width:794px;box-sizing:border-box;background:#fff;color:#111;padding:42px;font-family:Arial,sans-serif;';
  const content = window.document.createElement('div');
  content.innerHTML = document.renderedHtmlContent;
  root.appendChild(content);

  const signed = document.signatures.filter(signature => signature.status === SignatureStatus.Signed);
  if (signed.length > 0) {
    const evidence = window.document.createElement('section');
    evidence.style.cssText = 'margin-top:32px;padding-top:18px;border-top:1px solid #bbb;break-inside:avoid;';
    const heading = window.document.createElement('h3');
    heading.textContent = 'Electronic signature evidence';
    evidence.appendChild(heading);
    signed.forEach(signature => {
      const row = window.document.createElement('div');
      row.style.cssText = 'display:inline-flex;vertical-align:top;flex-direction:column;width:45%;min-width:260px;margin:12px 4% 12px 0;';
      const label = window.document.createElement('strong');
      label.textContent = signature.signerRole === 0 ? 'Client signature' : 'Freelancer signature';
      row.appendChild(label);
      if (signature.signatureImageUrl) {
        const image = window.document.createElement('img');
        image.src = signature.signatureImageUrl;
        image.crossOrigin = 'anonymous';
        image.alt = label.textContent;
        image.style.cssText = 'display:block;max-width:220px;max-height:90px;margin:10px 0;object-fit:contain;';
        row.appendChild(image);
      }
      const signedAt = window.document.createElement('span');
      signedAt.textContent = signature.signedAt
        ? `Signed ${new Date(signature.signedAt).toLocaleString()}`
        : 'Signature recorded';
      row.appendChild(signedAt);
      evidence.appendChild(row);
    });
    root.appendChild(evidence);
  }
  host.appendChild(root);
  window.document.body.appendChild(host);
  return { host, content: root };
};

const renderPdf = async (document: ESignDocumentDto): Promise<Blob> => {
  const source = buildPdfSource(document);
  try {
    const { default: html2pdf } = await import('html2pdf.js');
    return await html2pdf()
      .set({
        margin: 8,
        filename: safeFileName(document),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 1.5, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      })
      .from(source.content)
      .outputPdf('blob');
  } finally {
    source.host.remove();
  }
};

export async function prepareESignPdf(
  document: ESignDocumentDto,
  download: boolean,
): Promise<void> {
  const fileName = safeFileName(document);
  if (document.hasPdfArtifact) {
    const cached = await esignGetAPI.downloadDocument(document.documentId);
    if (cached.success && cached.data) {
      if (download) downloadBlob(cached.data, fileName);
      return;
    }
    if (cached.statusCode !== 409) {
      throw new Error(cached.message || 'The saved PDF could not be downloaded.');
    }
    // A signature or renderer revision made the cached PDF stale; rebuild below.
  }

  if (document.contractId) {
    const generated = await esignPostAPI.generateDocumentPdf(document.documentId);
    if (!generated.success) {
      throw new Error(generated.message || 'The contract PDF could not be prepared from the Word template.');
    }
    if (download) {
      const prepared = await esignGetAPI.downloadDocument(document.documentId);
      if (!prepared.success || !prepared.data) {
        throw new Error(prepared.message || 'The prepared contract PDF could not be downloaded.');
      }
      downloadBlob(prepared.data, fileName);
    }
    return;
  }

  const pdf = await renderPdf(document);
  const signatureCount = document.signatures.filter(signature => signature.status === SignatureStatus.Signed).length;
  const saved = await esignPostAPI.saveDocumentPdf(document.documentId, pdf, fileName, signatureCount);
  if (download) downloadBlob(pdf, fileName);
  if (!saved.success) throw new Error(saved.message || 'The PDF was created but could not be saved.');
}

export async function prepareESignPdfById(documentId: string, download = false): Promise<void> {
  const response = await esignGetAPI.getDocumentById(documentId);
  if (!response.success || !response.data) throw new Error(response.message || 'The signed document could not be loaded.');
  await prepareESignPdf(response.data, download);
}

export function useESignPdf(document: ESignDocumentDto | null) {
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async (): Promise<void> => {
    if (!document || isPreparing) return;
    setIsPreparing(true);
    setError(null);
    try {
      await prepareESignPdf(document, true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The PDF could not be prepared.');
    } finally {
      setIsPreparing(false);
    }
  }, [document, isPreparing]);

  return { isPreparing, error, download, retry: download };
}
