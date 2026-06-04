export type TopNavNotification = {
  id: string;
  userId: string;
  type: 'message' | 'proposal' | 'milestone' | 'payment' | 'ai_suggestion' | 'system';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
};

export const MOCK_TOP_NAV_NOTIFICATIONS: TopNavNotification[] = [
  {
    id: 'topnav_notif_1',
    userId: 'demo_client_001',
    type: 'proposal',
    title: 'New proposal received',
    body: 'Demo Freelancer applied to your Premium CRM Automation job post.',
    isRead: false,
    createdAt: '2026-06-03T08:35:00Z',
    actionUrl: '/proposals',
  },
  {
    id: 'topnav_notif_2',
    userId: 'demo_client_001',
    type: 'milestone',
    title: 'Milestone ready for review',
    body: 'Dashboard implementation was submitted and is waiting for approval.',
    isRead: false,
    createdAt: '2026-06-03T07:50:00Z',
    actionUrl: '/contracts/contract_mock_1',
  },
  {
    id: 'topnav_notif_3',
    userId: 'demo_freelancer_001',
    type: 'message',
    title: 'New workspace message',
    body: 'Demo Client replied in the SaaS Analytics Dashboard workspace.',
    isRead: false,
    createdAt: '2026-06-03T06:20:00Z',
    actionUrl: '/workspace/proj_1',
  },
  {
    id: 'topnav_notif_4',
    userId: 'demo_freelancer_001',
    type: 'payment',
    title: 'Escrow payment released',
    body: 'A milestone payment was released to your wallet.',
    isRead: true,
    createdAt: '2026-06-02T15:10:00Z',
    actionUrl: '/wallet/history',
  },
  {
    id: 'topnav_notif_5',
    userId: 'demo_client_001',
    type: 'ai_suggestion',
    title: 'AI match found',
    body: 'Smart Talent Matching found 4 strong candidates for your open job.',
    isRead: true,
    createdAt: '2026-06-02T11:15:00Z',
    actionUrl: '/smart-talent-matching',
  },
];
