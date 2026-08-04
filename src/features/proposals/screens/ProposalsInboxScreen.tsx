import { useApp } from '../../../app/providers/AppProvider';
import { UserRole } from '../../../types';
import ClientProposalsScreen from './ClientProposalsScreen';
import FreelancerProposalsScreen from './FreelancerProposalsScreen';

export default function ProposalsInboxScreen() {
  const { role } = useApp();
  const isClient = role === UserRole.Client;

  return isClient ? <ClientProposalsScreen /> : <FreelancerProposalsScreen />;
}

