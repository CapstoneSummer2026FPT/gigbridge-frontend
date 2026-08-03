import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertCircle, CheckCircle, Clock, FileText, Loader, PenTool, X } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { useApp } from '../../../app/providers/AppProvider';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { esignGetAPI } from '../../../api/esignAPI/GET';
import type { ContractDto, Milestone } from '../../../types/models/Contract';
import type { ESignDocumentDto } from '../../../types/models/ESign';
import { ContractStatus } from '../../../types/models/Contract';
import { SignatureStatus } from '../../../types/models/ESign';
import { UserRole } from '../../../types/models/User';
import '../styles/signature-workflow-screen.css';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { useTranslation } from '../../../hooks/useTranslation';

type SignatureStep = 'review' | 'capture' | 'complete';
const POLICY_VERSION = '1.0-DATN';

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

const formatMoney = (value?: number): string =>
  formatGigCoin(value ?? 0);

const formatDate = (value?: string | null): string => {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleDateString();
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
  const [signingInProgress, setSigningInProgress] = useState(false);
  const submittingRef = useRef(false);

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
  const milestoneTotalDiffers = contract ? Math.abs(milestonesTotal - Number(contract.totalBudget || 0)) >= 0.01 : false;

  const loadDocument = useCallback(async (targetContractId: string): Promise<void> => {
    try {
      const docResponse = await esignGetAPI.getDocumentByContract(targetContractId);
      if (docResponse.success && docResponse.data) {
        setDocument(docResponse.data);
        setDocumentWarning('');
        return;
      }
      setDocument(null);
      setDocumentWarning(docResponse.message || 'The signed document will be generated when the first party signs.');
    } catch (err) {
      console.warn('Contract document is not available yet:', err);
      setDocument(null);
      setDocumentWarning('The signed document will be generated when the first party signs.');
    }
  }, []);

  const loadContract = useCallback(async (): Promise<void> => {
    if (!contractId) {
      setError('Missing contract ID.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setDocumentWarning('');

      const contractResponse = await contractGetAPI.getContractById(contractId);
      if (!contractResponse.success || !contractResponse.data) {
        setError(contractResponse.message || 'Failed to load contract details.');
        return;
      }

      setContract(contractResponse.data);
      const milestonesResponse = await contractGetAPI.getMilestonesByContract(contractId);
      setMilestones(milestonesResponse.success && milestonesResponse.data ? milestonesResponse.data : []);
      await loadDocument(contractId);

      if (
        ![
          ContractStatus.PendingSignature,
          ContractStatus.PendingEscrow,
          ContractStatus.Active,
        ].includes(contractResponse.data.status)
      ) {
        setError('This contract is not ready for E-signature.');
      }
    } catch (err) {
      console.error('Failed to load contract signing flow:', err);
      setError('Failed to load contract details.');
    } finally {
      setLoading(false);
    }
  }, [contractId, loadDocument]);

  useEffect(() => {
    void loadContract();
  }, [loadContract]);

  const resetCanvas = useCallback((): void => {
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
  }, []);

  useEffect(() => {
    if (signatureStep === 'capture') {
      resetCanvas();
    }
  }, [resetCanvas, signatureStep]);

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const point = getCanvasPoint(canvas, event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
    setSignatureDrawn(true);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    if (!isDrawing || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const point = getCanvasPoint(canvas, event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const handleMouseUp = (): void => {
    setIsDrawing(false);
    canvasRef.current?.getContext('2d')?.closePath();
  };

  const handleClearSignature = (): void => {
    resetCanvas();
  };

  const refreshAfterSigning = async (nextStatus?: ContractStatus): Promise<ContractStatus | undefined> => {
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
  };

  const handleSubmitSignature = async (): Promise<void> => {
    if (submittingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas || !contract) {
      setError('Please sign before submitting.');
      return;
    }

    if (!signatureDrawn) {
      setError('Please draw your signature before submitting.');
      return;
    }

    if (!policyAccepted) {
      setError('Please accept the GigBridge policy before signing.');
      return;
    }

    try {
      submittingRef.current = true;
      setSigningInProgress(true);
      setError('');
      setSuccess('');

      const signatureImageUrl = canvas.toDataURL('image/png');
      const response = await contractPostAPI.sign(contract.contractsId, {
        signatureImageUrl,
        signatureWidth: canvas.width,
        signatureHeight: canvas.height,
        policyAccepted: true,
        policyVersion: POLICY_VERSION,
      });

      if (!response.success) {
        if (response.statusCode === 409) {
          // Already signed, proceed as success!
          await refreshAfterSigning();
          setSignatureStep('complete');
          return;
        }
        setError(response.message || 'Failed to submit signature. Please try again.');
        return;
      }

      const documentId = getDocumentIdFromResponse(response.data);
      if (documentId) {
        await loadDocument(contract.contractsId);
      }

      const finalStatus = await refreshAfterSigning(getStatusFromResponse(response.data));
      setSignatureStep('complete');

      if (finalStatus === ContractStatus.PendingEscrow) {
        setSuccess(isClient ? 'Contract fully signed. You can now fund escrow.' : 'Contract fully signed. Waiting for the client to fund escrow.');
        if (isClient) {
          window.setTimeout(() => navigate(`/contracts/${contract.contractsId}`), 1200);
        }
        return;
      }

      if (finalStatus === ContractStatus.Active) {
        setSuccess('Contract is active. Opening workspace...');
        window.setTimeout(() => navigate(`/workspace/${contract.contractsId}`), 1200);
        return;
      }

      if (!isClient && finalStatus === ContractStatus.PendingSignature) {
        setSuccess('Your signature has been recorded. Waiting for the other party to sign.');
        window.setTimeout(() => navigate(`/contracts/${contract.contractsId}`), 1200);
        return;
      }

      setSuccess('Your signature has been recorded. Waiting for the other party to sign.');
    } catch (err) {
      console.error('Failed to submit signature:', err);
      setError('Failed to submit signature. Please try again.');
    } finally {
      submittingRef.current = false;
      setSigningInProgress(false);
    }
  };

  const handleCompleteNavigation = (): void => {
    if (!contract) return;

    if (contract.status === ContractStatus.Active) {
      navigate(`/workspace/${contract.contractsId}`);
      return;
    }

    navigate(`/contracts/${contract.contractsId}`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="signature-workflow-page">
          <div className="signature-loading">
            <Loader size={32} className="spinner" />
            <p>{t('contracts.loadingContract')}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!contract) {
    return (
      <AppLayout>
        <div className="signature-workflow-page">
          <div className="signature-error">
            <AlertCircle size={32} />
            <h2>{error || t('contracts.contractNotFound')}</h2>
            <button onClick={() => navigate('/contracts')}>{t('contracts.backToContracts')}</button>
          </div>
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
          <div className="signature-alert alert-success">
            <CheckCircle size={18} />
            {success}
            <button onClick={() => setSuccess('')}>
              <X size={16} />
            </button>
          </div>
        )}

        {documentWarning && (
          <div className="signature-alert alert-warning">
            <Clock size={18} />
            {documentWarning}
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
            <span className="step-label">{t('contracts.completed')}</span>
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

              <div className="contract-description">
                <div className="signature-milestone-header">
                  <h3>{t('contracts.milestones')}</h3>
                  <strong>{formatMoney(milestonesTotal)}</strong>
                </div>
                {milestoneTotalDiffers && (
                  <div className="signature-inline-warning">
                    {t('contracts.milestoneTotalDiffers')}
                  </div>
                )}
                {milestones.length > 0 ? (
                  <div className="signature-milestone-list">
                    {milestones.map((milestone, index) => (
                      <div key={milestone.id || index} className="signature-milestone-item">
                        <div>
                          <span className="signature-milestone-number">#{index + 1}</span>
                          <strong>{milestone.title}</strong>
                          <p>{t('contracts.duePrefix')}: {formatDate(milestone.due_date)}</p>
                        </div>
                        <strong>{formatMoney(milestone.amount)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>{t('contracts.noMilestonesPlanned')}</p>
                )}
              </div>

              {document?.renderedHtmlContent && (
                <div className="contract-description">
                  <h3>{t('contracts.generatedContractDoc')}</h3>
                  <iframe
                    title={t('contracts.generatedContractDoc')}
                    className="signature-document-frame"
                    sandbox=""
                    srcDoc={document.renderedHtmlContent}
                  />
                </div>
              )}

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
                onClick={() => setSignatureStep(hasSigned ? 'complete' : 'capture')}
                disabled={Boolean(error) && !hasSigned}
              >
                {hasSigned ? t('contracts.viewStatus') : t('contracts.proceedToSign')} <PenTool size={16} />
              </button>
            </div>
          </div>
        )}

        {signatureStep === 'capture' && (
          <div className="signature-step-content">
            <div className="signature-section">
              <h2>{t('contracts.drawYourSignature')}</h2>

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
                <button className="btn-outline" onClick={handleClearSignature}>
                  {t('contracts.clearSignature')}
                </button>
              </div>

              <div className="signature-info-box">
                <FileText size={20} />
                <div>
                  <h3>{t('contracts.legalAgreement')}</h3>
                  <p>{t('contracts.legalAgreementDesc')}</p>
                </div>
              </div>

              <label className="signature-policy-consent" htmlFor="signature-policy-consent">
                <input
                  id="signature-policy-consent"
                  type="checkbox"
                  checked={policyAccepted}
                  onChange={event => setPolicyAccepted(event.target.checked)}
                />
                <span>
                  Tôi đã đọc, hiểu và đồng ý với{' '}
                  <a href="/policies" target="_blank" rel="noopener noreferrer">
                    Bộ chính sách GigBridge phiên bản {POLICY_VERSION}
                  </a>
                  .
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
                disabled={!signatureDrawn || !policyAccepted || signingInProgress}
              >
                {signingInProgress ? (
                  <>
                    <Loader size={16} className="spinner-small" />
                    {t('contracts.signing')}
                  </>
                ) : (
                  <>
                    <PenTool size={16} />
                    {t('contracts.signContract')}
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
                <CheckCircle size={48} className="success-icon" />
                <h2>{hasSigned ? t('contracts.signatureRecorded') : t('contracts.status')}</h2>
                <p>
                  {contract.status === ContractStatus.PendingEscrow
                    ? isClient
                      ? t('contracts.bothSignedEscrow')
                      : t('contracts.bothSignedWaitEscrow')
                    : contract.status === ContractStatus.Active
                      ? t('contracts.contractActiveWorkspace')
                      : t('contracts.signatureSavedWaitOther')}
                </p>

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
