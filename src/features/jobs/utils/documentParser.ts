import mammoth from 'mammoth';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

// Polyfill DOMMatrix for Node/jsdom environments
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {};
}

export interface ParsedDocumentResult {
  text: string;
  charCount: number;
  fileName: string;
  fileType: string;
  isTruncated: boolean;
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_PDF_PAGES = 15;
export const MAX_CHAR_LIMIT = 15000;

async function getFileArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    try {
      return await file.arrayBuffer();
    } catch {
      // Fallback to FileReader if arrayBuffer call fails
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error('FILE_READ_ERROR'));
    reader.readAsArrayBuffer(file);
  });
}

async function getFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    try {
      return await file.text();
    } catch {
      // Fallback to FileReader if text call fails
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('FILE_READ_ERROR'));
    reader.readAsText(file);
  });
}

/**
 * Extracts pure raw plain text from .docx, .pdf, .txt, and .md files in the browser.
 */
export async function parseJobDocument(file: File): Promise<ParsedDocumentResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('FILE_TOO_LARGE');
  }

  const fileName = file.name;
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  let rawText = '';
  let fileTypeLabel = ext.toUpperCase().replace('.', '');

  try {
    if (ext === '.docx') {
      const arrayBuffer = await getFileArrayBuffer(file);
      const result = await mammoth.extractRawText({ arrayBuffer });
      rawText = result.value || '';
    } else if (ext === '.pdf') {
      // Use legacy build for PDF parsing compatibility across Node/jsdom & browser
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      if (typeof window !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      }
      const arrayBuffer = await getFileArrayBuffer(file);
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      const maxPages = Math.min(pdf.numPages, MAX_PDF_PAGES);
      const textParts: string[] = [];

      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ');
        if (pageText.trim()) {
          textParts.push(`--- Page ${i} ---\n${pageText}`);
        }
      }
      rawText = textParts.join('\n\n');
    } else if (ext === '.txt' || ext === '.md') {
      rawText = await getFileText(file);
    } else {
      throw new Error('UNSUPPORTED_FORMAT');
    }
  } catch (err: any) {
    if (err.message === 'FILE_TOO_LARGE' || err.message === 'UNSUPPORTED_FORMAT') {
      throw err;
    }
    throw new Error(`PARSING_FAILED: ${err.message || 'Unknown error'}`);
  }

  // Clean excessive line breaks
  let cleanedText = rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  let isTruncated = false;
  if (cleanedText.length > MAX_CHAR_LIMIT) {
    cleanedText = cleanedText.slice(0, MAX_CHAR_LIMIT);
    isTruncated = true;
  }

  return {
    text: cleanedText,
    charCount: cleanedText.length,
    fileName,
    fileType: fileTypeLabel,
    isTruncated,
  };
}
