import { api } from '../api.js';
import { formatDate, t } from '../i18n.js';
import { dateRange, idOf } from '../utils.js';
import type { History } from '../types.js';
import { recordLink, action, button, confirmAction, empty, errorMessage, field, formValue, h, iconButton, link, muted, notice, pageTitle, pager, panel, remote, table, text, toast } from '../ui.js';
export function chats(root: HTMLElement, signal: AbortSignal): void {
  let page = 1, params: { userId?: string; fromDate?: string; toDate?: string } = {};
  const body = h('div'), errors = h('div'); let reload: () => Promise<void> = async () => {};
  const form = h('form', { class: 'filter-bar' }, field('User ID', 'userId', '', { maxlength: 100 }), field('From date', 'from', '', { type: 'date' }), field('To date', 'to', '', { type: 'date' }), h('button', { class: 'button primary', type: 'submit' }, t('Apply filters')));
  form.addEventListener('submit', event => { event.preventDefault(); errors.replaceChildren(); try { const data = new FormData(form); params = { userId: formValue(data, 'userId'), ...dateRange(formValue(data, 'from'), formValue(data, 'to')) }; page = 1; void reload(); } catch (error) { errors.replaceChildren(notice(errorMessage(error), 'danger')); } });
  root.append(pageTitle('Chat histories', 'Review conversations across the campus platform.', button('Refresh', () => void reload(), 'refresh')), notice('Chat content may contain personal information. Access it only for authorized support tasks.'), h('section', { class: 'card' }, form, errors, body));
  reload = remote(body, signal, s => api.histories({ page, pageSize: 20, ...params }, s), data => [table<History>([
    { label: 'Conversation', cell: row => row.id ? recordLink(row.header || row.id, 'chats/' + encodeURIComponent(row.id), 'chat', 'record-link clamp') : text(row.header) },
    { label: 'User ID', cell: row => h('code', { class: 'small' }, text(row.userId)) }, { label: 'Created', cell: row => muted(formatDate(row.create_date)) },
    { label: 'Actions', cell: row => {
      if (!row.id) return null;
      const control = iconButton('Delete conversation', 'trash', () => void action(control, async () => { if (!await confirmAction('Delete conversation?', t('All messages in this conversation will be deleted.'), 'Delete')) return; await api.deleteHistory(idOf(row)); toast('Deleted successfully.'); void reload(); }), true);
      return h('div', { class: 'actions' }, link('View', 'chats/' + encodeURIComponent(row.id), 'chevron', 'text-link'), control);
    } },
  ], data.items, 'Chat histories'), pager(data, p => { page = p; void reload(); })]);
}
export function chatDetail(root: HTMLElement, signal: AbortSignal, id: string): void {
  const body = h('div'); let reload: () => Promise<void> = async () => {};
  const remove = button('Delete conversation', () => void action(remove, async () => { if (!await confirmAction('Delete conversation?', t('All messages in this conversation will be deleted.'), 'Delete')) return; await api.deleteHistory(id); toast('Deleted successfully.'); location.hash = '#/chats'; }), 'trash', 'danger-outline');
  root.append(pageTitle('Conversation', id, link('Back', 'chats', 'back', 'button secondary'), button('Refresh', () => void reload(), 'refresh'), remove), body);
  reload = remote(body, signal, s => api.messages(id, s), data => panel('Messages', data.length ? h('div', { class: 'message-list' }, [...data].sort((a, b) => (Date.parse(a.contact_time || '') || 0) - (Date.parse(b.contact_time || '') || 0)).map(message => {
    const control = iconButton('Delete message', 'trash', () => void action(control, async () => { if (!await confirmAction('Delete message?', t('This action cannot be undone.'), 'Delete')) return; await api.deleteMessage(idOf(message)); toast('Deleted successfully.'); void reload(); }), true);
    // contact_person is a string, not an enum: display its actual value instead of inventing user/assistant roles.
    return h('article', { class: 'message-card' }, h('div', { class: 'spread' }, h('strong', {}, message.contact_person || t('Participant')), h('div', { class: 'actions' }, h('small', { class: 'muted' }, formatDate(message.contact_time)), message.id ? control : null)), h('p', { class: 'prose' }, text(message.content)));
  })) : empty('No messages yet', 'This conversation has no messages.')));
}
