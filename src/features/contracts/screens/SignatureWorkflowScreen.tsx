import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertCircle, CheckCircle, Clock, FileText, Loader, PenTool, X } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
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

type SignatureStep = 'review' | 'capture' | 'complete';

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
            <p>Loading contract...</p>
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
            <h2>{error || 'Contract not found'}</h2>
            <button onClick={() => navigate('/contracts')}>Back to contracts</button>
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
            Back to contract
          </button>
          <h1>E-Sign Contract</h1>
          <p>Review the agreed job details, then add your electronic signature.</p>
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
            <span className="step-label">Review</span>
          </div>
          <div className="step-divider" />
          <div className={`step ${signatureStep === 'capture' ? 'active' : signatureStep === 'complete' ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Sign</span>
          </div>
          <div className="step-divider" />
          <div className={`step ${signatureStep === 'complete' ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Done</span>
          </div>
        </div>

        {signatureStep === 'review' && (
          <div className="signature-step-content">
            <div className="signature-section">
              <h2>Contract Details</h2>

              <div className="signature-info-box">
                <Clock size={20} />
                <div>
                  <h3>Review before signing</h3>
                  <p>Please review final price, dates, job scope, and milestones before signing. Your signature confirms the finalized contract terms.</p>
                </div>
              </div>

              <div className="contract-details">
                <div className="detail-row">
                  <span>Job</span>
                  <strong>{contract.jobTitle || contract.title}</strong>
                </div>
                <div className="detail-row">
                  <span>Final budget</span>
                  <strong>{formatMoney(contract.totalBudget)}</strong>
                </div>
                <div className="detail-row">
                  <span>Milestone total</span>
                  <strong>{formatMoney(milestonesTotal)}</strong>
                </div>
                <div className="detail-row">
                  <span>Start date</span>
                  <strong>{formatDate(contract.startDate)}</strong>
                </div>
                <div className="detail-row">
                  <span>End date</span>
                  <strong>{formatDate(contract.endDate)}</strong>
                </div>
                <div className="detail-row">
                  <span>Client</span>
                  <strong>{contract.clientName || contract.clientEmail || 'Client'}</strong>
                </div>
                <div className="detail-row">
                  <span>Freelancer</span>
                  <strong>{contract.freelancerName || contract.freelancerEmail || 'Freelancer'}</strong>
                </div>
              </div>

              <div className="contract-description">
                <h3>Scope of work</h3>
                <p>{contract.jobDescription || contract.description || 'No scope of work provided.'}</p>
              </div>

              <div className="contract-description">
                <div className="signature-milestone-header">
                  <h3>Milestones</h3>
                  <strong>{formatMoney(milestonesTotal)}</strong>
                </div>
                {milestoneTotalDiffers && (
                  <div className="signature-inline-warning">
                    Milestone total differs from final budget. Review the schedule carefully before signing.
                  </div>
                )}
                {milestones.length > 0 ? (
                  <div className="signature-milestone-list">
                    {milestones.map((milestone, index) => (
                      <div key={milestone.id || index} className="signature-milestone-item">
                        <div>
                          <span className="signature-milestone-number">#{index + 1}</span>
                          <strong>{milestone.title}</strong>
                          <p>Due: {formatDate(milestone.due_date)}</p>
                        </div>
                        <strong>{formatMoney(milestone.amount)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No milestones are attached to this contract yet.</p>
                )}
              </div>

              {document?.renderedHtmlContent && (
                <div className="contract-description">
                  <h3>Generated contract document</h3>
                  <iframe
                    title="Generated E-sign contract document"
                    className="signature-document-frame"
                    sandbox=""
                    srcDoc={document.renderedHtmlContent}
                  />
                </div>
              )}

              <div className="signature-info-box">
                <Clock size={20} />
                <div>
                  <p>Your signature is recorded with timestamp and account identity. You can go back to the contract page or return to this review before submitting the signature.</p>
                </div>
              </div>
            </div>

            <div className="signature-actions">
              <button className="btn-secondary" onClick={() => navigate(`/contracts/${contract.contractsId}`)}>
                Back
              </button>
              <button
                className="btn-primary"
                onClick={() => setSignatureStep(hasSigned ? 'complete' : 'capture')}
                disabled={Boolean(error) && !hasSigned}
              >
                {hasSigned ? 'View status' : 'Proceed to sign'} <PenTool size={16} />
              </button>
            </div>
          </div>
        )}

        {signatureStep === 'capture' && (
          <div className="signature-step-content">
            <div className="signature-section">
              <h2>Draw Your Signature</h2>

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
                  Draw your signature above, then submit it to the contract.
                </div>
              </div>

              <div className="signature-buttons">
                <button className="btn-outline" onClick={handleClearSignature}>
                  Clear Signature
                </button>
              </div>

              <div className="signature-info-box">
                <FileText size={20} />
                <div>
                  <h3>Legal agreement</h3>
                  <p>By signing this contract, you agree to the final job budget, dates, and terms shown on this page.</p>
                </div>
              </div>
            </div>

            <div className="signature-actions">
              <button className="btn-secondary" onClick={() => setSignatureStep('review')}>
                Back to review
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmitSignature}
                disabled={!signatureDrawn || signingInProgress}
              >
                {signingInProgress ? (
                  <>
                    <Loader size={16} className="spinner-small" />
                    Signing...
                  </>
                ) : (
                  <>
                    <PenTool size={16} />
                    Sign contract
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
                <h2>{hasSigned ? 'Signature Recorded' : 'Contract Status'}</h2>
                <p>
                  {contract.status === ContractStatus.PendingEscrow
                    ? isClient
                      ? 'Both parties have signed. Fund escrow to open the workspace.'
                      : 'Both parties have signed. Waiting for the client to fund escrow.'
                    : contract.status === ContractStatus.Active
                      ? 'The contract is active and the workspace is ready.'
                      : 'Your signature is saved. Waiting for the other party to sign.'}
                </p>

                <div className="signed-info">
                  <div className="info-item">
                    <span>Contract</span>
                    <strong>{contract.jobTitle || contract.title}</strong>
                  </div>
                  <div className="info-item">
                    <span>Status</span>
                    <strong>{ContractStatus[contract.status] ?? 'PendingSignature'}</strong>
                  </div>
                  <div className="info-item">
                    <span>Next step</span>
                    <strong>
                      {contract.status === ContractStatus.PendingEscrow && isClient
                        ? 'Fund escrow'
                        : contract.status === ContractStatus.Active
                          ? 'Open workspace'
                          : 'Wait for counterpart'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="signature-actions">
              <button className="btn-primary btn-large" onClick={handleCompleteNavigation}>
                {contract.status === ContractStatus.Active ? 'Open workspace' : 'View contract details'} <FileText size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
