import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Layers,
  Loader,
  PenTool,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { useApp } from '../../../app/providers/AppProvider';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { esignGetAPI } from '../../../api/esignAPI/GET';
import { esignPostAPI } from '../../../api/esignAPI/POST';
import type { ContractDto, Milestone } from '../../../types/models/Contract';
import type { ESignDocumentDto } from '../../../types/models/ESign';
import { ContractStatus } from '../../../types/models/Contract';
import { ESignDocumentStatus, SignatureStatus } from '../../../types/models/ESign';
import { UserRole } from '../../../types/models/User';
import '../styles/signature-workflow-screen.css';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { getContractStatusLabel } from '../../../shared/utils/contractUtils';
import { useTranslation } from '../../../hooks/useTranslation';
import { useESignPdf } from '../hooks/useESignPdf';
import { useContractReadyForEscrowEvent } from '../hooks/useContractReadyForEscrowEvent';
import { ContractPdfViewer } from '../components/ContractPdfViewer';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';

type SignatureStep = 'review' | 'capture' | 'complete';
const POLICY_VERSION = 'Ver 1.0 Gigbridge';
const normalizeIdentityCode = (value: string): string => value.replace(/\s+/g, '');
const isValidIdentityCode = (value: string): boolean => /^(?:\d{9}|\d{12})$/.test(normalizeIdentityCode(value));

interface SignContractResponse {
  status?: ContractStatus;
  Status?: ContractStatus;
  contractStatus?: ContractStatus;
  ContractStatus?: ContractStatus;
  contractId?: string;
  ContractId?: string;
  documentId?: string;
  DocumentId?: string;
  message?: string;
  Message?: string;
}

interface PreparedSignatureImage {
  imageUrl: string;
  width: number;
  height: number;
}

const PDF_SIGNATURE_MAX_WIDTH = 220;
const PDF_SIGNATURE_MAX_HEIGHT = 80;

const prepareSignatureImage = (canvas: HTMLCanvasElement): PreparedSignatureImage => {
  const fallbackScale = Math.min(
    PDF_SIGNATURE_MAX_WIDTH / canvas.width,
    PDF_SIGNATURE_MAX_HEIGHT / canvas.height,
  );
  const fallback = {
    imageUrl: canvas.toDataURL('image/png'),
    width: Math.round(canvas.width * fallbackScale),
    height: Math.round(canvas.height * fallbackScale),
  };
  const context = canvas.getContext('2d');
  if (!context) return fallback;

  try {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const offset = (y * canvas.width + x) * 4;
        const alpha = pixels.data[offset + 3];
        const isInk = alpha > 0 && (
          pixels.data[offset] < 245 ||
          pixels.data[offset + 1] < 245 ||
          pixels.data[offset + 2] < 245
        );
        if (!isInk) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < minX || maxY < minY) return fallback;

    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(canvas.width - 1, maxX + padding);
    maxY = Math.min(canvas.height - 1, maxY + padding);
    const croppedWidth = maxX - minX + 1;
    const croppedHeight = maxY - minY + 1;
    const croppedPixels = context.getImageData(minX, minY, croppedWidth, croppedHeight);

    for (let offset = 0; offset < croppedPixels.data.length; offset += 4) {
      if (
        croppedPixels.data[offset] > 245 &&
        croppedPixels.data[offset + 1] > 245 &&
        croppedPixels.data[offset + 2] > 245
      ) {
        croppedPixels.data[offset + 3] = 0;
      }
    }

    const exportCanvas = window.document.createElement('canvas');
    exportCanvas.width = croppedWidth;
    exportCanvas.height = croppedHeight;
    const exportContext = exportCanvas.getContext('2d');
    if (!exportContext) return fallback;
    exportContext.putImageData(croppedPixels, 0, 0);

    const scale = Math.min(
      PDF_SIGNATURE_MAX_WIDTH / croppedWidth,
      PDF_SIGNATURE_MAX_HEIGHT / croppedHeight,
    );
    return {
      imageUrl: exportCanvas.toDataURL('image/png'),
      width: Math.max(1, Math.round(croppedWidth * scale)),
      height: Math.max(1, Math.round(croppedHeight * scale)),
    };
  } catch (imageError) {
    console.warn('Could not crop the signature image; using the fitted canvas.', imageError);
    return fallback;
  }
};

