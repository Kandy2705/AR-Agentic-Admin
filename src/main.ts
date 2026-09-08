import { session } from './auth.js';
import { icon, type IconName } from './icons.js';
import { locale, setLanguage, t } from './i18n.js';
import { initials } from './utils.js';
import { button, h, link, loading, notice, toast } from './ui.js';
import { dashboard } from './pages/dashboard.js';
import { users, userDetail } from './pages/users.js';
import { buildings, buildingDetail, categories } from './pages/campus.js';
import { questions, questionDetail } from './pages/support.js';
import { chats, chatDetail } from './pages/chats.js';
import { login, password, profile } from './pages/account.js';
const app = document.getElementById('app')!;
let control: AbortController | undefined;
const navigation: [string, [string, string, IconName][]][] = [
  ['Overview', [['dashboard', 'Dashboard', 'dashboard']]],
  ['Management', [['users', 'Users', 'users'], ['buildings', 'Buildings', 'building']]],
  ['User support', [['questions', 'Questions', 'question'], ['categories', 'Categories', 'category']]],
  ['AI management', [['chats', 'Chat histories', 'chat']]],
  ['Account', [['profile', 'Profile', 'profile'], ['password', 'Change password', 'lock']]],
];
function languagePicker(): HTMLElement {
  const select = h('select', { 'aria-label': 'Language / Ngon ngu', value: locale(), onchange: (event: Event) => { setLanguage((event.target as HTMLSelectElement).value === 'en' ? 'en' : 'vi'); render(); } }, h('option', { value: 'vi' }, 'Tiếng Việt'), h('option', { value: 'en' }, 'English'));
  return h('div', { class: 'language-picker' }, icon('globe'), select);
}
function render(): void {
  control?.abort(); control = new AbortController(); const signal = control.signal;
  document.querySelectorAll('dialog').forEach(dialog => dialog.close());
  document.documentElement.lang = locale();
  let route = location.hash.replace(/^#\/?/, '') || 'dashboard';
  if (!session.user && route !== 'login') { location.replace('#/login'); return; }
  if (session.user && route === 'login') { location.replace('#/dashboard'); return; }
  app.replaceChildren();
  if (!session.user) {
    login(app); app.append(h('div', { class: 'login-language' }, languagePicker())); document.title = `${t('Sign in')} | Agentic AR`; return;
  }
  const parts = route.split('/'), group = parts[0];
  let id = ''; try { id = parts[1] ? decodeURIComponent(parts[1]) : ''; } catch { route = 'not-found'; }
  const title = navigation.flatMap(([, items]) => items).find(([path]) => path === group)?.[1] || 'Page not found';
  const main = h('main', { id: 'main-content', class: 'main-content', tabindex: '-1' });
  const shell = h('div', { class: 'app-shell' });
  try { if (localStorage.getItem('agentic-admin-collapsed') === 'true') shell.classList.add('is-collapsed'); } catch { /* optional preference */ }
  const menu = h('button', { type: 'button', class: 'icon-button menu-toggle', 'aria-label': 'Toggle navigation', 'aria-expanded': 'false', 'aria-controls': 'sidebar', onclick: () => { if (matchMedia('(max-width: 850px)').matches) { const open = shell.classList.toggle('mobile-open'); menu.setAttribute('aria-expanded', String(open)); } else { const collapsed = shell.classList.toggle('is-collapsed'); try { localStorage.setItem('agentic-admin-collapsed', String(collapsed)); } catch { /* optional preference */ } } } }, icon('menu'));
  const nav = h('nav', { 'aria-label': 'Main navigation' },
    navigation.map(([label, items]) => h('section', { class: 'nav-group' },
      h('h2', {}, t(label)),
      items.map(([path, name, symbol]) => h('a', {
        href: '#/' + path, class: 'nav-link' + (group === path ? ' active' : ''),
        title: t(name), 'aria-current': group === path ? 'page' : undefined,
      }, icon(symbol), h('span', {}, t(name)))),
    )),
  );
  const sidebar = h('aside', { id: 'sidebar', class: 'sidebar' },
    h('a', { class: 'brand', href: '#/dashboard', 'aria-label': 'Agentic AR home' },
      h('img', { src: './mark.svg', alt: '', width: 36, height: 36 }),
      h('span', { class: 'brand-word' }, 'AGENTIC', h('strong', {}, 'AR'))),
    nav,
    h('div', { class: 'sidebar-bottom' },
      h('div', { class: 'sidebar-note' }, icon('shield'), h('span', {}, t('Session verified'), h('small', {}, 'ADMIN ACCESS'))),
      button('Logout', () => session.clear(), 'logout', 'sidebar-logout')),
  );
  const overlay = h('button', { type: 'button', class: 'sidebar-overlay', 'aria-label': 'Close navigation', onclick: () => { shell.classList.remove('mobile-open'); menu.setAttribute('aria-expanded', 'false'); } });
  const header = h('header', { class: 'topbar' }, h('div', { class: 'topbar-left' }, menu, h('div', { class: 'breadcrumb' }, t('Admin workspace'), icon('chevron'), h('strong', {}, t(title)))), h('div', { class: 'topbar-right' }, languagePicker(), h('a', { href: '#/profile', class: 'header-profile' }, h('span', { class: 'avatar' }, initials(session.user.name)), h('span', {}, h('strong', {}, session.user.name || 'Admin'), h('small', { class: 'muted' }, 'Administrator')))));
  shell.append(sidebar, overlay, h('div', { class: 'workspace' }, header, main, h('footer', { class: 'workspace-footer' }, 'AGENTIC AR', h('span', {}, t('Admin workspace'))))); app.append(shell);
  document.title = `${t(title)} | Agentic AR`;
  if (route === 'not-found' || parts.length > 2) { main.append(notice('Page not found.'), link('Dashboard', 'dashboard', 'back', 'button primary')); return; }
  try {
    switch (group) {
      case 'dashboard': dashboard(main, signal); break;
      case 'users': id ? userDetail(main, signal, id) : users(main, signal); break;
      case 'buildings': id ? buildingDetail(main, signal, id) : buildings(main, signal); break;
      case 'questions': id ? questionDetail(main, signal, id) : questions(main, signal); break;
      case 'categories': categories(main, signal); break;
      case 'chats': id ? chatDetail(main, signal, id) : chats(main, signal); break;
      case 'profile': profile(main, signal); break;
      case 'password': password(main, signal); break;
      default: main.append(notice('Page not found.'), link('Dashboard', 'dashboard', 'back', 'button primary'));
    }
  } catch { main.replaceChildren(notice('This page could not be displayed. Please refresh and check the API contract.', 'danger')); }
}
window.addEventListener('hashchange', render);
document.querySelector('.skip-link')?.addEventListener('click', event => { event.preventDefault(); document.getElementById('main-content')?.focus(); });
window.addEventListener('keydown', event => { if (event.key === 'Escape') { document.querySelector('.app-shell')?.classList.remove('mobile-open'); document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'false'); } });
app.replaceChildren(loading());
await session.restore();
session.onChange(() => { if (!session.user) document.getElementById('toasts')?.replaceChildren(); render(); });
render();
// Revalidate the application role/active state periodically; never invent a refresh-token endpoint.
let verifying = false;
async function verify(): Promise<void> { if (!session.user || document.hidden || verifying) return; verifying = true; try { await session.refresh(); } catch { /* Unauthorized is handled centrally; transient network errors do not silently replace data. */ } finally { verifying = false; } }
window.addEventListener('focus', () => void verify());
setInterval(() => void verify(), 60000);
window.addEventListener('unhandledrejection', () => { toast('An unexpected action failed. Please refresh and try again.', true); });
