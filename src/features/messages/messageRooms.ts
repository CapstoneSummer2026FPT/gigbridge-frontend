import type { RoomType } from '../../types/models/Message';

export const MESSAGE_ROOMS: Array<{ id: string; type: RoomType }> = [
  { id: 'room_invited', type: 'invited' },
  { id: 'room_negotiation', type: 'negotiation' },
  { id: 'room_workspace', type: 'workspace' },
];
