import * as signalR from '@microsoft/signalr';
import { getSystemTrackingHubUrl } from '../../../service/apiService';

export type SystemTrackingHubConnectionMode = 'direct-websocket' | 'negotiated';

export const createSystemTrackingHubConnection = (
  _mode: SystemTrackingHubConnectionMode = 'direct-websocket',
  reconnectDelaysMs: number[] = [0, 2_000, 5_000, 10_000, 30_000],
) => {
  const connectionOptions = {
    accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
    transport: signalR.HttpTransportType.WebSockets,
    skipNegotiation: true,
  };

  return new signalR.HubConnectionBuilder()
    .configureLogging(signalR.LogLevel.Warning)
    .withUrl(getSystemTrackingHubUrl(), connectionOptions)
    .withAutomaticReconnect(reconnectDelaysMs)
    .build();
};
