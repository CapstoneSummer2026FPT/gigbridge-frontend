import * as signalR from '@microsoft/signalr';
import { getNotificationHubUrl } from '../../../service/apiService';

export type NotificationHubConnectionMode = 'direct-websocket' | 'negotiated';

export const createNotificationHubConnection = (
  mode: NotificationHubConnectionMode = 'direct-websocket',
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
    .withUrl(getNotificationHubUrl(), connectionOptions)
    .withAutomaticReconnect()
    .build();
};
