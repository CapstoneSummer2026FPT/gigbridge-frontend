import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
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
import { useTranslation } from '../../../hooks/useTranslation';

export type StatusFilter = 'all' | ESignDocumentStatus;
const PAGE_SIZE = 20;

export interface GroupedDocuments {
  jobPostId: string;
  documents: ESignDocumentListItemDto[];
}

export function useESignContracts() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['contracts', 'common']);
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

    try {
      const response = isAdmin
        ? await esignGetAPI.getAdminDocuments(params)
        : await esignGetAPI.getMyDocuments(params);

      if (requestId !== listRequestId.current) return;

      if (!response.success || !response.data) {
        setPage(null);
        setListError(response.message || t('contracts.legal.loadError'));
        return;
      }

      setPage(response.data);
    } catch {
      if (requestId === listRequestId.current) {
        setListError(t('contracts.alerts.errorOccurred'));
      }
    } finally {
      if (requestId === listRequestId.current) {
        setLoadingList(false);
      }
    }
  }, [isAdmin, pageNumber, searchQuery, statusFilter, t]);

  const loadDocument = useCallback(async (documentId: string): Promise<void> => {
    const requestId = ++documentRequestId.current;
    setSelectedDocumentId(documentId);
    setSelectedDocument(null);
    setDocumentError(null);
    setLoadingDocument(true);

    try {
      const response = await esignGetAPI.getDocumentById(documentId);

      if (requestId !== documentRequestId.current) return;

      if (!response.success || !response.data) {
        setDocumentError(response.message || t('contracts.legal.loadError'));
        return;
      }

      setSelectedDocument(response.data);
    } catch {
      if (requestId === documentRequestId.current) {
        setDocumentError(t('contracts.alerts.errorOccurred'));
      }
    } finally {
      if (requestId === documentRequestId.current) {
        setLoadingDocument(false);
      }
    }
  }, [t]);

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

    if (requestedDocumentId) return;

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
    const listedDocument = page?.items.find(document => document.documentId === selectedDocumentId) ?? null;
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
      title: selectedDocument.documentCode || t('contracts.legal.contractDocument'),
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
      hasPdfArtifact: selectedDocument.hasPdfArtifact,
      createdAt: selectedDocument.createdAt,
      updatedAt: selectedDocument.updatedAt ?? null,
    };
  }, [page?.items, selectedDocument, selectedDocumentId, t]);

  const handleClearSearch = (): void => {
    setSearchQuery('');
    setPageNumber(1);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(event.target.value);
    setPageNumber(1);
  };

  const handleStatusChange = (statusVal: StatusFilter): void => {
    setStatusFilter(statusVal);
    setPageNumber(1);
  };

  const handlePreviousPage = (): void => {
    setPageNumber((current) => Math.max(1, current - 1));
  };

  const handleNextPage = (): void => {
    setPageNumber((current) => current + 1);
  };

  const totalDocuments = page?.totalCount ?? 0;
  const fullySignedCount = page?.items.filter(
    (doc) => doc.documentStatus === ESignDocumentStatus.FullySigned
  ).length ?? 0;
  const artifactCount = page?.items.filter((doc) => doc.hasPdfArtifact).length ?? 0;

  return {
    t,
    isAdmin,
    page,
    pageNumber,
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
  };
}
