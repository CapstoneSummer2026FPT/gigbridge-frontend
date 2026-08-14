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
import type { ESignDocumentDto } from '../../../types/models/ESign';
import { ContractStatus } from '../../../types/models/Contract';
import { ESignDocumentStatus, SignatureStatus } from '../../../types/models/ESign';
import { UserRole } from '../../../types/models/User';
import '../styles/signature-workflow-screen.css';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { useTranslation } from '../../../hooks/useTranslation';
import { useESignPdf } from '../hooks/useESignPdf';
import { useContractReadyForEscrowEvent } from '../hooks/useContractReadyForEscrowEvent';
import { ContractPdfViewer } from '../components/ContractPdfViewer';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { IdentityEmailVerification } from '../../../shared/components/IdentityEmailVerification';

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

    if (!profileIdentityCode && !identityVerificationTicket) {
      setError(t('settings:identityVerificationRequired'));
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
        identityVerificationTicket,
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

      setProfileIdentityCode(normalizedIdentityCode);
      setIdentityVerificationTicket(null);

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
    <AppLayout fullWidth>
      <div className="min-h-[calc(100vh-4rem)] bg-background text-text-primary py-8 px-4 lg:px-8 max-w-[1600px] mx-auto space-y-6">

        {/* Top Bento Header Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[var(--brand)]/10 blur-3xl pointer-events-none" />

          <div className="space-y-2 relative z-10">
            <button
              type="button"
              onClick={() => navigate(`/contracts/${contract.contractsId}`)}
              className="inline-flex items-center gap-2 text-xs font-extrabold text-[var(--brand)] hover:underline cursor-pointer transition mb-1"
            >
              <ArrowLeft size={14} /> {t('contracts.back')}
            </button>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[var(--brand)]">
              <Sparkles size={13} />
              <span>{t('contracts.esignContract')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {contract.jobTitle || contract.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-semibold max-w-2xl leading-relaxed">
              {t('contracts.esignSubtitle')}
            </p>
          </div>

          {/* Stepper Card */}
          <div className="flex items-center gap-1.5 sm:gap-2 p-2 rounded-2xl bg-muted/40 border border-border/60 shrink-0 self-start md:self-auto relative z-10 overflow-x-auto">
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              signatureStep === 'review'
                ? 'bg-[var(--brand)] text-white shadow-md shadow-[var(--brand)]/20'
                : 'text-muted-foreground'
            }`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
              <span>{t('contracts.reviewProposal')}</span>
            </div>

            <ChevronRight size={13} className="text-muted-foreground shrink-0" />

            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              signatureStep === 'capture'
                ? 'bg-[var(--brand)] text-white shadow-md shadow-[var(--brand)]/20'
                : 'text-muted-foreground'
            }`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
              <span>{t('contracts.proceedToSign')}</span>
            </div>

            <ChevronRight size={13} className="text-muted-foreground shrink-0" />

            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              signatureStep === 'complete'
                ? 'bg-[var(--brand)] text-white shadow-md shadow-[var(--brand)]/20'
                : 'text-muted-foreground'
            }`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
              <span>{hasValidCurrentUserDraft && !isContractFinalized ? 'Waiting' : t('contracts.completed')}</span>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-600 text-white text-xs font-black shadow-md">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="hover:opacity-80 cursor-pointer">
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-600 text-white text-xs font-black shadow-md">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{t(success, { defaultValue: success })}</span>
            </div>
            <button type="button" onClick={() => setSuccess('')} className="hover:opacity-80 cursor-pointer">
              <X size={16} />
            </button>
          </div>
        )}

        {documentWarning && (
          <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-amber-500 text-white text-xs font-black shadow-md">
            <Clock size={18} className="shrink-0 text-white" />
            <span>{t(documentWarning, { defaultValue: documentWarning })}</span>
          </div>
        )}

        {/* STEP 1: REVIEW PROPOSAL / SCOPE */}
        {signatureStep === 'review' && (
          <div className="space-y-6">

            {/* Alert Notification Card */}
            <div className="p-5 rounded-2xl bg-[var(--brand)] text-white flex items-start gap-3.5 text-xs font-semibold shadow-md">
              <Clock size={20} className="shrink-0 text-white mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-extrabold text-white text-sm">{t('contracts.reviewBeforeSigning')}</h4>
                <p className="text-white/90 leading-relaxed">{t('contracts.reviewBeforeSigningDesc')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* Left Bento: Project Scope & Milestones (col-span-8) */}
              <div className="lg:col-span-8 space-y-6">

                {/* Bento Card: Scope of Work */}
                <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-lg space-y-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    <FileText size={15} className="text-brand" />
                    <span>{t('contracts.scope')}</span>
                  </div>
                  <div className="p-4.5 rounded-2xl border border-border bg-muted/20 text-xs leading-relaxed font-semibold text-foreground whitespace-pre-line shadow-inner">
                    {contract.jobDescription || contract.description || t('contracts.noDescription')}
                  </div>
                </div>

                {/* Bento Card: Milestones Schedule */}
                <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                      <Layers size={15} className="text-brand" />
                      <span>{t('contracts.milestones')} ({milestones.length})</span>
                    </div>
                    <span className="text-sm font-black text-brand">{formatMoney(milestonesTotal)}</span>
                  </div>

                  {milestones.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {milestones.map((m, idx) => (
                        <div key={m.id || idx} className="p-4 rounded-2xl border border-border/70 bg-background hover:border-brand/30 transition-all flex items-center justify-between gap-4 text-xs shadow-xs">
                          <div className="space-y-1 min-w-0">
                            <span className="font-extrabold text-foreground block truncate">#{idx + 1}. {m.title}</span>
                            <span className="text-[10px] text-muted-foreground font-semibold block">{t('contracts.duePrefix')}: {formatDate(m.due_date)}</span>
                          </div>
                          <span className="font-black text-brand shrink-0 text-sm">{formatMoney(m.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground font-semibold p-4 rounded-2xl border border-border bg-muted/20 text-center">
                      {t('contracts.noMilestonesPlanned')}
                    </p>
                  )}
                </div>

              </div>

              {/* Right Bento: Key Metrics & Parties Overview (col-span-4) */}
              <div className="lg:col-span-4 space-y-6">

                {/* Key Contract Metrics Card */}
                <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-lg space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border pb-3">
                    {t('contracts.contractSummary')}
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/50 text-xs">
                      <span className="text-muted-foreground font-bold">{t('contracts.budget')}</span>
                      <span className="font-black text-foreground text-sm">{formatMoney(contract.totalBudget)}</span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/50 text-xs">
                      <span className="text-muted-foreground font-bold">{t('contracts.startDate')}</span>
                      <span className="font-extrabold text-foreground">{formatDate(contract.startDate)}</span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/50 text-xs">
                      <span className="text-muted-foreground font-bold">{t('contracts.endDate')}</span>
                      <span className="font-extrabold text-foreground">{formatDate(contract.endDate)}</span>
                    </div>
                  </div>
                </div>

                {/* Parties Involved Card */}
                <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-lg space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border pb-3">
                    {t('contracts.parties')}
                  </h3>

                  <div className="space-y-3 text-xs">
                    {/* Client */}
                    <div className="p-3.5 rounded-2xl bg-background border border-border/70 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase text-muted-foreground block">{t('contracts.client')}</span>
                        <UserProfileLink userId={contract.clientUserId} role="client">
                          <span className="font-black text-foreground truncate hover:text-brand transition">{contract.clientName || contract.clientEmail || t('contracts.client')}</span>
                        </UserProfileLink>
                      </div>
                    </div>

                    {/* Freelancer */}
                    <div className="p-3.5 rounded-2xl bg-background border border-border/70 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase text-muted-foreground block">{t('contracts.freelancer')}</span>
                        <UserProfileLink userId={contract.freelancerUserId} role="freelancer">
                          <span className="font-black text-foreground truncate hover:text-brand transition">{contract.freelancerName || contract.freelancerEmail || t('contracts.freelancer')}</span>
                        </UserProfileLink>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proceed Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSignatureStep(hasSigned ? 'complete' : 'capture')}
                    disabled={Boolean(error) && !hasSigned}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#3f41d0] via-[var(--brand,#494be7)] to-[#6366f1] hover:from-[#3436be] hover:to-[var(--brand,#494be7)] text-white font-black text-sm shadow-xl shadow-[var(--brand)]/25 transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 border-none"
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
          <div className="space-y-6">

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* Left Col: PDF Document Viewer Bento (col-span-7) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <FileText size={15} className="text-brand" /> {t('contracts.reviewPdfWhileSigning')}
                    </h2>
                    {signaturePreviewApplied && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                        <CheckCircle2 size={13} /> {t('contracts.signatureApplied')}
                      </span>
                    )}
                  </div>

                  {document ? (
                    <div className="rounded-2xl border border-border bg-background p-2 shadow-inner min-h-[500px]">
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
              </div>

              {/* Right Col: Signature Canvas & Identity Verification (col-span-5) */}
              <div className="lg:col-span-5 space-y-6">

                <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-lg space-y-5">
                  <h2 className="text-base font-black text-foreground tracking-tight border-b border-border pb-3 flex items-center gap-2">
                    <PenTool size={18} className="text-brand" />
                    <span>{t('contracts.drawYourSignature')}</span>
                  </h2>

                  {/* Identity Code Input */}
                  <div className="space-y-2">
                    <label htmlFor="signature-identity-code" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)] outline-none transition shadow-xs"
                      placeholder={t('contracts.identityCodePlaceholder')}
                    />
                    <p className={`text-[11px] font-semibold ${identityTouched && !identityCodeIsValid ? 'text-rose-500' : 'text-muted-foreground'}`}>
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

                  {/* Existing Temporary Signature Draft */}
                  {existingDraftImageUrl && (
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2">
                      <span className="text-xs font-bold text-foreground block">Mẫu chữ ký tạm thời hiện tại</span>
                      <div className="p-3 bg-white rounded-xl border border-border flex items-center justify-center">
                        <img src={existingDraftImageUrl} alt="Current temporary signature" className="max-h-16 object-contain" />
                      </div>
                      <p className="text-[10px] font-medium text-muted-foreground">Vẽ lại bên dưới nếu bạn muốn thay đổi chữ ký này.</p>
                    </div>
                  )}

                  {/* Signature Canvas Pad */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Vẽ chữ ký của bạn
                    </span>
                    <div className="rounded-2xl border-2 border-dashed border-border bg-white p-2 relative shadow-inner overflow-hidden">
                      <canvas
                        ref={canvasRef}
                        width={500}
                        height={180}
                        className="w-full h-40 touch-none cursor-crosshair"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-semibold text-center">
                      {t('contracts.signatureInstructions')}
                    </p>
                  </div>

                  {/* Canvas Buttons */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => void handleApplySignaturePreview()}
                      disabled={!hasSignatureForDraft || !identityCodeIsValid || isApplyingSignature}
                      className="py-2.5 px-3 rounded-xl bg-brand/10 border border-brand/30 text-brand font-black text-xs hover:bg-brand/20 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      {isApplyingSignature ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      <span>{isApplyingSignature ? t('contracts.applyingSignature') : t('contracts.applySignatureToPdf')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearSignature}
                      className="py-2.5 px-3 rounded-xl border border-border bg-background text-text-primary font-extrabold text-xs hover:border-brand/40 transition cursor-pointer"
                    >
                      {existingDraftImageUrl ? 'Xóa nét vẽ mới' : t('contracts.clearSignature')}
                    </button>
                  </div>

                  {counterpartHasValidDraft && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs font-bold">
                      Đối tác đã hoàn tất chữ ký tạm thời. Việc nộp chữ ký này sẽ chốt và khóa hợp đồng chính thức.
                    </div>
                  )}

                  {signaturePreviewError && (
                    <p className="text-xs font-bold text-rose-500">{signaturePreviewError}</p>
                  )}

                  {/* Policy Consent */}
                  <div className="p-4 rounded-2xl border border-border bg-muted/30">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        id="signature-policy-consent"
                        type="checkbox"
                        checked={policyAccepted}
                        onChange={event => setPolicyAccepted(event.target.checked)}
                        className="mt-0.5 rounded border-border text-brand focus:ring-brand cursor-pointer"
                      />
                      <span className="text-xs font-bold text-foreground leading-snug">
                        Tôi đã đọc, hiểu và đồng ý với{' '}
                        <a href="/policies" target="_blank" rel="noopener noreferrer" className="text-brand underline hover:opacity-80">
                          Bộ chính sách GigBridge — {POLICY_VERSION}
                        </a>
                      </span>
                    </label>
                  </div>

                  {/* Submit Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSignatureStep('review')}
                      className="px-4 py-3 rounded-xl border border-border bg-background text-text-primary font-extrabold text-xs hover:border-brand/40 transition cursor-pointer shrink-0"
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
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#3f41d0] via-[var(--brand,#494be7)] to-[#6366f1] text-white font-black text-xs shadow-lg shadow-[var(--brand)]/25 hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border-none"
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
                              ? 'Gửi & Chốt hợp đồng'
                              : currentUserDraft
                                ? 'Cập nhật chữ ký'
                                : t('contracts.signContract')}
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* STEP 3: COMPLETE / CONFIRMATION */}
        {signatureStep === 'complete' && (
          <div className="max-w-3xl mx-auto space-y-6">

            <div className="p-8 rounded-3xl bg-card border border-border/80 shadow-2xl space-y-6 text-center relative overflow-hidden">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={44} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-foreground tracking-tight">
                  {hasRecordedSignature ? t('contracts.signatureRecorded') : t('contracts.status')}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground font-semibold max-w-lg mx-auto leading-relaxed">
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
                <div className="p-4 rounded-2xl bg-muted/40 border border-border text-left space-y-3 max-w-md mx-auto">
                  <span className="text-xs font-extrabold text-foreground block text-center">Chữ ký tạm thời đã lưu</span>
                  {existingDraftImageUrl && (
                    <div className="p-3 bg-white rounded-xl border border-border flex items-center justify-center">
                      <img src={existingDraftImageUrl} alt="Saved temporary signature" className="max-h-16 object-contain" />
                    </div>
                  )}
                  <p className="text-xs font-semibold text-foreground text-center">Số định danh: {identityOrTaxCode}</p>
                </div>
              )}

              {/* Contract Details Summary Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">{t('contracts.document')}</span>
                  <span className="text-xs font-extrabold text-foreground truncate block">{contract.jobTitle || contract.title}</span>
                </div>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">{t('contracts.status')}</span>
                  <span className="text-xs font-extrabold text-brand block">{t('contracts.statusLabels.' + contract.status, { defaultValue: String(contract.status) })}</span>
                </div>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">{t('contracts.nextStep')}</span>
                  <span className="text-xs font-extrabold text-foreground block">
                    {contract.status === ContractStatus.PendingEscrow && isClient
                      ? t('contracts.fundEscrow')
                      : contract.status === ContractStatus.Active
                        ? t('contracts.openWorkspace')
                        : t('contracts.waitForCounterpart')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-border">
                {hasValidCurrentUserDraft && !isContractFinalized && (
                  <button
                    type="button"
                    onClick={handleEditDraft}
                    disabled={signingInProgress}
                    className="px-5 py-3 rounded-xl border border-border bg-background text-text-primary font-extrabold text-xs hover:border-brand/40 transition cursor-pointer inline-flex items-center gap-2"
                  >
                    <PenTool size={15} /> Chỉnh sửa chữ ký tạm
                  </button>
                )}

                {isContractFinalized && (
                  <button
                    type="button"
                    onClick={() => void pdf.download()}
                    disabled={signingInProgress || pdf.isPreparing}
                    className="px-5 py-3 rounded-xl border border-border bg-background text-text-primary font-extrabold text-xs hover:border-brand/40 transition cursor-pointer inline-flex items-center gap-2"
                  >
                    <Download size={15} /> {pdf.isPreparing ? 'Đang chuẩn bị PDF…' : 'Tải PDF đã ký'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCompleteNavigation}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#3f41d0] via-[var(--brand,#494be7)] to-[#6366f1] text-white font-black text-xs shadow-lg shadow-[var(--brand)]/25 hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer border-none"
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
