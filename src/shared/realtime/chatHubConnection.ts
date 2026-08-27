import * as signalR from '@microsoft/signalr';
import { getChatHubUrl } from '../../service/apiService';

type ReconnectedHandler = () => void;
export type ChatHubConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';
type StatusHandler = (status: ChatHubConnectionStatus) => void;
let connection: signalR.HubConnection | null = null;
let startPromise: Promise<void> | null = null;
let subscriberCount = 0;
let restartTimer: number | null = null;
const reconnectedHandlers = new Set<ReconnectedHandler>();
const statusHandlers = new Set<StatusHandler>();
let connectionStatus: ChatHubConnectionStatus = 'idle';

const publishStatus = (status: ChatHubConnectionStatus): void => {
  connectionStatus = status;
  statusHandlers.forEach(handler => handler(status));
};

const clearRestartTimer = (): void => {
  if (restartTimer !== null) {
    window.clearTimeout(restartTimer);
    restartTimer = null;
  }
};

const ensureConnection = (): signalR.HubConnection => {
  if (connection) return connection;
  connection = new signalR.HubConnectionBuilder()
    .configureLogging(signalR.LogLevel.Warning)
    .withUrl(getChatHubUrl(), { accessTokenFactory: () => localStorage.getItem('access_token') ?? '' })
    .withAutomaticReconnect()
    .build();
  connection.onreconnecting(() => publishStatus('reconnecting'));
  connection.onreconnected(() => {
    publishStatus('connected');
    reconnectedHandlers.forEach(handler => handler());
  });
  connection.onclose(() => {
    publishStatus('disconnected');
    startPromise = null;
    if (subscriberCount > 0 && localStorage.getItem('access_token')) {
      clearRestartTimer();
      restartTimer = window.setTimeout(() => {
        restartTimer = null;
        void startConnection().catch(() => undefined);
      }, 5_000);
    }
  });
  return connection;
};

const startConnection = async (): Promise<void> => {
  if (!localStorage.getItem('access_token') || subscriberCount === 0) return;
  const current = ensureConnection();
  if (current.state !== signalR.HubConnectionState.Disconnected) return;
  publishStatus('connecting');
  startPromise ??= current.start()
    .then(() => publishStatus('connected'))
    .catch(error => {
      publishStatus('failed');
      throw error;
    })
    .finally(() => { startPromise = null; });
  await startPromise;
};

const stopConnectionIfIdle = async (): Promise<void> => {
  if (subscriberCount > 0 || !connection) return;
  clearRestartTimer();
  const current = connection;
  connection = null;
  try { await startPromise; } catch { /* failure already surfaced */ }
  startPromise = null;
  await current.stop().catch(() => undefined);
};

export const subscribeChatHubEvent = <TPayload>(
  eventName: string,
  handler: (payload: TPayload) => void,
): (() => void) => {
  const current = ensureConnection();
  const wrapped = (payload: TPayload): void => handler(payload);
  current.on(eventName, wrapped);
  subscriberCount += 1;
  void startConnection().catch(error => console.warn('[ChatHub] connection failed', error));
  let subscribed = true;
  return () => {
    if (!subscribed) return;
    subscribed = false;
    current.off(eventName, wrapped);
    subscriberCount = Math.max(0, subscriberCount - 1);
    void stopConnectionIfIdle();
  };
};

export const onChatHubReconnected = (handler: ReconnectedHandler): (() => void) => {
  reconnectedHandlers.add(handler);
  return () => reconnectedHandlers.delete(handler);
};

export const onChatHubStatusChanged = (handler: StatusHandler): (() => void) => {
  statusHandlers.add(handler);
  handler(connectionStatus);
  return () => statusHandlers.delete(handler);
};

export interface ChatHubConnectionLease {
  connection: signalR.HubConnection;
  ready: Promise<void>;
  release: () => void;
}

export const retainChatHubConnection = (): ChatHubConnectionLease => {
  const current = ensureConnection();
  subscriberCount += 1;
  let retained = true;
  return {
    connection: current,
    ready: startConnection(),
    release: () => {
      if (!retained) return;
      retained = false;
      subscriberCount = Math.max(0, subscriberCount - 1);
      void stopConnectionIfIdle();
    },
  };
};
