import { messageHandlers } from '../../mock_backend';
import type { Message } from '../../types/models/Message';

export const messagePostAPI = {
  sendMessage: async (data: Partial<Message>) => {
    return await messageHandlers.sendMessage(data);
  },

  markAsRead: async (messageIds: string[]) => {
    return await messageHandlers.markAsRead(messageIds);
  },
};
