import { api } from '../api.js';
import { session } from '../auth.js';
import { t } from '../i18n.js';
import { idOf, localPage, nullableNumber } from '../utils.js';
import type { Building, Category } from '../types.js';
import { recordLink, action, button, confirmAction, field, formDialog, formValue, h, iconButton, link, muted, notice, pageTitle, pager, panel, recordDetails, remote, table, text, toast } from '../ui.js';
function buildingFields(building?: Building) {
  return [field('Name', 'name', building?.name, { required: true, maxlength: 200 }), field('Description', 'content', building?.content, { area: true, maxlength: 10000 }), h('div', { class: 'form-grid' }, field('Latitude', 'latitude', building?.latitude, { type: 'number', min: -90, max: 90, step: 'any' }), field('Longitude', 'longitude', building?.longitude, { type: 'number', min: -180, max: 180, step: 'any' })), notice('Coordinates are optional. This API does not manage floors, rooms, AR meshes or image uploads.')];
}
function saveBuilding(building: Building | undefined, reload: () => void): void {
  formDialog(building ? 'Edit building' : 'Add building', buildingFields(building), data => {
    const payload = { name: formValue(data, 'name'), content: formValue(data, 'content'), latitude: nullableNumber(formValue(data, 'latitude'), -90, 90), longitude: nullableNumber(formValue(data, 'longitude'), -180, 180) };
    return building ? api.updateBuilding(idOf(building), payload) : api.createBuilding({ ...payload, userId: idOf(session.user!) });
  }, reload);
}
function deleteBuilding(building: Building, reload: () => void): HTMLButtonElement {
  const control = iconButton('Delete', 'trash', () => void action(control, async () => {
    if (!await confirmAction('Delete building?', text(building.name) + '. ' + t('This action cannot be undone.'), 'Delete')) return;
    await api.deleteBuilding(idOf(building)); toast('Deleted successfully.'); reload();
  }), true); return control;
}
export function buildings(root: HTMLElement, signal: AbortSignal): void {
  let rows: Building[] = [], search = '', page = 1;
  const display = h('div'), state = h('div');
  const draw = () => { const data = localPage(rows.filter(row => `${row.name || ''} ${row.content || ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), page); display.replaceChildren(table<Building>([
    { label: 'Name', cell: b => h('div', {}, b.id ? recordLink(b.name || b.id, 'buildings/' + encodeURIComponent(b.id), 'building', 'record-link') : text(b.name), h('small', { class: 'muted clamp' }, text(b.content))) },
    { label: 'Latitude', cell: b => h('code', {}, b.latitude ?? '\u2014') }, { label: 'Longitude', cell: b => h('code', {}, b.longitude ?? '\u2014') },
    { label: 'Actions', cell: b => b.id ? h('div', { class: 'actions' }, iconButton('Edit building', 'edit', () => saveBuilding(b, () => void reload())), deleteBuilding(b, () => void reload()), link('Details', 'buildings/' + encodeURIComponent(b.id), 'chevron', 'text-link')) : null },
  ], data.items, 'Buildings'), pager(data, p => { page = p; draw(); })); };
  let reload: () => Promise<void> = async () => {};
  const searchBox = field('Search', 'search', '', { placeholder: 'Search records', maxlength: 200 });
  searchBox.addEventListener('input', event => { search = (event.target as HTMLInputElement).value; page = 1; draw(); });
  root.append(pageTitle('Buildings', 'Manage campus destinations and geographical coordinates.', button('Refresh', () => void reload(), 'refresh'), button('Add building', () => saveBuilding(undefined, () => void reload()), 'plus', 'primary')), h('section', { class: 'card' }, h('div', { class: 'filter-bar' }, searchBox), state), h('p', { class: 'small muted' }, t('Search and pagination on this page apply to the list returned by the existing API.')));
  reload = remote(state, signal, s => api.buildings(s), data => { rows = data; draw(); return display; });
}
export function buildingDetail(root: HTMLElement, signal: AbortSignal, id: string): void {
  const body = h('div'); root.append(pageTitle('Building details', 'Campus destination information.', link('Back', 'buildings', 'back', 'button secondary')), body);
  let reload: () => Promise<void> = async () => {};
  reload = remote(body, signal, s => api.building(id, s), b => {
    const map = b.latitude !== null && b.longitude !== null && Number.isFinite(b.latitude) && Number.isFinite(b.longitude) ? h('a', { class: 'button secondary', href: `https://www.openstreetmap.org/?mlat=${b.latitude}&mlon=${b.longitude}#map=18/${b.latitude}/${b.longitude}`, target: '_blank', rel: 'noopener noreferrer' }, t('Open map')) : muted(t('Coordinates are not available.'));
    return panel(b.name || 'Building details', h('div', { class: 'detail-body' }, recordDetails([['ID', h('code', {}, id)], ['Name', text(b.name)], ['Latitude', text(b.latitude)], ['Longitude', text(b.longitude)]]), h('h3', {}, t('Description')), h('p', { class: 'prose' }, text(b.content)), h('div', { class: 'actions' }, button('Edit building', () => saveBuilding(b, () => void reload()), 'edit', 'primary'), deleteBuilding(b, () => { location.hash = '#/buildings'; }), map)));
  });
}
export function categories(root: HTMLElement, signal: AbortSignal): void {
  let rows: Category[] = [], search = '', page = 1;
  const state = h('div'), display = h('div'); let reload: () => Promise<void> = async () => {};
  const edit = (category?: Category) => formDialog(category ? 'Edit category' : 'Add category', [field('Name', 'name', category?.name, { required: true, maxlength: 200 })], data => category ? api.updateCategory(idOf(category), formValue(data, 'name')) : api.createCategory(formValue(data, 'name')), () => void reload());
  const draw = () => { const data = localPage(rows.filter(c => (c.name || '').toLocaleLowerCase().includes(search.toLocaleLowerCase())), page); display.replaceChildren(table<Category>([
    { label: 'Name', cell: c => h('strong', {}, text(c.name)) }, { label: 'ID', cell: c => h('code', { class: 'small' }, text(c.id)) },
    { label: 'Actions', cell: c => { if (!c.id) return null; const control = iconButton('Delete', 'trash', () => void action(control, async () => { if (!await confirmAction('Delete category?', text(c.name) + '. ' + t('Existing references may prevent deletion.'), 'Delete')) return; await api.deleteCategory(idOf(c)); toast('Deleted successfully.'); void reload(); }), true); return h('div', { class: 'actions' }, iconButton('Edit category', 'edit', () => edit(c)), control); } },
  ], data.items, 'Categories'), pager(data, p => { page = p; draw(); })); };
  const searchBox = field('Search', 'search', '', { placeholder: 'Search records', maxlength: 200 }); searchBox.addEventListener('input', event => { search = (event.target as HTMLInputElement).value; page = 1; draw(); });
  root.append(pageTitle('Categories', 'Organize the topics used for student support.', button('Refresh', () => void reload(), 'refresh'), button('Add category', () => edit(), 'plus', 'primary')), h('section', { class: 'card' }, h('div', { class: 'filter-bar' }, searchBox), state));
  reload = remote(state, signal, s => api.categories(s), data => { rows = data; draw(); return display; });
}
