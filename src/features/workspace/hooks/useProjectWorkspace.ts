import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../../app/providers/AppProvider';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { messageGetAPI } from '../../../api/messageAPI/GET';
import { messagePostAPI } from '../../../api/messageAPI/POST';
import type { Message } from '../../../types';
import type { ContractDto, ContractProductHandoffResponse, Milestone } from '../../../types/models/Contract';
import { ContractStatus, MilestoneStatus } from '../../../types/models/Contract';
import { UserRole } from '../../../types/models/User';

interface WorkspaceMilestone {
  id: string;
  title: string;
  description?: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'paid' | 'disputed';
  completedAt?: string;
}

interface WorkspaceProject {
  id: string;
  contractId: string;
  jobId: string;
  conversationId?: string | null;
  title: string;
  progress: number;
  paidAmount: number;
  totalBudget: number;
  startDate?: string;
  clientId?: string;
  freelancerId?: string | null;
  milestones: WorkspaceMilestone[];
}

interface WorkspaceProjectListItem {
  id: string;
  title: string;
  partnerName: string;
  partnerAvatar: string;
  latestMessage: string;
  time: string;
  unread: boolean;
  online: boolean;
  titleLong: string;
}

interface SubmitMilestoneDeliverablePayload {
  description?: string;
  file?: File | null;
  externalUrl?: string;
}

interface SubmitMilestoneDeliverableResult {
  success: boolean;
  message?: string;
}

interface WorkspaceActionResult {
  success: boolean;
  message?: string;
}

interface SubmitProductHandoffPayload {
  note?: string;
  file?: File | null;
  externalUrl?: string;
}

const emptyProject: WorkspaceProject = {
  id: '',
  contractId: '',
  jobId: '',
  title: 'Workspace',
  progress: 0,
  paidAmount: 0,
  totalBudget: 0,
  milestones: [],
};

const formatTime = (value?: string): string => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getPartnerName = (contract: ContractDto, isClient: boolean): string =>
  isClient
    ? contract.freelancerName || contract.freelancerEmail || 'Freelancer'
    : contract.clientName || contract.clientEmail || 'Client';

const getAvatarUrl = (name: string): string =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

const mapMilestoneStatus = (status: MilestoneStatus): WorkspaceMilestone['status'] => {
  switch (status) {
    case MilestoneStatus.InProgress:
      return 'in_progress';
    case MilestoneStatus.Submitted:
      return 'submitted';
    case MilestoneStatus.Approved:
      return 'approved';
    case MilestoneStatus.PaymentProofUploaded:
    case MilestoneStatus.PaymentConfirmed:
      return 'paid';
    case MilestoneStatus.Disputed:
      return 'disputed';
    case MilestoneStatus.Pending:
    default:
      return 'pending';
  }
};

const isMilestonePaid = (milestone: WorkspaceMilestone): boolean =>
  milestone.status === 'approved' || milestone.status === 'paid';

const mapMilestone = (milestone: Milestone): WorkspaceMilestone => ({
  id: milestone.id,
  title: milestone.title,
  amount: milestone.amount,
  dueDate: milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : 'Not set',
  status: mapMilestoneStatus(milestone.status),
  completedAt: milestone.paid_at ?? undefined,
});

const buildProject = (contract: ContractDto, milestones: Milestone[]): WorkspaceProject => {
  const mappedMilestones = milestones.map(mapMilestone);
  const completedCount = mappedMilestones.filter(isMilestonePaid).length;
  const progress = mappedMilestones.length > 0
    ? Math.round((completedCount / mappedMilestones.length) * 100)
    : 0;

  return {
    id: contract.contractsId,
    contractId: contract.contractsId,
    jobId: contract.jobPostsId,
    conversationId: contract.conversationId,
    title: contract.jobTitle || contract.title,
    progress,
    paidAmount: mappedMilestones.filter(isMilestonePaid).reduce((sum, milestone) => sum + milestone.amount, 0),
    totalBudget: contract.totalBudget,
    startDate: contract.startDate,
    clientId: contract.clientProfilesId,
    freelancerId: contract.freelancerProfilesId,
    milestones: mappedMilestones,
  };
};

