import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/app/App';
import { createMockFetch, createMockState, type MockState } from '@/test/mock-backend';
import { sessionStore } from './session';

let state: MockState;

beforeEach(() => {
  state = createMockState();
  localStorage.setItem('agentic-admin-language', 'en');
});

describe('session restore', () => {
  it('keeps a stored session across a reload under StrictMode', async () => {
    vi.stubGlobal('fetch', createMockFetch(state));
    sessionStore.save({ accessToken: 'mock-token', expiresAt: '2099-01-01T00:00:00Z' });
    window.history.replaceState(null, '', '#/dashboard');
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(sessionStore.load()?.accessToken).toBe('mock-token');
  });

  it('keeps the stored session when the API is unreachable', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });
    sessionStore.save({ accessToken: 'mock-token', expiresAt: '2099-01-01T00:00:00Z' });
    window.history.replaceState(null, '', '#/dashboard');
    render(<App />);
    expect(
      await screen.findByText(/Cannot connect to the API/, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(sessionStore.load()?.accessToken).toBe('mock-token');
  });

  it('drops an expired session without calling the API', async () => {
    const fetch = vi.fn(createMockFetch(state));
    vi.stubGlobal('fetch', fetch);
    sessionStore.save({ accessToken: 'mock-token', expiresAt: '2000-01-01T00:00:00Z' });
    window.history.replaceState(null, '', '#/dashboard');
    render(<App />);
    expect(
      await screen.findByText('Your session has expired. Please sign in again.'),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(sessionStore.load()).toBeNull();
  });
});
