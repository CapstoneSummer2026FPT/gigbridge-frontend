import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RouteErrorScreen } from './RouteErrorScreen';

describe('RouteErrorScreen', () => {
  it('offers reload and home recovery actions', () => {
    const reload = vi.fn();

    render(<RouteErrorScreen onReload={reload} />);

    expect(screen.getByRole('heading', { name: "We couldn't load this page" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reload page' }));
    expect(reload).toHaveBeenCalledOnce();

    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
  });
});