const mapContractListItem = (contract: ContractDto, isClient: boolean): WorkspaceProjectListItem => {
  const partnerName = getPartnerName(contract, isClient);

  return {
    id: contract.contractsId,
    title: contract.jobTitle || contract.title,
    partnerName,
    partnerAvatar: getAvatarUrl(partnerName),
    latestMessage: contract.status === ContractStatus.Active
      ? 'Workspace is open.'
      : 'Workspace open. Waiting for escrow funding.',
    time: formatTime(contract.updatedAt || contract.createdAt),
    unread: false,
    online: true,
    titleLong: contract.jobTitle || contract.title,
  };
};

const mapWorkspaceMessage = (message: Record<string, unknown>): Message => {
  const messageType = Number(message.messageType ?? message.MessageType ?? 0);
  const firstAttachment = Array.isArray(message.attachments) ? message.attachments[0] as Record<string, unknown> | undefined : undefined;

  return {
    id: String(message.messageId ?? message.MessageId ?? message.id ?? crypto.randomUUID()),
    clientMessageId: typeof message.clientMessageId === 'string' ? message.clientMessageId : null,
    conversationId: String(message.conversationId ?? message.ConversationId ?? ''),
    senderId: String(message.senderUserId ?? message.SenderUserId ?? message.senderId ?? ''),
    content: String(message.content ?? message.Content ?? ''),
    type: messageType === 1 ? 'image' : messageType === 2 ? 'file' : 'text',
    createdAt: String(message.sentAt ?? message.SentAt ?? message.createdAt ?? new Date().toISOString()),
    isRead: true,
    fileUrl: typeof firstAttachment?.fileUrl === 'string' ? firstAttachment.fileUrl : undefined,
    fileName: typeof firstAttachment?.fileName === 'string' ? firstAttachment.fileName : undefined,
  };
};

const getCurrentProductHandoffFromList = (
  handoffs: ContractProductHandoffResponse[]
): ContractProductHandoffResponse | null =>
  handoffs.find(handoff => handoff.isCurrent) ?? handoffs[0] ?? null;

