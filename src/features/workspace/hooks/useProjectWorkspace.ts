import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../../app/providers/AppProvider';
import { DB, SEED_PROJECTS, SEED_MESSAGES } from '../../../mock_backend';
import type { Message } from '../../../types';
import { projectGetAPI } from '../../../api/projectAPI/GET';
import { projectPutAPI } from '../../../api/projectAPI/PUT';
import { messageGetAPI } from '../../../api/messageAPI/GET';
import { messagePostAPI } from '../../../api/messageAPI/POST';
import { contractGetAPI } from '../../../api/contractAPI/GET';

export function useProjectWorkspace(initialProjectId: string) {
  const navigate = useNavigate();
  const { user, role } = useApp();
  const isClient = role === 0 || role === 'client';

  const [activeProjectId, setActiveProjectId] = useState(initialProjectId || 'proj_1');
  const [showInfo, setShowInfo] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const [aiChat, setAiChat] = useState<{ role: string; content: string }[]>([
    { role: 'ai', content: 'Hello! I\'m your AI Work Assistant. I can help you with project updates, code reviews, milestone planning, and much more. What do you need today?' }
  ]);

  // Load project details dynamically
  const mockProj = DB.getProjects().find(p => p.id === activeProjectId) || DB.getProjects()[0];
  const [project, setProject] = useState<any>(mockProj);

  useEffect(() => {
    const isMock = activeProjectId.startsWith('proj_mock_') || activeProjectId === 'proj_1' || activeProjectId === 'proj_2' || activeProjectId === 'proj_3';
    
    if (isMock) {
      const found = DB.getProjects().find(p => p.id === activeProjectId) || DB.getProjects()[0];
      setProject(found);
    } else {
      const fetchApiProject = async () => {
        try {
          const contractRes = await contractGetAPI.getContractById(activeProjectId);
          const milestonesRes = await contractGetAPI.getMilestonesByContract(activeProjectId);
          
          if (contractRes.success && contractRes.data) {
            const contract = contractRes.data;
            const milestones = milestonesRes.data || [];
            
            const mapMilestoneStatus = (status: number): string => {
              if (status === 3 || status === 5) return 'paid';
              if (status === 1 || status === 2 || status === 4) return 'in_progress';
              return 'pending';
            };
            
            setProject({
              id: contract.contractsId,
              title: contract.title,
              jobId: contract.jobPostsId,
              clientId: contract.clientProfilesId,
              freelancerId: contract.freelancerProfilesId,
              totalBudget: contract.totalBudget,
              progress: contract.status === 8 ? 100 : contract.status === 7 ? 30 : 0,
              status: contract.status === 8 ? 'completed' : 'active',
              conversationId: `conv_${contract.contractsId}`,
              milestones: milestones.map((m: any) => ({
                id: m.milestoneId,
                title: m.title,
                amount: m.amount,
                dueDate: m.dueDate ? new Date(m.dueDate).toLocaleDateString() : '',
                status: mapMilestoneStatus(m.status),
              }))
            });
          }
        } catch (err) {
          console.error('Error fetching contract project from API:', err);
        }
      };
      fetchApiProject();
    }
  }, [activeProjectId]);


  // Dynamic conversations/projects list mapped to mockup structure
  const allProjects = DB.getProjects();
  const mockProjects = allProjects.map(p => {
    if (p.id === 'proj_1') {
      return {
        id: 'proj_1',
        title: 'E-commerce Platform Build',
        partnerName: isClient ? 'Alex Johnson' : 'Jordan Mitchell',
        partnerAvatar: isClient 
          ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuCt226TXncFjd6zQyyFNqkOAKj-pTYClfBHUGbG7EsCTL5gzWQbF5K-mojkZ1u9U91izwjnV--bOtLgKPwMjODHfOuVpg5nOAxiXsve-4RdrP3GeYe6L9llw_G0e7TExXaCWHruulVFEUP-acilXdvARPO-JVC17ShH6ztqc9CUYzp9r2Duy95bm3YrKoT0XmazmW2mgGKr4H_BYRs6iYRH0ATn2UaEHxrBE1AFiTPLNgtYDGnskVHrXWmKPI5nDsP3KsJHRYgTs29I' 
          : 'https://lh3.googleusercontent.com/aida-public/AB6AXuBeoKX1UynnkJ0b15ZqIqe0FGcJAeG-r0lmmDdDbCq_9lfPGs986ViSmQIz5X5Je-lT6mt1f75tc_3qUuEj_9zyqagKr9dnTiny_lzGv1OzrAGTpTIxTodcVIqD7Bxkd6FTFccqY2Ca6bKdb2VKNwcgZqYmTzZcj09OMTiNdybLbnS-wb_WxJhyeAJ_NARjM5HidZjgCFbCUZup_7-G2arZi-NMogLhwxyla0vxK5a0xl2w4XcMLfEc4KRaPz-CMm2twhh6r8nOs3Tb',
        latestMessage: "Sounds great, I've sent the contract...",
        time: '10:24 AM',
        unread: false,
        online: true,
        titleLong: 'E-Commerce Platform Redesign',
      };
    }
    
    const partnerId = isClient ? p.freelancerId : p.clientId;
    const partnerUser = DB.getUserById(partnerId);
    const pName = partnerUser?.name || (isClient ? 'Freelancer' : 'Client');
    return {
      id: p.id,
      title: p.title,
      partnerName: pName,
      partnerAvatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${pName}`,
      latestMessage: 'Project started and workspace active.',
      time: 'Just now',
      unread: false,
      online: true,
      titleLong: p.title,
    };
  });

  if (!mockProjects.some(p => p.id === 'proj_2')) {
    mockProjects.push({
      id: 'proj_2',
      title: 'Fintech Mobile App Redesign',
      partnerName: 'David Chen',
      partnerAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCt226TXncFjd6zQyyFNqkOAKj-pTYClfBHUGbG7EsCTL5gzWQbF5K-mojkZ1u9U91izwjnV--bOtLgKPwMjODHfOuVpg5nOAxiXsve-4RdrP3GeYe6L9llw_G0e7TExXaCWHruulVFEUP-acilXdvARPO-JVC17ShH6ztqc9CUYzp9r2Duy95bm3YrKoT0XmazmW2mgGKr4H_BYRs6iYRH0ATn2UaEHxrBE1AFiTPLNgtYDGnskVHrXWmKPI5nDsP3KsJHRYgTs29I',
      latestMessage: 'The API keys are updated now.',
      time: '2m',
      unread: true,
      online: true,
      titleLong: 'Fintech Mobile App Redesign',
    });
  }

  if (!mockProjects.some(p => p.id === 'proj_3')) {
    mockProjects.push({
      id: 'proj_3',
      title: 'SaaS Dashboard Analytics',
      partnerName: 'Elena Rodriguez',
      partnerAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCdLF72GSJAKTKAXQJTmZPrytHCNef0EG6PBa8RxPaGWZgX7RUdjbX130CZ1pIpbSfMGEx3KmopHX4jgiUbvhq6B5TXukEAT_AIiPOGs1SN4BRjDw61FLdp7frEThStyzCBbY7xelVeQlLA_EORhwu3gKWwfg9K26LgEOXbaWEpWdbw5ERIR1Eam3X2TJd6HMAqxsgwJuDdY-t9Dje5H0mM4kqDh2NfF7j8H4TnEPcCHTTrJnt8V3uQVeztENLHWLKKQk05XkftCx_j',
      latestMessage: "Let's review the Figma file tomorrow.",
      time: 'Yesterday',
      unread: false,
      online: false,
      titleLong: 'SaaS Analytics Dashboard Build',
    });
  }

  const currentProjData = mockProjects.find(p => p.id === activeProjectId) || mockProjects[0];
  const partnerName = currentProjData.partnerName;
  const partnerAvatar = currentProjData.partnerAvatar;
  const partnerTitle = activeProjectId === 'proj_1' ? 'Project Manager' : activeProjectId === 'proj_2' ? 'Lead Architect' : 'UI/UX Designer';
  const partnerCompany = activeProjectId === 'proj_1' ? 'TechFlow' : activeProjectId === 'proj_2' ? 'StartupXYZ' : 'Design Studio';
  const isPartnerOnline = currentProjData.online;

  // Manage message lists per project/conversation
  const [projectMessagesMap, setProjectMessagesMap] = useState<Record<string, Message[]>>({
    proj_1: [
      ...SEED_MESSAGES.map(m => ({ ...m, senderId: m.senderId === 'u_client_1' ? 'client' : 'freelancer' }))
    ],
    proj_2: [
      { id: 'm_p2_1', senderId: 'other', content: 'Hi! I am starting on the API gateway setup.', type: 'text', createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), isRead: true },
      { id: 'm_p2_2', senderId: 'other', content: 'The API keys are updated now.', type: 'text', createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(), isRead: false }
    ],
    proj_3: [
      { id: 'm_p3_1', senderId: 'other', content: 'Let\'s review the Figma file tomorrow.', type: 'text', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), isRead: true }
    ]
  });

  const projectMessages = projectMessagesMap[activeProjectId] || [];

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [projectMessages]);

  // Bind API queries on active project changes
  useEffect(() => {
    const fetchApiData = async () => {
      try {
        // reasonable API query to fetch project details
        await projectGetAPI.getProjectById(activeProjectId);
        // reasonable API query to fetch messages
        await messageGetAPI.getConversationMessages(project?.conversationId || 'conv_1');
      } catch (e) {
        console.warn('API call fallback to mock backend database: ', e);
      }
    };
    void fetchApiData();
  }, [activeProjectId, project?.conversationId]);

  // Actions
  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: user?.id || (isClient ? 'client' : 'freelancer'),
      content: messageInput,
      type: 'text' as const,
      createdAt: new Date().toISOString(),
    };

    setProjectMessagesMap(prev => ({
      ...prev,
      [activeProjectId]: [...(prev[activeProjectId] || []), newMsg]
    }));
    setMessageInput('');

    try {
      // reasonable API call to send message
      await messagePostAPI.sendMessage(newMsg);
    } catch (e) {
      console.warn('Fallback: sent message to local state.', e);
    }

    // Trigger partner reply
    setTimeout(() => {
      const replyMsg = {
        id: `msg_reply_${Date.now()}`,
        senderId: 'other',
        content: `Thanks for the message! I'm reviewing this on "${project?.title || ''}" and will follow up.`,
        type: 'text',
        createdAt: new Date().toISOString(),
      };
      setProjectMessagesMap(prev => ({
        ...prev,
        [activeProjectId]: [...(prev[activeProjectId] || []), replyMsg]
      }));
    }, 2000);
  };

  const handleSendAiMessage = () => {
    if (!aiMessage.trim()) return;
    const userMsg = aiMessage;
    setAiChat(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiMessage('');
    setTimeout(() => {
      setAiChat(prev => [...prev, { 
        role: 'ai', 
        content: `I've analyzed the query "${userMsg}" for the project "${project.title}". You are currently at ${project.progress}% progress. 1 milestone is completed and paid, and 1 is currently in-progress.` 
      }]);
    }, 1000);
  };

  // Removed deal handlers

  const handleSimulateAttachment = () => {
    const attachMsg = {
      id: `file_${Date.now()}`,
      senderId: user?.id || (isClient ? 'client' : 'freelancer'),
      content: "Here's the latest preview of the updated design requirements.",
      type: 'file',
      fileName: 'UI_Requirements_v2.jpg',
      fileUrl: 'https://images.unsplash.com/photo-1460925895917-aaf4f1f1c5ce?w=400&h=300&fit=crop',
      createdAt: new Date().toISOString(),
    };
    setProjectMessagesMap(prev => ({
      ...prev,
      [activeProjectId]: [...(prev[activeProjectId] || []), attachMsg]
    }));
    alert('Mock file "UI_Requirements_v2.jpg" attached successfully.');
  };

  const handleCreateMockMilestone = async () => {
    const title = prompt("Enter milestone title:");
    if (!title) return;
    const amountStr = prompt("Enter milestone amount ($):", "500");
    if (!amountStr) return;
    const amount = parseFloat(amountStr) || 500;
    
    const newMilestone = {
      id: `m_${Date.now()}`,
      title,
      description: 'Custom milestone created from chat workspace.',
      amount,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      status: 'pending'
    };
    project.milestones.push(newMilestone);
    setActiveProjectId(prev => prev); // force re-render
    
    try {
      // reasonable API call to add milestone
      await projectPutAPI.updateMilestone(activeProjectId, newMilestone.id, { status: 'pending' });
    } catch (e) {
      console.warn(e);
    }
    
    alert('New milestone proposed!');
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
    mockProjects,
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
    chatEndRef,
  };
}
