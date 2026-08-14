import { ConversationType, type RoomType } from '../../../types/models/Message';

export interface MessageRoom {
  id: string;
  type: RoomType;
}

export const MESSAGE_ROOMS: MessageRoom[] = [
  { id: 'room_invited', type: 'invited' },
  { id: 'room_negotiation', type: 'negotiation' },
  { id: 'room_workspace', type: 'workspace' },
];

export const getMessageRoom = (conversationType: number): MessageRoom => {
  switch (conversationType) {
    case ConversationType.JobInvitedRoom:
      return MESSAGE_ROOMS[0];
    case ConversationType.ContractWorkroom:
    case ConversationType.Dispute:
      return MESSAGE_ROOMS[2];
    case ConversationType.JobNegotiation:
    default:
      return MESSAGE_ROOMS[1];
  }
};