export function useProjectWorkspace(initialContractId: string) {
  const navigate = useNavigate();
  const { user, role } = useApp();
  const roleValue = role as UserRole | string | null;
  const isClient = roleValue === UserRole.Client || roleValue === 'client';

  const [activeProjectId, setActiveProjectId] = useState(initialContractId);
  const [activeContract, setActiveContract] = useState<ContractDto | null>(null);
  const [currentProductHandoff, setCurrentProductHandoff] = useState<ContractProductHandoffResponse | null>(null);
  const [productHandoffs, setProductHandoffs] = useState<ContractProductHandoffResponse[]>([]);
  const [workspaceContracts, setWorkspaceContracts] = useState<ContractDto[]>([]);
  const [project, setProject] = useState<WorkspaceProject>(emptyProject);
  const [showInfo, setShowInfo] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [projectMessages, setProjectMessages] = useState<Message[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [aiChat, setAiChat] = useState<{ role: string; content: string }[]>([
    { role: 'ai', content: 'Hello! I can help summarize this workspace, milestone progress, and recent chat activity.' },
  ]);

  useEffect(() => {
    setActiveProjectId(initialContractId);
  }, [initialContractId]);

  useEffect(() => {
    let current = true;

    const loadWorkspace = async (): Promise<void> => {
      if (!activeProjectId) return;

      try {
        const [contractResponse, milestonesResponse, contractsResponse, productHandoffsResponse] = await Promise.all([
          contractGetAPI.getContractById(activeProjectId),
          contractGetAPI.getMilestonesByContract(activeProjectId),
          contractGetAPI.getMyContracts(),
          contractGetAPI.getProductHandoffs(activeProjectId),
        ]);

        if (!current) return;

        if (contractsResponse.success && contractsResponse.data) {
          setWorkspaceContracts(
            contractsResponse.data.filter(contract =>
              contract.status === ContractStatus.PendingEscrow ||
              contract.status === ContractStatus.Active
            )
          );
        }

        if (!contractResponse.success || !contractResponse.data) {
          setProject(emptyProject);
          setActiveContract(null);
          setCurrentProductHandoff(null);
          setProductHandoffs([]);
          return;
        }

        const nextContract = contractResponse.data;
        const nextProject = buildProject(nextContract, milestonesResponse.data ?? []);
        const nextProductHandoffs = productHandoffsResponse.success ? productHandoffsResponse.data ?? [] : [];
        setActiveContract(nextContract);
        setProject(nextProject);
        setProductHandoffs(nextProductHandoffs);
        setCurrentProductHandoff(getCurrentProductHandoffFromList(nextProductHandoffs));

        if (nextContract.conversationId) {
          const messagesResponse = await messageGetAPI.getConversationMessages(nextContract.conversationId);
          if (current && messagesResponse.success && messagesResponse.data) {
            setProjectMessages(messagesResponse.data.map(message => mapWorkspaceMessage(message as Record<string, unknown>)));
          }
        } else {
          setProjectMessages([]);
        }
      } catch (err) {
        console.error('Failed to load workspace:', err);
        if (current) {
          setProject(emptyProject);
          setActiveContract(null);
          setCurrentProductHandoff(null);
          setProductHandoffs([]);
          setProjectMessages([]);
        }
      }
    };

    void loadWorkspace();
    return () => {
      current = false;
    };
  }, [activeProjectId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [projectMessages]);

  const workspaceProjects = useMemo(() => {
    const projects = workspaceContracts.map(contract => mapContractListItem(contract, isClient));
    if (activeContract && !projects.some(item => item.id === activeContract.contractsId)) {
      projects.unshift(mapContractListItem(activeContract, isClient));
    }
    return projects;
  }, [activeContract, isClient, workspaceContracts]);

  const currentProjData = workspaceProjects.find(item => item.id === activeProjectId) ?? {
    id: activeProjectId,
    title: project.title,
    titleLong: project.title,
    partnerName: activeContract ? getPartnerName(activeContract, isClient) : 'Partner',
    partnerAvatar: getAvatarUrl(activeContract ? getPartnerName(activeContract, isClient) : 'Partner'),
    latestMessage: 'Workspace is open.',
    time: 'Just now',
    unread: false,
    online: true,
  };

  const partnerName = currentProjData.partnerName;
  const partnerAvatar = currentProjData.partnerAvatar;
  const partnerTitle = isClient ? 'Freelancer' : 'Client';
  const partnerCompany = activeContract ? activeContract.jobTitle || activeContract.title : '';
  const isPartnerOnline = currentProjData.online;

  const handleSendMessage = async (): Promise<void> => {
    if (!messageInput.trim() || !project.conversationId) return;

    const clientMessageId = crypto.randomUUID();
    const newMessage: Message = {
      id: clientMessageId,
      clientMessageId,
      conversationId: project.conversationId,
      senderId: user?.id ?? '',
      content: messageInput.trim(),
      type: 'text',
      createdAt: new Date().toISOString(),
      isRead: true,
      sendStatus: 'pending',
    };

    setProjectMessages(prev => [...prev, newMessage]);
    setMessageInput('');

    try {
      const response = await messagePostAPI.sendMessage({
        conversationId: project.conversationId,
        clientMessageId,
        content: newMessage.content,
      });

      if (response.success && response.data) {
        setProjectMessages(prev =>
          prev.map(message =>
            message.id === clientMessageId
              ? { ...mapWorkspaceMessage(response.data as Record<string, unknown>), sendStatus: 'sent' }
              : message
          )
        );
        return;
      }

      setProjectMessages(prev =>
        prev.map(message =>
          message.id === clientMessageId
            ? { ...message, sendStatus: 'failed', sendError: response.message || 'Message failed to send.' }
            : message
        )
      );
    } catch (err) {
      console.error('Failed to send workspace message:', err);
      setProjectMessages(prev =>
        prev.map(message =>
          message.id === clientMessageId
            ? { ...message, sendStatus: 'failed', sendError: 'Message failed to send.' }
            : message
        )
      );
    }
  };

  const handleSendAiMessage = (): void => {
    if (!aiMessage.trim()) return;
    const userMessage = aiMessage.trim();
    setAiChat(prev => [...prev, { role: 'user', content: userMessage }]);
    setAiMessage('');
    setAiChat(prev => [
      ...prev,
      {
        role: 'ai',
        content: `This workspace is ${project.progress}% complete with ${project.milestones.length} milestone(s) tracked from the active contract.`,
      },
    ]);
  };

  const handleSimulateAttachment = (): void => {
    alert('File attachments are not available in this workspace yet.');
  };

  const handleCreateMockMilestone = (): void => {
    if (!activeProjectId) return;
    navigate(`/contracts/${activeProjectId}/milestones?mode=contract-edit`);
  };

  const reloadActiveWorkspace = async (): Promise<void> => {
    if (!activeProjectId) return;

    const [contractResponse, milestonesResponse, productHandoffsResponse] = await Promise.all([
      contractGetAPI.getContractById(activeProjectId),
      contractGetAPI.getMilestonesByContract(activeProjectId),
      contractGetAPI.getProductHandoffs(activeProjectId),
    ]);

    if (contractResponse.success && contractResponse.data) {
      const nextContract = contractResponse.data;
      const nextProductHandoffs = productHandoffsResponse.success ? productHandoffsResponse.data ?? [] : [];
      setActiveContract(nextContract);
      setProject(buildProject(nextContract, milestonesResponse.data ?? []));
      setProductHandoffs(nextProductHandoffs);
      setCurrentProductHandoff(getCurrentProductHandoffFromList(nextProductHandoffs));

      if (nextContract.conversationId) {
        const messagesResponse = await messageGetAPI.getConversationMessages(nextContract.conversationId);
        if (messagesResponse.success && messagesResponse.data) {
          setProjectMessages(messagesResponse.data.map(message => mapWorkspaceMessage(message as Record<string, unknown>)));
        }
      }
    }
  };

  const handleSubmitMilestoneDeliverable = async (
    milestoneId: string,
    payload: SubmitMilestoneDeliverablePayload
  ): Promise<SubmitMilestoneDeliverableResult> => {
    if (!activeProjectId) {
      return { success: false, message: 'Missing contract ID.' };
    }

    const formData = new FormData();
    const description = payload.description?.trim();
    const externalUrl = payload.externalUrl?.trim();

    if (description) {
      formData.append('description', description);
    }

    if (payload.file) {
      formData.append('file', payload.file);
    }

    if (externalUrl) {
      formData.append('externalUrl', externalUrl);
    }

    const response = await contractPostAPI.submitMilestone(activeProjectId, milestoneId, formData);

    if (!response.success) {
      return { success: false, message: response.message || 'Failed to submit deliverable.' };
    }

    await reloadActiveWorkspace();
    return { success: true, message: response.message };
  };

  const handleStartMilestone = async (milestoneId: string): Promise<WorkspaceActionResult> => {
    if (!activeProjectId) {
      return { success: false, message: 'Missing contract ID.' };
    }

    const response = await contractPostAPI.startMilestone(activeProjectId, milestoneId);

    if (!response.success) {
      return { success: false, message: response.message || 'Failed to start milestone.' };
    }

    await reloadActiveWorkspace();
    return { success: true, message: response.message };
  };

  const handleRequestMilestoneUnlock = async (milestoneId: string): Promise<WorkspaceActionResult> => {
    if (!activeProjectId) {
      return { success: false, message: 'Missing contract ID.' };
    }

    const response = await contractPostAPI.requestMilestoneUnlock(activeProjectId, milestoneId);

    if (!response.success) {
      return { success: false, message: response.message || 'Failed to request milestone unlock.' };
    }

    await reloadActiveWorkspace();
    return { success: true, message: response.message };
  };

  const handleSubmitProductHandoff = async (
    payload: SubmitProductHandoffPayload
  ): Promise<SubmitMilestoneDeliverableResult> => {
    if (!activeProjectId) {
      return { success: false, message: 'Missing contract ID.' };
    }

    const formData = new FormData();
    const note = payload.note?.trim();
    const externalUrl = payload.externalUrl?.trim();

    if (note) {
      formData.append('note', note);
    }

    if (payload.file) {
      formData.append('file', payload.file);
    }

    if (externalUrl) {
      formData.append('externalUrl', externalUrl);
    }

    const response = await contractPostAPI.submitProductHandoff(activeProjectId, formData);

    if (!response.success) {
      return { success: false, message: response.message || 'Failed to send work materials.' };
    }

    await reloadActiveWorkspace();
    return { success: true, message: response.message };
  };

  return {
    user,
    isClient,
    activeProjectId,
    setActiveProjectId,
    showInfo,
    setShowInfo,
    messageInput,
    setMessageInput,
    aiMessage,
    setAiMessage,
    isFavorited,
    setIsFavorited,
    isBlocked,
    setIsBlocked,
    aiChat,
    project,
    activeContract,
    currentProductHandoff,
    productHandoffs,
    workspaceProjects,
    currentProjData,
    partnerName,
    partnerAvatar,
    partnerTitle,
    partnerCompany,
    isPartnerOnline,
    projectMessages,
    handleSendMessage,
    handleSendAiMessage,
    handleSimulateAttachment,
    handleCreateMockMilestone,
    handleStartMilestone,
    handleRequestMilestoneUnlock,
    handleSubmitMilestoneDeliverable,
    handleSubmitProductHandoff,
    chatEndRef,
  };
}
