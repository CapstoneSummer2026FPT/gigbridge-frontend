import { DB } from '../../../mock_backend';
import type { MsgConversation, Message, RoomType, JobInfo } from '../../../types';

export type MsgMessage = Message;
export type { RoomType, JobInfo, MsgConversation };

// ─── Rooms ───────────────────────────────────────────────────────────────────
export const MOCK_ROOMS: { id: string; type: RoomType; label: string; description: string }[] = [
  {
    id: 'room_invited',
    type: 'invited',
    label: 'Invited Jobs',
    description: 'Invitations from clients for your skills',
  },
  {
    id: 'room_negotiation',
    type: 'negotiation',
    label: 'Negotiation',
    description: 'Active price & scope negotiations',
  },
  {
    id: 'room_workspace',
    type: 'workspace',
    label: 'Workspace',
    description: 'Active project workrooms',
  },
];

// ─── Conversations ────────────────────────────────────────────────────────────
export const MOCK_MSG_CONVERSATIONS: MsgConversation[] = DB.getConversations();

// ─── Messages ─────────────────────────────────────────────────────────────────
export const MOCK_MSG_MESSAGES: MsgMessage[] = DB.getMessages();
