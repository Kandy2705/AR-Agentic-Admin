import { api } from '../api.js';
import { session } from '../auth.js';
import { t } from '../i18n.js';
import { idOf, localPage, nullableNumber } from '../utils.js';
import type { Building, Category, Floor, Room } from '../types.js';
import { recordLink, action, badge, button, confirmAction, field, formDialog, formValue, h, iconButton, link, muted, notice, pageTitle, pager, panel, recordDetails, remote, table, text, toast } from '../ui.js';

function checkboxField(label: string, name: string, checked = false): HTMLElement {
  return h('label', { class: 'check-label' }, h('input', { type: 'checkbox', name, checked }), t(label));
}

function safeSource(url: string | null): HTMLElement {
  if (!url) return muted('—');
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return muted(url);
    return h('a', { href: parsed.href, target: '_blank', rel: 'noopener noreferrer', class: 'text-link' }, t('Source'));
  } catch { return muted(url); }
}

function buildingFields(building?: Building) {
  return [
    field('Name', 'name', building?.name, { required: true, maxlength: 200 }),
    field('Description', 'content', building?.content, { area: true, maxlength: 10000 }),
    h('div', { class: 'form-grid' },
      field('Latitude', 'latitude', building?.latitude, { type: 'number', min: -90, max: 90, step: 'any' }),
      field('Longitude', 'longitude', building?.longitude, { type: 'number', min: -180, max: 180, step: 'any' })),
    notice('Coordinates are optional. Floors and rooms can be managed from the building detail page.'),
  ];
}

function saveBuilding(building: Building | undefined, reload: () => void): void {
  formDialog(building ? 'Edit building' : 'Add building', buildingFields(building), data => {
    const payload = {
      name: formValue(data, 'name'),
      content: formValue(data, 'content'),
      latitude: nullableNumber(formValue(data, 'latitude'), -90, 90),
      longitude: nullableNumber(formValue(data, 'longitude'), -180, 180),
    };
    return building ? api.updateBuilding(idOf(building), payload) : api.createBuilding({ ...payload, userId: idOf(session.user!) });
  }, reload);
}

function deleteBuilding(building: Building, reload: () => void): HTMLButtonElement {
  const control = iconButton('Delete', 'trash', () => void action(control, async () => {
    if (!await confirmAction('Delete building?', text(building.name) + '. ' + t('This action cannot be undone.'), 'Delete')) return;
    await api.deleteBuilding(idOf(building)); toast('Deleted successfully.'); reload();
  }), true); return control;
}

function floorFields(floor?: Floor): HTMLElement[] {
  return [
    field('Floor number', 'floorNumber', floor?.floorNumber ?? 0, { type: 'number', required: true, step: '1' }),
    field('Name', 'name', floor?.name, { maxlength: 200, placeholder: 'Tầng 1 / Ground floor' }),
    field('Floor plan URL', 'floorPlanUrl', floor?.floorPlanUrl, { type: 'url', maxlength: 1000 }),
    field('Source URL', 'sourceUrl', floor?.sourceUrl, { type: 'url', maxlength: 1000 }),
    checkboxField('Verified', 'verified', floor?.verified ?? false),
  ];
}

function saveFloor(buildingId: string, floor: Floor | undefined, reload: () => void): void {
  formDialog(floor ? 'Edit floor' : 'Add floor', floorFields(floor), data => {
    const floorNumber = Number(formValue(data, 'floorNumber'));
    if (!Number.isInteger(floorNumber)) throw new Error('Floor number must be an integer.');
    const payload = {
      floorNumber,
      name: formValue(data, 'name') || null,
      floorPlanUrl: formValue(data, 'floorPlanUrl') || null,
      sourceUrl: formValue(data, 'sourceUrl') || null,
      verified: data.get('verified') === 'on',
    };
    return floor ? api.updateFloor(idOf(floor), payload) : api.createFloor(buildingId, payload);
  }, reload);
}

