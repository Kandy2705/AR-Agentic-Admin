import { api } from '../api.js';
import { session } from '../auth.js';
import { formatDate, t } from '../i18n.js';
import { idOf, localPage, newest } from '../utils.js';
import type { Answer, Category, Question } from '../types.js';
import { recordLink, action, badge, button, confirmAction, empty, field, formDialog, formValue, h, iconButton, link, muted, notice, pageTitle, pager, panel, recordDetails, remote, table, text, toast } from '../ui.js';
function editQuestion(question: Question | undefined, categories: Category[], after: () => void): void {
  formDialog(question ? 'Edit question' : 'Add question', [field('Content', 'content', question?.content, { area: true, required: true, maxlength: 20000 }), h('div', { class: 'form-grid' }, field('Name', 'name', question?.name ?? session.user?.name, { maxlength: 200 }), field('Email', 'email', question?.email ?? session.user?.email, { type: 'email', maxlength: 254 })), field('Category', 'categoryId', question?.categoryId, { options: [['', 'Uncategorized'], ...categories.filter(c => c.id).map(c => [idOf(c), c.name || idOf(c)] as [string, string])] })], data => {
    const payload = { content: formValue(data, 'content'), name: formValue(data, 'name'), email: formValue(data, 'email'), categoryId: formValue(data, 'categoryId') || null, createDate: question ? question.createDate : new Date().toISOString(), userId: question ? question.userId : session.user?.id || null };
    return question ? api.updateQuestion(idOf(question), payload) : api.createQuestion(payload);
  }, after);
}
function deleteQuestion(question: Question, after: () => void): HTMLButtonElement {
  const control = iconButton('Delete', 'trash', () => void action(control, async () => { if (!await confirmAction('Delete question?', t('This action cannot be undone.'), 'Delete')) return; await api.deleteQuestion(idOf(question)); toast('Deleted successfully.'); after(); }), true); return control;
}
export function questions(root: HTMLElement, signal: AbortSignal): void {
  let rows: Question[] = [], categories: Category[] = [], search = '', categoryId = '', page = 1;
  const state = h('div'), display = h('div'); let reload: () => Promise<void> = async () => {};
  const selectField = field('Category', 'categoryId', '', { options: [['', 'All categories']] });
  const filterForm = h('form', { class: 'filter-bar' }, field('Search', 'search', '', { placeholder: 'Search records', maxlength: 200 }), selectField, h('button', { class: 'button primary', type: 'submit' }, t('Apply filters')));
  filterForm.addEventListener('submit', event => { event.preventDefault(); const data = new FormData(filterForm); search = formValue(data, 'search'); categoryId = formValue(data, 'categoryId'); page = 1; void reload(); });
  const add = button('Add question', () => editQuestion(undefined, categories, () => void reload()), 'plus', 'primary'); add.disabled = true;
  const draw = () => { const data = localPage(newest(rows, q => q.createDate).filter(q => `${q.content || ''} ${q.name || ''} ${q.email || ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), page); display.replaceChildren(table<Question>([
    { label: 'Content', cell: q => q.id ? recordLink(q.content || q.id, 'questions/' + encodeURIComponent(q.id), undefined, 'record-link clamp') : text(q.content) },
    { label: 'Name', cell: q => h('div', {}, text(q.name), h('small', { class: 'muted' }, text(q.email))) },
    { label: 'Category', cell: q => badge(categories.find(c => c.id === q.categoryId)?.name || q.categoryId || 'Uncategorized', 'purple') },
    { label: 'Created', cell: q => muted(formatDate(q.createDate)) },
    { label: 'Actions', cell: q => q.id ? h('div', { class: 'actions' }, iconButton('Edit question', 'edit', () => editQuestion(q, categories, () => void reload())), deleteQuestion(q, () => void reload()), link('View', 'questions/' + encodeURIComponent(q.id), 'chevron', 'text-link')) : null },
  ], data.items, 'Questions'), pager(data, p => { page = p; draw(); })); };
  root.append(pageTitle('Questions', 'Review student questions and manage their answers.', button('Refresh', () => void reload(), 'refresh'), add), h('section', { class: 'card' }, filterForm, state));
  reload = remote(state, signal, async s => { const [q, c] = await Promise.all([api.questions(categoryId || undefined, s), api.categories(s)]); return { q, c }; }, ({ q, c }) => {
    rows = q; categories = c; add.disabled = false;
    const select = selectField.querySelector('select')!; select.replaceChildren(h('option', { value: '' }, t('All categories')), ...c.filter(item => item.id).map(item => h('option', { value: idOf(item) }, text(item.name)))); select.value = categoryId;
    draw(); return display;
  });
}
function editAnswer(questionId: string, answer: Answer | undefined, after: () => void): void {
  formDialog(answer ? 'Edit answer' : 'Add answer', [field('Content', 'content', answer?.content, { area: true, required: true, maxlength: 20000 })], data => {
    // Request uses createdDate; response uses createDate. Preserve the original timestamp/author on edit.
    const payload = { content: formValue(data, 'content'), createdDate: answer ? answer.createDate : new Date().toISOString(), questionId, userId: answer ? answer.userId : session.user?.id || null };
    return answer ? api.updateAnswer(idOf(answer), payload) : api.createAnswer(payload);
  }, after);
}
export function questionDetail(root: HTMLElement, signal: AbortSignal, id: string): void {
  const body = h('div'); root.append(pageTitle('Question details', 'Read the question and manage its answer thread.', link('Back', 'questions', 'back', 'button secondary')), body);
  let reload: () => Promise<void> = async () => {};
  reload = remote(body, signal, async s => { const [question, answers, categories] = await Promise.all([api.question(id, s), api.answers(id, s), api.categories(s)]); return { question, answers, categories }; }, ({ question, answers, categories }) => [
    panel('Content', h('div', { class: 'detail-body' }, recordDetails([['Name', text(question.name)], ['Email', text(question.email)], ['Category', categories.find(c => c.id === question.categoryId)?.name || question.categoryId || t('Uncategorized')], ['Created', formatDate(question.createDate)], ['User ID', h('code', {}, text(question.userId))]]), h('p', { class: 'prose question-content' }, text(question.content)), h('div', { class: 'actions' }, button('Edit question', () => editQuestion(question, categories, () => void reload()), 'edit'), deleteQuestion(question, () => { location.hash = '#/questions'; })))),
    panel('Answers', answers.length ? h('div', { class: 'answer-list' }, newest(answers, a => a.createDate).map(answer => {
      const control = iconButton('Delete', 'trash', () => void action(control, async () => { if (!await confirmAction('Delete answer?', t('This action cannot be undone.'), 'Delete')) return; await api.deleteAnswer(idOf(answer)); toast('Deleted successfully.'); void reload(); }), true);
      return h('article', { class: 'answer-card' }, h('div', { class: 'spread' }, h('small', { class: 'muted' }, t('Created'), ': ', formatDate(answer.createDate)), answer.id ? h('div', { class: 'actions' }, iconButton('Edit answer', 'edit', () => editAnswer(id, answer, () => void reload())), control) : null), h('p', { class: 'prose' }, text(answer.content)), h('small', { class: 'muted' }, t('Author ID'), ': ', text(answer.userId)));
    })) : empty('No answers yet', 'Write the first answer to this question.'), button('Add answer', () => editAnswer(id, undefined, () => void reload()), 'plus', 'primary')),
    notice('The backend does not expose a workflow status for questions. No status is inferred or written by this portal.'),
  ]);
}
