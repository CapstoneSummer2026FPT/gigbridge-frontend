import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { disputeGetAPI } from '../../../api/disputeAPI';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { ContractStatus, type ContractDto, type Milestone } from '../../../types/models/Contract';
import { UserRole } from '../../../types/models/User';
import type { Dispute } from '../../../types/models/Dispute';
import { ClientContractDetails } from '../components/ClientContractDetails';
import { FreelancerContractDetails } from '../components/FreelancerContractDetails';
import { ProjectReviewDialog } from '../../reviews/components/ProjectReviewDialog';
import { useContractReadyForEscrowEvent } from '../hooks/useContractReadyForEscrowEvent';
import { useContractCancelledEvent } from '../hooks/useContractCancelledEvent';
import { useContractEscrowFundedEvent } from '../hooks/useContractEscrowFundedEvent';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';

interface AuditTrailEntry {
  id: string;
  action: string;
  timestamp: string;
  performedBy: string;
  performedByRole: 'Client' | 'Freelancer' | 'Admin';
  details?: string;
  metadata?: Record<string, any>;
}

interface ClientProfile {
  profilesId?: string;
  fullName?: string;
  email?: string;
  profileImageUrl?: string;
  avatarUrl?: string;
  companyName?: string;
  verificationStatus?: 'Verified' | 'Pending' | 'Unverified';
}

interface FreelancerProfile {
  profilesId?: string;
  fullName?: string;
  email?: string;
  profileImageUrl?: string;
  avatarUrl?: string;
  headline?: string;
  verificationStatus?: 'Verified' | 'Pending' | 'Unverified';
}

interface ContractDetailsData extends ContractDto {
  clientProfile?: ClientProfile;
  freelancerProfile?: FreelancerProfile;
  milestones?: Milestone[];
  auditTrail?: AuditTrailEntry[];
}

type ContractUserRole = 'client' | 'freelancer' | 'admin' | 'none';

