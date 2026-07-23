import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PolicyScreen from './PolicyScreen';

const getPolicyMock = vi.hoisted(() => vi.fn());

vi.mock('../../../api/policyAPI', () => ({
  policyAPI: {
    getGigBridgeVietnamPolicy: getPolicyMock,
  },
}));

vi.mock('../../../shared/components/AppLayout', () => ({
  GuestLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'policy.loading': 'Đang tải Bộ chính sách GigBridge...',
      'policy.loadError': 'Không thể tải Bộ chính sách GigBridge.',
      'policy.retry': 'Thử lại',
    }[key] || key),
  }),
}));

afterEach(() => {
  cleanup();
  getPolicyMock.mockReset();
});

describe('PolicyScreen', () => {
  it('shows a loading state while the Markdown request is pending', () => {
    getPolicyMock.mockReturnValue(new Promise(() => undefined));

    render(<PolicyScreen />);

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải Bộ chính sách GigBridge...');
  });

  it('renders Vietnamese Markdown, GFM tables, and safe external links', async () => {
    getPolicyMock.mockResolvedValue({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: '# Bộ chính sách GigBridge\n\n| Vai trò | Quyền |\n| --- | --- |\n| Freelancer | Nhận việc |\n\n[Tra cứu pháp luật](https://vanban.chinhphu.vn)',
    });

    render(<PolicyScreen />);

    expect(await screen.findByRole('heading', { name: 'Bộ chính sách GigBridge' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();

    const externalLink = screen.getByRole('link', { name: 'Tra cứu pháp luật' });
    expect(externalLink).toHaveAttribute('target', '_blank');
    expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows an error and retries the request', async () => {
    getPolicyMock
      .mockResolvedValueOnce({ success: false, statusCode: 500, message: 'Không thể kết nối.' })
      .mockResolvedValueOnce({ success: true, statusCode: 200, message: 'Success', data: '# Chính sách đã tải lại' });

    render(<PolicyScreen />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối.');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    await waitFor(() => expect(getPolicyMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('heading', { name: 'Chính sách đã tải lại' })).toBeInTheDocument();
  });
});
