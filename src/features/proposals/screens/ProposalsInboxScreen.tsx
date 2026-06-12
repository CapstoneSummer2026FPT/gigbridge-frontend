import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { UserRole } from '../../../types/models/User';
import ClientProposalsScreen from './ClientProposalsScreen';
import FreelancerProposalsScreen from './FreelancerProposalsScreen';

export default function ProposalsInboxScreen() {
  const { role } = useApp();

  if (role === UserRole.Client) {
    return <ClientProposalsScreen />;
  }

  if (role === UserRole.Freelancer) {
    return <FreelancerProposalsScreen />;
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="glass-card p-8">
          <p className="text-primary font-semibold mb-2">Proposal workspace unavailable</p>
          <p className="text-sm text-secondary">
            Your account role does not have a proposal workspace.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
