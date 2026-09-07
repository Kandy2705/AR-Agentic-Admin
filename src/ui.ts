import { ApiError } from './api.js';
import { icon, type IconName } from './icons.js';
import { count, t } from './i18n.js';
import type { Page } from './types.js';
export type Child = Node | string | number | boolean | null | undefined | Child[];
/** Text is always inserted via textContent/text nodes. Never interpolate API data as HTML. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attributes: Record<string, unknown> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  const append = (child: Child): void => { if (Array.isArray(child)) child.forEach(append); else if (child instanceof Node) element.append(child); else if (child !== null && child !== undefined && typeof child !== 'boolean') element.append(document.createTextNode(String(child))); };
  children.forEach(append);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === null || value === false) continue;
    if (name.startsWith('on') && typeof value === 'function') element.addEventListener(name.slice(2).toLowerCase(), value as EventListener);
    else if (name === 'value' && 'value' in element) (element as HTMLInputElement).value = String(value);
    else if (value === true) element.setAttribute(name, '');
    else element.setAttribute(name, String(value));
  }
  return element;
}
export function button(label: string, onClick: () => void, name?: IconName, variant = 'secondary'): HTMLButtonElement {
  return h('button', { type: 'button', class: `button ${variant}`, onclick: onClick }, name ? icon(name) : null, h('span', {}, t(label)));
}
export function link(label: string, route: string, name?: IconName, className = ''): HTMLAnchorElement { return h('a', { href: '#/' + route, class: className }, name ? icon(name) : null, t(label)); }
export function recordLink(label: string, route: string, name?: IconName, className = ''): HTMLAnchorElement { return h('a', { href: '#/' + route, class: className }, name ? icon(name) : null, label); }
export function iconButton(label: string, name: IconName, onClick: () => void, danger = false): HTMLButtonElement {
  return h('button', { type: 'button', class: 'icon-button' + (danger ? ' danger-text' : ''), title: t(label), 'aria-label': t(label), onclick: onClick }, icon(name));
}
export const text = (value: unknown) => value === null || value === undefined || value === '' ? '\u2014' : String(value);
export const muted = (value: unknown) => h('span', { class: 'muted' }, text(value));
export const badge = (label: string, tone = 'neutral') => h('span', { class: `badge ${tone}` }, t(label));
export function pageTitle(title: string, subtitle: string, ...actions: Child[]): HTMLElement { return h('div', { class: 'page-heading' }, h('div', {}, h('div', { class: 'eyebrow' }, 'WORKSPACE / ', t(title)), h('h1', {}, t(title)), h('p', { class: 'muted' }, t(subtitle))), h('div', { class: 'actions' }, ...actions)); }
export function panel(title: string, body: Child, action?: Child): HTMLElement { return h('section', { class: 'card' }, h('div', { class: 'card-heading' }, h('h2', {}, t(title)), action), body); }
export function notice(message: string, tone = 'info'): HTMLElement { return h('div', { class: `notice ${tone}`, role: tone === 'danger' ? 'alert' : 'note' }, icon(tone === 'danger' ? 'alert' : 'shield'), h('div', {}, t(message))); }
export function empty(message = 'No records found', detail = 'No records match your filters.'): HTMLElement { return h('div', { class: 'empty-state' }, h('span', { class: 'empty-icon' }, icon('box')), h('h3', {}, t(message)), h('p', { class: 'muted' }, t(detail))); }
export function loading(): HTMLElement { return h('div', { class: 'loading-panel', role: 'status', 'aria-label': t('Loading') }, h('div', { class: 'skeleton' }), h('div', { class: 'skeleton' }), h('div', { class: 'skeleton' }), h('span', { class: 'sr-only' }, t('Loading'))); }
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return t('Cannot connect to the API. Check network, backend deployment and CORS.');
    if (error.status === 404) return t('Resource or API endpoint not found. Verify the backend deployment.');
    if (error.status >= 500) return t('The server could not complete this request. Please try again.');
    return t(error.message);
  }
  return error instanceof Error ? t(error.message) : t('Something went wrong. Please try again.');
}
export const isAbort = (error: unknown): boolean => error instanceof Error && error.name === 'AbortError';
export function toast(message: string, danger = false): void {
  const root = document.getElementById('toasts'); if (!root) return;
  const item = h('div', { class: `toast ${danger ? 'danger' : ''}` }, icon(danger ? 'alert' : 'check'), h('span', {}, t(message)));
  root.append(item); setTimeout(() => item.remove(), 5500);
}
export async function action(control: HTMLButtonElement, run: () => Promise<unknown>): Promise<void> {
  if (control.disabled) return; control.disabled = true; control.setAttribute('aria-busy', 'true');
  try { await run(); } catch (error) { if (!isAbort(error)) toast(errorMessage(error), true); }
  finally { control.disabled = false; control.removeAttribute('aria-busy'); }
}
export function remote<T>(root: HTMLElement, signal: AbortSignal, fetchData: (signal: AbortSignal) => Promise<T>, render: (data: T) => Child): () => Promise<void> {
  let sequence = 0, control: AbortController | undefined;
  signal.addEventListener('abort', () => control?.abort(), { once: true });
  const reload = async (): Promise<void> => {
    if (signal.aborted) return; control?.abort(); control = new AbortController(); const current = ++sequence;
    root.replaceChildren(loading()); root.setAttribute('aria-busy', 'true');
    try {
      const data = await fetchData(control.signal);
      if (signal.aborted || current !== sequence || !root.isConnected) return;
      root.replaceChildren(h('div', { class: 'data-content' }, render(data)));
    } catch (error) {
      if (isAbort(error) || signal.aborted || current !== sequence || !root.isConnected) return;
      root.replaceChildren(h('div', { class: 'error-state' }, notice(errorMessage(error), 'danger'), button('Retry', () => void reload(), 'refresh')));
    } finally { if (current === sequence) root.removeAttribute('aria-busy'); }
  };
  void reload(); return reload;
}
export interface Column<T> { label: string; cell: (item: T) => Child; }
export function table<T>(columns: Column<T>[], rows: T[], caption = 'Records'): HTMLElement {
  if (!rows.length) return empty();
  return h('div', { class: 'table-scroll', tabindex: '0', 'aria-label': t(caption) }, h('table', {}, h('caption', { class: 'sr-only' }, t(caption)), h('thead', {}, h('tr', {}, columns.map(c => h('th', { scope: 'col' }, t(c.label))))), h('tbody', {}, rows.map(item => h('tr', {}, columns.map(c => h('td', {}, c.cell(item))))))));
}
export function pager<T>(data: Page<T>, change: (page: number) => void): HTMLElement {
  const previous = button('Previous', () => change(data.page - 1), 'back'); previous.disabled = data.page <= 1;
  const next = button('Next', () => change(data.page + 1), 'arrow'); next.disabled = data.totalPages <= data.page;
  return h('div', { class: 'pagination' }, h('span', { class: 'muted' }, count(data.totalItems), ' ', t('records')), h('div', { class: 'actions' }, previous, h('span', { class: 'page-number' }, t('Page'), ` ${data.page} / ${Math.max(1, data.totalPages)}`), next));
}
let fieldNumber = 0;
export interface FieldOptions { type?: string; required?: boolean; disabled?: boolean; readonly?: boolean; min?: string | number; max?: string | number; minlength?: number; maxlength?: number; placeholder?: string; autocomplete?: string; help?: string; options?: [string, string][]; area?: boolean; step?: string; }
export function field(label: string, name: string, value: string | number | null = '', options: FieldOptions = {}): HTMLElement {
  const id = 'field-' + ++fieldNumber;
  const attrs = { id, name, value: value ?? '', required: options.required, disabled: options.disabled, readonly: options.readonly, min: options.min, max: options.max, minlength: options.minlength, maxlength: options.maxlength, placeholder: options.placeholder ? t(options.placeholder) : undefined, autocomplete: options.autocomplete, step: options.step, 'aria-describedby': options.help ? id + '-help' : undefined };
  const input = options.options ? h('select', attrs, options.options.map(([v, l]) => h('option', { value: v }, t(l)))) : options.area ? h('textarea', { ...attrs, rows: 5 }) : h('input', { ...attrs, type: options.type || 'text' });
  return h('div', { class: 'field' }, h('label', { for: id }, t(label), options.required ? h('span', { class: 'required', 'aria-hidden': 'true' }, ' *') : null), input, options.help ? h('p', { class: 'field-help', id: id + '-help' }, t(options.help)) : null);
}
export function formValue(data: FormData, name: string): string { return String(data.get(name) || '').trim(); }
export function confirmAction(title: string, description: string, confirm = 'Continue', danger = true): Promise<boolean> {
  return new Promise(resolve => {
    const dialog = h('dialog', { class: 'modal small', 'aria-label': t(title) });
    const cleanup = () => { const result = dialog.returnValue === 'confirmed'; dialog.remove(); resolve(result); };
    dialog.addEventListener('close', cleanup, { once: true });
    dialog.append(h('div', { class: 'modal-body' }, h('span', { class: `confirm-icon ${danger ? 'danger' : ''}` }, icon(danger ? 'alert' : 'shield')), h('h2', {}, t(title)), h('p', { class: 'muted' }, t(description))), h('div', { class: 'modal-footer' }, button('Cancel', () => dialog.close('cancel')), button(confirm, () => dialog.close('confirmed'), undefined, danger ? 'danger' : 'primary')));
    document.body.append(dialog); dialog.showModal();
  });
}
export function formDialog(title: string, fields: Child[], submit: (data: FormData) => Promise<unknown>, after?: () => void): void {
  const dialog = h('dialog', { class: 'modal', 'aria-label': t(title) });
  const errors = h('div', { class: 'form-errors', 'aria-live': 'assertive' });
  const fieldset = h('fieldset', {}, h('div', { class: 'form-fields' }, ...fields));
  const save = h('button', { class: 'button primary', type: 'submit' }, icon('check'), t('Save changes'));
  const cancel = button('Cancel', () => dialog.close());
  let busy = false;
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  const form = h('form', {}, h('div', { class: 'modal-heading' }, h('h2', {}, t(title))), fieldset, errors, h('div', { class: 'modal-footer' }, cancel, save));
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !form.reportValidity()) return;
    const data = new FormData(form); busy = true; fieldset.disabled = true; save.disabled = true; cancel.disabled = true; form.setAttribute('aria-busy', 'true'); errors.replaceChildren();
    try { if (await submit(data) !== false) { dialog.close(); toast('Saved successfully.'); after?.(); } }
    catch (error) { if (!isAbort(error)) errors.replaceChildren(notice(errorMessage(error), 'danger')); }
    finally { busy = false; fieldset.disabled = false; save.disabled = false; cancel.disabled = false; form.removeAttribute('aria-busy'); }
  });
  dialog.append(form); document.body.append(dialog); dialog.showModal();
}
export function recordDetails(entries: [string, Child][]): HTMLElement { return h('dl', { class: 'detail-grid' }, entries.map(([label, value]) => h('div', {}, h('dt', {}, t(label)), h('dd', {}, value ?? '\u2014')))); }
