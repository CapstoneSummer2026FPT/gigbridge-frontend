import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Lock, AlertCircle } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { ContractStatus, type ContractDto, type Milestone } from '../../../types/models/Contract';
import { UserRole } from '../../../types/models/User';
import { ClientContractDetails } from '../components/ClientContractDetails';
import { FreelancerContractDetails } from '../components/FreelancerContractDetails';

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
  scopeOfWork?: string;
  paymentTerms?: string;
  intellectualPropertyTerms?: string;
  confidentialityTerms?: string;
  cancellationTerms?: string;
  disputeTerms?: string;
}

type ContractUserRole = 'client' | 'freelancer' | 'admin' | 'none';

export default function ViewContractDetailsScreen() {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const { user } = useApp();
  const { t } = useTranslation();

  // State
  const [contract, setContract] = useState<ContractDetailsData | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<ContractUserRole>('none');

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
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const apiResponse = await contractGetAPI.getContractById(contractId);
      
      if (apiResponse.success && apiResponse.data) {
        const contractData = apiResponse.data as ContractDetailsData;
        
        // Fetch milestones for this contract from API
        const milestonesResponse = await contractGetAPI.getMilestonesByContract(contractId);
        const milestonesList = milestonesResponse.success && milestonesResponse.data 
          ? milestonesResponse.data 
          : [];
          
        setContract(contractData);
        setMilestones(milestonesList);
        generateAuditTrail(contractData);
      } else {
        setError(apiResponse.message || t('contracts.unableToLoadContract'));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('contracts.anErrorOccurred');
      setError(errorMsg);
      console.error('Failed to load contract details:', err);
    } finally {
      setLoading(false);
    }
  }, [contractId, t]);

  useEffect(() => {
    loadContractDetails();
  }, [loadContractDetails]);

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
        <div className="w-full max-w-md mx-auto py-20 px-6 text-center">
          <div className="w-16 h-16 bg-destructive/10 text-destructive border border-destructive/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{t('contracts.invalidContract')}</h2>
          <p className="text-muted-foreground text-sm mt-2">{t('contracts.noContractIdParam')}</p>
          <button 
            onClick={() => navigate('/contracts')} 
            className="btn-primary-custom mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            {t('contracts.backToContracts')}
          </button>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-10 animate-pulse space-y-8">
          <div className="text-center py-10 text-muted-foreground font-semibold">{t('contracts.loading')}</div>
          <div className="bg-card border border-border/50 rounded-3xl p-8 h-48 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-card border border-border/50 rounded-3xl p-8 h-60 w-full" />
              <div className="bg-card border border-border/50 rounded-3xl p-8 h-80 w-full" />
            </div>
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-card border border-border/50 rounded-3xl p-8 h-40 w-full" />
              <div className="bg-card border border-border/50 rounded-3xl p-8 h-64 w-full" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !contract) {
    return (
      <AppLayout>
        <div className="w-full max-w-md mx-auto py-20 px-6 text-center">
          <div className="w-16 h-16 bg-destructive/10 text-destructive border border-destructive/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{t('contracts.unableToLoadContract')}</h2>
          <p className="text-muted-foreground text-sm mt-2">{error || t('contracts.contractNotFound')}</p>
          <button 
            onClick={() => navigate('/contracts')} 
            className="btn-primary-custom mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            {t('contracts.backToContracts')}
          </button>
        </div>
      </AppLayout>
    );
  }

  if (!hasAccess()) {
    return (
      <AppLayout>
        <div className="w-full max-w-md mx-auto py-20 px-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <Lock size={28} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{t('contracts.accessDenied')}</h2>
          <p className="text-muted-foreground text-sm mt-2">{t('contracts.noPermissionResource')}</p>
          <button 
            onClick={() => navigate('/contracts')} 
            className="btn-primary-custom mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            {t('contracts.backToContracts')}
          </button>
        </div>
      </AppLayout>
    );
  }

  if (userRole === 'client') {
    return (
      <ClientContractDetails
        contract={contract}
        milestones={milestones}
        auditTrail={auditTrail}
        onRefresh={loadContractDetails}
      />
    );
  }

  if (userRole === 'freelancer') {
    return (
      <FreelancerContractDetails
        contract={contract}
        milestones={milestones}
        auditTrail={auditTrail}
        onRefresh={loadContractDetails}
      />
    );
  }

  // Fallback for Admin / others
  return (
    <ClientContractDetails
      contract={contract}
      milestones={milestones}
      auditTrail={auditTrail}
      onRefresh={loadContractDetails}
      isAdminOverride={userRole === 'admin'}
    />
  );
}
