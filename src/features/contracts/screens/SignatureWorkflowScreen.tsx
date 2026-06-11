import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertCircle, CheckCircle, Clock, FileText, Loader, PenTool, X } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import type { ContractDto } from '../../../types/models/Contract';
import { ContractStatus } from '../../../types/models/Contract';
import { MOCK_CONTRACTS_FOR_SCREENS } from '../mock/data-for-ContractScreens';
import '../styles/signature-workflow-screen.css';

interface SignaturePad {
  x: number;
  y: number;
  pressure: number[];
  timestamp: number;
}

export default function SignatureWorkflowScreen() {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const { user } = useApp();

  const [contract, setContract] = useState<ContractDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Signature state
  const [signatureStep, setSignatureStep] = useState<'review' | 'capture' | 'confirm'>('review');
  const [signatureData, setSignatureData] = useState<SignaturePad | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [signingInProgress, setSigningInProgress] = useState(false);

  // Load contract data
  useEffect(() => {
    const loadContract = async () => {
      if (!contractId) return;
      try {
        setLoading(true);
        setError('');
        const res = await contractGetAPI.getContractById(contractId);
        if (res.success && res.data) {
          setContract(res.data);
          const alreadySigned = localStorage.getItem(`contract-signature-${contractId}-${user?.id}`);
          if (res.data.status !== ContractStatus.PendingSignature) {
            setError('This contract is not in signature pending state.');
          }
        } else {
          if (import.meta.env.VITE_USE_MOCK === 'true') {
            const mockContract = MOCK_CONTRACTS_FOR_SCREENS.find(item => item.contractsId === contractId);
            if (mockContract) {
              setContract(mockContract);
              if (mockContract.status !== ContractStatus.PendingSignature) {
                setError('MSG55: You have already signed this document');
              }
            } else {
              setError('Contract not found in mock data');
            }
          } else {
            setError(res.message || 'Failed to load contract details');
          }
        }
      } catch (err) {
        console.error('Failed to load contract:', err);
        if (import.meta.env.VITE_USE_MOCK === 'true') {
          const mockContract = MOCK_CONTRACTS_FOR_SCREENS.find(item => item.contractsId === contractId);
          if (mockContract) {
            setContract(mockContract);
          } else {
            setError('Failed to load contract details');
          }
        } else {
          setError('Failed to load contract details');
        }
      } finally {
        setLoading(false);
      }
    };

    loadContract();
  }, [contractId, user?.id]);

  // Initialize canvas for signature capture
  useEffect(() => {
    if (signatureStep === 'capture' && canvasRef) {
      const ctx = canvasRef.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [signatureStep, canvasRef]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef) return;
    setIsDrawing(true);

    const ctx = canvasRef.getContext('2d');
    const rect = canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    setSignatureData({
      x,
      y,
      pressure: [],
      timestamp: Date.now(),
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef) return;

    const ctx = canvasRef.getContext('2d');
    const rect = canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClearSignature = () => {
    if (canvasRef) {
      const ctx = canvasRef.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);
      }
    }
    setSignatureData(null);
  };

  const handleSubmitSignature = async () => {
    if (!canvasRef || !contract) {
      setError('Please sign before submitting');
      return;
    }

    try {
      setSigningInProgress(true);
      setError('');

      // Get signature as data URL
      const signatureImage = canvasRef.toDataURL('image/png');

      const res = await contractPostAPI.sign(contract.contractsId, {
        signatureImageUrl: signatureImage,
        signatureWidth: 300,
        signatureHeight: 100,
      });

      if (res.success) {
        localStorage.setItem(`contract-signature-${contract.contractsId}-${user?.id}`, new Date().toISOString());
        setSuccess('Signature captured and contract signed successfully!');
        setSignatureStep('confirm');

        // Navigate back to contract details after a delay
        setTimeout(() => {
          navigate(`/contracts/${contract.contractsId}`);
        }, 2000);
      } else {
        setError(res.message || 'Failed to submit signature. Please try again.');
      }
    } catch (err) {
      console.error('Failed to submit signature:', err);
      setError('Failed to submit signature. Please try again.');
    } finally {
      setSigningInProgress(false);
    }
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
            <button onClick={() => navigate(-1)}>Go back</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="signature-workflow-page">
        <div className="signature-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1>E-Signature Workflow</h1>
          <p>Sign this contract to complete the agreement</p>
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

        {/* Signature steps */}
        <div className="signature-steps">
          <div className={`step ${signatureStep === 'review' ? 'active' : 'completed'}`}>
            <span className="step-number">1</span>
            <span className="step-label">Review</span>
          </div>
          <div className="step-divider" />
          <div className={`step ${signatureStep === 'capture' ? 'active' : signatureStep === 'confirm' ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Sign</span>
          </div>
          <div className="step-divider" />
          <div className={`step ${signatureStep === 'confirm' ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Confirm</span>
          </div>
        </div>

        {/* Step: Review */}
        {signatureStep === 'review' && (
          <div className="signature-step-content">
            <div className="signature-section">
              <h2>Review Contract</h2>

              <div className="contract-details">
                <div className="detail-row">
                  <span>Title</span>
                  <strong>{contract.title}</strong>
                </div>
                <div className="detail-row">
                  <span>Amount</span>
                  <strong>${(contract.totalBudget || 0).toLocaleString()}</strong>
                </div>
                <div className="detail-row">
                  <span>Start Date</span>
                  <strong>{contract.startDate ? new Date(contract.startDate).toLocaleDateString() : 'N/A'}</strong>
                </div>
                <div className="detail-row">
                  <span>Status</span>
                  <strong>Pending Signature</strong>
                </div>
              </div>

              <div className="contract-description">
                <h3>Description</h3>
                <p>{contract.description || 'No description provided'}</p>
              </div>

              <div className="signature-info-box">
                <Clock size={20} />
                <div>
                  <h3>Audit Trail</h3>
                  <p>Your signature will be recorded with timestamp, IP address, and user identification for legal compliance and dispute resolution.</p>
                </div>
              </div>
            </div>

            <div className="signature-actions">
              <button className="btn-secondary" onClick={() => navigate(-1)}>
                Decline
              </button>
              <button
                className="btn-primary"
                onClick={() => setSignatureStep('capture')}
                disabled={error.includes('MSG55')}
              >
                Proceed to Sign <PenTool size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Capture signature */}
        {signatureStep === 'capture' && (
          <div className="signature-step-content">
            <div className="signature-section">
              <h2>Draw Your Signature</h2>

              <div className="signature-pad-wrapper">
                <canvas
                  ref={el => setCanvasRef(el)}
                  width={600}
                  height={200}
                  className="signature-pad"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
                <div className="signature-instructions">
                  Draw your signature above, then click "Sign Document"
                </div>
              </div>

              <div className="signature-buttons">
                <button
                  className="btn-outline"
                  onClick={handleClearSignature}
                >
                  Clear Signature
                </button>
              </div>

              <div className="signature-info-box">
                <FileText size={20} />
                <div>
                  <h3>Legal Agreement</h3>
                  <p>By signing this contract, you agree to its terms and conditions. This electronic signature is legally binding and equivalent to your handwritten signature.</p>
                </div>
              </div>
            </div>

            <div className="signature-actions">
              <button className="btn-secondary" onClick={() => setSignatureStep('review')}>
                ← Back to Review
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmitSignature}
                disabled={!signatureData || signingInProgress}
              >
                {signingInProgress ? (
                  <>
                    <Loader size={16} className="spinner-small" />
                    Signing...
                  </>
                ) : (
                  <>
                    <PenTool size={16} />
                    Sign Document
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {signatureStep === 'confirm' && (
          <div className="signature-step-content">
            <div className="signature-section">
              <div className="signature-success">
                <CheckCircle size={48} className="success-icon" />
                <h2>Contract Signed Successfully</h2>
                <p>Your electronic signature has been recorded and the contract is now active.</p>

                <div className="signed-info">
                  <div className="info-item">
                    <span>Signed At</span>
                    <strong>{new Date().toLocaleString()}</strong>
                  </div>
                  <div className="info-item">
                    <span>Contract Status</span>
                    <strong>Active</strong>
                  </div>
                  <div className="info-item">
                    <span>Next Steps</span>
                    <strong>Milestone Setup</strong>
                  </div>
                </div>

                <p className="signature-note">
                  A confirmation email has been sent to both parties with the signed contract.
                </p>
              </div>
            </div>

            <div className="signature-actions">
              <button className="btn-primary btn-large" onClick={() => navigate(`/contracts/${contract.contractsId}`)}>
                View Contract Details <FileText size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
