import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/services/query-keys';
import { answersService, categoriesService, questionsService } from '@/services/support.service';
import type { AnswerInput, QuestionInput } from '@/types/api';

// ---- Categories ---------------------------------------------------------------

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: ({ signal }) => categoriesService.list(signal),
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: readonly (readonly unknown[])[]) => {
    for (const queryKey of [...keys, queryKeys.dashboard]) {
      void queryClient.invalidateQueries({ queryKey });
    }
  };
}

export function useSaveCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, name }: { id?: string; name: string }) =>
      id ? categoriesService.update(id, name) : categoriesService.create(name),
    onSuccess: () => invalidate(queryKeys.categories.all),
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: categoriesService.remove,
    onSuccess: () => invalidate(queryKeys.categories.all, ['questions', 'list']),
  });
}

// ---- Questions ----------------------------------------------------------------

/** `categoryId = ''` loads every question. */
export function useQuestions(categoryId: string) {
  return useQuery({
    queryKey: queryKeys.questions.list(categoryId),
    queryFn: ({ signal }) => questionsService.list(categoryId || undefined, signal),
  });
}

export function useQuestion(id: string) {
  return useQuery({
    queryKey: queryKeys.questions.detail(id),
    queryFn: ({ signal }) => questionsService.get(id, signal),
  });
}

export function useSaveQuestion() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: QuestionInput }) =>
      id ? questionsService.update(id, body) : questionsService.create(body),
    onSuccess: () => invalidate(queryKeys.questions.all),
  });
}

/** Only lists are refreshed: refetching the deleted question's detail would just 404. */
export function useDeleteQuestion() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: questionsService.remove,
    onSuccess: () => invalidate(['questions', 'list']),
  });
}

// ---- Answers ------------------------------------------------------------------

export function useAnswers(questionId: string) {
  return useQuery({
    queryKey: queryKeys.questions.answers(questionId),
    queryFn: ({ signal }) => answersService.listByQuestion(questionId, signal),
  });
}

export function useSaveAnswer(questionId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: AnswerInput }) =>
      id ? answersService.update(id, body) : answersService.create(body),
    onSuccess: () => invalidate(queryKeys.questions.answers(questionId)),
  });
}

export function useDeleteAnswer(questionId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: answersService.remove,
    onSuccess: () => invalidate(queryKeys.questions.answers(questionId)),
  });
}
