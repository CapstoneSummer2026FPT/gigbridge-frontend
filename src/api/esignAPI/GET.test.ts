import { describe, expect, it } from 'vitest';
import { ESignerRole, ESignDocumentStatus, SignatureStatus } from '../../types/models/ESign';
import { normalizeESignDocument, normalizeESignDocumentListPage, normalizeESignSignature } from './GET';

describe('e-sign GET response normalization', () => {
  it('normalizes PascalCase document and signature payloads', () => {
    const document = normalizeESignDocument({
      DocumentId: 'doc-1',
      JobPostId: 'job-1',
      ContractId: 'contract-1',
      TemplateId: 'template-1',
      DocumentCode: 'DOC-001',
      RenderedHtmlContent: '<p>Contract</p>',
      Status: ESignDocumentStatus.FullySigned,
      DocumentHash: 'hash-1',
      ExpiresAt: null,
      FinalizedAt: '2026-06-28T01:00:00.000Z',
      ExportedPdfUrl: 'https://example.com/contract.pdf',
      CreatedAt: '2026-06-27T01:00:00.000Z',
      UpdatedAt: '2026-06-28T01:00:00.000Z',
      Signatures: [
        {
          SignatureId: 'sig-1',
          DocumentId: 'doc-1',
          UserId: 'user-1',
          SignerRole: ESignerRole.Freelancer,
          SignatureImageUrl: 'https://example.com/signature.png',
          SignatureWidth: 300,
          SignatureHeight: 100,
          Status: SignatureStatus.Signed,
          SignedAt: '2026-06-28T01:00:00.000Z',
          DeclinedAt: null,
          DeclineReason: null,
          IpAddress: '127.0.0.1',
          UserAgent: 'Vitest',
          CreatedAt: '2026-06-27T01:00:00.000Z',
        },
      ],
    });

    expect(document.status).toBe(ESignDocumentStatus.FullySigned);
    expect(document.signatures).toHaveLength(1);
    expect(document.signatures[0]).toMatchObject({
      signatureId: 'sig-1',
      signerRole: ESignerRole.Freelancer,
      status: SignatureStatus.Signed,
    });
  });

  it('returns an empty signatures array when the backend omits signatures', () => {
    const document = normalizeESignDocument({
      DocumentId: 'doc-1',
      Status: ESignDocumentStatus.PendingSignatures,
    });

    expect(document.signatures).toEqual([]);
  });

  it('normalizes standalone PascalCase signature payloads', () => {
    const signature = normalizeESignSignature({
      SignatureId: 'sig-1',
      DocumentId: 'doc-1',
      UserId: 'user-1',
      SignerRole: ESignerRole.Client,
      Status: SignatureStatus.Signed,
      CreatedAt: '2026-06-27T01:00:00.000Z',
    });

    expect(signature).toMatchObject({
      signatureId: 'sig-1',
      documentId: 'doc-1',
      userId: 'user-1',
      signerRole: ESignerRole.Client,
      status: SignatureStatus.Signed,
    });
  });

  it('normalizes PascalCase signed document list pages', () => {
    const page = normalizeESignDocumentListPage({
      Items: [
        {
          DocumentId: 'doc-1',
          JobPostId: 'job-1',
          ContractId: 'contract-1',
          DocumentCode: 'GB-CONTRACT-001',
          DocumentType: 'Contract',
          Title: 'Mobile App Contract',
          DocumentStatus: ESignDocumentStatus.FullySigned,
          CurrentUserSignerRole: ESignerRole.Client,
          CurrentUserSignedAt: '2026-06-28T02:00:00.000Z',
          HasClientSigned: true,
          HasFreelancerSigned: true,
          SignatureCount: 2,
          FinalizedAt: '2026-06-28T03:00:00.000Z',
          ExportedPdfUrl: 'https://example.com/contract.pdf',
          CreatedAt: '2026-06-27T01:00:00.000Z',
          UpdatedAt: '2026-06-28T03:00:00.000Z',
        },
      ],
      PageNumber: 1,
      TotalPages: 3,
      TotalCount: 7,
      HasPreviousPage: false,
      HasNextPage: true,
    });

    expect(page).toMatchObject({
      pageNumber: 1,
      totalPages: 3,
      totalCount: 7,
      hasNextPage: true,
    });
    expect(page.items[0]).toMatchObject({
      documentId: 'doc-1',
      jobPostId: 'job-1',
      contractId: 'contract-1',
      documentCode: 'GB-CONTRACT-001',
      documentType: 'Contract',
      title: 'Mobile App Contract',
      documentStatus: ESignDocumentStatus.FullySigned,
      currentUserSignerRole: ESignerRole.Client,
      hasClientSigned: true,
      hasFreelancerSigned: true,
      signatureCount: 2,
    });
  });
});
