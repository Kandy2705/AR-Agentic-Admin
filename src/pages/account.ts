import { api } from '../api.js';
import { session } from '../auth.js';
import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { dateInput, initials } from '../utils.js';
import { action, badge, button, errorMessage, field, formDialog, h, link, muted, notice, pageTitle, panel, recordDetails, remote, text, toast } from '../ui.js';
import { userFields, userPayload } from './users.js';
export function login(root: HTMLElement): void {
  const email = field('Email address', 'email', '', { type: 'email', required: true, autocomplete: 'username', maxlength: 254, placeholder: 'admin@example.edu.vn' });
  const password = field('Password', 'password', '', { type: 'password', required: true, autocomplete: 'current-password' });
  const show = h('input', { type: 'checkbox', id: 'show-password' }); show.addEventListener('change', () => { password.querySelector('input')!.type = show.checked ? 'text' : 'password'; });
  const staleMessage = session.message;
  session.message = '';
  const errors = h('div', { 'aria-live': 'assertive' }, staleMessage ? notice(staleMessage, 'danger') : null);
  const submit = h('button', { type: 'submit', class: 'button primary login-submit' }, t('Sign in'), icon('arrow'));
  const fieldset = h('fieldset', {}, email, password, h('label', { for: 'show-password', class: 'check-label' }, show, t('Show password')), submit);
  const form = h('form', {}, fieldset, errors);
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (fieldset.disabled || !form.reportValidity()) return;
    const data = new FormData(form); fieldset.disabled = true; errors.replaceChildren(); form.setAttribute('aria-busy', 'true');
    try {
      await session.login(String(data.get('email') || '').trim(), String(data.get('password') || ''));
      if (session.user) {
        if (location.hash !== '#/dashboard') location.hash = '#/dashboard';
        else window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    }
    catch (error) { errors.replaceChildren(notice(errorMessage(error), 'danger')); }
    finally { fieldset.disabled = false; form.removeAttribute('aria-busy'); }
  });
  root.append(h('div', { class: 'login-layout' }, h('section', { class: 'login-brand' }, h('div', { class: 'brand' }, h('img', { src: './mark.svg', alt: '', width: 42, height: 42 }), h('span', {}, 'AGENTIC', h('strong', {}, 'AR'))), h('div', { class: 'login-copy' }, h('span', { class: 'eyebrow' }, 'CAMPUS INTELLIGENCE'), h('h1', {}, t('A connected campus.')), h('h1', { class: 'accent-text' }, t('One clear view.')), h('p', {}, t('Your workspace for campus destinations, student support and AI conversations.')), h('div', { class: 'login-illustration', 'aria-hidden': 'true' }, h('div', { class: 'orbit orbit-one' }), h('div', { class: 'orbit orbit-two' }), h('div', { class: 'orbit-center' }, icon('building')), h('div', { class: 'orbit-dot dot-one' }, icon('chat')), h('div', { class: 'orbit-dot dot-two' }, icon('pin')))), h('small', { class: 'login-footnote' }, 'AGENTIC AR / ADMIN PORTAL')), h('main', { id: 'main-content', tabindex: '-1', class: 'login-main' }, h('div', { class: 'login-card' }, h('span', { class: 'login-shield' }, icon('shield')), badge('Admin workspace', 'purple'), h('h2', {}, t('Welcome back')), h('p', { class: 'muted' }, t('Sign in with an active Admin account to continue.')), form, h('p', { class: 'login-security muted' }, icon('lock'), t('Your session is stored in this tab only. No password is stored.'))))));
}
export function profile(root: HTMLElement, signal: AbortSignal): void {
  const body = h('div'); let reload: () => Promise<void> = async () => {};
  root.append(pageTitle('Profile', 'Your account and security settings.', link('Change password', 'password', 'lock', 'button secondary')), body);
  reload = remote(body, signal, s => api.me(s), user => panel('Account', h('div', { class: 'detail-body' }, h('div', { class: 'profile-banner' }, h('span', { class: 'avatar large' }, initials(user.name)), h('div', {}, h('h2', {}, text(user.name)), muted(user.email)), badge(text(user.role), 'purple'), badge(user.isActive ? 'Active' : 'Disabled', user.isActive ? 'success' : 'danger')), recordDetails([['ID', h('code', {}, text(user.id))], ['Email', text(user.email)], ['Phone', text(user.phone)], ['Birthday', dateInput(user.birthday) || '—'], ['Gender', text(user.gender)]]), button('Edit profile', () => formDialog('Edit profile', userFields(user), async data => { const result = await api.updateProfile(userPayload(data)); session.user = result; return result; }, () => void reload()), 'edit', 'primary'))));
}
export function password(root: HTMLElement, signal: AbortSignal): void {
  const email = session.user?.email || '';
  const errors = h('div', { 'aria-live': 'assertive' });
  let waitUntil = 0;
  const send = button('Send OTP', () => void action(send, async () => {
    if (Date.now() < waitUntil) return;
    const sent = await api.sendOtp(email); if (!sent) throw new Error('The OTP could not be sent. Please try again.');
    toast('OTP sent. Check your email.'); waitUntil = Date.now() + 60000;
  }), 'mail');
  const timer = setInterval(() => { const seconds = Math.max(0, Math.ceil((waitUntil - Date.now()) / 1000)); if (seconds > 0) { send.disabled = true; send.querySelector('span')!.textContent = `${t('Send OTP')} (${seconds}s)`; } else if (send.getAttribute('aria-busy') !== 'true') { send.disabled = false; send.querySelector('span')!.textContent = t('Send OTP'); } }, 1000);
  signal.addEventListener('abort', () => clearInterval(timer), { once: true });
  const fieldset = h('fieldset', {}, field('Email', 'email', email, { readonly: true, type: 'email' }), h('div', { class: 'otp-row' }, field('OTP code', 'otpCode', '', { required: true, autocomplete: 'one-time-code', maxlength: 20 }), send), field('Old password', 'oldPassword', '', { type: 'password', required: true, autocomplete: 'current-password' }), field('New password', 'newPassword', '', { type: 'password', required: true, minlength: 8, autocomplete: 'new-password' }), field('Confirm password', 'confirm', '', { type: 'password', required: true, minlength: 8, autocomplete: 'new-password' }), h('button', { type: 'submit', class: 'button primary' }, icon('lock'), t('Change password')));
  const form = h('form', { class: 'detail-body narrow-form' }, fieldset, errors);
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (fieldset.disabled || !form.reportValidity()) return;
    const data = new FormData(form), oldPassword = String(data.get('oldPassword') || ''), newPassword = String(data.get('newPassword') || ''); errors.replaceChildren();
    if (newPassword !== data.get('confirm')) { errors.append(notice('The passwords do not match.', 'danger')); return; }
    if (newPassword === oldPassword) { errors.append(notice('Choose a new password different from the old password.', 'danger')); return; }
    fieldset.disabled = true;
    try { await api.changePassword({ email, oldPassword, newPassword, otpCode: String(data.get('otpCode') || '').trim() }); session.clear('Password changed. Please sign in again.'); }
    catch (error) { if (!signal.aborted) errors.replaceChildren(notice(errorMessage(error), 'danger')); }
    finally { fieldset.disabled = false; }
  });
  root.append(pageTitle('Change password', 'Verify your email and set a new password.', link('Back', 'profile', 'back', 'button secondary')), panel('Account security', form), notice('The portal signs out locally after a password change. Server-side session revocation is managed by the backend.'));
}
