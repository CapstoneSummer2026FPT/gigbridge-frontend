import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
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
import { profileGetAPI } from '../../../api/profileAPI';
import type { ContractDto, Milestone } from '../../../types/models/Contract';
import type { ESignDocumentStatusDto } from '../../../types/models/ESign';
import { ContractStatus } from '../../../types/models/Contract';
import { ESignDocumentStatus, SignatureStatus } from '../../../types/models/ESign';
import { UserRole } from '../../../types/models/User';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { formatGigCoinNumber, formatGigCoinToVnd } from '../../../shared/utils/gigcoin';
import { getContractStatusLabel } from '../../../shared/utils/contractUtils';
import { useTranslation } from '../../../hooks/useTranslation';
import { useESignPdf } from '../hooks/useESignPdf';
import { useContractReadyForEscrowEvent } from '../hooks/useContractReadyForEscrowEvent';
import { useESignDocumentRevisionEvent } from '../hooks/useESignDocumentRevisionEvent';
import { ContractPdfViewer } from '../components/ContractPdfViewer';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { IdentityEmailVerification } from '../../../shared/components/IdentityEmailVerification';
import '../styles/signature-workflow-screen.css';

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

const getStatusFromResponse = (data: unknown): ContractStatus | undefined => {
  const response = data as SignContractResponse | undefined;
  const status = response?.status ?? response?.Status ?? response?.contractStatus ?? response?.ContractStatus;
  return typeof status === 'number' ? status : undefined;
};

const getDocumentIdFromResponse = (data: unknown): string | undefined => {
  const response = data as SignContractResponse | undefined;
  return response?.documentId ?? response?.DocumentId;
};

