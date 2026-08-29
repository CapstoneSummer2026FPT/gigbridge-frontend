import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL, revokeServerSession } from './apiService';

describe('revokeServerSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts a credentialed keepalive logout request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    revokeServerSession();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    });
  });
});
