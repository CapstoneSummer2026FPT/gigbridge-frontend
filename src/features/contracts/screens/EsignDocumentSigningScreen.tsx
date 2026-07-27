import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, FileText, Signature, Check, AlertCircle, Clock,
  Copy, Download, Shield, Loader, PenTool, Type,
  ChevronRight, CheckCircle, Zap
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { esignGetAPI } from '../../../api/esignAPI/GET';
import { esignPostAPI } from '../../../api/esignAPI/POST';
import { useApp } from '../../../app/providers/AppProvider';
import type { ContractDto } from '../../../types/models/Contract';
import type { ESignSignatureDto, ESignDocumentDto, SignatureAuditTrail } from '../../../types/models/ESign';
import { SignatureStatus, SignatureType } from '../../../types/models/ESign';
import '../styles/esign-document-signing-screen.css';

import { useTranslation } from '../../../hooks/useTranslation';

type SigningStep = 'review' | 'capture' | 'confirm' | 'complete';
type CaptureMethod = 'draw' | 'type' | 'initials';

interface AuditEntry {
  timestamp: string;
  action: string;
  details: string;
  ipAddress?: string;
  deviceInfo?: string;
  location?: string;
}

export default function EsignDocumentSigningScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { contractId, documentId } = useParams<{ contractId: string; documentId: string }>();
  const { user } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typedSignatureInputRef = useRef<HTMLInputElement>(null);

  // State
  const [contract, setContract] = useState<ContractDto | null>(null);
  const [document, setDocument] = useState<ESignDocumentDto | null>(null);
  const [signature, setSignature] = useState<ESignSignatureDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingStep, setSigningStep] = useState<SigningStep>('review');
  const [captureMethod, setCaptureMethod] = useState<CaptureMethod>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasContext, setCanvasContext] = useState<CanvasRenderingContext2D | null>(null);
  const [typedSignatureName, setTypedSignatureName] = useState('');
  const [initialsInput, setInitialsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // System information for audit trail
  const getSystemInfo = () => {
    return {
      ipAddress: 'Client IP', // Would be from backend in production
      userAgent: navigator.userAgent,
      deviceInfo: `${navigator.platform} - ${navigator.language}`,
      timestamp: new Date().toISOString(),
    };
  };

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!contractId || !documentId) {
          throw new Error('Missing contract or document ID');
        }

        // Load contract
        const contractResponse = await contractGetAPI.getContractById(contractId);
        if (!contractResponse.success || !contractResponse.data) {
          throw new Error('Failed to load contract');
        }
        setContract(contractResponse.data);

        // Load document
        const docResponse = await esignGetAPI.getDocumentById(documentId);
        if (!docResponse.success || !docResponse.data) {
          throw new Error('Failed to load document');
        }
        setDocument(docResponse.data);
        if (!docResponse.data.canCurrentUserSign) {
          setError('This document is not available for your signature');
        }

        // Load existing signatures for this document
        const sigsResponse = await esignGetAPI.getDocumentSignatures(documentId);
        if (sigsResponse.success && sigsResponse.data) {
          const userSignature = sigsResponse.data.find(
            sig => sig.userId === user?.id
          );
          if (userSignature) {
            setSignature(userSignature);
            if (userSignature.status === SignatureStatus.Signed) {
              setError('You have already signed this document');
            }
          }
        }

        // Load audit trail
        const auditResponse = await esignGetAPI.getDocumentAuditTrail(documentId);
        if (auditResponse.success && auditResponse.data) {
          const formattedTrail: AuditEntry[] = auditResponse.data.map((entry: SignatureAuditTrail) => ({
            timestamp: entry.timestamp,
            action: entry.action,
            details: entry.details ? JSON.stringify(entry.details) : '',
            ipAddress: entry.ipAddress,
            deviceInfo: entry.deviceInfo,
          }));
          setAuditTrail(formattedTrail);
        }

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMsg);
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [contractId, documentId, user?.id]);

  // Initialize canvas
  useEffect(() => {
    if (signingStep === 'capture' && captureMethod === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setCanvasContext(ctx);
      }
    }
  }, [signingStep, captureMethod]);

  // Canvas drawing handlers
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasContext) return;
    setIsDrawing(true);
    const pos = getMousePos(e);
    canvasContext.beginPath();
    canvasContext.moveTo(pos.x, pos.y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasContext) return;
    const pos = getMousePos(e);
    canvasContext.lineTo(pos.x, pos.y);
    canvasContext.stroke();
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
    if (canvasContext) {
      canvasContext.closePath();
    }
  };

  const handleCanvasMouseLeave = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (canvasContext) {
        canvasContext.closePath();
      }
    }
  };

  const clearCanvas = () => {
    if (canvasContext && canvasRef.current) {
      canvasContext.fillStyle = 'white';
      canvasContext.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const getCanvasSignatureData = (): string => {
    if (!canvasRef.current) return '';
    return canvasRef.current.toDataURL('image/png');
  };

  // Submit signature
  const handleSubmitSignature = async () => {
    if (submittingRef.current) return;
    try {
      if (!contractId || !documentId || !user?.id) {
        setError('Missing required information');
        return;
      }

      submittingRef.current = true;
      setSubmitting(true);
      setError(null);

      let signatureData = '';
      let signatureType = SignatureType.Draw;

      if (captureMethod === 'draw') {
        signatureData = getCanvasSignatureData();
        if (!signatureData || signatureData === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==') {
          setError('Please draw your signature');
          setSubmitting(false);
          submittingRef.current = false;
          return;
        }
        signatureType = SignatureType.Draw;
      } else if (captureMethod === 'type') {
        if (!typedSignatureName.trim()) {
          setError('Please enter your name');
          setSubmitting(false);
          submittingRef.current = false;
          return;
        }
        signatureData = typedSignatureName;
        signatureType = SignatureType.TypedName;
      } else if (captureMethod === 'initials') {
        if (!initialsInput.trim()) {
          setError('Please enter your initials');
          setSubmitting(false);
          submittingRef.current = false;
          return;
        }
        signatureData = initialsInput;
        signatureType = SignatureType.Initials;
      }

      // Record audit trail entry before submitting
      const systemInfo = getSystemInfo();
      await esignPostAPI.recordAuditTrailEntry(documentId, 'Signature Captured', {
        signatureType: captureMethod,
        ...systemInfo,
      });

      // Create signature
      const signatureResponse = await esignPostAPI.createSignature({
        documentId,
        signerId: user.id,
        signerEmail: user.email || '',
        signatureType,
        signatureData,
        ipAddress: systemInfo.ipAddress,
        userAgent: systemInfo.userAgent,
        deviceInfo: systemInfo.deviceInfo,
      });

      if (!signatureResponse.success || !signatureResponse.data) {
        if (signatureResponse.statusCode === 409) {
          setSuccessMessage('Your signature has already been recorded');
          setTimeout(() => {
            setSigningStep('complete');
          }, 1500);
          return;
        }
        throw new Error(signatureResponse.message || 'Failed to save signature');
      }

      setSignature(signatureResponse.data);

      // Record completion
      await esignPostAPI.recordAuditTrailEntry(documentId, 'Document Signed', {
        signerId: user.id,
        ...systemInfo,
      });

      setSuccessMessage('Your signature has been captured and recorded');
      setTimeout(() => {
        setSigningStep('complete');
      }, 1500);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit signature';
      setError(errorMsg);
      console.error('Error submitting signature:', err);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleDeclineSignature = async () => {
    try {
      if (!documentId) {
        setError('Missing document ID');
        return;
      }
      if (window.confirm('Are you sure you want to decline signing this document?')) {
        setSubmitting(true);
        // Record decline action
        await esignPostAPI.recordAuditTrailEntry(documentId, 'Document Declined', {
          reason: 'User declined to sign',
          timestamp: new Date().toISOString(),
        });
        navigate(`/contracts/${contractId}`);
      }
    } catch (err) {
      setError('Failed to decline signature');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyDocumentId = () => {
    if (document?.documentId) {
      navigator.clipboard.writeText(document.documentId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="esign-loading">
          <div className="spinner" />
          <p>{t('contracts.loadingContract')}</p>
        </div>
      </AppLayout>
    );
  }

  if (error && signingStep !== 'complete') {
    return (
      <AppLayout>
        <div className="esign-error">
          <AlertCircle size={48} />
          <h2>{t('contracts.unableToLoad')}</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/contracts')} className="btn-primary">
            {t('contracts.backToContracts')}
          </button>
        </div>
      </AppLayout>
    );
  }

  if (!contract || !document) {
    return (
      <AppLayout>
        <div className="esign-error">
          <AlertCircle size={48} />
          <h2>{t('contracts.documentNotFound')}</h2>
          <button onClick={() => navigate('/contracts')} className="btn-primary">
            {t('contracts.backToContracts')}
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="esign-document-signing">
        <div className="signing-container">
          {/* Header */}
          <div className="signing-header">
            <button
              onClick={() => navigate(`/contracts/${contractId}`)}
              className="btn-back-icon"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="header-info">
              <h1>{t('contracts.documentSigning')}</h1>
              <p className="subtitle">{document.documentCode || contract.title}</p>
            </div>
            {successMessage && (
              <div className="success-alert">
                <CheckCircle size={20} />
                {successMessage}
              </div>
            )}
          </div>

          {/* Progress Steps */}
          <div className="signing-progress">
            <div className={`progress-step ${signingStep === 'review' || ['capture', 'confirm', 'complete'].includes(signingStep) ? 'active' : ''}`}>
              <div className="step-circle">1</div>
              <span>{t('contracts.reviewProposal')}</span>
            </div>
            <div className="progress-line" />
            <div className={`progress-step ${['capture', 'confirm', 'complete'].includes(signingStep) ? 'active' : ''}`}>
              <div className="step-circle">2</div>
              <span>{t('contracts.proceedToSign')}</span>
            </div>
            <div className="progress-line" />
            <div className={`progress-step ${['confirm', 'complete'].includes(signingStep) ? 'active' : ''}`}>
              <div className="step-circle">3</div>
              <span>{t('contracts.confirmSignature')}</span>
            </div>
            <div className="progress-line" />
            <div className={`progress-step ${signingStep === 'complete' ? 'active' : ''}`}>
              <div className="step-circle">4</div>
              <span>{t('contracts.completed')}</span>
            </div>
          </div>

          {/* Main Content */}
          <div className="signing-content">
            {signingStep === 'review' && (
              <div className="step-content">
                <h2>{t('contracts.reviewDocument')}</h2>
                <div className="document-review">
                  <div className="document-info">
                    <FileText size={32} className="doc-icon" />
                    <div className="info-text">
                      <h3>{document.documentCode || contract.title}</h3>
                      {contract.description && <p>{contract.description}</p>}
                    </div>
                  </div>

                  <div className="document-meta">
                    <div className="meta-item">
                      <label>{t('contracts.documentId')}</label>
                      <div className="meta-value-with-copy">
                        <code>{document.documentId}</code>
                        <button
                          onClick={handleCopyDocumentId}
                          className="btn-copy-small"
                          title={copySuccess ? 'Copied' : 'Copy'}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="meta-item">
                      <label>{t('contracts.title')}</label>
                      <p>{contract.title}</p>
                    </div>
                    <div className="meta-item">
                      <label>{t('contracts.created')}</label>
                      <p>{new Date(document.createdAt).toLocaleString()}</p>
                    </div>
                    {document.expiresAt && (
                      <div className="meta-item">
                        <label>{t('contracts.expires')}</label>
                        <p>{new Date(document.expiresAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {document.exportedPdfUrl && (
                    <div className="document-preview">
                      <a
                        href={document.exportedPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-view-document"
                      >
                        <Download size={18} />
                        {t('contracts.viewFullDocument')}
                      </a>
                    </div>
                  )}
                </div>

                <div className="review-instructions">
                  <Zap size={20} />
                  <div>
                    <h4>{t('contracts.instructions')}</h4>
                    <ol>
                      <li>{t('contracts.inst1')}</li>
                      <li>{t('contracts.inst2')}</li>
                      <li>{t('contracts.inst3')}</li>
                      <li>{t('contracts.inst4')}</li>
                    </ol>
                  </div>
                </div>

                <div className="step-actions">
                  <button
                    onClick={() => setSigningStep('capture')}
                    className="btn-primary"
                    disabled={Boolean(signature) || error?.includes('You have already signed this document')}
                  >
                    {t('contracts.proceedToSign')}
                    <ChevronRight size={18} />
                  </button>
                  <button
                    onClick={handleDeclineSignature}
                    className="btn-secondary"
                  >
                    {t('contracts.decline')}
                  </button>
                </div>
              </div>
            )}

            {signingStep === 'capture' && (
              <div className="step-content">
                <h2>{t('contracts.captureYourSignature')}</h2>

                <div className="capture-method-selector">
                  <button
                    className={`method-btn ${captureMethod === 'draw' ? 'active' : ''}`}
                    onClick={() => setCaptureMethod('draw')}
                  >
                    <PenTool size={20} />
                    <span>{t('contracts.draw')}</span>
                  </button>
                  <button
                    className={`method-btn ${captureMethod === 'type' ? 'active' : ''}`}
                    onClick={() => setCaptureMethod('type')}
                  >
                    <Type size={20} />
                    <span>{t('contracts.type')}</span>
                  </button>
                  <button
                    className={`method-btn ${captureMethod === 'initials' ? 'active' : ''}`}
                    onClick={() => setCaptureMethod('initials')}
                  >
                    <Signature size={20} />
                    <span>{t('contracts.initials')}</span>
                  </button>
                </div>

                {captureMethod === 'draw' && (
                  <div className="capture-area">
                    <p className="capture-label">{t('contracts.drawInstructions')}</p>
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={150}
                      className="signature-canvas"
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseLeave}
                    />
                    <button onClick={clearCanvas} className="btn-clear">
                      {t('contracts.clearSignature')}
                    </button>
                  </div>
                )}

                {captureMethod === 'type' && (
                  <div className="capture-area">
                    <p className="capture-label">{t('contracts.typeInstructions')}</p>
                    <input
                      ref={typedSignatureInputRef}
                      type="text"
                      value={typedSignatureName}
                      onChange={(e) => setTypedSignatureName(e.target.value)}
                      placeholder={t('contracts.typePlaceholder')}
                      className="signature-input"
                    />
                  </div>
                )}

                {captureMethod === 'initials' && (
                  <div className="capture-area">
                    <p className="capture-label">{t('contracts.initialsInstructions')}</p>
                    <input
                      type="text"
                      value={initialsInput}
                      onChange={(e) => setInitialsInput(e.target.value.toUpperCase().slice(0, 3))}
                      placeholder={t('contracts.initialsPlaceholder')}
                      className="signature-input"
                      maxLength={3}
                    />
                  </div>
                )}

                <div className="capture-info">
                  <Shield size={18} />
                  <div>
                    <p>{t('contracts.recordingWarning')}</p>
                  </div>
                </div>

                <div className="step-actions">
                  <button
                    onClick={() => setSigningStep('confirm')}
                    className="btn-primary"
                  >
                    {t('contracts.confirmSignature')}
                    <ChevronRight size={18} />
                  </button>
                  <button
                    onClick={() => setSigningStep('review')}
                    className="btn-secondary"
                  >
                    {t('contracts.back')}
                  </button>
                </div>
              </div>
            )}

            {signingStep === 'confirm' && (
              <div className="step-content">
                <h2>{t('contracts.confirmSignature')}</h2>

                <div className="confirm-section">
                  <h3>{t('contracts.signaturePreview')}</h3>
                  <div className="signature-preview">
                    {captureMethod === 'draw' && (
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={150}
                        className="signature-canvas preview-mode"
                      />
                    )}
                    {(captureMethod === 'type' || captureMethod === 'initials') && (
                      <div className="typed-signature-preview">
                        <p className="preview-text">
                          {captureMethod === 'type' ? typedSignatureName : initialsInput}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="confirm-section">
                  <h3>{t('contracts.auditInformation')}</h3>
                  <div className="audit-info">
                    <div className="audit-item">
                      <Clock size={16} />
                      <span>{t('contracts.timestamp')}: {new Date().toLocaleString()}</span>
                    </div>
                    <div className="audit-item">
                      <Shield size={16} />
                      <span>{t('contracts.user')}: {user?.email}</span>
                    </div>
                    <div className="audit-item">
                      <FileText size={16} />
                      <span>{t('contracts.device')}: {navigator.platform}</span>
                    </div>
                  </div>
                </div>

                <div className="confirm-notice">
                  <AlertCircle size={18} />
                  <p>{t('contracts.legallyBindingNotice')}</p>
                </div>

                {error && (
                  <div className="error-alert">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div className="step-actions">
                  <button
                    onClick={handleSubmitSignature}
                    disabled={submitting || Boolean(signature) || error?.includes('MSG55')}
                    className="btn-primary btn-submit"
                  >
                    {submitting ? (
                      <>
                        <Loader size={18} className="spinner-icon" />
                        {t('contracts.signing')}
                      </>
                    ) : (
                      <>
                        <Signature size={18} />
                        {t('contracts.signAndSubmit')}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setSigningStep('capture')}
                    className="btn-secondary"
                  >
                    {t('contracts.back')}
                  </button>
                </div>
              </div>
            )}

            {signingStep === 'complete' && (
              <div className="step-content">
                <div className="completion-message">
                  <CheckCircle size={48} className="success-icon" />
                  <h2>{t('contracts.signatureRecorded')}</h2>
                  <p>{t('contracts.signatureSavedDesc')}</p>
                </div>

                <div className="completion-details">
                  <div className="detail-box">
                    <Check size={20} />
                    <div>
                      <h4>{t('contracts.signatureRecorded')}</h4>
                      <p>{t('contracts.signatureSavedDesc')}</p>
                    </div>
                  </div>
                  <div className="detail-box">
                    <Clock size={20} />
                    <div>
                      <h4>{t('contracts.auditTrail')}</h4>
                      <p>{t('contracts.timestamp')}</p>
                    </div>
                  </div>
                  <div className="detail-box">
                    <Shield size={20} />
                    <div>
                      <h4>{t('contracts.legalAgreement')}</h4>
                      <p>{t('contracts.legallyBindingNotice')}</p>
                    </div>
                  </div>
                </div>

                <div className="step-actions">
                  <button
                    onClick={() => navigate(`/contracts/${contractId}`)}
                    className="btn-primary"
                  >
                    {t('contracts.viewContract')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Audit Trail */}
          <div className="signing-audit">
            <button
              onClick={() => setShowAuditTrail(!showAuditTrail)}
              className="audit-toggle"
            >
              <Clock size={18} />
              {t('contracts.auditTrail')} {auditTrail.length > 0 && `(${auditTrail.length})`}
              <span className="toggle-arrow">{showAuditTrail ? '▼' : '▶'}</span>
            </button>

            {showAuditTrail && (
              <div className="audit-trail-detail">
                {auditTrail.length > 0 ? (
                  <div className="audit-entries">
                    {auditTrail.map((entry, idx) => (
                      <div key={idx} className="audit-entry">
                        <span className="entry-time">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="entry-action">{entry.action}</span>
                        {entry.ipAddress && (
                          <span className="entry-ip">{entry.ipAddress}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-audit">{t('contracts.noAuditEntries')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