export default function ViewContractDetailsScreen() {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const { user } = useApp();
  const { t } = useTranslation(['contracts', 'common']);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [contract, setContract] = useState<ContractDetailsData | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<ContractUserRole>('none');
  const [activeDispute, setActiveDispute] = useState<Dispute | null>(null);
  const [activeDisputeError, setActiveDisputeError] = useState<string | null>(null);
  const [activeDisputeLoading, setActiveDisputeLoading] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // GSAP Entrance animation
  usePageGSAP({
    containerRef,
    loading,
    groups: [
      { selector: '.vcd-gsap-header', y: 20, duration: 0.55 },
      { selector: '.vcd-gsap-main', y: 24, duration: 0.5 },
      { selector: '.vcd-gsap-sidebar', y: 24, duration: 0.5, stagger: 0.1 },
    ],
  });

  // Determine user role relative to contract
  useEffect(() => {
    if (!user || !contract) return;

    const userProfileId = (user as any).profileId || user.id;

    // Admin role check
    const isAdmin = user.role === UserRole.Admin;
    if (isAdmin) {
      setUserRole('admin');
      return;
    }

    // Check if user is client
    const isClient = user.role === UserRole.Client;
    if (contract.clientProfilesId === userProfileId || (!((user as any).profileId) && isClient)) {
      setUserRole('client');
      return;
    }

    // Check if user is freelancer
    const isFreelancer = user.role === UserRole.Freelancer;
    if (contract.freelancerProfilesId === userProfileId || (!((user as any).profileId) && isFreelancer)) {
      setUserRole('freelancer');
      return;
    }

    setUserRole('none');
  }, [user, contract]);

  // Load contract details from API
  const loadContractDetails = useCallback(async () => {
    if (!contractId) {
      setError(t('contracts.noContractIdParam'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setActiveDisputeLoading(true);
      setActiveDisputeError(null);

      const apiResponse = await contractGetAPI.getContractById(contractId);
      
      if (apiResponse.success && apiResponse.data) {
        const contractData = apiResponse.data as ContractDetailsData;
        
        const shouldLoadActiveDispute = user?.role === UserRole.Client || user?.role === UserRole.Freelancer;
        const [milestonesResponse, activeDisputeResponse] = await Promise.all([
          contractGetAPI.getMilestonesByContract(contractId),
          shouldLoadActiveDispute
            ? disputeGetAPI.getActiveDispute(contractId)
            : Promise.resolve(null),
        ]);
        const milestonesList = milestonesResponse.success && milestonesResponse.data 
          ? milestonesResponse.data 
          : [];
          
        setContract(contractData);
        setMilestones(milestonesList);
        if (activeDisputeResponse) {
          if (activeDisputeResponse.success) {
            setActiveDispute(activeDisputeResponse.data ?? null);
          } else {
            setActiveDispute(null);
            setActiveDisputeError(activeDisputeResponse.message || t('contracts.checkingDispute'));
          }
        } else {
          setActiveDispute(null);
        }
        generateAuditTrail(contractData);
      } else {
        setError(apiResponse.message || t('contracts.unableToLoadContract'));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('contracts.anErrorOccurred');
      setError(errorMsg);
    } finally {
      setLoading(false);
      setActiveDisputeLoading(false);
    }
  }, [contractId, user?.role]);

  useEffect(() => {
    void loadContractDetails();
  }, [loadContractDetails]);

  useContractReadyForEscrowEvent(
    contractId,
    userRole === 'client' && contract?.status === ContractStatus.PendingSignature,
    loadContractDetails
  );

  useContractCancelledEvent(
    contractId,
    userRole === 'client' || userRole === 'freelancer',
    loadContractDetails
  );

  // Swaps the freelancer's "waiting for escrow funding" card straight into the Active
  // contract view the moment the client funds, without a reload.
  useContractEscrowFundedEvent(
    contractId,
    (userRole === 'client' || userRole === 'freelancer') &&
      contract?.status !== undefined &&
      contract.status < ContractStatus.Active,
    loadContractDetails
  );

  // Generate audit trail entries from contract metadata
  const generateAuditTrail = (contractData: ContractDetailsData) => {
    const trail: AuditTrailEntry[] = [];

    // Contract created
    trail.push({
      id: '1',
      action: 'Contract Created',
      timestamp: contractData.createdAt,
      performedBy: contractData.clientProfilesId || 'Client',
      performedByRole: 'Client',
      details: `Contract "${contractData.title}" created from proposal`,
      metadata: {
        budget: contractData.totalBudget,
        contractType: 'Fixed Price',
      }
    });

    // Contract started
    if (contractData.startDate) {
      trail.push({
        id: '2',
        action: 'Contract Started',
        timestamp: contractData.startDate,
        performedBy: 'System',
        performedByRole: 'Admin',
        details: 'Contract work period began'
      });
    }

    // Contract status changes
    if (contractData.status === ContractStatus.Completed && contractData.completedAt) {
      trail.push({
        id: '3',
        action: 'Contract Completed',
        timestamp: contractData.completedAt,
        performedBy: contractData.clientProfilesId || 'Client',
        performedByRole: 'Client',
        details: 'All milestones approved and paid'
      });
    }

    setAuditTrail(trail);
  };

  const hasAccess = (): boolean => {
    return userRole !== 'none';
  };

  if (!contractId) {
    return (
      <AppLayout>
        <div className="w-full max-w-md mx-auto py-20 px-6 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-text-primary">{t('contracts.invalidContract')}</h2>
          <p className="text-xs font-semibold text-text-muted">{t('contracts.noContractIdParam')}</p>
          <button 
            type="button"
            onClick={() => navigate('/contracts')} 
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-extrabold text-white hover:opacity-90 transition cursor-pointer"
          >
            <ArrowLeft size={14} /> {t('contracts.backToContracts')}
          </button>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout fullWidth>
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-12 bg-background">
          <LemniscateBloomLoader label={t('contracts.loadingContract')} size={56} />
        </div>
      </AppLayout>
    );
  }

  if (error || !contract) {
    return (
      <AppLayout>
        <div className="w-full max-w-md mx-auto py-20 px-6 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-text-primary">{t('contracts.unableToLoadContract')}</h2>
          <p className="text-xs font-semibold text-text-muted">{error || t('contracts.contractNotFound')}</p>
          <button 
            type="button"
            onClick={() => navigate('/contracts')} 
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-extrabold text-white hover:opacity-90 transition cursor-pointer"
          >
            <ArrowLeft size={14} /> {t('contracts.backToContracts')}
          </button>
        </div>
      </AppLayout>
    );
  }

  if (!hasAccess()) {
    return (
      <AppLayout>
        <div className="w-full max-w-md mx-auto py-20 px-6 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-text-primary">{t('contracts.accessDenied')}</h2>
          <p className="text-xs font-semibold text-text-muted">{t('contracts.noPermissionResource')}</p>
          <button 
            type="button"
            onClick={() => navigate('/contracts')} 
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-extrabold text-white hover:opacity-90 transition cursor-pointer"
          >
            <ArrowLeft size={14} /> {t('contracts.backToContracts')}
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <div ref={containerRef}>
      {userRole === 'client' ? (
        <ClientContractDetails
          contract={contract}
          milestones={milestones}
          auditTrail={auditTrail}
          onRefresh={loadContractDetails}
          activeDispute={activeDispute}
          activeDisputeError={activeDisputeError}
          activeDisputeLoading={activeDisputeLoading}
          onRetryDispute={loadContractDetails}
          onOpenReviewModal={() => setIsReviewModalOpen(true)}
        />
      ) : userRole === 'freelancer' ? (
        <FreelancerContractDetails
          contract={contract}
          milestones={milestones}
          auditTrail={auditTrail}
          onRefresh={loadContractDetails}
          activeDispute={activeDispute}
          activeDisputeError={activeDisputeError}
          activeDisputeLoading={activeDisputeLoading}
          onRetryDispute={loadContractDetails}
          onOpenReviewModal={() => setIsReviewModalOpen(true)}
        />
      ) : (
        <ClientContractDetails
          contract={contract}
          milestones={milestones}
          auditTrail={auditTrail}
          onRefresh={loadContractDetails}
          isAdminOverride={userRole === 'admin'}
          activeDispute={null}
          activeDisputeError={null}
          activeDisputeLoading={false}
          onRetryDispute={loadContractDetails}
          onOpenReviewModal={() => setIsReviewModalOpen(true)}
        />
      )}

      <ProjectReviewDialog
        open={isReviewModalOpen}
        contract={contract}
        role={userRole === 'client' ? UserRole.Client : UserRole.Freelancer}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmitted={() => {
          setIsReviewModalOpen(false);
          void loadContractDetails();
        }}
      />
    </div>
  );
}
