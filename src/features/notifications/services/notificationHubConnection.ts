import * as signalR from '@microsoft/signalr';
import { getNotificationHubUrl } from '../../../service/apiService';

type ReconnectedHandler = () => void;
let connection: signalR.HubConnection | null = null;
let startPromise: Promise<void> | null = null;
let subscriberCount = 0;
const reconnectedHandlers = new Set<ReconnectedHandler>();

const ensureConnection = (): signalR.HubConnection => {
  if (connection) return connection;
  connection = new signalR.HubConnectionBuilder()
    .configureLogging(signalR.LogLevel.Warning)
    .withUrl(getNotificationHubUrl(), { accessTokenFactory: () => localStorage.getItem('access_token') ?? '' })
    .withAutomaticReconnect()
    .build();
  connection.onreconnected(() => reconnectedHandlers.forEach(handler => handler()));
  connection.onclose(() => { startPromise = null; });
  return connection;
};

const start = async (): Promise<void> => {
  if (subscriberCount === 0 || !localStorage.getItem('access_token')) return;
  const current = ensureConnection();
  if (current.state !== signalR.HubConnectionState.Disconnected) return;
  startPromise ??= current.start().finally(() => { startPromise = null; });
  await startPromise;
};

export const subscribeNotificationHubEvent = <TPayload>(
  eventName: string,
  handler: (payload: TPayload) => void,
): (() => void) => {
  const current = ensureConnection();
  const wrapped = (payload: TPayload): void => handler(payload);
  current.on(eventName, wrapped);
  subscriberCount += 1;
  void start().catch(error => console.warn('[NotificationHub] connection failed', error));
  let subscribed = true;
  return () => {
    if (!subscribed) return;
    subscribed = false;
    current.off(eventName, wrapped);
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0 && connection) {
      const idle = connection;
      connection = null;
      void idle.stop().catch(() => undefined);
    }
  };
};

export const onNotificationHubReconnected = (handler: ReconnectedHandler): (() => void) => {
  reconnectedHandlers.add(handler);
  return () => reconnectedHandlers.delete(handler);
};