const formatMoney = (value?: number): string =>
  formatGigCoin(value ?? 0);

const formatDate = (value?: string | null): string => {
  if (!value) return 'Chưa đặt';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa đặt' : date.toLocaleDateString('vi-VN');
};

const getStatusFromResponse = (data: unknown): ContractStatus | undefined => {
  const response = data as SignContractResponse | undefined;
  const status = response?.status ?? response?.Status ?? response?.contractStatus ?? response?.ContractStatus;
  return typeof status === 'number' ? status : undefined;
};

const getDocumentIdFromResponse = (data: unknown): string | undefined => {
  const response = data as SignContractResponse | undefined;
  return response?.documentId ?? response?.DocumentId;
};

const getCanvasPoint = (canvas: HTMLCanvasElement, event: React.MouseEvent<HTMLCanvasElement>) => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
};

export default function SignatureWorkflowScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const { user, role } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [contract, setContract] = useState<ContractDto | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [document, setDocument] = useState<ESignDocumentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documentWarning, setDocumentWarning] = useState('');
  const [signatureStep, setSignatureStep] = useState<SignatureStep>('review');
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureDrawn, setSignatureDrawn] = useState(false);
  const [identityOrTaxCode, setIdentityOrTaxCode] = useState('');
  const [identityTouched, setIdentityTouched] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [signaturePreviewPdf, setSignaturePreviewPdf] = useState<Blob | null>(null);
  const [signaturePreviewApplied, setSignaturePreviewApplied] = useState(false);
  const [signaturePreviewError, setSignaturePreviewError] = useState('');
  const [isApplyingSignature, setIsApplyingSignature] = useState(false);
  const [signingInProgress, setSigningInProgress] = useState(false);
  const submittingRef = useRef(false);
  const pdf = useESignPdf(document);

  const currentUserSignature = useMemo(
    () =>
      document?.signatures.find(
        signature => signature.userId === user?.id
      ),
    [document?.signatures, user?.id]
  );

  const currentUserDraft = currentUserSignature?.status === SignatureStatus.Pending
    ? currentUserSignature
    : undefined;
  const hasValidCurrentUserDraft = currentUserDraft?.isDraftValid === true;
  const hasFinalSignature = currentUserSignature?.status === SignatureStatus.Signed;
  const isContractFinalized =
    document?.status === ESignDocumentStatus.FullySigned ||
    contract?.status === ContractStatus.PendingEscrow ||
    contract?.status === ContractStatus.Active;
  const hasRecordedSignature = hasValidCurrentUserDraft || hasFinalSignature || isContractFinalized;
  const existingDraftImageUrl = currentUserDraft?.signatureImageUrl ?? null;
  const hasSignatureForDraft = signatureDrawn || Boolean(existingDraftImageUrl);
  const hasSigned = hasFinalSignature || isContractFinalized;
  const isWaitingForCounterpart = hasValidCurrentUserDraft && !isContractFinalized;
  const counterpartHasValidDraft = Boolean(
    document?.signatures.some(
      signature => signature.userId !== user?.id &&
        signature.status === SignatureStatus.Pending &&
        signature.isDraftValid
    )
  );
  const identityCodeIsValid = isValidIdentityCode(identityOrTaxCode);
  const isClient = role === UserRole.Client;
  const milestonesTotal = useMemo(
    () => milestones.reduce((sum, milestone) => sum + Number(milestone.amount || 0), 0),
    [milestones]
  );

  const loadDocument = useCallback(async (targetContractId: string): Promise<void> => {
    try {
      const docResponse = await esignGetAPI.getDocumentByContract(targetContractId);
      if (docResponse.success && docResponse.data) {
        setDocument(docResponse.data);
        setDocumentWarning('');
      } else {
        setDocument(null);
        setDocumentWarning(docResponse.message || 'contracts.pdfWillGenerated');
      }
    } catch {
      setDocument(null);
      setDocumentWarning('contracts.pdfWillGeneratedDesc');
    }
  }, []);

  const refreshWorkflow = useCallback(async (): Promise<void> => {
    if (!contractId) return;

    try {
      const response = await contractGetAPI.getContractById(contractId);
      if (response.success && response.data) {
        setContract(response.data);
      }
      await loadDocument(contractId);
    } catch (refreshError) {
      console.warn('Could not refresh the signature workflow state.', refreshError);
    }
  }, [contractId, loadDocument]);

  useContractReadyForEscrowEvent(
    contractId,
    signatureStep === 'complete' && isWaitingForCounterpart,
    refreshWorkflow,
  );

  useEffect(() => {
    if (signatureStep !== 'complete' || !isWaitingForCounterpart) return;

    const intervalId = window.setInterval(() => {
      void refreshWorkflow();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [isWaitingForCounterpart, refreshWorkflow, signatureStep]);

  useEffect(() => {
    const fetchContractDetails = async () => {
      if (!contractId) {
        setError('contracts.invalidId');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await contractGetAPI.getContractById(contractId);

        if (!response.success || !response.data) {
          setError(response.message || 'contracts.contractNotFound');
          setLoading(false);
          return;
        }

        const contractData = response.data;
        setContract(contractData);

        const milestonesResponse = await contractGetAPI.getMilestonesByContract(contractId);
        if (milestonesResponse.success && milestonesResponse.data) {
          setMilestones(milestonesResponse.data);
        }

        await loadDocument(contractId);

        const isUserParticipant =
          user?.id === contractData.clientUserId || user?.id === contractData.freelancerUserId;

        if (!isUserParticipant) {
          setError('contracts.notAuthorized');
        }
      } catch (err: unknown) {
        console.error('Error loading contract:', err);
        setError('contracts.errorLoading');
      } finally {
        setLoading(false);
      }
    };

    void fetchContractDetails();
  }, [contractId, loadDocument, user?.id]);

  useEffect(() => {
    if (document) {
      setIdentityOrTaxCode(currentUserSignature?.identityOrTaxCode ?? '');
    }

    if (currentUserDraft) {
      setPolicyAccepted(currentUserDraft.isDraftValid);
      setSignatureStep(currentUserDraft.isDraftValid ? 'complete' : 'capture');
      return;
    }

    if (hasFinalSignature || isContractFinalized) {
      setSignatureStep('complete');
      return;
    }

    if (document && !currentUserSignature) {
      setPolicyAccepted(false);
      setSignatureStep('review');
    }
  }, [currentUserDraft, currentUserSignature, document, hasFinalSignature, isContractFinalized]);

  useEffect(() => {
    if (!canvasRef.current || signatureStep !== 'capture') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#111827';
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    setSignatureDrawn(false);
  }, [signatureStep]);

  useEffect(() => {
    setSignatureStep('review');
  }, [contractId]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const point = getCanvasPoint(canvas, e);
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const point = getCanvasPoint(canvas, e);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    setSignatureDrawn(true);
    setSignaturePreviewApplied(false);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureDrawn(false);
    setSignaturePreviewPdf(null);
    setSignaturePreviewApplied(false);
    setSignaturePreviewError('');
  };

  const handleApplySignaturePreview = async (): Promise<void> => {
    const canvas = canvasRef.current;
    if (!hasSignatureForDraft || (signatureDrawn && !canvas)) return;

    if (!identityCodeIsValid) {
      setIdentityTouched(true);
      setSignaturePreviewError('Identity number must contain exactly 9 or 12 digits.');
      return;
    }

    if (!document?.documentId) {
      setSignaturePreviewError(t('contracts.documentNotReadyPreview'));
      return;
    }

    setIsApplyingSignature(true);
    setSignaturePreviewError('');

    try {
      const prepared = signatureDrawn && canvas ? prepareSignatureImage(canvas) : null;
      const response = await esignPostAPI.previewDocumentPdf(
        document.documentId,
        prepared?.imageUrl,
        prepared?.width,
        prepared?.height,
        normalizeIdentityCode(identityOrTaxCode),
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || t('contracts.signaturePreviewFailed'));
      }

      setSignaturePreviewPdf(response.data);
      setSignaturePreviewApplied(true);
    } catch (previewError) {
      console.error('Failed to preview signature on PDF:', previewError);
      setSignaturePreviewError(
        previewError instanceof Error
          ? previewError.message
          : t('contracts.failedApplySignaturePreview')
      );
      setSignaturePreviewApplied(false);
    } finally {
      setIsApplyingSignature(false);
    }
  };

  const handleEditDraft = (): void => {
    if (!currentUserDraft || isContractFinalized) return;
    setError('');
    setSuccess('');
    setIdentityTouched(false);
    setSignatureStep('capture');
  };

  const refreshAfterSigning = useCallback(async (nextStatus?: ContractStatus): Promise<ContractStatus | undefined> => {
    if (!contractId) return nextStatus;

    const refreshedContract = await contractGetAPI.getContractById(contractId);
    if (refreshedContract.success && refreshedContract.data) {
      setContract(refreshedContract.data);
      await loadDocument(contractId);
      if (
        nextStatus === ContractStatus.PendingEscrow &&
        refreshedContract.data.status === ContractStatus.PendingSignature
      ) {
        return nextStatus;
      }
      if (
        nextStatus === ContractStatus.Active &&
        refreshedContract.data.status !== ContractStatus.Active
      ) {
        return nextStatus;
      }
      return refreshedContract.data.status;
    }

    return nextStatus;
  }, [contractId, loadDocument]);

  useEffect(() => {
    if (
      signatureStep !== 'complete' ||
      !hasValidCurrentUserDraft ||
      contract?.status !== ContractStatus.PendingSignature
    ) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void refreshAfterSigning();
    }, 5_000);

    return () => window.clearInterval(intervalId);
  }, [contract?.status, hasValidCurrentUserDraft, refreshAfterSigning, signatureStep]);

  const handleSubmitSignature = async () => {
    if (!contract || !hasSignatureForDraft) return;
    if (submittingRef.current || signingInProgress) return;

    if (!signatureDrawn && !existingDraftImageUrl) {
      setError('Please draw your signature before submitting.');
      return;
    }

    if (!identityCodeIsValid) {
      setIdentityTouched(true);
      setError('Identity number must contain exactly 9 or 12 digits.');
      return;
    }

    if (!policyAccepted) {
      setError('Please accept the GigBridge policy before signing.');
      return;
    }

    try {
      const canvas = canvasRef.current;
      if (signatureDrawn && !canvas) {
        setError('Signature canvas is not available. Please try again.');
        return;
      }

      submittingRef.current = true;
      setSigningInProgress(true);
      setError('');
      setSuccess('');

      const normalizedIdentityCode = normalizeIdentityCode(identityOrTaxCode);
      const response = await contractPostAPI.sign(contract.contractsId, {
        ...(signatureDrawn
          ? {
            signatureImageUrl: canvas!.toDataURL('image/png'),
            signatureWidth: canvas!.width,
            signatureHeight: canvas!.height,
          }
          : {}),
        identityOrTaxCode: normalizedIdentityCode,
        policyAccepted: true,
        policyVersion: POLICY_VERSION,
      });

      if (!response.success) {
        if (response.statusCode === 409) {
          setSignatureStep('complete');
          setSuccess('This contract has already been finalized. Its signatures can no longer be changed.');
          await refreshAfterSigning();
          return;
        }
        setError(response.message || t('contracts.failedToSign'));
        return;
      }

      const documentId = getDocumentIdFromResponse(response.data);
      setSignatureStep('complete');
      setSuccess('Your temporary signature has been saved.');
      if (documentId) {
        await loadDocument(contract.contractsId);
      }

      const finalStatus = await refreshAfterSigning(getStatusFromResponse(response.data));
      if (finalStatus === ContractStatus.PendingEscrow) {
        setSuccess(isClient ? 'Contract fully signed. You can now fund escrow.' : 'Contract fully signed. Waiting for the client to fund escrow.');
        return;
      }

      if (finalStatus === ContractStatus.Active) {
        setSuccess('Contract is active. Opening workspace...');
        window.setTimeout(() => navigate(`/workspace/${contract.contractsId}`), 1200);
        return;
      }

      setSuccess('Your temporary signature has been saved. You can update it until the other party submits a valid signature.');
    } catch (err) {
      console.error('Failed to submit signature:', err);
      setError('Failed to submit signature. Please try again.');
    } finally {
      submittingRef.current = false;
      setSigningInProgress(false);
    }
  };

  const handleCompleteNavigation = () => {
    if (!contract) {
      navigate('/contracts');
      return;
    }

    if (contract.status === ContractStatus.PendingEscrow && isClient) {
      navigate(`/contracts/${contract.contractsId}`);
      return;
    }

    if (contract.status === ContractStatus.Active) {
      navigate(`/workspace/${contract.contractsId}`);
      return;
    }

    navigate(`/contracts/${contract.contractsId}`);
  };

  if (loading) {
    return (
      <AppLayout fullWidth>
        <div className="flex min-h-[70vh] items-center justify-center p-12 my-auto bg-background">
          <LemniscateBloomLoader label={t('contracts.loadingContract')} size={56} />
        </div>
      </AppLayout>
    );
  }

  if (!contract) {
    return (
      <AppLayout fullWidth>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-background space-y-4">
          <ShieldAlert className="text-rose-500" size={44} />
          <h2 className="text-xl font-extrabold text-text-primary">{error || t('contracts.contractNotFound')}</h2>
          <button
            type="button"
            onClick={() => navigate('/contracts')}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-extrabold text-white hover:opacity-90 transition cursor-pointer"
          >
            {t('contracts.backToContracts')}
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="signature-workflow-page">
        <div className="signature-header">
          <button className="back-btn" onClick={() => navigate(`/contracts/${contract.contractsId}`)}>
            {t('contracts.back')}
          </button>
          <h1>{t('contracts.esignContract')}</h1>
          <p>{t('contracts.esignSubtitle')}</p>
        </div>

        {error && (
          <div className="signature-alert alert-error">
            <AlertCircle size={18} />
            {error}
            <button onClick={() => setError('')}>
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold shadow-sm">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{t(success, { defaultValue: success })}</span>
            </div>
            <button type="button" onClick={() => setSuccess('')} className="hover:opacity-75 cursor-pointer">
              <X size={16} />
            </button>
          </div>
        )}

        {documentWarning && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-extrabold shadow-sm">
            <Clock size={18} className="shrink-0" />
            <span>{t(documentWarning, { defaultValue: documentWarning })}</span>
          </div>
        )}

        <div className="signature-steps">
          <div className={`step ${signatureStep === 'review' ? 'active' : 'completed'}`}>
            <span className="step-number">1</span>
            <span className="step-label">{t('contracts.reviewProposal')}</span>
          </div>
          <div className="step-divider" />
          <div className={`step ${signatureStep === 'capture' ? 'active' : signatureStep === 'complete' ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">{t('contracts.proceedToSign')}</span>
          </div>
          <div className="step-divider" />
          <div className={`step ${signatureStep === 'complete' ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">
              {hasValidCurrentUserDraft && !isContractFinalized
                ? 'Waiting for other party'
                : t('contracts.completed')}
            </span>
          </div>
        </div>

        {signatureStep === 'review' && (
          <div className="signature-step-content">
            <div className="signature-section">
              <h2>{t('contracts.contractSummary')}</h2>

              <div className="signature-info-box">
                <Clock size={20} />
                <div>
                  <h3>{t('contracts.reviewBeforeSigning')}</h3>
                  <p>{t('contracts.reviewBeforeSigningDesc')}</p>
                </div>
              </div>

              <div className="contract-details">
                <div className="detail-row">
                  <span>{t('contracts.document')}</span>
                  <strong>{contract.jobTitle || contract.title}</strong>
                </div>
                <div className="detail-row">
                  <span>{t('contracts.budget')}</span>
                  <strong>{formatMoney(contract.totalBudget)}</strong>
                </div>
                <div className="detail-row">
                  <span>{t('contracts.milestoneTotal')}</span>
                  <strong>{formatMoney(milestonesTotal)}</strong>
                </div>
                <div className="detail-row">
                  <span>{t('contracts.startDate')}</span>
                  <strong>{formatDate(contract.startDate)}</strong>
                </div>
                <div className="detail-row">
                  <span>{t('contracts.endDate')}</span>
                  <strong>{formatDate(contract.endDate)}</strong>
                </div>
                <div className="detail-row">
                  <span>{t('contracts.client')}</span>
                  <strong>
                    <UserProfileLink userId={contract.clientUserId} role="client">{contract.clientName || contract.clientEmail || t('contracts.client')}</UserProfileLink>
                  </strong>
                </div>
                <div className="detail-row">
                  <span>{t('contracts.freelancer')}</span>
                  <strong>
                    <UserProfileLink userId={contract.freelancerUserId} role="freelancer">{contract.freelancerName || contract.freelancerEmail || t('contracts.freelancer')}</UserProfileLink>
                  </strong>
                </div>
              </div>

              <div className="contract-description">
                <h3>{t('contracts.scope')}</h3>
                <p>{contract.jobDescription || contract.description || t('contracts.noDescription')}</p>
              </div>

              {/* Scope of Work */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-muted">{t('contracts.scope')}</h3>
                <div className="p-4 rounded-xl border border-border bg-surface-muted/30 text-xs leading-relaxed text-text-primary font-semibold whitespace-pre-line">
                  {contract.jobDescription || contract.description || t('contracts.noDescription')}
                </div>
              </div>

              {/* Milestones List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-2">
                    <Layers size={14} /> {t('contracts.milestones')} ({milestones.length})
                  </h3>
                  <span className="text-xs font-black text-brand">{formatMoney(milestonesTotal)}</span>
                </div>

                {milestones.length > 0 ? (
                  <div className="space-y-2">
                    {milestones.map((m, idx) => (
                      <div key={m.id || idx} className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between gap-3 text-xs">
                        <div>
                          <span className="font-extrabold text-text-primary block">#{idx + 1}. {m.title}</span>
                          <span className="text-[10px] text-text-muted font-semibold">{t('contracts.duePrefix')}: {formatDate(m.due_date)}</span>
                        </div>
                        <span className="font-black text-brand shrink-0">{formatMoney(m.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted font-semibold p-4 rounded-xl border border-border bg-surface-muted/20">
                    {t('contracts.noMilestonesPlanned')}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => navigate(`/contracts/${contract.contractsId}`)}
                className="px-5 py-2.5 rounded-xl border border-border bg-background text-text-primary font-extrabold text-xs hover:border-brand/40 transition cursor-pointer"
              >
                {t('contracts.back')}
              </button>
              <button
                type="button"
                onClick={() => setSignatureStep(hasSigned ? 'complete' : 'capture')}
                disabled={Boolean(error) && !hasSigned}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand text-white font-extrabold text-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {hasSigned ? t('contracts.viewStatus') : t('contracts.proceedToSign')} <PenTool size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CAPTURE & PREVIEW SIGNATURE */}
        {signatureStep === 'capture' && (
          <div className="space-y-6">

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* Left Col: PDF Document Viewer */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-2">
                    <FileText size={14} /> {t('contracts.reviewPdfWhileSigning')}
                  </h2>
                  {signaturePreviewApplied && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                      <CheckCircle2 size={12} /> {t('contracts.signatureApplied')}
                    </span>
                  )}
                </div>

                {document ? (
                  <div className="rounded-2xl border border-border bg-background p-2 shadow-sm">
                    <ContractPdfViewer
                      document={document}
                      title={t('contracts.generatedContractDoc')}
                      sourceBlob={signaturePreviewPdf ?? undefined}
                      hideHeaderToolbar={Boolean(signaturePreviewPdf)}
                    />
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs font-bold text-center">
                    {documentWarning || t('contracts.pdfPreviewError')}
                  </div>
                )}
              </div>

              <div className="signature-info-box">
                <Clock size={20} />
                <div>
                  <p>{t('contracts.signatureSavedDesc')}</p>
                </div>
              </div>
            </div>

            <div className="signature-actions">
              <button className="btn-secondary" onClick={() => navigate(`/contracts/${contract.contractsId}`)}>
                {t('contracts.back')}
              </button>
              <button
                className="btn-primary"
                onClick={() => setSignatureStep(hasRecordedSignature ? 'complete' : 'capture')}
                disabled={Boolean(error) && !hasRecordedSignature}
              >
                {hasRecordedSignature ? t('contracts.viewStatus') : t('contracts.proceedToSign')} <PenTool size={16} />
              </button>
            </div>
          </div>
        )}

        {signatureStep === 'capture' && (
          <div className="signature-step-content">
            <div className="signature-section">
              <h2>{t('contracts.drawYourSignature')}</h2>

              <div className="signature-identity-field">
                <label htmlFor="signature-identity-code">Identity number (ID card/Citizen ID)</label>
                <input
                  id="signature-identity-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={16}
                  value={identityOrTaxCode}
                  onBlur={() => setIdentityTouched(true)}
                  onChange={event => {
                    setIdentityOrTaxCode(event.target.value);
                    setSignaturePreviewApplied(false);
                    setSignaturePreviewPdf(null);
                  }}
                  aria-invalid={identityTouched && !identityCodeIsValid}
                  aria-describedby="signature-identity-help"
                  placeholder="Enter 9 or 12 digits"
                />
                <p id="signature-identity-help" className={identityTouched && !identityCodeIsValid ? 'field-error' : ''}>
                  {identityTouched && !identityCodeIsValid
                    ? 'Identity number must contain exactly 9 or 12 digits.'
                    : 'This information applies only to this contract and does not update your profile.'}
                </p>
              </div>

              {existingDraftImageUrl && (
                <div className="current-draft-signature">
                  <strong>Your current temporary signature</strong>
                  <img src={existingDraftImageUrl} alt="Current temporary signature" />
                  <p>Draw below only if you want to replace this signature. Otherwise, the saved image will be retained.</p>
                </div>
              )}

              <div className="signature-pad-wrapper">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="signature-pad"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
                <div className="signature-instructions">
                  {t('contracts.signatureInstructions')}
                </div>
              </div>

              <div className="signature-buttons">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={() => void handleApplySignaturePreview()}
                  disabled={!hasSignatureForDraft || !identityCodeIsValid || isApplyingSignature}
                >
                  {isApplyingSignature ? (
                    <Loader size={16} className="spinner-small" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  {isApplyingSignature
                    ? t('contracts.applyingSignature')
                    : t('contracts.applySignatureToPdf')}
                </button>
                <button className="btn-outline" onClick={handleClearSignature}>
                  {existingDraftImageUrl ? 'Clear new drawing' : t('contracts.clearSignature')}
                </button>
              </div>

              {counterpartHasValidDraft && (
                <div className="signature-inline-warning">
                  The other party already has a valid temporary signature. Submitting this form will finalize and lock the contract.
                </div>
              )}

              {signaturePreviewError && (
                <p className="text-xs font-bold text-rose-500 mt-2">{signaturePreviewError}</p>
              )}
            </div>

            {/* Policy Agreement */}
            <div className="p-4 rounded-xl border border-border bg-surface-muted/40 space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  id="signature-policy-consent"
                  type="checkbox"
                  checked={policyAccepted}
                  onChange={event => setPolicyAccepted(event.target.checked)}
                  className="mt-0.5 rounded border-border text-brand focus:ring-brand"
                />
                <span className="text-xs font-bold text-text-primary leading-snug">
                  Tôi đã đọc, hiểu và đồng ý với{' '}
                  <a href="/policies" target="_blank" rel="noopener noreferrer" className="text-brand underline hover:opacity-80">
                    Bộ chính sách GigBridge — {POLICY_VERSION}
                  </a>
                </span>
              </label>
            </div>

            <div className="signature-actions">
              <button className="btn-secondary" onClick={() => setSignatureStep('review')}>
                {t('contracts.backToReview')}
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmitSignature}
                disabled={
                  (!signatureDrawn && !existingDraftImageUrl) ||
                  !identityCodeIsValid ||
                  !policyAccepted ||
                  signingInProgress
                }
              >
                {signingInProgress ? (
                  <>
                    <Loader size={16} className="spinner-small" />
                    {t('contracts.signing')}
                  </>
                ) : (
                  <>
                    <PenTool size={16} />
                    {counterpartHasValidDraft
                      ? 'Submit and finalize contract'
                      : currentUserDraft
                        ? 'Update temporary signature'
                        : t('contracts.signContract')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {signatureStep === 'complete' && (
          <div className="signature-step-content">
            <div className="signature-section">
              <div className="signature-success">
                <CheckCircle2 size={48} className="success-icon" />
                <h2>{hasRecordedSignature ? t('contracts.signatureRecorded') : t('contracts.status')}</h2>
                <p>
                  {contract.status === ContractStatus.PendingEscrow
                    ? isClient
                      ? t('contracts.bothSignedEscrow')
                      : t('contracts.bothSignedWaitEscrow')
                    : contract.status === ContractStatus.Active
                      ? t('contracts.contractActiveWorkspace')
                      : t('contracts.signatureSavedWaitOther')}
                </p>

                {hasValidCurrentUserDraft && !isContractFinalized && (
                  <div className="current-draft-signature compact">
                    <strong>Your temporary signature is saved</strong>
                    {existingDraftImageUrl && (
                      <img src={existingDraftImageUrl} alt="Saved temporary signature" />
                    )}
                    <p>Identity number: {identityOrTaxCode}</p>
                    <p>You may update these details until the other party submits a valid temporary signature.</p>
                  </div>
                )}

                <div className="signed-info">
                  <div className="info-item">
                    <span>{t('contracts.document')}</span>
                    <strong>{contract.jobTitle || contract.title}</strong>
                  </div>
                  <div className="info-item">
                    <span>{t('contracts.status')}</span>
                    <strong>{t('contracts.statusLabels.' + contract.status, { defaultValue: contract.status })}</strong>
                  </div>
                  <div className="info-item">
                    <span>{t('contracts.nextStep')}</span>
                    <strong>
                      {contract.status === ContractStatus.PendingEscrow && isClient
                        ? t('contracts.fundEscrow')
                        : contract.status === ContractStatus.Active
                          ? t('contracts.openWorkspace')
                          : t('contracts.waitForCounterpart')}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="signature-actions">
              {hasValidCurrentUserDraft && !isContractFinalized && (
                <button className="btn-secondary" onClick={handleEditDraft} disabled={signingInProgress}>
                  <PenTool size={16} /> Edit temporary signature
                </button>
              )}
              {isContractFinalized && (
                <button className="btn-secondary" onClick={() => void pdf.download()} disabled={signingInProgress || pdf.isPreparing}>
                  <Download size={16} /> {pdf.isPreparing ? 'Preparing PDF…' : 'Download signed PDF'}
                </button>
              )}
              <button className="btn-primary btn-large" onClick={handleCompleteNavigation}>
                {contract.status === ContractStatus.Active ? t('contracts.openWorkspace') : t('contracts.viewContractDetails')} <FileText size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
