import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { 
  Check, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../../../shared/components/AppLayout';
import '../styles/PostJobScreen.css';

export default function CreatePostJobContractScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  const jobData = location.state?.jobData;
  const jobPostId = location.state?.jobPostId;

  useEffect(() => {
    if (!jobData || !jobPostId) {
      toast.error('Created JobPost data is missing. Redirecting to Job Creation step.');
      navigate('/jobs/post');
    }
  }, [jobData, jobPostId, navigate]);

  const [contractForm, setContractForm] = useState({
    title: jobData?.title ? `${jobData.title} Contract` : '',
    description: jobData?.description || '',
    budget: jobData?.budgetMax !== undefined && jobData?.budgetMax !== null
      ? String(jobData.budgetMax)
      : jobData?.budgetMin !== undefined && jobData?.budgetMin !== null
        ? String(jobData.budgetMin)
        : '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: jobData?.deadline || '',
  });

  const handleBack = () => {
    navigate('/jobs/post', { state: { jobData, jobPostId } });
  };

  const handleSubmit = () => {
    if (!contractForm.title || !contractForm.budget || !contractForm.endDate) {
      alert('Please fill in all contract details (Title, Budget, End Date)');
      return;
    }

    navigate('/jobs/post/contract/esign', {
      state: {
        jobPostId: location.state?.jobPostId,
        jobData,
        contractForm,
      }
    });
  };

  return (
    <AppLayout>
      <div className="max-w-[1440px] mx-auto px-6 py-8 relative">
        {/* Background Mesh Gradient (Subtle) */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(159,75,255,0.02),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(0,119,255,0.02),transparent_50%)] opacity-50 pointer-events-none" />

        {/* Header & Stepper */}
        <div className="flex flex-col gap-6 items-center mb-8">
          <div className="flex justify-center w-full">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground text-center uppercase" style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif", letterSpacing: '0.05em' }}>
              Create New Contract
            </h1>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center w-full max-w-5xl mx-auto py-4">
            {/* Step 1: Completed */}
            <div className="flex items-center gap-3 cursor-pointer group" onClick={handleBack}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md font-bold text-sm bg-green-500 text-white hover:bg-green-600 transition-colors">
                <Check size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-green-500 uppercase tracking-wider font-bold">Step 1</span>
                <span className="text-xs font-bold text-green-500 group-hover:underline">Project Details</span>
              </div>
            </div>
            {/* Connector */}
            <div className="flex-grow mx-6 h-[2px] bg-green-500 rounded-full opacity-60" />
            {/* Step 2: Active */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md font-bold text-sm bg-[var(--gb-cyan)] text-white">
                2
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--gb-cyan)] uppercase tracking-wider font-bold">Step 2</span>
                <span className="text-xs font-bold text-foreground">Contract Setup</span>
              </div>
            </div>
            {/* Connector */}
            <div className="flex-grow mx-6 h-[2px] bg-border rounded-full opacity-50" />
            {/* Step 3: Coming */}
            <div className="flex items-center gap-3 opacity-60">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm">3</div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Step 3</span>
                <span className="text-xs font-bold text-muted-foreground">E-Sign Contract</span>
              </div>
            </div>
            <div className="flex-grow mx-6 h-[2px] bg-border rounded-full opacity-50" />
            {/* Step 4: Coming */}
            <div className="flex items-center gap-3 opacity-60">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm">4</div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Step 4</span>
                <span className="text-xs font-bold text-muted-foreground">Setup Milestone</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Contract Details Layout */}
        <div className="flex flex-col gap-6 max-w-5xl mx-auto">
          {/* Main Details Card */}
          <div className="bg-card rounded-2xl border border-border p-8 shadow-sm flex flex-col gap-6">
            <h2 className="text-lg font-bold border-b border-border pb-4 mb-2 text-foreground">Contract Details</h2>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="contract-title">Title</label>
                <input 
                  id="contract-title"
                  type="text" 
                  placeholder="e.g. Senior UX Designer Retainer" 
                  value={contractForm.title}
                  onChange={e => setContractForm({ ...contractForm, title: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all text-foreground font-medium"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="contract-desc">Description</label>
                <textarea 
                  id="contract-desc"
                  placeholder="Detail the scope of work, deliverables, and expectations..." 
                  value={contractForm.description}
                  onChange={e => setContractForm({ ...contractForm, description: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all text-foreground resize-y leading-relaxed"
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="contract-budget">Total Budget *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">$</span>
                    <input 
                      id="contract-budget"                                                                                                                                                 
                      type="number" 
                      placeholder="5000" 
                      value={contractForm.budget}
                      onChange={e => setContractForm({ ...contractForm, budget: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all text-foreground font-semibold"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="contract-start">Start Date (Created Date)</label>
                  <input 
                    id="contract-start"
                    type="date" 
                    value={contractForm.startDate}
                    onChange={e => setContractForm({ ...contractForm, startDate: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all text-foreground cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="contract-end">End Date (Deadline)</label>
                  <input 
                    id="contract-end"
                    type="date" 
                    value={contractForm.endDate}
                    onChange={e => setContractForm({ ...contractForm, endDate: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gb-cyan)]/25 focus:border-[var(--gb-cyan)] transition-all text-foreground cursor-pointer"
                  />
                </div>
              </div>
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
            Back to Project Details
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={!contractForm.title || !contractForm.budget || !contractForm.endDate}
            className="w-full md:w-auto px-10 py-3 rounded-full font-bold text-sm bg-[var(--gb-cyan)] text-white hover:bg-[var(--gb-cyan)]/90 shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group cursor-pointer border-none"
          >
            <>
              <span>Continue to E-Sign Contract</span>
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
            </>
          </button>
        </div>

      </div>
    </AppLayout>
  );
}
