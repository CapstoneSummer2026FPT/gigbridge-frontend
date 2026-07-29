import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import * as signalR from '@microsoft/signalr';
import { useApp } from '../../../app/providers/AppProvider';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { contractPutAPI } from '../../../api/contractAPI/PUT';
import { messageGetAPI } from '../../../api/messageAPI/GET';
import { messagePostAPI } from '../../../api/messageAPI/POST';
import type { Message } from '../../../types';
import type { ContractDto, ContractProductHandoffResponse, ContractWorkItem, Milestone, MilestoneEarlyStartRequest } from '../../../types/models/Contract';
import { ContractStatus, MilestoneStatus } from '../../../types/models/Contract';
import { UserRole } from '../../../types/models/User';
import { getChatHubUrl } from '../../../service/apiService';

interface WorkspaceMilestone {
  id: string;
  title: string;
  description?: string;
  amount: number;
  releasedAmount: number;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'disputed';
  completedAt?: string;
  workItems: ContractWorkItem[];
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
  status: ContractStatus;
}

interface SubmitMilestoneDeliverablePayload {
  description?: string;
  file?: File | null;
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
    case MilestoneStatus.PaymentProofUploaded:
    case MilestoneStatus.PaymentConfirmed:
    case MilestoneStatus.Approved:
      return 'approved';
    case MilestoneStatus.Disputed:
      return 'disputed';
    case MilestoneStatus.Pending:
    default:
      return 'pending';
  }
};

const isMilestoneApproved = (milestone: WorkspaceMilestone): boolean =>
  milestone.status === 'approved';

const mapMilestone = (milestone: Milestone): WorkspaceMilestone => ({
  id: milestone.id,
  title: milestone.title,
  amount: milestone.amount,
  releasedAmount: Number(milestone.releasedAmount ?? 0),
  dueDate: milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : 'Not set',
  status: mapMilestoneStatus(milestone.status),
  completedAt: milestone.paid_at ?? undefined,
  workItems: milestone.workItems || [],
});

const buildProject = (contract: ContractDto, milestones: Milestone[]): WorkspaceProject => {
  const mappedMilestones = milestones.map(mapMilestone);
  const completedCount = mappedMilestones.filter(isMilestoneApproved).length;
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
    paidAmount: mappedMilestones.reduce((sum, milestone) => sum + milestone.releasedAmount, 0),
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
      : contract.status === ContractStatus.Disputed
        ? 'Workspace is read-only while the dispute is open.'
        : 'Workspace open. Waiting for escrow funding.',
    time: formatTime(contract.updatedAt || contract.createdAt),
    unread: false,
    online: true,
    titleLong: contract.jobTitle || contract.title,
    status: contract.status,
  };
};

const getObjectValue = (source: unknown, ...keys: string[]): unknown => {
  if (typeof source !== 'object' || source === null) return undefined;

  for (const key of keys) {
    if (key in source) return Reflect.get(source, key);
  }

  return undefined;
};

const mapWorkspaceMessage = (message: unknown): Message => {
  const messageType = Number(getObjectValue(message, 'messageType', 'MessageType') ?? 0);
  const attachments = getObjectValue(message, 'attachments', 'Attachments');
  const firstAttachment = Array.isArray(attachments) ? attachments[0] : undefined;
  const clientMessageId = getObjectValue(message, 'clientMessageId', 'ClientMessageId');
  const metadata = getObjectValue(message, 'metadata', 'Metadata');
  const fileUrl = getObjectValue(firstAttachment, 'fileUrl', 'FileUrl');
  const fileName = getObjectValue(firstAttachment, 'fileName', 'FileName');

  return {
    id: String(getObjectValue(message, 'messageId', 'MessageId', 'id') ?? crypto.randomUUID()),
    clientMessageId: typeof clientMessageId === 'string' ? clientMessageId : null,
    conversationId: String(getObjectValue(message, 'conversationId', 'ConversationId') ?? ''),
    senderId: String(getObjectValue(message, 'senderUserId', 'SenderUserId', 'senderId') ?? ''),
    content: String(getObjectValue(message, 'content', 'Content') ?? ''),
    type: messageType === 1
      ? 'image'
      : messageType === 2
        ? 'file'
        : messageType >= 3
          ? 'system'
          : 'text',
    messageType,
    metadata: typeof metadata === 'string' ? metadata : null,
    createdAt: String(getObjectValue(message, 'sentAt', 'SentAt', 'createdAt') ?? new Date().toISOString()),
    isRead: true,
    fileUrl: typeof fileUrl === 'string' ? fileUrl : undefined,
    fileName: typeof fileName === 'string' ? fileName : undefined,
  };
};

