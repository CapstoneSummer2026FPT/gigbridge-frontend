import * as signalR from '@microsoft/signalr';
import { getChatHubUrl } from '../../../service/apiService';

export type ChatHubConnectionMode = 'direct-websocket' | 'negotiated';

export const createChatHubConnection = (
  mode: ChatHubConnectionMode = 'direct-websocket',
  reconnectDelaysMs: number[] = [0, 2_000, 5_000, 10_000, 30_000],
) => {
  const connectionOptions = mode === 'direct-websocket'
    ? {
        accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: true,
      }
    : {
        accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
      };

  return new signalR.HubConnectionBuilder()
    .configureLogging(signalR.LogLevel.Warning)
    .withUrl(getChatHubUrl(), connectionOptions)
    .withAutomaticReconnect(reconnectDelaysMs)
    .build();
};
