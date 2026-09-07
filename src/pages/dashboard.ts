import { api } from '../api.js';
import { session } from '../auth.js';
import { icon, type IconName } from '../icons.js';
import { count, formatDate, t } from '../i18n.js';
import { newest } from '../utils.js';
import { recordLink, h, button, link, muted, pageTitle, panel, remote, table, text } from '../ui.js';
export function dashboard(root: HTMLElement, signal: AbortSignal): void {
  const summary = h('div'), questions = h('div'), chats = h('div');
  const reloads: (() => Promise<void>)[] = [];
  root.append(pageTitle('Dashboard', 'A clear view of your campus, community and conversations.', button('Refresh', () => reloads.forEach(reload => void reload()), 'refresh')),
    h('section', { class: 'welcome-banner' }, h('div', {}, h('span', { class: 'eyebrow' }, 'AGENTIC AR / CONTROL CENTER'), h('h2', {}, t('Welcome back'), ', ', session.user?.name || 'Admin', '.'), h('p', {}, t('One workspace to keep your campus connected.'))), h('div', { class: 'welcome-symbol', 'aria-hidden': 'true' }, icon('building'))), summary,
    h('div', { class: 'dashboard-columns' }, panel('Recent questions', questions, link('View all', 'questions', undefined, 'text-link')), panel('Recent conversations', chats, link('View all', 'chats', undefined, 'text-link'))));
  reloads.push(remote(summary, signal, s => api.summary(s), data => {
    const metrics: [string, number, IconName, string][] = [['Total users', data.totalUsers, 'users', 'users'], ['Total buildings', data.totalBuildings, 'building', 'buildings'], ['Total questions', data.totalQuestions, 'question', 'questions'], ['Conversations', data.totalHistories, 'chat', 'chats']];
    const progress = h('progress', { max: Math.max(1, data.totalUsers), value: data.activeUsers, 'aria-label': t('Active users') });
    return [h('div', { class: 'metrics-grid' }, metrics.map(([label, value, name, route], i) => h('a', { href: '#/' + route, class: `metric-card tone-${i}` }, h('div', { class: 'metric-top' }, h('span', { class: 'metric-icon' }, icon(name)), icon('chevron')), h('span', { class: 'metric-label' }, t(label)), h('strong', {}, count(value)), h('span', { class: 'metric-hint' }, t('View all'), ' ', icon('arrow'))))),
      h('div', { class: 'summary-strip card' }, h('div', {}, muted(t('Answers')), h('strong', {}, count(data.totalAnswers))), h('div', {}, muted(t('Categories')), h('strong', {}, count(data.totalCategories))), h('div', {}, muted(t('Messages')), h('strong', {}, count(data.totalChatboxes))), h('div', { class: 'account-progress' }, h('div', { class: 'spread' }, h('span', {}, t('Active users'), ' ', count(data.activeUsers)), muted(t('Disabled users') + ' ' + count(data.disabledUsers))), progress)),
      h('div', { class: 'updated-at muted' }, icon('clock'), t('Last refreshed'), ': ', formatDate(new Date().toISOString()))];
  }));
  reloads.push(remote(questions, signal, s => api.questions(undefined, s), rows => table([{ label: 'Content', cell: q => q.id ? h('div', {}, recordLink(q.content || q.id, 'questions/' + encodeURIComponent(q.id), undefined, 'record-link clamp'), h('small', { class: 'muted' }, text(q.name))) : text(q.content) }, { label: 'Created', cell: q => muted(formatDate(q.createDate)) }], newest(rows, q => q.createDate).slice(0, 6), 'Recent questions')));
  reloads.push(remote(chats, signal, s => api.histories({ page: 1, pageSize: 5 }, s), data => data.items.length ? h('div', { class: 'conversation-list' }, data.items.map(item => h('a', { class: 'conversation-row', href: '#/chats/' + encodeURIComponent(item.id || '') }, h('span', { class: 'small-icon' }, icon('chat')), h('div', {}, h('strong', { class: 'clamp' }, item.header || t('Conversation')), h('small', { class: 'muted' }, formatDate(item.create_date))), icon('chevron')))) : h('div', { class: 'empty-state' }, muted(t('No records found')))));
}
