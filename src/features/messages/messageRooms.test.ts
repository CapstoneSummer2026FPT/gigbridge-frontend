import { describe, expect, it } from 'vitest';
import { ConversationType } from '../../types/models/Message';
import { getMessageRoom, MESSAGE_ROOMS } from './messageRooms';

describe('message conversation grouping', () => {
  it('provides the four conversation categories in navigation order', () => {
    expect(MESSAGE_ROOMS.map(room => room.type)).toEqual([
      'invited',
      'negotiation',
      'workspace',
      'dispute',
    ]);
  });

  it('keeps dispute conversations out of the workspace category', () => {
    expect(getMessageRoom(ConversationType.Dispute)).toEqual({
      id: 'room_dispute',
      type: 'dispute',
    });
    expect(getMessageRoom(ConversationType.ContractWorkroom)).toEqual({
      id: 'room_workspace',
      type: 'workspace',
    });
  });
});
