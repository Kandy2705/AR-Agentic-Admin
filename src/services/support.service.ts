import { safeId } from '@/lib/http/api-client';
import type { Answer, AnswerInput, Category, Question, QuestionInput } from '@/types/api';
import { http } from './http';

export const categoriesService = {
  list: (signal?: AbortSignal) => http.get<Category[]>('/contacts/categories', signal),
  create: (name: string) => http.post<Category>('/contacts/categories', { name }),
  update: (id: string, name: string) =>
    http.put<Category>(`/contacts/categories/${safeId(id)}`, { name }),
  remove: (id: string) => http.remove(`/contacts/categories/${safeId(id)}`),
};

export const questionsService = {
  /** The backend filters by category through a dedicated path, not a query parameter. */
  list: (categoryId?: string, signal?: AbortSignal) =>
    http.get<Question[]>(
      categoryId ? `/contacts/questions/categories/${safeId(categoryId)}` : '/contacts/questions',
      signal,
    ),
  get: (id: string, signal?: AbortSignal) =>
    http.get<Question>(`/contacts/questions/${safeId(id)}`, signal),
  create: (body: QuestionInput) => http.post<Question>('/contacts/questions', body),
  update: (id: string, body: QuestionInput) =>
    http.put<Question>(`/contacts/questions/${safeId(id)}`, body),
  remove: (id: string) => http.remove(`/contacts/questions/${safeId(id)}`),
};

export const answersService = {
  listByQuestion: (questionId: string, signal?: AbortSignal) =>
    http.get<Answer[]>(`/contacts/questions/${safeId(questionId)}/answers`, signal),
  create: (body: AnswerInput) => http.post<Answer>('/contacts/answers', body),
  update: (id: string, body: AnswerInput) =>
    http.put<Answer>(`/contacts/answers/${safeId(id)}`, body),
  remove: (id: string) => http.remove(`/contacts/answers/${safeId(id)}`),
};
