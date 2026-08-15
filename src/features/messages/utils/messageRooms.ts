import { ConversationType, type RoomType } from '../../../types/models/Message';

export interface MessageRoom {
  id: string;
  type: RoomType;
}

export const MESSAGE_ROOMS: MessageRoom[] = [
  { id: 'room_negotiation', type: 'negotiation' },
  { id: 'room_workspace', type: 'workspace' },
];

export const getMessageRoom = (conversationType: number): MessageRoom => {
  switch (conversationType) {
    case ConversationType.ContractWorkroom:
    case ConversationType.Dispute:
      return MESSAGE_ROOMS[1];
    case ConversationType.JobInvitedRoom:
    case ConversationType.JobNegotiation:
    default:
      return MESSAGE_ROOMS[0];
  }
};
