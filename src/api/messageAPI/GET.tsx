import { messageHandlers } from '../../mock_backend';

export const messageGetAPI = {
  getConversationMessages: async (conversationId: string) => {
    return await messageHandlers.getConversationMessages(conversationId);
  },
};
