import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PolicyScreen from './PolicyScreen';

vi.mock('../../../shared/components/AppLayout', () => ({
  GuestLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => ({
      'policy.legalCenter': 'Trung tâm pháp lý',
      'policy.pageTitle': 'Chính sách rõ ràng cho mọi dự án',
      'policy.pageDescription': 'Quyền và nghĩa vụ của người dùng.',
      'policy.documentInfo': 'Thông tin tài liệu',
      'policy.version': values?.version || '',
      'policy.updatedAt': `Cập nhật ${values?.date || ''}`,
      'policy.policyViews': 'Các trang chính sách',
      'policy.allPolicies': 'Toàn bộ chính sách',
      'policy.terms': 'Điều khoản sử dụng',
      'policy.privacy': 'Quyền riêng tư',
      'policy.tableOfContents': 'Mục lục',
      'policy.print': 'In chính sách',
      'policy.contact': 'Liên hệ hỗ trợ',
    }[key] || key),
  }),
}));

const renderPolicy = () => render(
  <MemoryRouter initialEntries={['/policies']}>
    <PolicyScreen />
  </MemoryRouter>,
);

afterEach(cleanup);

describe('PolicyScreen', () => {
  it('renders the frontend-hardcoded policy without a loading or error state', () => {
    renderPolicy();

    expect(screen.getByRole('heading', { name: 'BỘ CHÍNH SÁCH SỬ DỤNG NỀN TẢNG GIGBRIDGE' })).toBeInTheDocument();
    expect(screen.getAllByText('Ver 1.0 Gigbridge').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: '3. Quyền của Client' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '6. Nghĩa vụ của Freelancer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '7. Quyền và nghĩa vụ của GigBridge' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('builds the table of contents and protects external legal links', () => {
    renderPolicy();

    const termsLink = screen.getByRole('link', { name: /PHẦN I – ĐIỀU KHOẢN SỬ DỤNG/ });
    expect(termsLink).toHaveAttribute('href', '#phan-i-dieu-khoan-su-dung');

    const legalLink = screen.getByRole('link', { name: 'Luật Thương mại điện tử số 122/2025/QH15' });
    expect(legalLink).toHaveAttribute('target', '_blank');
    expect(legalLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
