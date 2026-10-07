import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 15_000 });
import { createMockFetch, createMockState, type MockState } from '@/test/mock-backend';
import { App } from './App';

let state: MockState;

beforeEach(() => {
  state = createMockState();
  vi.stubGlobal('fetch', createMockFetch(state));
  localStorage.setItem('agentic-admin-language', 'en');
});

async function signIn() {
  window.history.replaceState(null, '', '#/login');
  const user = userEvent.setup();
  render(<App />);
  await user.type(await screen.findByLabelText(/Email address/), 'admin@example.test');
  await user.type(screen.getByLabelText(/^Password/), 'secret');
  await user.click(screen.getByRole('button', { name: /Sign in/ }));
  await screen.findByRole('heading', { level: 1, name: 'Dashboard' }, { timeout: 5000 });
  return user;
}

describe('Admin portal', () => {
  it('redirects anonymous visitors to login and validates the form', async () => {
    window.history.replaceState(null, '', '#/users');
    const user = userEvent.setup();
    render(<App />);
    const submit = await screen.findByRole('button', { name: /Sign in/ });
    await user.click(submit);
    expect(await screen.findByText('Email is required.')).toBeInTheDocument();
    expect(state.requests).toHaveLength(0);
  });

  it('shows the server error for invalid credentials', async () => {
    window.history.replaceState(null, '', '#/login');
    const user = userEvent.setup();
    render(<App />);
    await user.type(await screen.findByLabelText(/Email address/), 'admin@example.test');
    await user.type(screen.getByLabelText(/^Password/), 'wrong');
    await user.click(screen.getByRole('button', { name: /Sign in/ }));
    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
  });

  it('signs in, shows dashboard counters and lists users with server pagination', async () => {
    const user = await signIn();
    expect(await screen.findByText('Total users')).toBeInTheDocument();
    expect(sessionStorage.getItem('agentic-admin-session')).toContain('mock-token');

    await user.click(screen.getByRole('link', { name: 'Users' }));
    const table = await screen.findByRole('region', { name: 'Users' }, { timeout: 5000 });
    expect(within(table).getAllByRole('row')).toHaveLength(21); // header + 20
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await waitFor(() =>
      expect(state.requests.some((r) => r.path === '/admin/users' && r.query.page === '2')).toBe(
        true,
      ),
    );
  });

  it('asks for confirmation before deleting and calls the API', async () => {
    const user = await signIn();
    await user.click(screen.getByRole('link', { name: 'Buildings' }));
    const row = (await screen.findByRole('link', { name: 'A4' }, { timeout: 5000 })).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: /Delete building\?/ });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await screen.findByText('Deleted successfully.');
    expect(state.requests).toContainEqual(
      expect.objectContaining({ method: 'DELETE', path: '/buildings/b-2' }),
    );
  });
  it('returns to the originally requested page after signing in', async () => {
    window.history.replaceState(null, '', '#/buildings');
    const user = userEvent.setup();
    render(<App />);
    await user.type(await screen.findByLabelText(/Email address/), 'admin@example.test');
    await user.type(screen.getByLabelText(/^Password/), 'secret');
    await user.click(screen.getByRole('button', { name: /Sign in/ }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Buildings' }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});
