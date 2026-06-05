export type ChatAttachment = {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: 'image' | 'document' | 'pdf';
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  attachment?: ChatAttachment;
};

export type Conversation = {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: 'Client' | 'Freelancer';
  isBanned?: boolean;
  lastActivityAt: string;
};

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_1',
    participantId: 'u_client_1',
    participantName: 'Acme Studio',
    participantRole: 'Client',
    lastActivityAt: '2026-06-03T08:30:00Z',
  },
  {
    id: 'conv_2',
    participantId: 'u_freelancer_2',
    participantName: 'Sarah Chen',
    participantRole: 'Freelancer',
    lastActivityAt: '2026-06-02T16:10:00Z',
  },
];

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_1',
    conversationId: 'conv_1',
    senderId: 'u_client_1',
    receiverId: 'current_user',
    content: 'Hi, can you share the latest dashboard build?',
    createdAt: '2026-06-03T08:20:00Z',
    isRead: true,
  },
  {
    id: 'msg_2',
    conversationId: 'conv_1',
    senderId: 'current_user',
    receiverId: 'u_client_1',
    content: 'Yes, I am polishing the analytics widgets and will send it today.',
    createdAt: '2026-06-03T08:24:00Z',
    isRead: true,
  },
  {
    id: 'msg_3',
    conversationId: 'conv_2',
    senderId: 'u_freelancer_2',
    receiverId: 'current_user',
    content: 'Attached my updated CV for your review.',
    createdAt: '2026-06-02T16:10:00Z',
    isRead: false,
    attachment: {
      fileName: 'Sarah_Chen_CV.pdf',
      fileUrl: '#',
      fileSize: 720000,
      fileType: 'pdf',
    },
  },
];
