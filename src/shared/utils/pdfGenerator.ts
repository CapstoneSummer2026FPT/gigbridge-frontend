import type { ContractDto } from '../../types/models/Contract';

/**
 * Contract PDF Generation Utilities
 * Client-side PDF generation for contracts
 */

export interface PdfOptions {
  includeTerms?: boolean;
  includeNda?: boolean;
  includeClauses?: string[];
  clientName?: string;
  freelancerName?: string;
}

/**
 * Generate contract HTML content for PDF rendering
 */
export const generateContractHTML = (
  contract: ContractDto,
  options: PdfOptions = {}
): string => {
  const {
    includeTerms = true,
    includeNda = false,
    clientName = 'Client',
    freelancerName = 'Freelancer',
  } = options;

  const startDate = contract.startDate ? new Date(contract.startDate).toLocaleDateString() : '';
  const endDate = contract.endDate ? new Date(contract.endDate).toLocaleDateString() : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Arial', sans-serif;
            color: #333;
            line-height: 1.6;
            padding: 40px;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .header h1 {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .header p {
            color: #666;
            font-size: 12px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: uppercase;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
          }
          .section-content {
            margin-left: 20px;
            font-size: 12px;
            color: #555;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 5px 0;
            border-bottom: 1px dotted #ccc;
          }
          .detail-label {
            font-weight: bold;
            color: #333;
          }
          .detail-value {
            color: #666;
          }
          .parties {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
          }
          .party {
            flex: 1;
            padding: 15px;
            border: 1px solid #ccc;
            margin-right: 10px;
          }
          .party:last-child {
            margin-right: 0;
          }
          .party-title {
            font-weight: bold;
            margin-bottom: 10px;
            font-size: 12px;
          }
          .party-content {
            font-size: 11px;
            color: #666;
          }
          .signature-block {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
          }
          .signature {
            flex: 1;
            text-align: center;
            border-top: 1px solid #333;
            padding-top: 10px;
            font-size: 11px;
          }
          .signature-label {
            font-weight: bold;
            margin-top: 5px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ccc;
            font-size: 10px;
            color: #999;
            text-align: center;
          }
          .terms {
            margin-top: 30px;
            font-size: 11px;
            background: #f5f5f5;
            padding: 20px;
            border-left: 4px solid #333;
          }
          .terms ol {
            margin-left: 20px;
          }
          .terms li {
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SERVICE AGREEMENT</h1>
            <p>Contract No: ${contract.contractsId}</p>
            <p>Generated: ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="section">
            <div class="section-title">Agreement Details</div>
            <div class="section-content">
              <div class="detail-row">
                <span class="detail-label">Project Title:</span>
                <span class="detail-value">${contract.title}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Contract Type:</span>
                <span class="detail-value">Fixed Price</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Total Budget:</span>
                <span class="detail-value">$${(contract.totalBudget || 0).toLocaleString()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Start Date:</span>
                <span class="detail-value">${startDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">End Date:</span>
                <span class="detail-value">${endDate || 'Flexible'}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Parties</div>
            <div class="parties">
              <div class="party">
                <div class="party-title">Client</div>
                <div class="party-content">
                  <p>${clientName}</p>
                </div>
              </div>
              <div class="party">
                <div class="party-title">Service Provider</div>
                <div class="party-content">
                  <p>${freelancerName}</p>
                </div>
              </div>
            </div>
          </div>

          ${contract.description ? `
            <div class="section">
              <div class="section-title">Project Description</div>
              <div class="section-content">
                <p>${contract.description.replace(/\n/g, '<br>')}</p>
              </div>
            </div>
          ` : ''}

          ${includeTerms ? `
            <div class="terms">
              <div class="section-title">Standard Terms and Conditions</div>
              <ol>
                <li><strong>Payment Terms:</strong> Payment will be made upon delivery and acceptance of deliverables as agreed.</li>
                <li><strong>Intellectual Property:</strong> Upon full payment, all intellectual property rights transfer to the client.</li>
                <li><strong>Confidentiality:</strong> Both parties agree to maintain confidentiality of any sensitive information.</li>
                <li><strong>Limitation of Liability:</strong> Neither party shall be liable for indirect, incidental, or consequential damages.</li>
                <li><strong>Dispute Resolution:</strong> Any disputes will be resolved through mediation or arbitration.</li>
                <li><strong>Term and Termination:</strong> This agreement is effective from the start date until completion or mutual termination.</li>
              </ol>
            </div>
          ` : ''}

          ${includeNda ? `
            <div class="section">
              <div class="section-title">Non-Disclosure Agreement</div>
              <div class="section-content">
                <p>The parties agree to keep all project-related information confidential and not disclose it to any third parties without prior written consent.</p>
              </div>
            </div>
          ` : ''}

          <div class="signature-block">
            <div class="signature">
              <div style="height: 50px; border: 1px dashed #ccc;"></div>
              <div class="signature-label">${clientName}</div>
              <div style="font-size: 10px; color: #999;">Date: ___________</div>
            </div>
            <div class="signature">
              <div style="height: 50px; border: 1px dashed #ccc;"></div>
              <div class="signature-label">${freelancerName}</div>
              <div style="font-size: 10px; color: #999;">Date: ___________</div>
            </div>
          </div>

          <div class="footer">
            <p>This is an electronic contract generated by GigBridge platform.</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Download contract as HTML file
 */
export const downloadContractAsHTML = (
  contract: ContractDto,
  options: PdfOptions = {}
): void => {
  const html = generateContractHTML(contract, options);
  const blob = new Blob([html], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `contract_${contract.contractsId}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Open contract preview in new tab
 */
export const openContractPreview = (
  contract: ContractDto,
  options: PdfOptions = {}
): Window | null => {
  const html = generateContractHTML(contract, options);
  const blob = new Blob([html], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const newWindow = window.open(url, '_blank');
  return newWindow;
};

/**
 * Print contract
 */
export const printContract = (
  contract: ContractDto,
  options: PdfOptions = {}
): void => {
  const html = generateContractHTML(contract, options);
  const printWindow = window.open('', '', 'height=600,width=800');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
};

/**
 * Convert data URL signature to compressed format
 */
export const compressSignature = (
  dataUrl: string,
  quality: number = 0.7
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } else {
        resolve(dataUrl);
      }
    };
  });
};

/**
 * Validate contract before PDF generation
 */
export const validateContractForPdf = (contract: ContractDto): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!contract.contractsId) {
    errors.push('Contract ID is required');
  }

  if (!contract.title || contract.title.trim().length === 0) {
    errors.push('Contract title is required');
  }

  if (!contract.totalBudget || contract.totalBudget <= 0) {
    errors.push('Contract budget must be greater than 0');
  }

  if (!contract.startDate) {
    errors.push('Contract start date is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
