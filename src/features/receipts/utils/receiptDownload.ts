export const receiptFileName = (receiptNumber: string): string =>
  `GigBridge-${receiptNumber || 'receipt'}.pdf`;

export const saveReceiptBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