const getCurrentProductHandoffFromList = (
  handoffs: ContractProductHandoffResponse[]
): ContractProductHandoffResponse | null =>
  handoffs.find(handoff => handoff.isCurrent) ?? handoffs[0] ?? null;

const isContractLocked = (status?: ContractStatus): boolean =>
  status === ContractStatus.Completed || status === ContractStatus.Disputed;

export function useProjectWorkspace(initialContractId: string) {
  const navigate = useNavigate();
  const { user, role } = useApp();
  const isClient = role === UserRole.Client;

  const [activeProjectId, setActiveProjectId] = useState(initialContractId);
  const [activeContract, setActiveContract] = useState<ContractDto | null>(null);
  const [currentProductHandoff, setCurrentProductHandoff] = useState<ContractProductHandoffResponse | null>(null);
  const [productHandoffs, setProductHandoffs] = useState<ContractProductHandoffResponse[]>([]);
  const [earlyStartRequests, setEarlyStartRequests] = useState<MilestoneEarlyStartRequest[]>([]);
  const [workspaceContracts, setWorkspaceContracts] = useState<ContractDto[]>([]);
  const [project, setProject] = useState<WorkspaceProject>(emptyProject);
  const [showInfo, setShowInfo] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [projectMessages, setProjectMessages] = useState<Message[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatConnectionRef = useRef<signalR.HubConnection | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const activeProjectIdRef = useRef(activeProjectId);

  useEffect(() => {
    setActiveProjectId(initialContractId);
  }, [initialContractId]);

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  useEffect(() => {
    let current = true;

    const loadWorkspace = async (): Promise<void> => {
      if (!activeProjectId) return;

      try {
        const [contractResponse, milestonesResponse, contractsResponse, productHandoffsResponse, earlyStartResponse] = await Promise.all([
          contractGetAPI.getContractById(activeProjectId),
          contractGetAPI.getMilestonesByContract(activeProjectId),
          contractGetAPI.getMyContracts(),
          contractGetAPI.getProductHandoffs(activeProjectId),
          contractGetAPI.getEarlyStartRequests?.(activeProjectId) ?? Promise.resolve({ success: true, statusCode: 200, data: [] }),
        ]);

        if (!current) return;

        if (contractsResponse.success && contractsResponse.data) {
          setWorkspaceContracts(
            contractsResponse.data.filter(contract =>
              contract.status === ContractStatus.PendingEscrow ||
              contract.status === ContractStatus.Active ||
              contract.status === ContractStatus.Disputed
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
        setEarlyStartRequests(earlyStartResponse.data || []);

        if (nextContract.conversationId) {
          const messagesResponse = await messageGetAPI.getConversationMessages(nextContract.conversationId);
          if (current && messagesResponse.success && messagesResponse.data) {
            setProjectMessages(messagesResponse.data.map(mapWorkspaceMessage));
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

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('[WorkspaceChatHub] skipped connection: no access token found');
      return;
    }

    let disposed = false;
    const connection = new signalR.HubConnectionBuilder()
      .configureLogging(signalR.LogLevel.Warning)
      .withUrl(getChatHubUrl(), {
        accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
      })
      .withAutomaticReconnect()
      .build();

    const joinCurrentConversation = async (): Promise<void> => {
      const conversationId = conversationIdRef.current;
      if (!conversationId || connection.state !== signalR.HubConnectionState.Connected) return;

      try {
        await connection.invoke('JoinConversation', conversationId);
      } catch (joinError) {
        console.error(`[WorkspaceChatHub] failed to join conversation ${conversationId}`, joinError);
      }
    };

    const handleReceiveMessage = (payload: Record<string, unknown>): void => {
      const mappedMessage: Message = {
        ...mapWorkspaceMessage(payload),
        sendStatus: 'sent',
      };

      if (!mappedMessage.conversationId || mappedMessage.conversationId !== conversationIdRef.current) return;

      setProjectMessages(previousMessages => {
        const existingIndex = previousMessages.findIndex(existingMessage =>
          existingMessage.id === mappedMessage.id ||
          Boolean(mappedMessage.clientMessageId && (
            existingMessage.id === mappedMessage.clientMessageId ||
            existingMessage.clientMessageId === mappedMessage.clientMessageId
          ))
        );

        if (existingIndex < 0) return [...previousMessages, mappedMessage];

        const nextMessages = [...previousMessages];
        nextMessages[existingIndex] = mappedMessage;
        return nextMessages;
      });
    };

    const handleContractCompleted = (payload: Record<string, unknown>): void => {
      const eventContractId = String(payload.contractId ?? payload.ContractId ?? '');
      if (eventContractId && eventContractId !== activeProjectIdRef.current) return;
      void reloadActiveWorkspace().finally(() => {
        window.dispatchEvent(new Event('gigbridge-wallet-updated'));
      });
    };

    const handleFinalPayoutClaimed = (payload: Record<string, unknown>): void => {
      const eventContractId = String(payload.contractId ?? payload.ContractId ?? '');
      if (eventContractId && eventContractId !== activeProjectIdRef.current) return;
      void reloadActiveWorkspace().finally(() => {
        window.dispatchEvent(new Event('gigbridge-wallet-updated'));
      });
    };

    connection.on('ReceiveMessage', handleReceiveMessage);
    connection.on('ContractCompleted', handleContractCompleted);
    connection.on('FinalPayoutClaimed', handleFinalPayoutClaimed);
    connection.onreconnected(() => {
      if (!disposed) void joinCurrentConversation();
    });
    connection.onclose(error => {
      if (!disposed && error) console.warn('[WorkspaceChatHub] disconnected', error);
    });

    void connection.start()
      .then(() => {
        if (disposed) {
          void connection.stop();
          return;
        }
        chatConnectionRef.current = connection;
        void joinCurrentConversation();
      })
      .catch(connectionError => {
        if (!disposed) console.error('[WorkspaceChatHub] connection failed', connectionError);
      });

    return () => {
      disposed = true;
      connection.off('ReceiveMessage', handleReceiveMessage);
      connection.off('ContractCompleted', handleContractCompleted);
      connection.off('FinalPayoutClaimed', handleFinalPayoutClaimed);
      if (chatConnectionRef.current === connection) chatConnectionRef.current = null;
      void connection.stop();
    };
  }, []);

  useEffect(() => {
    const previousConversationId = conversationIdRef.current;
    const nextConversationId = project.conversationId ?? null;
    conversationIdRef.current = nextConversationId;

    const connection = chatConnectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;

    if (previousConversationId && previousConversationId !== nextConversationId) {
      void connection.invoke('LeaveConversation', previousConversationId).catch(() => {});
    }
    if (nextConversationId && previousConversationId !== nextConversationId) {
      void connection.invoke('JoinConversation', nextConversationId).catch(joinError => {
        console.error(`[WorkspaceChatHub] failed to join conversation ${nextConversationId}`, joinError);
      });
    }

    return () => {
      if (nextConversationId && conversationIdRef.current === nextConversationId) {
        void connection.invoke('LeaveConversation', nextConversationId).catch(() => {});
      }
    };
  }, [project.conversationId]);

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
    status: activeContract?.status ?? ContractStatus.Active,
  };

  const partnerName = currentProjData.partnerName;
  const partnerAvatar = currentProjData.partnerAvatar;
  const partnerTitle = isClient ? 'Freelancer' : 'Client';
  const partnerCompany = activeContract ? activeContract.jobTitle || activeContract.title : '';
  const isPartnerOnline = currentProjData.online;

  const handleSendMessage = async (): Promise<void> => {
    if (isContractLocked(activeContract?.status) || !messageInput.trim() || !project.conversationId) return;

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
              ? { ...mapWorkspaceMessage(response.data), sendStatus: 'sent' }
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

  const handleSimulateAttachment = (): void => {
    alert('File attachments are not available in this workspace yet.');
  };

  const handleOpenMilestoneEditor = (): void => {
    if (!activeProjectId) return;
    navigate(`/contracts/${activeProjectId}/milestones?mode=contract-edit`);
  };

  const reloadActiveWorkspace = async (): Promise<void> => {
    if (!activeProjectId) return;

    const [contractResponse, milestonesResponse, productHandoffsResponse, earlyStartResponse] = await Promise.all([
      contractGetAPI.getContractById(activeProjectId),
      contractGetAPI.getMilestonesByContract(activeProjectId),
      contractGetAPI.getProductHandoffs(activeProjectId),
      contractGetAPI.getEarlyStartRequests?.(activeProjectId) ?? Promise.resolve({ success: true, statusCode: 200, data: [] }),
    ]);

    if (contractResponse.success && contractResponse.data) {
      const nextContract = contractResponse.data;
      const nextProductHandoffs = productHandoffsResponse.success ? productHandoffsResponse.data ?? [] : [];
      setActiveContract(nextContract);
      setProject(buildProject(nextContract, milestonesResponse.data ?? []));
      setProductHandoffs(nextProductHandoffs);
      setCurrentProductHandoff(getCurrentProductHandoffFromList(nextProductHandoffs));
      setEarlyStartRequests(earlyStartResponse.data || []);

      if (nextContract.conversationId) {
        const messagesResponse = await messageGetAPI.getConversationMessages(nextContract.conversationId);
        if (messagesResponse.success && messagesResponse.data) {
          setProjectMessages(messagesResponse.data.map(mapWorkspaceMessage));
        }
      }
    }
  };

  const handleSubmitMilestoneDeliverable = async (
    milestoneId: string,
    payload: SubmitMilestoneDeliverablePayload
  ): Promise<SubmitMilestoneDeliverableResult> => {
    if (!activeProjectId || isContractLocked(activeContract?.status)) {
      return { success: false, message: 'Missing contract ID.' };
    }

    const formData = new FormData();
    const description = payload.description?.trim();

    if (description) {
      formData.append('description', description);
    }

    if (payload.file) {
      formData.append('file', payload.file);
    }

    if (!payload.file) return { success: false, message: 'A platform-hosted deliverable file is required.' };

    const response = await contractPostAPI.submitMilestone(activeProjectId, milestoneId, formData);

    if (!response.success) {
      return { success: false, message: response.message || 'Failed to submit deliverable.' };
    }

    await reloadActiveWorkspace();
    return { success: true, message: response.message };
  };

  const handleRequestMilestoneUnlock = async (milestoneId: string, reason: string): Promise<WorkspaceActionResult> => {
    if (!activeProjectId || isContractLocked(activeContract?.status)) {
      return { success: false, message: 'Missing contract ID.' };
    }

    const response = await contractPostAPI.requestMilestoneUnlock(activeProjectId, milestoneId, reason);

    if (!response.success) {
      return { success: false, message: response.message || 'Failed to request milestone unlock.' };
    }

    await reloadActiveWorkspace();
    return { success: true, message: response.message };
  };

  const handleUpdateWorkItem = async (milestoneId: string, workItemId: string, status: number, progressNote?: string): Promise<WorkspaceActionResult> => {
    if (!activeProjectId || activeContract?.status !== ContractStatus.Active) return { success: false, message: 'Contract is not active.' };
    const response = await contractPutAPI.updateWorkItem(activeProjectId, milestoneId, workItemId, { status, progressNote });
    if (!response.success) return { success: false, message: response.message || 'Work item could not be updated.' };
    await reloadActiveWorkspace();
    return { success: true, message: response.message };
  };

  const handleRespondEarlyStart = async (requestId: string, approve: boolean, note?: string): Promise<WorkspaceActionResult> => {
    if (!activeProjectId || !isClient) return { success: false, message: 'Only the client can respond.' };
    if (isContractLocked(activeContract?.status)) return { success: false, message: 'Contract is locked.' };
    const response = await contractPostAPI.respondEarlyStartRequest(activeProjectId, requestId, approve, note);
    if (!response.success) return { success: false, message: response.message || 'Early start request could not be updated.' };
    await reloadActiveWorkspace();
    return { success: true, message: response.message };
  };

  const handleEndProject = async (): Promise<WorkspaceActionResult> => {
    if (!activeProjectId || isContractLocked(activeContract?.status)) {
      return { success: false, message: 'Missing contract ID.' };
    }

    const response = await contractPostAPI.endProject(activeProjectId);

    if (!response.success) {
      return { success: false, message: response.message || 'Failed to end project.' };
    }

    await reloadActiveWorkspace();
    return { success: true, message: response.message };
  };

  const handleSubmitProductHandoff = async (
    payload: SubmitProductHandoffPayload
  ): Promise<SubmitMilestoneDeliverableResult> => {
    if (!activeProjectId || isContractLocked(activeContract?.status)) {
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
    isFavorited,
    setIsFavorited,
    isBlocked,
    setIsBlocked,
    project,
    activeContract,
    currentProductHandoff,
    productHandoffs,
    earlyStartRequests,
    workspaceProjects,
    currentProjData,
    partnerName,
    partnerAvatar,
    partnerTitle,
    partnerCompany,
    isPartnerOnline,
    projectMessages,
    handleSendMessage,
    handleSimulateAttachment,
    handleOpenMilestoneEditor,
    handleRequestMilestoneUnlock,
    handleUpdateWorkItem,
    handleRespondEarlyStart,
    handleEndProject,
    handleSubmitMilestoneDeliverable,
    handleSubmitProductHandoff,
    chatEndRef,
  };
}