function roomFields(room?: Room): HTMLElement[] {
  return [
    field('Room code', 'roomCode', room?.roomCode, { required: true, maxlength: 100, placeholder: '202 / PM1' }),
    field('Name', 'name', room?.name, { maxlength: 200 }),
    field('Room type', 'roomType', room?.roomType, { maxlength: 200, placeholder: 'Classroom / Computer room' }),
    field('Description', 'description', room?.description, { area: true, maxlength: 5000 }),
    h('div', { class: 'form-grid' },
      field('Local X', 'localX', room?.localX, { type: 'number', step: 'any' }),
      field('Local Y', 'localY', room?.localY, { type: 'number', step: 'any' }),
      field('Local Z', 'localZ', room?.localZ, { type: 'number', step: 'any' })),
    field('Source URL', 'sourceUrl', room?.sourceUrl, { type: 'url', maxlength: 1000 }),
    checkboxField('Verified', 'verified', room?.verified ?? false),
  ];
}

function saveRoom(floorId: string, room: Room | undefined, reload: () => void): void {
  formDialog(room ? 'Edit room' : 'Add room', roomFields(room), data => {
    const payload = {
      roomCode: formValue(data, 'roomCode'),
      name: formValue(data, 'name') || null,
      description: formValue(data, 'description') || null,
      roomType: formValue(data, 'roomType') || null,
      localX: nullableNumber(formValue(data, 'localX')),
      localY: nullableNumber(formValue(data, 'localY')),
      localZ: nullableNumber(formValue(data, 'localZ')),
      sourceUrl: formValue(data, 'sourceUrl') || null,
      verified: data.get('verified') === 'on',
    };
    return room ? api.updateRoom(idOf(room), payload) : api.createRoom(floorId, payload);
  }, reload);
}

