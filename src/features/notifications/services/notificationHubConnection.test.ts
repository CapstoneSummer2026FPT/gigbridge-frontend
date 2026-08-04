import { beforeEach, describe, expect, it, vi } from 'vitest';

const signalRMock = vi.hoisted(() => {
  const connection = {};
  const builder = {
    configureLogging: vi.fn(),
    withUrl: vi.fn(),
    withAutomaticReconnect: vi.fn(),
    build: vi.fn(() => connection),
  };
  builder.configureLogging.mockReturnValue(builder);
  builder.withUrl.mockReturnValue(builder);
  builder.withAutomaticReconnect.mockReturnValue(builder);
  return { builder, connection };
});

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: vi.fn(function HubConnectionBuilderMock() {
    return signalRMock.builder;
  }),
  HttpTransportType: { WebSockets: 1 },
  LogLevel: { Warning: 'Warning' },
}));

vi.mock('../../../service/apiService', () => ({
  getNotificationHubUrl: () => 'https://api.example.com/hubs/notification',
}));

import { createNotificationHubConnection } from './notificationHubConnection';

describe('createNotificationHubConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signalRMock.builder.configureLogging.mockReturnValue(signalRMock.builder);
    signalRMock.builder.withUrl.mockReturnValue(signalRMock.builder);
    signalRMock.builder.withAutomaticReconnect.mockReturnValue(signalRMock.builder);
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'access-token'),
    });
  });

  it('uses the direct WebSocket fast path without negotiation', () => {
    expect(createNotificationHubConnection('direct-websocket')).toBe(signalRMock.connection);

    expect(signalRMock.builder.withUrl).toHaveBeenCalledWith(
      'https://api.example.com/hubs/notification',
      expect.objectContaining({
        transport: 1,
        skipNegotiation: true,
        accessTokenFactory: expect.any(Function),
      }),
    );
    const options = signalRMock.builder.withUrl.mock.calls[0][1];
    expect(options.accessTokenFactory()).toBe('access-token');
  });

  it('keeps negotiated transports available as a fallback', () => {
    createNotificationHubConnection('negotiated');

    const options = signalRMock.builder.withUrl.mock.calls[0][1];
    expect(options.accessTokenFactory()).toBe('access-token');
    expect(options).not.toHaveProperty('transport');
    expect(options).not.toHaveProperty('skipNegotiation');
  });
});