const getCanvasPoint = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * canvas.width,
    y: ((clientY - rect.top) / rect.height) * canvas.height,
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
  const [document, setDocument] = useState<ESignDocumentStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documentWarning, setDocumentWarning] = useState('');
  const [signatureStep, setSignatureStep] = useState<SignatureStep>('review');
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureDrawn, setSignatureDrawn] = useState(false);
  const [identityOrTaxCode, setIdentityOrTaxCode] = useState('');
  const [profileIdentityCode, setProfileIdentityCode] = useState<string | null>(null);
  const [identityVerificationTicket, setIdentityVerificationTicket] = useState<string | null>(null);
  const [identityTouched, setIdentityTouched] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [signaturePreviewPdf, setSignaturePreviewPdf] = useState<Blob | null>(null);
  const [signaturePreviewApplied, setSignaturePreviewApplied] = useState(false);
  const [signaturePreviewError, setSignaturePreviewError] = useState('');
  const [isApplyingSignature, setIsApplyingSignature] = useState(false);
  const [signingInProgress, setSigningInProgress] = useState(false);
  const submittingRef = useRef(false);
  const pdf = useESignPdf(document);

  const formatDate = useCallback((value?: string | null): string => {
    if (!value) return t('contracts.notSet');
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? t('contracts.notSet') : date.toLocaleDateString();
  }, [t]);

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
      const docResponse = await esignGetAPI.getDocumentStatusByContract(targetContractId);
      if (docResponse.success && docResponse.data) {
        setDocument(docResponse.data);
        setDocumentWarning('');
      } else {
        setDocument(null);
        setDocumentWarning(docResponse.message || 'contracts.pdfWillGenerated');
      }
    } catch {
      setDocument(null);
      setDocumentWarning('contracts.pdfWillGenerated');
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
    const fetchContractDetails = async () => {
      if (!contractId) {
        setError('contracts.invalidContract');
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

        try {
          const profileResponse = await profileGetAPI.getMyUserProfile();
          const savedIdentityCode = profileResponse.success && profileResponse.data
            ? normalizeIdentityCode(profileResponse.data.identityOrTaxCode ?? '')
            : '';
          setProfileIdentityCode(isValidIdentityCode(savedIdentityCode) ? savedIdentityCode : null);
        } catch (profileError) {
          console.warn('Could not load the saved identity number; allowing manual entry.', profileError);
          setProfileIdentityCode(null);
        }

        await loadDocument(contractId);

        const isUserParticipant =
          user?.id === contractData.clientUserId || user?.id === contractData.freelancerUserId;

        if (!isUserParticipant) {
          setError('contracts.noPermissionResource');
        }
      } catch (err: unknown) {
        console.error('Error loading contract:', err);
        setError('contracts.unableToLoadContract');
      } finally {
        setLoading(false);
      }
    };

    void fetchContractDetails();
  }, [contractId, loadDocument, user?.id]);

  useEffect(() => {
    if (document) {
      setIdentityOrTaxCode(
        profileIdentityCode ?? currentUserSignature?.identityOrTaxCode ?? '',
      );
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
  }, [
    currentUserDraft,
    currentUserSignature,
    document,
    hasFinalSignature,
    isContractFinalized,
    profileIdentityCode,
  ]);

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

  const startDrawing = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const point = getCanvasPoint(canvas, clientX, clientY);
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const drawPoint = (clientX: number, clientY: number) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const point = getCanvasPoint(canvas, clientX, clientY);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    setSignatureDrawn(true);
    setSignaturePreviewApplied(false);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    startDrawing(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    drawPoint(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      startDrawing(touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      drawPoint(touch.clientX, touch.clientY);
    }
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
      setSignaturePreviewError(t('contracts.errors.identityCodeLength'));
      return;
    }

    if (!profileIdentityCode && !identityVerificationTicket) {
      setError(t('contracts.errors.identityCodeLength'));
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
        identityOrTaxCode,
      );

      if (!response.success || !response.data) {
        setSignaturePreviewError(response.message || t('contracts.pdfPreviewError'));
        return;
      }

      setSignaturePreviewPdf(response.data);
      setSignaturePreviewApplied(true);
    } catch (previewError) {
      console.error('Failed to generate signature preview PDF:', previewError);
      setSignaturePreviewError(t('contracts.pdfPreviewError'));
    } finally {
      setIsApplyingSignature(false);
    }
  };

  const handleEditDraft = () => {
    setSignatureStep('capture');
  };

  const refreshAfterSigning = useCallback(async (fallbackStatus?: ContractStatus): Promise<ContractStatus | undefined> => {
    if (!contractId) return fallbackStatus;

    await loadDocument(contractId);

    const refreshedContract = await contractGetAPI.getContractById(contractId);
    let nextStatus = fallbackStatus;

    if (refreshedContract.success && refreshedContract.data) {
      setContract(refreshedContract.data);
      nextStatus = refreshedContract.data.status;
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

  const handleDocumentChangedDuringSigning = useCallback((): void => {
    if (signatureStep !== 'complete') return;
    if (isWaitingForCounterpart) {
      void refreshWorkflow();
    } else if (hasValidCurrentUserDraft && contract?.status === ContractStatus.PendingSignature) {
      void refreshAfterSigning();
    }
  }, [
    contract?.status,
    hasValidCurrentUserDraft,
    isWaitingForCounterpart,
    refreshAfterSigning,
    refreshWorkflow,
    signatureStep,
  ]);

  useESignDocumentRevisionEvent(
    contractId,
    signatureStep === 'complete' &&
      (isWaitingForCounterpart ||
        (hasValidCurrentUserDraft && contract?.status === ContractStatus.PendingSignature)),
    handleDocumentChangedDuringSigning,
  );

  const handleSubmitSignature = async () => {
    if (!contract || !hasSignatureForDraft) return;
    if (submittingRef.current || signingInProgress) return;

    if (!signatureDrawn && !existingDraftImageUrl) {
      setError(t('contracts.errors.drawSignatureFirst'));
      return;
    }

    if (!identityCodeIsValid) {
      setIdentityTouched(true);
      setError(t('contracts.errors.identityCodeLength'));
      return;
    }

    if (!policyAccepted) {
      setError(t('contracts.errors.acceptPolicyFirst'));
      return;
    }

    try {
      const canvas = canvasRef.current;
      if (signatureDrawn && !canvas) {
        setError(t('contracts.errors.canvasNotAvailable'));
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
        identityVerificationTicket,
        policyAccepted: true,
        policyVersion: POLICY_VERSION,
      });

      if (!response.success) {
        if (response.statusCode === 409) {
          setSignatureStep('complete');
          setSuccess(t('contracts.contractAlreadyFinalized'));
          await refreshAfterSigning();
          return;
        }
        setError(response.message || t('contracts.failedToSign'));
        return;
      }

      setProfileIdentityCode(normalizedIdentityCode);
      setIdentityVerificationTicket(null);

      const documentId = getDocumentIdFromResponse(response.data);
      setSignatureStep('complete');
      setSuccess(t('contracts.temporarySignatureSaved'));
      if (documentId) {
        await loadDocument(contract.contractsId);
      }

      const finalStatus = await refreshAfterSigning(getStatusFromResponse(response.data));
      if (finalStatus === ContractStatus.PendingEscrow) {
        setSuccess(isClient ? t('contracts.clientSignedFundEscrow') : t('contracts.freelancerSignedWaitEscrow'));
        return;
      }

      if (finalStatus === ContractStatus.Active) {
        setSuccess(t('contracts.contractActiveOpeningWorkspace'));
        window.setTimeout(() => navigate(`/workspace/${contract.contractsId}`), 1200);
        return;
      }

      setSuccess(t('contracts.temporarySignatureCanUpdate'));
    } catch (err) {
      console.error('Failed to submit signature:', err);
      setError(t('contracts.failedToSign'));
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
        <div style={{ display: 'flex', minHeight: '70vh', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
          <LemniscateBloomLoader label={t('contracts.loadingContract')} size={56} />
        </div>
      </AppLayout>
    );
  }

  if (!contract) {
    return (
      <AppLayout fullWidth>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '70vh', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', gap: '1rem' }}>
          <ShieldAlert className="text-rose-500" size={44} />
          <h2 className="text-xl font-extrabold text-text-primary">{error || t('contracts.contractNotFound')}</h2>
          <button
            type="button"
            onClick={() => navigate('/contracts')}
            className="sw-btn-primary"
          >
            {t('contracts.backToContracts')}
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout fullWidth>
      <div className="sw-container">

        {/* Top Header Card */}
        <div className="sw-header-card">
          <div className="sw-header-accent-bar" />

          <div className="sw-header-content">
            <button
              type="button"
              onClick={() => navigate(`/contracts/${contract.contractsId}`)}
              className="sw-header-back-btn"
            >
              <ArrowLeft size={14} /> {t('contracts.back')}
            </button>
            <div className="sw-header-badge">
              <Sparkles size={13} />
              <span>{t('contracts.esignContract')}</span>
            </div>
            <h1 className="sw-header-title" title={contract.jobTitle || contract.title}>
              {contract.jobTitle || contract.title}
            </h1>
            <p className="sw-header-subtitle">
              {t('contracts.esignSubtitle')}
            </p>
          </div>

          {/* Stepper Card */}
          <div className="sw-stepper-container">
            <div className={`sw-step-item ${signatureStep === 'review' ? 'active' : ''}`}>
              <span className="sw-step-badge">1</span>
              <span>{t('contracts.reviewProposal')}</span>
            </div>

            <ChevronRight size={13} className="sw-step-arrow" />

            <div className={`sw-step-item ${signatureStep === 'capture' ? 'active' : ''}`}>
              <span className="sw-step-badge">2</span>
              <span>{t('contracts.proceedToSign')}</span>
            </div>

            <ChevronRight size={13} className="sw-step-arrow" />

            <div className={`sw-step-item ${signatureStep === 'complete' ? 'active' : ''}`}>
              <span className="sw-step-badge">3</span>
              <span>{hasValidCurrentUserDraft && !isContractFinalized ? t('contracts.waitingConfirmation') : t('contracts.completed')}</span>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="sw-alert sw-alert-error">
            <div className="sw-alert-content">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="sw-alert-close-btn">
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="sw-alert sw-alert-success">
            <div className="sw-alert-content">
              <CheckCircle2 size={18} />
              <span>{t(success, { defaultValue: success })}</span>
            </div>
            <button type="button" onClick={() => setSuccess('')} className="sw-alert-close-btn">
              <X size={16} />
            </button>
          </div>
        )}

        {documentWarning && (
          <div className="sw-alert sw-alert-warning">
            <div className="sw-alert-content">
              <Clock size={18} />
              <span>{t(documentWarning, { defaultValue: documentWarning })}</span>
            </div>
          </div>
        )}

        {/* STEP 1: REVIEW PROPOSAL / SCOPE */}
        {signatureStep === 'review' && (
          <div className="sw-container" style={{ padding: 0, minHeight: 'auto' }}>

            {/* Alert Notification Banner */}
            <div className="sw-review-banner">
              <div className="sw-review-banner-icon">
                <Clock size={18} />
              </div>
              <div>
                <h4 className="sw-review-banner-title">{t('contracts.reviewBeforeSigning')}</h4>
                <p className="sw-review-banner-desc">{t('contracts.reviewBeforeSigningDesc')}</p>
              </div>
            </div>

            <div className="sw-review-grid">

              {/* Left Bento: Project Scope & Milestones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Scope of Work */}
                <div className="sw-card">
                  <div className="sw-card-header">
                    <h3 className="sw-card-title">
                      <FileText size={15} className="text-brand" />
                      <span>{t('contracts.scope')}</span>
                    </h3>
                  </div>
                  <div className="sw-scope-box">
                    {contract.jobDescription || contract.description || t('contracts.noDescription')}
                  </div>
                </div>

                {/* Milestones Schedule */}
                <div className="sw-card">
                  <div className="sw-card-header" style={{ flexWrap: 'wrap' }}>
                    <h3 className="sw-card-title">
                      <Layers size={15} className="text-brand" />
                      <span>{t('contracts.milestones')} ({milestones.length})</span>
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 900, color: 'var(--brand, #494be7)', fontSize: '0.875rem' }}>
                        <GCoinIcon size={16} />
                        <span>{formatGigCoinNumber(milestonesTotal)} G-coin</span>
                      </div>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        ≈ {formatGigCoinToVnd(milestonesTotal)}
                      </span>
                    </div>
                  </div>

                  {milestones.length > 0 ? (
                    <div className="sw-milestone-list">
                      {milestones.map((m, idx) => (
                        <div key={m.id || idx} className="sw-milestone-card">
                          <div>
                            <h4 className="sw-milestone-title">#{idx + 1}. {m.title}</h4>
                            <span className="sw-milestone-due">{t('contracts.duePrefix')}: {formatDate(m.due_date)}</span>
                          </div>
                          <div className="sw-milestone-amount-wrap">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 900, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                              <GCoinIcon size={14} />
                              <span>{formatGigCoinNumber(m.amount)} G-coin</span>
                            </div>
                            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                              ≈ {formatGigCoinToVnd(m.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                      {t('contracts.noMilestonesPlanned')}
                    </p>
                  )}
                </div>

              </div>

              {/* Right Bento: Summary & Parties */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Key Metrics */}
                <div className="sw-card">
                  <div className="sw-card-header">
                    <h3 className="sw-card-title">
                      {t('contracts.contractSummary')}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="sw-summary-row">
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{t('contracts.budget')}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 900, color: 'var(--brand, #494be7)', fontSize: '0.8125rem' }}>
                          <GCoinIcon size={14} />
                          <span>{formatGigCoinNumber(contract.totalBudget)} G-coin</span>
                        </div>
                        <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          ≈ {formatGigCoinToVnd(contract.totalBudget)}
                        </span>
                      </div>
                    </div>

                    <div className="sw-summary-row">
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{t('contracts.startDate')}</span>
                      <span style={{ fontWeight: 800 }}>{formatDate(contract.startDate)}</span>
                    </div>

                    <div className="sw-summary-row">
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{t('contracts.endDate')}</span>
                      <span style={{ fontWeight: 800 }}>{formatDate(contract.endDate)}</span>
                    </div>
                  </div>
                </div>

                {/* Parties Involved */}
                <div className="sw-card">
                  <div className="sw-card-header">
                    <h3 className="sw-card-title">
                      {t('contracts.parties')}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="sw-party-card">
                      <div>
                        <span style={{ fontSize: '0.625rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>{t('contracts.client')}</span>
                        <UserProfileLink userId={contract.clientUserId} role="client">
                          <span style={{ fontWeight: 900, fontSize: '0.75rem', color: 'var(--text-primary)' }}>{contract.clientName || contract.clientEmail || t('contracts.client')}</span>
                        </UserProfileLink>
                      </div>
                    </div>

                    <div className="sw-party-card">
                      <div>
                        <span style={{ fontSize: '0.625rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>{t('contracts.freelancer')}</span>
                        <UserProfileLink userId={contract.freelancerUserId} role="freelancer">
                          <span style={{ fontWeight: 900, fontSize: '0.75rem', color: 'var(--text-primary)' }}>{contract.freelancerName || contract.freelancerEmail || t('contracts.freelancer')}</span>
                        </UserProfileLink>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proceed Button */}
                <div>
                  <button
                    type="button"
                    onClick={() => setSignatureStep(hasSigned ? 'complete' : 'capture')}
                    disabled={Boolean(error) && !hasSigned}
                    className="sw-btn-primary"
                    style={{ width: '100%', padding: '1rem' }}
                  >
                    <span>{hasSigned ? t('contracts.viewStatus') : t('contracts.proceedToSign')}</span>
                    <PenTool size={16} />
                  </button>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* STEP 2: CAPTURE SIGNATURE */}
        {signatureStep === 'capture' && (
          <div className="sw-capture-grid">

            {/* Left Col: PDF Document Viewer */}
            <div className="sw-card">
              <div className="sw-card-header">
                <h2 className="sw-card-title">
                  <FileText size={15} className="text-brand" />
                  <span>{t('contracts.reviewPdfWhileSigning')}</span>
                </h2>
                {signaturePreviewApplied && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.625rem', fontWeight: 900, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <CheckCircle2 size={12} /> {t('contracts.signatureApplied')}
                  </span>
                )}
              </div>

              {document ? (
                <div className="sw-pdf-viewer-wrap">
                  <ContractPdfViewer
                    document={document}
                    title={t('contracts.generatedContractDoc')}
                    sourceBlob={signaturePreviewPdf ?? undefined}
                    hideHeaderToolbar={Boolean(signaturePreviewPdf)}
                  />
                </div>
              ) : (
                <div style={{ padding: '2rem', borderRadius: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#d97706', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>
                  {documentWarning || t('contracts.pdfPreviewError')}
                </div>
              )}
            </div>

            {/* Right Col: Signature Canvas & Identity Verification */}
            <div className="sw-card">
              <div className="sw-card-header">
                <h2 className="sw-card-title-lg">
                  <PenTool size={18} className="text-brand" />
                  <span>{t('contracts.drawYourSignature')}</span>
                </h2>
              </div>

              {/* Identity Code Input */}
              <div className="sw-form-group">
                <label htmlFor="signature-identity-code" className="sw-form-label">
                  {t('contracts.identityCodeLabel')}
                </label>
                <input
                  id="signature-identity-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={16}
                  value={identityOrTaxCode}
                  readOnly={Boolean(profileIdentityCode)}
                  onBlur={() => setIdentityTouched(true)}
                  onChange={event => {
                    setIdentityOrTaxCode(event.target.value);
                    setIdentityVerificationTicket(null);
                    setSignaturePreviewApplied(false);
                    setSignaturePreviewPdf(null);
                  }}
                  className="sw-form-input"
                  placeholder={t('contracts.identityCodePlaceholder')}
                />
                <p className={`sw-form-hint ${identityTouched && !identityCodeIsValid ? 'error' : ''}`}>
                  {identityTouched && !identityCodeIsValid
                    ? t('contracts.identityCodeInvalid')
                    : profileIdentityCode
                      ? t('contracts.identityCodeSavedHelp')
                      : t('contracts.identityCodeHelp')}
                </p>

                {!profileIdentityCode && (
                  <IdentityEmailVerification
                    email={user?.email ?? ''}
                    identityCode={identityOrTaxCode}
                    verificationTicket={identityVerificationTicket}
                    onVerified={setIdentityVerificationTicket}
                  />
                )}
              </div>

              {/* Existing Draft Preview */}
              {existingDraftImageUrl && (
                <div className="sw-temp-sig-box">
                  <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{t('contracts.currentTempSignature')}</span>
                  <div className="sw-temp-sig-img-container">
                    <img src={existingDraftImageUrl} alt="Current temporary signature" style={{ maxHeight: '4rem', objectFit: 'contain' }} />
                  </div>
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', margin: 0 }}>{t('contracts.redrawToChange')}</p>
                </div>
              )}

              {/* Signature Canvas Pad */}
              <div className="sw-form-group">
                <span className="sw-form-label">
                  {t('contracts.drawYourSignature')}
                </span>
                <div className="sw-canvas-container">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={180}
                    className="sw-canvas-el"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleMouseUp}
                  />
                </div>
                <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textAlign: 'center', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
                  {t('contracts.signatureInstructions')}
                </p>
              </div>

              {/* Canvas Buttons */}
              <div className="sw-canvas-actions">
                <button
                  type="button"
                  onClick={() => void handleApplySignaturePreview()}
                  disabled={!hasSignatureForDraft || !identityCodeIsValid || isApplyingSignature}
                  className="sw-btn-brand-subtle"
                >
                  {isApplyingSignature ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{isApplyingSignature ? t('contracts.applyingSignature') : t('contracts.applySignatureToPdf')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearSignature}
                  className="sw-btn-secondary"
                >
                  {existingDraftImageUrl ? t('contracts.clearNewDrawing') : t('contracts.clearSignature')}
                </button>
              </div>

              {counterpartHasValidDraft && (
                <div className="sw-counterpart-notice">
                  {t('contracts.counterpartSignedNotice')}
                </div>
              )}

              {signaturePreviewError && (
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e11d48', margin: 0 }}>{signaturePreviewError}</p>
              )}

              {/* Policy Consent */}
              <div className="sw-policy-consent-box">
                <label className="sw-policy-label">
                  <input
                    id="signature-policy-consent"
                    type="checkbox"
                    checked={policyAccepted}
                    onChange={event => setPolicyAccepted(event.target.checked)}
                    className="sw-policy-checkbox"
                  />
                  <span>
                    {t('contracts.policyAgreeText')}{' '}
                    <a href="/policies" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand, #494be7)', textDecoration: 'underline' }}>
                      {t('contracts.policyTitle')}{POLICY_VERSION}
                    </a>
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="sw-submit-actions-row">
                <button
                  type="button"
                  onClick={() => setSignatureStep('review')}
                  className="sw-btn-secondary"
                >
                  {t('contracts.backToReview')}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitSignature}
                  disabled={
                    (!signatureDrawn && !existingDraftImageUrl) ||
                    !identityCodeIsValid ||
                    (!profileIdentityCode && !identityVerificationTicket) ||
                    !policyAccepted ||
                    signingInProgress
                  }
                  className="sw-btn-primary"
                  style={{ flex: 1 }}
                >
                  {signingInProgress ? (
                    <>
                      <Loader size={15} className="animate-spin" />
                      <span>{t('contracts.signing')}</span>
                    </>
                  ) : (
                    <>
                      <PenTool size={15} />
                      <span>
                        {counterpartHasValidDraft
                          ? t('contracts.submitAndFinalize')
                          : currentUserDraft
                            ? t('contracts.updateSignature')
                            : t('contracts.proceedToSign')}
                      </span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        )}

        {/* STEP 3: COMPLETE / CONFIRMATION */}
        {signatureStep === 'complete' && (
          <div className="sw-complete-wrapper">
            <div className="sw-complete-card">
              <div className="sw-complete-icon-circle">
                <CheckCircle2 size={40} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.025em' }}>
                  {hasRecordedSignature ? t('contracts.signatureRecorded') : t('contracts.status')}
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600, maxWidth: '32rem', margin: '0 auto', lineHeight: 1.5 }}>
                  {contract.status === ContractStatus.PendingEscrow
                    ? isClient
                      ? t('contracts.bothSignedEscrow')
                      : t('contracts.bothSignedWaitEscrow')
                    : contract.status === ContractStatus.Active
                      ? t('contracts.contractActiveWorkspace')
                      : t('contracts.signatureSavedWaitOther')}
                </p>
              </div>

              {hasValidCurrentUserDraft && !isContractFinalized && (
                <div className="sw-temp-sig-box" style={{ maxWidth: '28rem', width: '100%', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, textAlign: 'center', display: 'block' }}>{t('contracts.savedTemporarySignature')}</span>
                  {existingDraftImageUrl && (
                    <div className="sw-temp-sig-img-container">
                      <img src={existingDraftImageUrl} alt="Saved temporary signature" style={{ maxHeight: '4rem', objectFit: 'contain' }} />
                    </div>
                  )}
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', margin: 0 }}>
                    {t('contracts.identityNumberLabel')}: {identityOrTaxCode}
                  </p>
                </div>
              )}

              {/* Summary Pills Grid */}
              <div className="sw-summary-pills-grid">
                <div className="sw-summary-pill">
                  <span style={{ fontSize: '0.625rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t('contracts.document')}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '100%' }} title={contract.jobTitle || contract.title}>
                    {contract.jobTitle || contract.title}
                  </span>
                </div>

                <div className="sw-summary-pill">
                  <span style={{ fontSize: '0.625rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t('contracts.status')}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand, #494be7)' }}>
                    {t('contracts.statusLabels.' + contract.status, { defaultValue: getContractStatusLabel(contract.status) })}
                  </span>
                </div>

                <div className="sw-summary-pill">
                  <span style={{ fontSize: '0.625rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t('contracts.nextStep')}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                    {contract.status === ContractStatus.PendingEscrow && isClient
                      ? t('contracts.fundEscrow')
                      : contract.status === ContractStatus.Active
                        ? t('contracts.openWorkspace')
                        : t('contracts.waitForCounterpart')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="sw-complete-actions">
                {hasValidCurrentUserDraft && !isContractFinalized && (
                  <button
                    type="button"
                    onClick={handleEditDraft}
                    disabled={signingInProgress}
                    className="sw-btn-secondary"
                  >
                    <PenTool size={15} /> {t('contracts.editTempSignature')}
                  </button>
                )}

                {isContractFinalized && (
                  <button
                    type="button"
                    onClick={() => void pdf.download()}
                    disabled={signingInProgress || pdf.isPreparing}
                    className="sw-btn-secondary"
                  >
                    <Download size={15} /> {pdf.isPreparing ? t('contracts.preparingPdf') : t('contracts.downloadSignedPdf')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCompleteNavigation}
                  className="sw-btn-primary"
                >
                  <span>{contract.status === ContractStatus.Active ? t('contracts.openWorkspace') : t('contracts.viewContractDetails')}</span>
                  <FileText size={15} />
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}