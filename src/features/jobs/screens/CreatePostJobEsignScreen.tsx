import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Check, ChevronLeft, Send, Loader2, AlertTriangle } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { esignGetAPI } from '../../../api/esignAPI/GET';
import { esignPostAPI } from '../../../api/esignAPI/POST';
import type { ESignDocumentDto } from '../../../types/models/ESign';
import { ESignDocumentStatus, SignatureStatus } from '../../../types/models/ESign';
import { toast } from 'sonner';
import { SuccessMilestoneSetupModal } from '../components/SuccessMilestoneSetupModal';
import { InviteFreelancersAfterPostModal } from '../components/InviteFreelancersAfterPostModal';
import '../styles/PostJobScreen.css';

export default function CreatePostJobEsignScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();

  const jobPostId: string | undefined = location.state?.jobPostId;
  const jobData = location.state?.jobData;
  const contractForm = location.state?.contractForm;

  // Document state
  const [document, setDocument] = useState<ESignDocumentDto | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Signature state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isInviteFreelancersModalOpen, setIsInviteFreelancersModalOpen] = useState(false);
  const [createdContractId, setCreatedContractId] = useState<string | null>(null);

  // Canvas drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Check if user already signed this document
  const currentUserSignature = document?.signatures?.find(
    (sig) => sig.userId === user?.id
  );
  const hasAlreadySigned = currentUserSignature?.status === SignatureStatus.Signed;

  // Redirect if no jobPostId
  useEffect(() => {
    if (!jobPostId) {
      toast.error('Missing job post information. Redirecting to job creation.');
      navigate('/jobs/post');
    }
  }, [jobPostId, navigate]);

  // Load or create the E-sign document
  useEffect(() => {
    if (!jobPostId) return;

    let isMounted = true;

    const loadDocument = async () => {
      setIsLoadingDocument(true);
      setLoadError(null);

      try {
        // Try fetching the existing document first
        const getResponse = await esignGetAPI.getDocumentByJob(jobPostId);

        if (getResponse.success && getResponse.data) {
          if (isMounted) setDocument(getResponse.data);
          if (getResponse.data.status === ESignDocumentStatus.FullySigned) {
            const contractResponse = await contractGetAPI.getContractByJobPost(jobPostId);
            if (isMounted && contractResponse.success && contractResponse.data) {
              setCreatedContractId(contractResponse.data.contractsId);
            }
          }
        } else {
          // No document exists yet — create one from the job post template
          const createResponse = await esignPostAPI.createDocumentFromJob(jobPostId);
          if (!createResponse.success || !createResponse.data) {
            throw new Error(createResponse.message || 'Failed to generate E-sign document.');
          }
          if (isMounted) setDocument(createResponse.data);
        }
      } catch (err) {
        if (isMounted) {
          setDocument(null);
          setCreatedContractId(null);
          setLoadError(err instanceof Error ? err.message : 'Unable to load the E-sign document from the server.');
        }
      } finally {
        if (isMounted) setIsLoadingDocument(false);
      }
    };

    loadDocument();

    return () => {
      isMounted = false;
    };
  }, [jobPostId]);

  // Initialize canvas when modal opens
  useEffect(() => {
    if (isModalOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = 540;
      canvas.height = 220;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#0247a3';
      }
    }
  }, [isModalOpen]);

  // Prevent touch scroll when signing
  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if (e.target === canvasRef.current) {
        e.preventDefault();
      }
    };
    window.document.body.addEventListener('touchstart', preventDefault, { passive: false });
    window.document.body.addEventListener('touchmove', preventDefault, { passive: false });
    return () => {
      window.document.body.removeEventListener('touchstart', preventDefault);
      window.document.body.removeEventListener('touchmove', preventDefault);
    };
  }, [isModalOpen]);

  // --- Canvas drawing handlers ---

  const getEventCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    rect: DOMRect
  ) => {
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const { x, y } = getEventCoords(e, rect);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const { x, y } = getEventCoords(e, rect);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const isCanvasBlank = (canvas: HTMLCanvasElement): boolean => {
    const blank = window.document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
  };

  const handleCompleteSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isCanvasBlank(canvas)) {
      toast.error('Please draw your signature before confirming.');
      return;
    }

    const confirmSign = window.confirm('Do you confirm using this signature?');
    if (confirmSign) {
      setSignatureImage(canvas.toDataURL());
      setIsModalOpen(false);
    }
  };

  const handleFinalize = async () => {
    if (submittingRef.current) return;
    if (!signatureImage || !document) {
      toast.error('Please sign the document before submitting.');
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Submit the signature via SubmitESignSignatureDto
      const submitResponse = await esignPostAPI.submitSignature({
        documentId: document.documentId,
        signatureImageUrl: signatureImage,
        signatureWidth: canvasRef.current?.width ?? 540,
        signatureHeight: canvasRef.current?.height ?? 220,
      });

      if (!submitResponse.success) {
        if (submitResponse.statusCode === 409) {
          // Already signed, proceed as success!
          toast.success('E-sign signature recorded.');
          const contractResponse = await contractGetAPI.getContractByJobPost(jobPostId!);
          if (contractResponse.success && contractResponse.data) {
            setCreatedContractId(contractResponse.data.contractsId);
          } else {
            console.warn('Draft contract not found for job post after E-sign. User can navigate manually.');
            setCreatedContractId(null);
          }
          setIsSuccessModalOpen(true);
          return;
        }
        throw new Error(submitResponse.message || 'Failed to submit E-sign signature.');
      }

      toast.success('E-sign signature submitted successfully!');

      // Fetch the draft contract created by the backend on E-sign completion
      const contractResponse = await contractGetAPI.getContractByJobPost(jobPostId!);
      if (contractResponse.success && contractResponse.data) {
        setCreatedContractId(contractResponse.data.contractsId);
      } else {
        // If contract isn't found immediately, still show success
        console.warn('Draft contract not found for job post after E-sign. User can navigate manually.');
        setCreatedContractId(null);
      }

      setIsSuccessModalOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit E-sign signature.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };  // --- Navigation ---

  const handleBackToProject = () => {
    navigate('/jobs/post', {
      state: { jobPostId, jobData },
    });
  };

  const handleBack = () => {
    navigate('/jobs/post/contract', {
      state: { jobPostId, jobData, contractForm },
    });
  };

  const handleNavigateToMilestones = () => {
    if (createdContractId) {
      navigate(`/contracts/${createdContractId}/milestones?mode=jobpost-setup`);
    } else {
      toast.error('Contract not ready yet. Please try again from My Jobs.');
      navigate('/jobs/my-jobs');
    }
  };

  // --- Render ---

  if (isLoadingDocument) {
    return (
      <AppLayout>
        <div className="max-w-[1440px] mx-auto px-6 py-16 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--gb-cyan)]" />
          <p className="text-sm text-muted-foreground font-semibold">Loading E-sign document...</p>
        </div>
      </AppLayout>
    );
  }

  if (loadError || !document) {
    return (
      <AppLayout>
        <div className="max-w-[1440px] mx-auto px-6 py-16 flex flex-col items-center justify-center gap-4">
          <AlertTriangle className="w-10 h-10 text-red-500" />
          <p className="text-sm text-red-500 font-semibold">{loadError || 'Document could not be loaded.'}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="px-6 py-3 rounded-full font-bold text-sm bg-[var(--gb-cyan)] text-white hover:opacity-90 transition-all cursor-pointer">Retry</button>
            <button type="button" onClick={handleBack} className="px-6 py-3 rounded-full font-bold text-sm border border-border bg-background text-foreground hover:bg-muted transition-all cursor-pointer">Go Back</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-[1440px] mx-auto px-6 py-8 relative">
        {/* Background Mesh Gradient */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(159,75,255,0.02),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(0,119,255,0.02),transparent_50%)] opacity-50 pointer-events-none" />

        {/* Header & Stepper */}
        <div className="flex flex-col gap-6 items-center mb-8">
          <div className="flex justify-center w-full">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground text-center uppercase" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif", letterSpacing: '0.05em' }}>
              E-Sign Contract
            </h1>
          </div>

          {/* Stepper: Step 1 done → Step 2 active */}
          <div className="flex items-center justify-center w-full max-w-5xl mx-auto py-4">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={handleBackToProject}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md font-bold text-sm bg-green-500 text-white hover:bg-green-600 transition-colors">
                <Check size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-green-500 uppercase tracking-wider font-bold">Step 1</span>
                <span className="text-xs font-bold text-green-500 group-hover:underline">Project Details</span>
              </div>
            </div>
            <div className="flex-grow mx-6 h-[2px] bg-green-500 rounded-full opacity-60" />
            <div className="flex items-center gap-3 cursor-pointer group" onClick={handleBack}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md font-bold text-sm bg-green-500 text-white hover:bg-green-600 transition-colors">
                <Check size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-green-500 uppercase tracking-wider font-bold">Step 2</span>
                <span className="text-xs font-bold text-green-500 group-hover:underline">Contract Setup</span>
              </div>
            </div>
            <div className="flex-grow mx-6 h-[2px] bg-green-500 rounded-full opacity-60" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md font-bold text-sm bg-[var(--gb-cyan)] text-white">
                3
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--gb-cyan)] uppercase tracking-wider font-bold">Step 3</span>
                <span className="text-xs font-bold text-foreground">E-Sign Contract</span>
              </div>
            </div>
            <div className="flex-grow mx-6 h-[2px] bg-border rounded-full opacity-50" />
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm">
                4
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Step 4</span>
                <span className="text-xs text-muted-foreground font-bold">Setup Milestone</span>
              </div>
            </div>
          </div>
        </div>

        {/* Already signed notice */}
        {hasAlreadySigned && (
          <div className="max-w-[850px] mx-auto mb-4 bg-green-500/10 border border-green-500/20 text-green-600 rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2">
            <Check size={16} />
            You have already signed this document. You can proceed to milestone setup.
          </div>
        )}

        {/* Document status badge */}
        {document.status === ESignDocumentStatus.FullySigned && (
          <div className="max-w-[850px] mx-auto mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2">
            <Check size={16} />
            This document has been fully signed by all parties.
          </div>
        )}

        {/* Rendered HTML Document */}
        <div className="max-w-[850px] mx-auto bg-white text-black p-12 shadow-2xl border border-slate-200 rounded-sm font-serif leading-relaxed relative overflow-hidden my-4 select-text">
          {/* Render the backend's HTML template */}
          <div
            dangerouslySetInnerHTML={{ __html: document.renderedHtmlContent }}
          />

          {/* Signature Area */}
          <div className="flex justify-end text-center text-xs mt-8 pb-4 border-t border-dashed border-slate-300 pt-6">
            <div className="w-72 flex flex-col items-center">
              <span className="font-bold">Xác nhận của chủ thể đăng ký dịch vụ</span>
              <span className="text-[10px] italic text-slate-500 mt-0.5">(Cá nhân ký tên / Đại diện doanh nghiệp đóng dấu)</span>

              <div className="h-32 flex items-center justify-center mt-4 mb-2 w-full relative">
                {signatureImage ? (
                  <img
                    src={signatureImage}
                    alt="Signature"
                    className="max-h-full max-w-full object-contain mix-blend-multiply border border-dashed border-slate-200 rounded p-1"
                  />
                ) : hasAlreadySigned && currentUserSignature?.signatureImageUrl ? (
                  <img
                    src={currentUserSignature.signatureImageUrl}
                    alt="Existing Signature"
                    className="max-h-full max-w-full object-contain mix-blend-multiply border border-dashed border-slate-200 rounded p-1"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs shadow-md transition-all border-none cursor-pointer flex items-center gap-1.5"
                  >
                    Click to sign
                  </button>
                )}
              </div>

              <span className="font-bold underline text-slate-800 tracking-wide mt-2">
                {user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-card border border-border rounded-2xl p-6 mt-8 flex justify-between items-center shadow-sm max-w-5xl mx-auto">
          <button
            type="button"
            onClick={handleBack}
            className="px-6 py-3 rounded-full font-bold text-sm border border-border bg-background text-muted-foreground hover:bg-muted transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ChevronLeft size={16} />
            Back to Contract Setup
          </button>

          {hasAlreadySigned ? (
            <button
              type="button"
              onClick={handleNavigateToMilestones}
              className="px-10 py-3 rounded-full font-bold text-sm bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer border-none group"
            >
              <span>Continue to Milestone Setup</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalize}
              disabled={isSubmitting || !signatureImage}
              className="w-full md:w-auto px-10 py-3 rounded-full font-bold text-sm bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group cursor-pointer border-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Sign & Continue</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Signature Drawing Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-lg border-2 border-[#ff3b86] w-full max-w-[600px] overflow-hidden shadow-2xl relative animate-[fadeIn_0.2s_ease-out]">
              {/* Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                <div className="flex flex-col text-[#c0005a] leading-none">
                  <span className="font-extrabold text-base tracking-widest uppercase">GIGBRIDGE LTD</span>
                  <span className="text-[10px] font-semibold text-slate-500 mt-1">Digital E-Sign</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors border-none cursor-pointer font-bold text-xs"
                >
                  X
                </button>
              </div>

              {/* Body */}
              <div className="p-6 flex flex-col gap-4 text-black">
                {/* Guidelines */}
                <div className="border border-slate-300 rounded p-4 bg-slate-50/50 text-xs leading-relaxed space-y-2">
                  <p>
                    <span className="font-bold">Instructions:</span> Draw your signature by clicking/tapping and holding in the area below. Click "Confirm" when done.
                  </p>
                  <p>
                    <span className="font-bold">Note:</span> By clicking "Confirm", you acknowledge that you have read and agree to the terms in this contract.
                  </p>
                </div>

                {/* Canvas Signature Area */}
                <div className="relative border border-[#1782fc] rounded-lg h-[222px] bg-white group overflow-hidden">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="absolute top-2 right-2 px-3 py-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded text-xs font-bold border border-slate-300 transition-colors z-20 cursor-pointer"
                  >
                    Clear
                  </button>
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="absolute inset-0 w-full h-full z-10 cursor-crosshair"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 z-0">
                    <span className="text-sm tracking-wider uppercase font-semibold text-slate-400">Draw your signature here</span>
                  </div>
                </div>

                {/* Confirm Actions */}
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2 border border-slate-300 text-slate-600 rounded hover:bg-slate-100 font-semibold text-xs cursor-pointer bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteSignature}
                    className="px-6 py-2 bg-[#ff3b86] text-white rounded hover:bg-[#e02b70] font-bold text-xs cursor-pointer border-none shadow-sm"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal → Navigate to milestone setup */}
        <SuccessMilestoneSetupModal
          isOpen={isSuccessModalOpen}
          onClose={() => navigate('/jobs/my-jobs')}
          onInvite={() => {
            setIsSuccessModalOpen(false);
            setIsInviteFreelancersModalOpen(true);
          }}
          onSetup={handleNavigateToMilestones}
        />
        {isInviteFreelancersModalOpen && (
          <InviteFreelancersAfterPostModal
            jobPostId={jobPostId || ''}
            jobTitle={jobData?.title || contractForm?.title}
            onClose={() => setIsInviteFreelancersModalOpen(false)}
          />
        )}
      </div>
    </AppLayout>
  );
}
