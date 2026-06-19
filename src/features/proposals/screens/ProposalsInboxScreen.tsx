import { useApp } from '../../../app/providers/AppProvider';
import ClientProposalsScreen from './ClientProposalsScreen';
import FreelancerProposalsScreen from './FreelancerProposalsScreen';

export default function ProposalsInboxScreen() {
  const { role } = useApp();

  // If role is Client (0), render the Client workspace. Otherwise, render the Freelancer workspace.
  if (role === 0) {
    return <ClientProposalsScreen />;
  }

  return <FreelancerProposalsScreen />;
}
