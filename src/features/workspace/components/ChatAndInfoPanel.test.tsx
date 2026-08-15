import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ContractStatus } from '../../../types/models/Contract';
import { ChatAndInfoPanel, type ChatAndInfoPanelProps } from './ChatAndInfoPanel';

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const createProps = (setProductModalOpen: (open: boolean) => void): ChatAndInfoPanelProps => ({
  showInfo: true,
  setShowInfo: vi.fn(),
  activeTab: 'chat',
  setActiveTab: vi.fn(),
  mobileTab: 'chat',
  partnerName: 'Freelancer',
  partnerAvatar: '',
  partnerUserId: 'partner-1',
  partnerTitle: 'Freelancer',
  partnerCompany: 'GigBridge project',
  isPartnerOnline: true,
  showProfilePopover: false,
  setShowProfilePopover: vi.fn(),
  profilePopoverTimeout: createRef<ReturnType<typeof setTimeout>>(),
  isFavorited: false,
  setIsFavorited: vi.fn(),
  isBlocked: false,
  setIsBlocked: vi.fn(),
  projectMessages: [],
  chatEndRef: createRef<HTMLDivElement>(),
  messageInput: '',
  setMessageInput: vi.fn(),
  handleSendMessage: vi.fn(),
  isWorkspaceLocked: false,
  isContractDisputed: false,
  activeDisputeId: null,
  workspaceContractId: 'contract-1',
  contractId: 'contract-1',
  isClient: true,
  activeContract: { status: ContractStatus.Active },
  setProductModalOpen,
  viewReportId: null,
  unavailableReportId: null,
  isLoadingReportDetail: false,
  handleViewContractReport: vi.fn().mockResolvedValue(undefined),
  workspaceFiles: [],
  workspaceFilesLoading: false,
  workspaceFilesError: null,
  setWorkspaceFilesLoading: vi.fn(),
  setWorkspaceFilesError: vi.fn(),
  setWorkspaceFiles: vi.fn(),
  user: { id: 'client-1' },
  navigate: vi.fn(),
});

describe('ChatAndInfoPanel', () => {
  it('removes chat attachments while preserving the work-material action', () => {
    const setProductModalOpen = vi.fn();
    render(
      <MemoryRouter>
        <ChatAndInfoPanel {...createProps(setProductModalOpen)} />
      </MemoryRouter>,
    );

    expect(screen.queryByTitle('workspace.attachFile')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle('workspace.sendMaterialsTooltip'));
    expect(setProductModalOpen).toHaveBeenCalledWith(true);
  });
});
