import { api } from '../api.js';
import { session } from '../auth.js';
import { t } from '../i18n.js';
import { dateInput, idOf, initials } from '../utils.js';
import type { Role, User, UserUpdate } from '../types.js';
import { recordLink, action, badge, button, confirmAction, field, formDialog, formValue, h, iconButton, link, muted, pageTitle, pager, panel, recordDetails, remote, table, text, toast } from '../ui.js';
const roles: [string, string][] = [['Customer', 'Customer'], ['Employee', 'Employee'], ['Admin', 'Admin']];
export function userFields(user: User, withRole = false) {
  return [field('Name', 'name', user.name, { required: true, maxlength: 200 }), field('Phone', 'phone', user.phone, { type: 'tel', maxlength: 30 }), field('Birthday', 'birthday', dateInput(user.birthday), { type: 'date', max: new Date().toISOString().slice(0, 10), help: 'An empty birthday keeps the current value in this backend.' }), field('Gender', 'gender', user.gender, { maxlength: 80 }), withRole ? field('Role', 'role', user.role || 'Customer', { options: roles, disabled: user.id === session.user?.id, help: user.id === session.user?.id ? 'Self role changes are disabled in this portal.' : 'Changing a role changes access permissions.' }) : null];
}
export function userPayload(data: FormData): UserUpdate { return { name: formValue(data, 'name'), phone: formValue(data, 'phone'), birthday: formValue(data, 'birthday') ? formValue(data, 'birthday') + 'T00:00:00Z' : null, gender: formValue(data, 'gender') }; }
function editUser(user: User, reload: () => void): void {
  formDialog('Edit user', userFields(user, true), async data => {
    const role = (formValue(data, 'role') || user.role || 'Customer') as Role;
    if (role !== user.role && !await confirmAction('Change role?', `${text(user.email)}: ${user.role} -> ${role}`, 'Continue', true)) return false;
    return api.updateUser(idOf(user), { ...userPayload(data), role });
  }, reload);
}
function statusButton(user: User, reload: () => void): HTMLButtonElement {
  const label = user.isActive ? 'Disable account' : 'Enable account';
  const control = button(label, () => void action(control, async () => {
    if (!await confirmAction(label, text(user.email) + '. ' + t(user.isActive ? 'The user will lose application access.' : 'Application access will be restored.'), 'Continue', user.isActive)) return;
    await api.setStatus(idOf(user), !user.isActive); toast('Saved successfully.'); reload();
  }), user.isActive ? 'lock' : 'check', user.isActive ? 'danger-outline' : 'secondary');
  if (user.id === session.user?.id) { control.disabled = true; control.title = t('You cannot disable your own account here.'); }
  return control;
}
export function users(root: HTMLElement, signal: AbortSignal): void {
  let page = 1, params = { search: '', role: '', isActive: '' };
  const body = h('div');
  const searchForm = h('form', { class: 'filter-bar' }, field('Search', 'search', '', { placeholder: 'Search by name or email', maxlength: 100 }), field('Role', 'role', '', { options: [['', 'All roles'], ...roles] }), field('Status', 'isActive', '', { options: [['', 'All statuses'], ['true', 'Active'], ['false', 'Disabled']] }), h('button', { class: 'button primary', type: 'submit' }, t('Apply filters')));
  let reload: () => Promise<void> = async () => {};
  searchForm.addEventListener('submit', event => { event.preventDefault(); const data = new FormData(searchForm); params = { search: formValue(data, 'search'), role: formValue(data, 'role'), isActive: formValue(data, 'isActive') }; page = 1; void reload(); });
  root.append(pageTitle('Users', 'Manage account access and user profiles.', button('Refresh', () => void reload(), 'refresh')), h('section', { class: 'card' }, searchForm, body));
  reload = remote(body, signal, s => api.users({ page, pageSize: 20, ...params }, s), data => [table<User>([
    { label: 'Name', cell: user => h('div', { class: 'identity' }, h('span', { class: 'avatar' }, initials(user.name)), h('div', {}, user.id ? recordLink(user.name || user.email || user.id, 'users/' + encodeURIComponent(user.id), undefined, 'record-link') : text(user.name), h('small', { class: 'muted' }, text(user.email)))) },
    { label: 'Role', cell: user => badge(text(user.role), user.role === 'Admin' ? 'purple' : 'neutral') },
    { label: 'Status', cell: user => badge(user.isActive ? 'Active' : 'Disabled', user.isActive ? 'success' : 'danger') },
    { label: 'Phone', cell: user => muted(user.phone) },
    { label: 'Actions', cell: user => user.id ? h('div', { class: 'actions' }, iconButton('Edit user', 'edit', () => editUser(user, () => void reload())), link('Details', 'users/' + encodeURIComponent(user.id), 'chevron', 'text-link')) : null },
  ], data.items, 'Users'), pager(data, p => { page = p; void reload(); })]);
}
export function userDetail(root: HTMLElement, signal: AbortSignal, id: string): void {
  const body = h('div'); root.append(pageTitle('User details', 'Profile and account permissions.', link('Back', 'users', 'back', 'button secondary')), body);
  let reload: () => Promise<void> = async () => {};
  reload = remote(body, signal, s => api.user(id, s), user => panel('Profile', h('div', { class: 'detail-body' }, h('div', { class: 'profile-banner' }, h('span', { class: 'avatar large' }, initials(user.name)), h('div', {}, h('h2', {}, text(user.name)), muted(user.email)), badge(text(user.role), 'purple'), badge(user.isActive ? 'Active' : 'Disabled', user.isActive ? 'success' : 'danger')), recordDetails([['ID', h('code', {}, text(user.id))], ['Email', text(user.email)], ['Phone', text(user.phone)], ['Birthday', dateInput(user.birthday) || '\u2014'], ['Gender', text(user.gender)]]), h('div', { class: 'actions' }, button('Edit user', () => editUser(user, () => void reload()), 'edit', 'primary'), statusButton(user, () => void reload())))));
}
