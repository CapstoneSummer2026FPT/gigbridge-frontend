import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertCircle, ArrowRight, Calendar, FileText, Users, X, CheckCircle, Download, Send, Zap } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import type { ProposalDto } from '../../../types/models/Proposal';
import type { CreateContractDto } from '../../../types/models/Contract';
import { ContractStatus } from '../../../types/models/Contract';
import '../styles/create-esign-contract-screen.css';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import { useTranslation } from '../../../hooks/useTranslation';

interface ContractMilestoneDraft {
  title: string;
  amount: number;
  dueDate: string;
}

export default function CreateEsignContractScreen() {
  const navigate = useNavigate();
  const { proposalId } = useParams<{ proposalId: string }>();
  const { user } = useApp();
  const { t } = useTranslation();

  const [proposal, setProposal] = useState<ProposalDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState<CreateContractDto>({
    jobPostId: '',
    proposalId: proposalId || '',
    clientProfileId: user?.id || '',
    freelancerProfileId: '',
    title: '',
    description: '',
    totalBudget: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  const [step, setStep] = useState<'review' | 'terms' | 'preview' | 'confirm'>('review');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [sendingForSignature, setSendingForSignature] = useState(false);
  const [contractCreated, setContractCreated] = useState<{ id: string; pdfUrl: string } | null>(null);
  const [paymentTerms, setPaymentTerms] = useState('Escrow funded per milestone. Funds are released after client approval.');
  const [milestoneDrafts, setMilestoneDrafts] = useState<ContractMilestoneDraft[]>([
    {
      title: 'Project kickoff and scope confirmation',
      amount: 0,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  ]);
  const isPremiumClient = Boolean((user as any)?.isPremium || user?.role === 'Client');

  // Validation
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load proposal data
  useEffect(() => {
    const loadProposal = async () => {
      if (!proposalId) {
        setError('Invalid proposal ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await proposalGetAPI.getAllProposals({ pageSize: 100 });
        const found = response.data?.find(p => p.proposalsId === proposalId);

        if (!found) {
          setError('Proposal not found');
          setLoading(false);
          return;
        }

        setProposal(found);

        // Prefill form with proposal data
        setFormData(prev => ({
          ...prev,
          jobPostId: found.jobPostsId,
          proposalId: found.proposalsId,
          freelancerProfileId: found.freelancerProfilesId,
          title: `Contract for ${found.jobTitle}`,
          description: `This contract is for the project: ${found.jobTitle}`,
          totalBudget: found.proposedBudget || 0,
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }));
      } catch (err) {
        console.error('Failed to load proposal:', err);
        setError('Failed to load proposal details');
      } finally {
        setLoading(false);
      }
    };

    loadProposal();
  }, [proposalId]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title || formData.title.trim().length < 5) {
      errors.title = 'Title must be at least 5 characters';
    }

    if (formData.title && formData.title.length > 255) {
      errors.title = 'Title must be at most 255 characters';
    }

    if (formData.totalBudget <= 0) {
      errors.totalBudget = 'Budget must be greater than 0';
    }

    if (!formData.description || !formData.description.trim()) {
      errors.description = 'Scope is required (BR-51)';
    }

    if (!paymentTerms.trim()) {
      errors.paymentTerms = 'Payment terms are required (BR-51)';
    }

    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }

    if (formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);

      if (endDate <= startDate) {
        errors.endDate = 'End date must be after start date';
      }
    } else {
      errors.endDate = 'Timeline end date is required (BR-51)';
    }

    const validMilestones = milestoneDrafts.filter(m => m.title.trim() || m.amount > 0 || m.dueDate);
    const totalMilestoneAmount = validMilestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

    validMilestones.forEach((milestone, index) => {
      if (!milestone.title.trim()) {
        errors[`milestoneTitle${index}`] = 'Milestone title is required';
      }

      if (!milestone.dueDate) {
        errors[`milestoneDueDate${index}`] = 'Milestone deadline is required';
      }

      if ((Number(milestone.amount) || 0) <= 0) {
        errors[`milestoneAmount${index}`] = 'Milestone amount must be positive';
      }
    });

    if (validMilestones.length === 0) {
      errors.milestones = 'At least one milestone is required';
    }

    if (totalMilestoneAmount > formData.totalBudget) {
      errors.milestones = 'Total milestone amount cannot exceed contract budget (BR-53)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGeneratePdf = async () => {
    if (!contractCreated) {
      setError('Contract must be created first');
      return;
    }

    try {
      setGeneratingPdf(true);
      setError('');

      const response = await contractPostAPI.generateContractPdf(contractCreated.id, {
        includeTerms: true,
        includeNda: isPremiumClient,
        includeClauses: isPremiumClient
          ? ['scope', 'budget', 'timeline', 'payment', 'nda', 'ip-ownership', 'payment-watermark']
          : ['scope', 'budget', 'timeline', 'payment'],
      });

      if (response.data?.pdfUrl) {
        setPdfUrl(response.data.pdfUrl);
        setSuccess('Contract PDF generated successfully');
      } else {
        setError('Failed to generate PDF');
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setError('Failed to generate contract PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleCreateContract = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      const response = await contractPostAPI.createContractFromProposal(formData);

      if (response.data) {
        setContractCreated({
          id: response.data.contractsId,
          pdfUrl: response.data.esignContractPdfUrl || '',
        });
        setSuccess('Contract created successfully');
        setStep('terms');
      } else {
        setError('Failed to create contract');
      }
    } catch (err) {
      console.error('Failed to create contract:', err);
      setError('Failed to create contract. Please try again.');
    }
  };

  const handleSendForSignature = async () => {
    if (!contractCreated) {
      setError('Contract not found');
      return;
    }

    try {
      setSendingForSignature(true);
      setError('');

      const response = await contractPostAPI.sendForSignature(
        contractCreated.id,
        proposal?.freelancerName
      );

      if (response.data?.signatureUrl) {
        setSuccess('Contract sent for signature. Freelancer will receive a signing invitation.');
        setStep('confirm');
        // Navigate to contract details after a delay
        setTimeout(() => {
          navigate(`/contracts/${contractCreated.id}`);
        }, 2000);
      } else {
        setError('Failed to send contract for signature');
      }
    } catch (err) {
      console.error('Failed to send for signature:', err);
      setError('Failed to send contract for signature');
    } finally {
      setSendingForSignature(false);
    }
  };

  const handleInputChange = (field: keyof CreateContractDto, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="create-contract-page">
          <div className="create-contract-loading">
            <div className="spinner" />
            <p>{t('contracts.loadingProposal')}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!proposal) {
    return (
      <AppLayout>
        <div className="create-contract-page">
          <div className="create-contract-error">
            <AlertCircle size={32} />
            <h2>{error || t('contracts.proposalNotFound')}</h2>
            <button onClick={() => navigate(-1)}>{t('contracts.back')}</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="create-contract-page">
        <div className="create-contract-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← {t('contracts.back')}
          </button>
          <h1>{t('contracts.createEsignContract')}</h1>
          <p>{t('contracts.generateAndManage')}</p>
        </div>

        {error && (
          <div className="contract-alert alert-error">
            <AlertCircle size={18} />
            {error}
            <button onClick={() => setError('')}>
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="contract-alert alert-success">
            <CheckCircle size={18} />
            {success}
            <button onClick={() => setSuccess('')}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Steps indicator */}
        <div className="contract-steps">
          <div className={`step ${step === 'review' ? 'active' : contractCreated ? 'completed' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">{t('contracts.reviewProposal')}</span>
          </div>
          <div className="step-divider" />
          <div className={`step ${step === 'terms' ? 'active' : step === 'preview' || step === 'confirm' ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">{t('contracts.setTerms')}</span>
          </div>
          <div className="step-divider" />
          <div className={`step ${step === 'preview' ? 'active' : step === 'confirm' ? 'completed' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">{t('contracts.previewPdf')}</span>
          </div>
          <div className="step-divider" />
          <div className={`step ${step === 'confirm' ? 'active' : ''}`}>
            <span className="step-number">4</span>
            <span className="step-label">{t('contracts.sendForSigning')}</span>
          </div>
        </div>

        {/* Step: Review */}
        {step === 'review' && (
          <div className="contract-step-content">
            <div className="contract-section">
              <h2>{t('contracts.proposalOverview')}</h2>

              <div className="proposal-summary-card">
                <div className="summary-header">
                  <div>
                    <img
                      src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${proposal.freelancerName}`}
                      alt={proposal.freelancerName}
                      className="freelancer-avatar"
                    />
                    <div>
                      <h3>{proposal.freelancerName || t('contracts.unknown')}</h3>
                      <p>{proposal.jobTitle}</p>
                    </div>
                  </div>
                  <span className="proposal-status">{t('contracts.milestoneStatus.Approved')}</span>
                </div>

                <div className="summary-details">
                  <div className="detail-item">
                    <GigCoinLogo size={16} />
                    <span>{t('contracts.proposedBudget')}</span>
                    <strong>${(proposal.proposedBudget || 0).toLocaleString()}</strong>
                  </div>
                  <div className="detail-item">
                    <Calendar size={16} />
                    <span>{t('contracts.duration')}</span>
                    <strong>{proposal.proposedDuration || t('contracts.other')}</strong>
                  </div>
                  <div className="detail-item">
                    <FileText size={16} />
                    <span>{t('contracts.coverLetter')}</span>
                    <p className="cover-letter-preview">{proposal.coverLetter || t('contracts.noCoverLetter')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="contract-actions">
              <button className="btn-primary" onClick={() => setStep('terms')}>
                {t('contracts.proceedToTerms')} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Terms */}
        {step === 'terms' && (
          <div className="contract-step-content">
            <div className="contract-section">
              <h2>{t('contracts.contractTerms')}</h2>

              <form className="contract-form">
                <div className="form-group">
                  <label>{t('contracts.contractTitle')}</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => handleInputChange('title', e.target.value)}
                    placeholder="e.g., Web Development Project"
                    maxLength={255}
                  />
                  {validationErrors.title && <span className="form-error">{validationErrors.title}</span>}
                  <span className="form-hint">{formData.title.length}/255 {t('contracts.characters')}</span>
                </div>

                <div className="form-group">
                  <label>{t('contracts.scope')}</label>
                  <textarea
                    value={formData.description}
                    onChange={e => handleInputChange('description', e.target.value)}
                    placeholder="Define deliverables, boundaries, acceptance criteria, and responsibilities..."
                    rows={4}
                  />
                  {validationErrors.description && <span className="form-error">{validationErrors.description}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t('contracts.totalBudget')}</label>
                    <div className="input-with-prefix">
                      <span>$</span>
                      <input
                        type="number"
                        value={formData.totalBudget}
                        onChange={e => handleInputChange('totalBudget', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    {validationErrors.totalBudget && <span className="form-error">{validationErrors.totalBudget}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t('contracts.startDate')}</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={e => handleInputChange('startDate', e.target.value)}
                    />
                    {validationErrors.startDate && <span className="form-error">{validationErrors.startDate}</span>}
                  </div>

                  <div className="form-group">
                    <label>{t('contracts.endDateOptional')}</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={e => handleInputChange('endDate', e.target.value)}
                    />
                    {validationErrors.endDate && <span className="form-error">{validationErrors.endDate}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label>{t('contracts.paymentTerms')}</label>
                  <textarea
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    placeholder="Describe escrow funding, approval, release, and revision rules..."
                    rows={3}
                  />
                  {validationErrors.paymentTerms && <span className="form-error">{validationErrors.paymentTerms}</span>}
                </div>

                <div className="contract-milestone-editor">
                  <div className="milestone-editor-header">
                    <div>
                      <h3>{t('contracts.milestones')}</h3>
                      <p>Total allocation must stay within contract budget.</p>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setMilestoneDrafts(prev => [
                        ...prev,
                        { title: '', amount: 0, dueDate: '' },
                      ])}
                    >
                      {t('contracts.addMilestone')}
                    </button>
                  </div>

                  {validationErrors.milestones && <span className="form-error">{validationErrors.milestones}</span>}

                  <div className="milestone-draft-list">
                    {milestoneDrafts.map((milestone, index) => (
                      <div className="milestone-draft-row" key={`milestone-draft-${index}`}>
                        <input
                          type="text"
                          value={milestone.title}
                          onChange={e => setMilestoneDrafts(prev => prev.map((item, i) => i === index ? { ...item, title: e.target.value } : item))}
                          placeholder={t('contracts.milestoneTitle')}
                        />
                        <input
                          type="number"
                          value={milestone.amount}
                          onChange={e => setMilestoneDrafts(prev => prev.map((item, i) => i === index ? { ...item, amount: parseFloat(e.target.value) || 0 } : item))}
                          min="0"
                          placeholder={t('contracts.amount')}
                        />
                        <input
                          type="date"
                          value={milestone.dueDate}
                          onChange={e => setMilestoneDrafts(prev => prev.map((item, i) => i === index ? { ...item, dueDate: e.target.value } : item))}
                        />
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setMilestoneDrafts(prev => prev.filter((_, i) => i !== index))}
                          disabled={milestoneDrafts.length === 1}
                        >
                          {t('contracts.remove')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {isPremiumClient && (
                  <div className="premium-legal-box">
                    <Zap size={18} />
                    <div>
                      <h3>{t('contracts.premiumLegalAutomation')}</h3>
                      <p>{t('contracts.premiumLegalDesc')}</p>
                    </div>
                  </div>
                )}

                <div className="terms-checkbox">
                  <input type="checkbox" id="terms-agree" defaultChecked />
                  <label htmlFor="terms-agree">{t('contracts.standardTermsAgree')}</label>
                </div>
              </form>
            </div>

            <div className="contract-actions">
              <button className="btn-secondary" onClick={() => setStep('review')}>
                ← {t('contracts.back')}
              </button>
              <button className="btn-primary" onClick={handleCreateContract}>
                {t('contracts.createContract')} <FileText size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && contractCreated && (
          <div className="contract-step-content">
            <div className="contract-section">
              <h2>{t('contracts.previewContractPdf')}</h2>

              <div className="pdf-preview-container">
                {pdfUrl ? (
                  <>
                    <div className="pdf-viewer">
                      <iframe src={pdfUrl} title={t('contracts.pdfViewerTitle')} />
                    </div>
                    <a href={pdfUrl} download="contract.pdf" className="btn-secondary">
                      <Download size={16} />
                      {t('contracts.downloadPdf')}
                    </a>
                  </>
                ) : (
                  <div className="pdf-generation">
                    <p>{t('contracts.pdfGenerationDesc')}</p>
                    <button
                      className="btn-primary"
                      onClick={handleGeneratePdf}
                      disabled={generatingPdf}
                    >
                      {generatingPdf ? (
                        <>
                          <span className="spinner small" />
                          {t('contracts.generatingPdf')}
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          {t('contracts.generatePdf')}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="contract-summary">
                <h3>{t('contracts.contractSummary')}</h3>
                <div className="summary-grid">
                  <div>
                    <span>{t('contracts.client')}</span>
                    <strong>{user?.fullName || t('contracts.clientYou')}</strong>
                  </div>
                  <div>
                    <span>{t('contracts.freelancer')}</span>
                    <strong>{proposal.freelancerName}</strong>
                  </div>
                  <div>
                    <span>{t('contracts.contractTitle')}</span>
                    <strong>{formData.title}</strong>
                  </div>
                  <div>
                    <span>{t('contracts.budget')}</span>
                    <strong>${(formData.totalBudget || 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>{t('contracts.startDate')}</span>
                    <strong>{new Date(formData.startDate).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span>{t('contracts.endDate')}</span>
                    <strong>{formData.endDate ? new Date(formData.endDate).toLocaleDateString() : 'N/A'}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="contract-actions">
              <button className="btn-secondary" onClick={() => setStep('terms')}>
                ← {t('contracts.back')}
              </button>
              <button className="btn-primary" onClick={() => setStep('confirm')}>
                {t('contracts.proceedToSigning')} <Send size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && contractCreated && (
          <div className="contract-step-content">
            <div className="contract-section">
              <h2>{t('contracts.sendForEsign')}</h2>

              <div className="signature-info">
                <CheckCircle size={48} className="success-icon" />
                <h3>{t('contracts.contractCreatedSuccess')}</h3>
                <p>{t('contracts.readyToSendEsign')}</p>

                <div className="signature-details">
                  <div className="detail-box">
                    <Users size={20} />
                    <div>
                      <h4>{t('contracts.freelancer')}</h4>
                      <p>{proposal.freelancerName}</p>
                    </div>
                  </div>

                  <div className="detail-box">
                    <FileText size={20} />
                    <div>
                      <h4>{t('contracts.document')}</h4>
                      <p>{formData.title}</p>
                    </div>
                  </div>

                  <div className="detail-box">
                    <GigCoinLogo size={20} />
                    <div>
                      <h4>{t('contracts.amount')}</h4>
                      <p>${(formData.totalBudget || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="signature-process">
                  <h4>{t('contracts.whatHappensNext')}</h4>
                  <ol>
                    <li>{t('contracts.step1')}</li>
                    <li>{t('contracts.step2')}</li>
                    <li>{t('contracts.step3')}</li>
                    <li>{t('contracts.step4')}</li>
                    <li>{t('contracts.step5')}</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="contract-actions">
              <button className="btn-secondary" onClick={() => setStep('preview')}>
                ← {t('contracts.backToPreview')}
              </button>
              <button
                className="btn-primary btn-large"
                onClick={handleSendForSignature}
                disabled={sendingForSignature}
              >
                {sendingForSignature ? (
                  <>
                    <span className="spinner small" />
                    {t('contracts.sendingForSignature')}
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    {t('contracts.sendContractForEsign')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
