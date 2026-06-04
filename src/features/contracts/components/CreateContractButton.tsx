import { useNavigate } from 'react-router';
import { FileText } from 'lucide-react';
import type { ProposalDto } from '../../../types/models/Proposal';

interface CreateContractButtonProps {
  proposal: ProposalDto;
  disabled?: boolean;
  className?: string;
}

export function CreateContractButton({
  proposal,
  disabled = false,
  className = '',
}: CreateContractButtonProps) {
  const navigate = useNavigate();

  const handleCreateContract = () => {
    navigate(`/contracts/create/${proposal.proposalsId}`);
  };

  return (
    <button
      onClick={handleCreateContract}
      disabled={disabled}
      className={className}
      title="Create and sign contract from this proposal"
    >
      <FileText size={15} />
      Create Contract & Sign
    </button>
  );
}