export function buildings(root: HTMLElement, signal: AbortSignal): void {
  let rows: Building[] = [], search = '', page = 1;
  const display = h('div'), state = h('div');
  const draw = () => { const data = localPage(rows.filter(row => `${row.name || ''} ${row.content || ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), page); display.replaceChildren(table<Building>([
    { label: 'Name', cell: b => h('div', {}, b.id ? recordLink(b.name || b.id, 'buildings/' + encodeURIComponent(b.id), 'building', 'record-link') : text(b.name), h('small', { class: 'muted clamp' }, text(b.content))) },
    { label: 'Latitude', cell: b => h('code', {}, b.latitude ?? '—') }, { label: 'Longitude', cell: b => h('code', {}, b.longitude ?? '—') },
    { label: 'Actions', cell: b => b.id ? h('div', { class: 'actions' }, iconButton('Edit building', 'edit', () => saveBuilding(b, () => void reload())), deleteBuilding(b, () => void reload()), link('Details', 'buildings/' + encodeURIComponent(b.id), 'chevron', 'text-link')) : null },
  ], data.items, 'Buildings'), pager(data, p => { page = p; draw(); })); };
  let reload: () => Promise<void> = async () => {};
  const searchBox = field('Search', 'search', '', { placeholder: 'Search records', maxlength: 200 });
  searchBox.addEventListener('input', event => { search = (event.target as HTMLInputElement).value; page = 1; draw(); });
  root.append(pageTitle('Buildings', 'Manage campus destinations, floors, rooms and geographical coordinates.', button('Refresh', () => void reload(), 'refresh'), button('Add building', () => saveBuilding(undefined, () => void reload()), 'plus', 'primary')), h('section', { class: 'card' }, h('div', { class: 'filter-bar' }, searchBox), state), h('p', { class: 'small muted' }, t('Search and pagination on this page apply to the list returned by the existing API.')));
  reload = remote(state, signal, s => api.buildings(s), data => { rows = data; draw(); return display; });
}

export function buildingDetail(root: HTMLElement, signal: AbortSignal, id: string): void {
  const body = h('div');
  const structure = h('div');
  let reloadBuilding: () => Promise<void> = async () => {};
  let reloadStructure: () => Promise<void> = async () => {};

  root.append(pageTitle('Building details', 'Campus destination, floor and room information.', link('Back', 'buildings', 'back', 'button secondary')), body, structure);

  reloadBuilding = remote(body, signal, s => api.building(id, s), b => {
    const map = b.latitude !== null && b.longitude !== null && Number.isFinite(b.latitude) && Number.isFinite(b.longitude)
      ? h('a', { class: 'button secondary', href: `https://www.openstreetmap.org/?mlat=${b.latitude}&mlon=${b.longitude}#map=18/${b.latitude}/${b.longitude}`, target: '_blank', rel: 'noopener noreferrer' }, t('Open map'))
      : muted(t('Coordinates are not available.'));
    return panel(b.name || 'Building details', h('div', { class: 'detail-body' },
      recordDetails([['ID', h('code', {}, id)], ['Name', text(b.name)], ['Latitude', text(b.latitude)], ['Longitude', text(b.longitude)]]),
      h('h3', {}, t('Description')), h('p', { class: 'prose' }, text(b.content)),
      h('div', { class: 'actions' }, button('Edit building', () => saveBuilding(b, () => void reloadBuilding()), 'edit', 'primary'), deleteBuilding(b, () => { location.hash = '#/buildings'; }), map)));
  });

  reloadStructure = remote(structure, signal, async s => {
    const floors = await api.floors(id, s);
    return Promise.all(floors.map(async floor => ({ floor, rooms: await api.rooms(idOf(floor), s) })));
  }, entries => {
    const header = h('div', { class: 'card-heading' }, h('div', {}, h('h2', {}, t('Floors & rooms')), h('p', { class: 'muted' }, t('Indoor navigation structure and AR local coordinates.'))), button('Add floor', () => saveFloor(id, undefined, () => void reloadStructure()), 'plus', 'primary'));
    if (!entries.length) return h('section', { class: 'card' }, header, notice('No floors have been added for this building yet.'));

    const floorCards = entries.map(({ floor, rooms }) => {
      const floorId = idOf(floor);
      const deleteFloorButton = iconButton('Delete floor', 'trash', () => void action(deleteFloorButton, async () => {
        if (!await confirmAction('Delete floor?', `${floor.name || `Floor ${floor.floorNumber}`}. ${t('This also deletes rooms on this floor.')}`, 'Delete')) return;
        await api.deleteFloor(floorId); toast('Deleted successfully.'); void reloadStructure();
      }), true);
      const roomTable = table<Room>([
        { label: 'Room', cell: r => h('div', {}, h('strong', {}, text(r.roomCode)), h('small', { class: 'muted' }, text(r.name))) },
        { label: 'Type', cell: r => text(r.roomType) },
        { label: 'AR local position', cell: r => h('code', {}, r.localX === null && r.localY === null && r.localZ === null ? '—' : `${r.localX ?? '—'}, ${r.localY ?? '—'}, ${r.localZ ?? '—'}`) },
        { label: 'Verification', cell: r => h('div', { class: 'actions' }, badge(r.verified ? 'Verified' : 'Unverified', r.verified ? 'success' : 'neutral'), safeSource(r.sourceUrl)) },
        { label: 'Actions', cell: r => { if (!r.id) return null; const del = iconButton('Delete room', 'trash', () => void action(del, async () => { if (!await confirmAction('Delete room?', text(r.roomCode), 'Delete')) return; await api.deleteRoom(idOf(r)); toast('Deleted successfully.'); void reloadStructure(); }), true); return h('div', { class: 'actions' }, iconButton('Edit room', 'edit', () => saveRoom(floorId, r, () => void reloadStructure())), del); } },
      ], rooms, 'Rooms');
      return h('section', { class: 'card' },
        h('div', { class: 'card-heading' },
          h('div', {}, h('h3', {}, floor.name || `Floor ${floor.floorNumber}`), h('p', { class: 'muted' }, `#${floor.floorNumber} · ${rooms.length} ${t('rooms')}`)),
          h('div', { class: 'actions' }, badge(floor.verified ? 'Verified' : 'Unverified', floor.verified ? 'success' : 'neutral'), safeSource(floor.sourceUrl), button('Add room', () => saveRoom(floorId, undefined, () => void reloadStructure()), 'plus'), iconButton('Edit floor', 'edit', () => saveFloor(id, floor, () => void reloadStructure())), deleteFloorButton)),
        floor.floorPlanUrl ? h('p', {}, h('a', { href: floor.floorPlanUrl, target: '_blank', rel: 'noopener noreferrer', class: 'text-link' }, t('Open floor plan'))) : null,
        roomTable);
    });
    return h('div', {}, h('section', { class: 'card' }, header), ...floorCards);
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
