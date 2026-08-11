import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Layers,
  Loader,
  Lock,
  PenTool,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  User,
  UserCheck,
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
import { SignatureStatus } from '../../../types/models/ESign';
import { UserRole } from '../../../types/models/User';
import '../styles/signature-workflow-screen.css';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { useTranslation } from '../../../hooks/useTranslation';
import { useESignPdf } from '../hooks/useESignPdf';
import { ContractPdfViewer } from '../components/ContractPdfViewer';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';

type SignatureStep = 'review' | 'capture' | 'complete';
const POLICY_VERSION = 'Ver 1.0 Gigbridge';

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
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [signaturePreviewPdf, setSignaturePreviewPdf] = useState<Blob | null>(null);
  const [preparedSignature, setPreparedSignature] = useState<PreparedSignatureImage | null>(null);
  const [signaturePreviewApplied, setSignaturePreviewApplied] = useState(false);
  const [signaturePreviewError, setSignaturePreviewError] = useState('');
  const [isApplyingSignature, setIsApplyingSignature] = useState(false);
  const [signingInProgress, setSigningInProgress] = useState(false);
  const submittingRef = useRef(false);
  const pdf = useESignPdf(document);

  const currentUserSignature = useMemo(
    () =>
      document?.signatures.find(
        signature => signature.userId === user?.id && signature.status === SignatureStatus.Signed
      ),
    [document?.signatures, user?.id]
  );

  const hasSigned = Boolean(currentUserSignature) || contract?.status === ContractStatus.PendingEscrow || contract?.status === ContractStatus.Active;
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
    if (!canvasRef.current || signatureStep !== 'capture') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [signatureStep]);

  useEffect(() => {
    if (hasSigned && signatureStep !== 'complete') {
      setSignatureStep('complete');
    }
  }, [hasSigned, signatureStep]);

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
    setSignatureDrawn(false);
    setPreparedSignature(null);
    setSignaturePreviewPdf(null);
    setSignaturePreviewApplied(false);
    setSignaturePreviewError('');
  };

  const handleApplySignaturePreview = async (): Promise<boolean> => {
    const canvas = canvasRef.current;
    if (!canvas || !signatureDrawn) return false;

    if (!document?.documentId) {
      setSignaturePreviewError(t('contracts.documentNotReadyPreview'));
      return false;
    }

    setIsApplyingSignature(true);
    setSignaturePreviewError('');

    try {
      const prepared = prepareSignatureImage(canvas);
      setPreparedSignature(prepared);

      const response = await esignPostAPI.previewDocumentPdf(
        document.documentId,
        prepared.imageUrl,
        prepared.width,
        prepared.height,
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || t('contracts.signaturePreviewFailed'));
      }

      setSignaturePreviewPdf(response.data);
      setSignaturePreviewApplied(true);
      return true;
    } catch (previewErr) {
      console.error('Failed to preview signature on PDF:', previewErr);
      setSignaturePreviewError(
        previewErr instanceof Error ? previewErr.message : t('contracts.failedApplySignaturePreview')
      );
      setSignaturePreviewApplied(false);
      return false;
    } finally {
      setIsApplyingSignature(false);
    }
  };

  const handleSubmitSignature = async () => {
    if (!contract || !signatureDrawn) return;
    if (submittingRef.current || signingInProgress) return;

    if (!policyAccepted) {
      setError(t('contracts.acceptPolicyToProceed'));
      return;
    }

    submittingRef.current = true;
    setSigningInProgress(true);
    setError('');

    try {
      let activePreparedSignature = preparedSignature;
      if (!signaturePreviewApplied || !activePreparedSignature) {
        const applied = await handleApplySignaturePreview();
        activePreparedSignature = preparedSignature;
        if (!applied || !activePreparedSignature) {
          submittingRef.current = false;
          setSigningInProgress(false);
          return;
        }
      }

      const signResponse = await contractPostAPI.sign(contract.contractsId, {
        signatureImageUrl: activePreparedSignature.imageUrl,
        signatureWidth: activePreparedSignature.width,
        signatureHeight: activePreparedSignature.height,
        policyAccepted: true,
        policyVersion: POLICY_VERSION,
      });

      if (!signResponse.success) {
        setError(signResponse.message || t('contracts.failedToSign'));
        return;
      }

      setSuccess(t('contracts.contractSignedSuccess'));

      const nextStatus = getStatusFromResponse(signResponse.data);
      if (nextStatus !== undefined) {
        setContract(prev => (prev ? { ...prev, status: nextStatus } : prev));
      }

      const returnedDocId = getDocumentIdFromResponse(signResponse.data) || document?.documentId;
      if (returnedDocId) {
        await loadDocument(contract.contractsId);
      }

      setSignatureStep('complete');
    } catch (err: unknown) {
      console.error('Error signing contract:', err);
      setError(t('contracts.errorSigning'));
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
      <div className="min-h-screen bg-background text-text-primary py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto space-y-6">
          
          {/* Professional Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <button
                type="button"
                onClick={() => navigate(`/contracts/${contract.contractsId}`)}
                className="inline-flex items-center gap-2 text-xs font-extrabold text-text-muted hover:text-brand transition mb-2 cursor-pointer"
              >
                <ArrowLeft size={16} /> {t('contracts.back')}
              </button>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
                {t('contracts.esignContract')}
              </h1>
              <p className="text-xs font-semibold text-text-muted mt-1">{t('contracts.esignSubtitle')}</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-border bg-surface-muted/50 px-3.5 py-1.5 text-xs font-mono font-bold text-text-primary">
                ID: {contract.contractsId}
              </span>
            </div>
          </div>

          {/* Alert Notifications */}
          {error && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-extrabold shadow-sm">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={18} className="shrink-0" />
                <span>{t(error, { defaultValue: error })}</span>
              </div>
              <button type="button" onClick={() => setError('')} className="hover:opacity-75 cursor-pointer">
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

          {/* Corporate Stepper Progress Bar */}
          <nav aria-label="Signature Progress" className="rounded-2xl border border-border bg-background p-2 shadow-sm">
            <div className="grid grid-cols-3 gap-2">
              
              {/* Step 1 Pill */}
              <button
                type="button"
                onClick={() => setSignatureStep('review')}
                className={`flex items-center gap-3 p-3 rounded-xl transition cursor-pointer text-left ${
                  signatureStep === 'review'
                    ? 'bg-brand text-white font-extrabold shadow-sm'
                    : 'bg-surface-muted/40 text-text-muted hover:text-text-primary'
                }`}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                  signatureStep === 'review' ? 'bg-white text-brand' : 'bg-border text-text-muted'
                }`}>1</span>
                <div className="min-w-0 hidden sm:block">
                  <p className="text-xs font-extrabold truncate">{t('contracts.reviewProposal')}</p>
                  <p className={`text-[10px] truncate ${signatureStep === 'review' ? 'text-white/80' : 'text-text-muted'}`}>Kiểm tra điều khoản</p>
                </div>
              </button>

              {/* Step 2 Pill */}
              <button
                type="button"
                onClick={() => {
                  if (signatureStep === 'review' || signatureStep === 'complete') setSignatureStep('capture');
                }}
                className={`flex items-center gap-3 p-3 rounded-xl transition cursor-pointer text-left ${
                  signatureStep === 'capture'
                    ? 'bg-brand text-white font-extrabold shadow-sm'
                    : signatureStep === 'complete'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold border border-emerald-500/30'
                      : 'bg-surface-muted/40 text-text-muted hover:text-text-primary'
                }`}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                  signatureStep === 'capture'
                    ? 'bg-white text-brand'
                    : signatureStep === 'complete'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-border text-text-muted'
                }`}>2</span>
                <div className="min-w-0 hidden sm:block">
                  <p className="text-xs font-extrabold truncate">{t('contracts.proceedToSign')}</p>
                  <p className={`text-[10px] truncate ${signatureStep === 'capture' ? 'text-white/80' : 'text-text-muted'}`}>Ký chữ ký số</p>
                </div>
              </button>

              {/* Step 3 Pill */}
              <button
                type="button"
                disabled={!hasSigned && signatureStep !== 'complete'}
                onClick={() => {
                  if (hasSigned) setSignatureStep('complete');
                }}
                className={`flex items-center gap-3 p-3 rounded-xl transition text-left ${
                  signatureStep === 'complete'
                    ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                    : 'bg-surface-muted/40 text-text-muted opacity-50 cursor-not-allowed'
                }`}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                  signatureStep === 'complete' ? 'bg-white text-emerald-600' : 'bg-border text-text-muted'
                }`}>3</span>
                <div className="min-w-0 hidden sm:block">
                  <p className="text-xs font-extrabold truncate">{t('contracts.completed')}</p>
                  <p className={`text-[10px] truncate ${signatureStep === 'complete' ? 'text-white/80' : 'text-text-muted'}`}>Hoàn tất niêm phong</p>
                </div>
              </button>
            </div>
          </nav>

          {/* STEP 1: REVIEW TERMS */}
          {signatureStep === 'review' && (
            <div className="space-y-6">
              
              {/* Summary Card */}
              <div className="rounded-2xl border border-border bg-background p-6 shadow-sm space-y-6">
                
                {/* Contract Title & Budget Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
                  <div>
                    <h2 className="text-xl font-black text-text-primary">{contract.jobTitle || contract.title}</h2>
                    <p className="text-xs font-semibold text-text-muted mt-1">{t('contracts.reviewBeforeSigningDesc')}</p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">{t('contracts.budget')}</span>
                    <span className="text-2xl font-black text-brand">{formatMoney(contract.totalBudget)}</span>
                  </div>
                </div>

                {/* Parties Involved */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-border bg-surface-muted/30 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-sm shrink-0">
                      <User size={20} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase text-text-muted block">Bên thuê (Client)</span>
                      <UserProfileLink userId={contract.clientUserId} role="client" className="text-xs font-extrabold text-text-primary hover:text-brand truncate block">
                        {contract.clientName || contract.clientEmail || t('contracts.client')}
                      </UserProfileLink>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-surface-muted/30 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                      <UserCheck size={20} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase text-text-muted block">Bên nhận (Freelancer)</span>
                      <UserProfileLink userId={contract.freelancerUserId} role="freelancer" className="text-xs font-extrabold text-text-primary hover:text-brand truncate block">
                        {contract.freelancerName || contract.freelancerEmail || t('contracts.freelancer')}
                      </UserProfileLink>
                    </div>
                  </div>
                </div>

                {/* Dates & Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-border bg-surface-muted/20">
                    <span className="text-[10px] font-bold uppercase text-text-muted block">{t('contracts.startDate')}</span>
                    <span className="text-xs font-extrabold text-text-primary mt-0.5 block">{formatDate(contract.startDate)}</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-border bg-surface-muted/20">
                    <span className="text-[10px] font-bold uppercase text-text-muted block">{t('contracts.endDate')}</span>
                    <span className="text-xs font-extrabold text-text-primary mt-0.5 block">{formatDate(contract.endDate)}</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-border bg-surface-muted/20">
                    <span className="text-[10px] font-bold uppercase text-text-muted block">Số mốc (Milestones)</span>
                    <span className="text-xs font-extrabold text-text-primary mt-0.5 block">{milestones.length} cột mốc</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-border bg-surface-muted/20">
                    <span className="text-[10px] font-bold uppercase text-text-muted block">Tổng tiền cột mốc</span>
                    <span className="text-xs font-black text-brand mt-0.5 block">{formatMoney(milestonesTotal)}</span>
                  </div>
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
                      />
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs font-bold text-center">
                      {documentWarning || t('contracts.pdfPreviewError')}
                    </div>
                  )}
                </div>

                {/* Right Col: Signature Canvas & Policy */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="rounded-2xl border border-border bg-background p-6 shadow-sm space-y-5">
                    <div>
                      <h2 className="text-base font-black text-text-primary">{t('contracts.drawYourSignature')}</h2>
                      <p className="text-xs text-text-muted font-semibold mt-1">{t('contracts.signatureEmbeddedDesc')}</p>
                    </div>

                    {/* Canvas Draw Box */}
                    <div className="space-y-2">
                      <div className="relative rounded-xl border border-border bg-card p-2">
                        <canvas
                          ref={canvasRef}
                          width={500}
                          height={180}
                          className="w-full h-44 touch-none cursor-crosshair rounded-lg bg-background"
                          onMouseDown={handleMouseDown}
                          onMouseMove={handleMouseMove}
                          onMouseUp={handleMouseUp}
                          onMouseLeave={handleMouseUp}
                        />
                        {!signatureDrawn && (
                          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-text-muted/40">
                            <PenTool size={26} className="mb-1 opacity-40" />
                            <span className="text-xs font-bold">{t('contracts.signatureInstructions')}</span>
                          </div>
                        )}
                      </div>

                      {/* Canvas Action Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => void handleApplySignaturePreview()}
                          disabled={!signatureDrawn || signaturePreviewApplied || isApplyingSignature}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-xs font-extrabold shadow-sm hover:opacity-90 transition cursor-pointer disabled:opacity-40"
                        >
                          {isApplyingSignature ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            <Sparkles size={14} />
                          )}
                          {isApplyingSignature
                            ? t('contracts.applyingSignature')
                            : signaturePreviewApplied
                              ? t('contracts.signatureApplied')
                              : t('contracts.applySignatureToPdf')}
                        </button>

                        <button
                          type="button"
                          onClick={handleClearSignature}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background text-text-muted hover:text-text-primary text-xs font-bold transition cursor-pointer"
                        >
                          <RotateCcw size={14} /> {t('contracts.clearSignature')}
                        </button>
                      </div>

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

                    {/* Submit Contract Button */}
                    <button
                      type="button"
                      onClick={handleSubmitSignature}
                      disabled={!signatureDrawn || !signaturePreviewApplied || !policyAccepted || signingInProgress}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand text-white font-black text-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40 shadow-sm"
                    >
                      {signingInProgress ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          {t('contracts.signing')}
                        </>
                      ) : (
                        <>
                          <Lock size={16} />
                          {t('contracts.completeSigning')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Back Button */}
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setSignatureStep('review')}
                  className="px-5 py-2.5 rounded-xl border border-border bg-background text-text-primary font-extrabold text-xs hover:border-brand/40 transition cursor-pointer"
                >
                  {t('contracts.backToReview')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: COMPLETED */}
          {signatureStep === 'complete' && (
            <div className="p-8 rounded-2xl border border-border bg-background shadow-sm text-center space-y-6 max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 size={40} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-text-primary">
                  {hasSigned ? t('contracts.signatureRecorded') : t('contracts.status')}
                </h2>
                <p className="text-xs font-semibold text-text-muted max-w-md mx-auto leading-relaxed">
                  {contract.status === ContractStatus.PendingEscrow
                    ? isClient
                      ? t('contracts.bothSignedEscrow')
                      : t('contracts.bothSignedWaitEscrow')
                    : contract.status === ContractStatus.Active
                      ? t('contracts.contractActiveWorkspace')
                      : t('contracts.signatureSavedWaitOther')}
                </p>
              </div>

              {/* Status Metadata */}
              <div className="p-4 rounded-xl border border-border bg-surface-muted/30 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-left">
                <div>
                  <span className="text-[10px] font-bold uppercase text-text-muted block">{t('contracts.document')}</span>
                  <span className="font-extrabold text-text-primary block truncate mt-0.5">{contract.jobTitle || contract.title}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-text-muted block">{t('contracts.status')}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">{t('contracts.statusLabels.' + contract.status, { defaultValue: contract.status })}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-text-muted block">{t('contracts.nextStep')}</span>
                  <span className="font-extrabold text-brand block truncate mt-0.5">
                    {contract.status === ContractStatus.PendingEscrow && isClient
                      ? t('contracts.fundEscrow')
                      : contract.status === ContractStatus.Active
                        ? t('contracts.openWorkspace')
                        : t('contracts.waitForCounterpart')}
                  </span>
                </div>
              </div>

              {/* PDF Preview Frame */}
              {document && (
                <div className="rounded-xl border border-border overflow-hidden text-left p-2 bg-card">
                  <ContractPdfViewer
                    document={document}
                    title={t('contracts.signedPdfPreview')}
                  />
                </div>
              )}

              {/* Final Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => void pdf.download()}
                  disabled={signingInProgress || pdf.isPreparing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-background text-text-primary font-extrabold text-xs hover:border-brand/40 transition cursor-pointer disabled:opacity-40"
                >
                  <Download size={16} /> {pdf.isPreparing ? 'Đang tạo PDF…' : 'Tải PDF đã ký kết'}
                </button>

                <button
                  type="button"
                  onClick={handleCompleteNavigation}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand text-white font-black text-xs hover:opacity-90 transition cursor-pointer shadow-sm"
                >
                  {contract.status === ContractStatus.Active ? t('contracts.openWorkspace') : t('contracts.viewContractDetails')} <FileText size={16} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
