import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockApiClient, mockAxiosPost, mockAxiosCreate } = vi.hoisted(() => {
  const apiClientFn = vi.fn(async () => ({ data: { success: true }, status: 200 }));
  Object.assign(apiClientFn, {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
  });

  return {
    mockApiClient: apiClientFn as typeof apiClientFn & {
      interceptors: {
        request: { use: ReturnType<typeof vi.fn> };
        response: { use: ReturnType<typeof vi.fn> };
      };
      get: ReturnType<typeof vi.fn>;
      post: ReturnType<typeof vi.fn>;
    },
    mockAxiosPost: vi.fn(),
    mockAxiosCreate: vi.fn(() => apiClientFn),
  };
});

vi.mock('axios', () => ({
  default: {
    create: mockAxiosCreate,
    post: mockAxiosPost,
    isAxiosError: (value: unknown): value is { response?: unknown } =>
      typeof value === 'object' && value !== null && 'isAxiosError' in value,
  },
}));

// Importing for its side effect: registers the interceptors on the mocked apiClient.
import '../service/apiService';

const assignMock = vi.fn();

function makeAxiosError(status: number, url: string) {
  return {
    isAxiosError: true,
    response: { status, data: {} },
    config: { url, headers: {} as Record<string, string>, _retry: false },
  };
}

describe('apiService refresh interceptor', () => {
  const getOnRejected = () => {
    const calls = mockApiClient.interceptors.response.use.mock.calls;
    const lastCall = calls[calls.length - 1];
    return lastCall[1] as (error: unknown) => Promise<unknown>;
  };

  beforeEach(() => {
    mockAxiosPost.mockReset();
    mockApiClient.mockReset();
    mockApiClient.mockImplementation(async () => ({ data: { success: true }, status: 200 }));
    localStorage.clear();
    localStorage.setItem('access_token', 'stale-access-token');
    assignMock.mockReset();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: assignMock },
      writable: true,
      configurable: true,
    });
  });

  it('refreshes once on a 401 and retries the original request with the new token', async () => {
    mockAxiosPost.mockResolvedValueOnce({
      data: { success: true, data: { token: 'fresh-access-token' } },
    });
    const onRejected = getOnRejected();
    const error = makeAxiosError(401, '/contracts');

    await onRejected(error);

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      expect.any(Object),
      expect.any(Object),
    );
    expect(mockApiClient).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('access_token')).toBe('fresh-access-token');
  });

  it('collapses multiple concurrent 401s into a single refresh call', async () => {
    mockAxiosPost.mockResolvedValueOnce({
      data: { success: true, data: { token: 'fresh-access-token' } },
    });
    const onRejected = getOnRejected();

    await Promise.all([
      onRejected(makeAxiosError(401, '/contracts')),
      onRejected(makeAxiosError(401, '/proposals')),
    ]);

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
  });

  it('does not clear storage or navigate away when refresh succeeds', async () => {
    mockAxiosPost.mockResolvedValueOnce({
      data: { success: true, data: { token: 'fresh-access-token' } },
    });
    const onRejected = getOnRejected();

    await onRejected(makeAxiosError(401, '/contracts'));

    expect(localStorage.getItem('access_token')).toBe('fresh-access-token');
    expect(assignMock).not.toHaveBeenCalled();
  });

  it('clears storage and redirects to login when refresh genuinely fails', async () => {
    mockAxiosPost.mockRejectedValueOnce(new Error('refresh token expired'));
    localStorage.setItem('gigbridge_user', 'encoded-user');
    localStorage.setItem('gigbridge_session', 'encoded-session');
    const onRejected = getOnRejected();

    await expect(onRejected(makeAxiosError(401, '/contracts'))).rejects.toThrow();

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('gigbridge_user')).toBeNull();
    expect(localStorage.getItem('gigbridge_session')).toBeNull();
    expect(assignMock).toHaveBeenCalledWith('/auth/login');
  });
});
