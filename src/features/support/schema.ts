import { z } from 'zod';
import type { Answer, AnswerInput, Question, QuestionInput, User } from '@/types/api';

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200),
});
export type CategoryValues = z.infer<typeof categorySchema>;

export const questionSchema = z.object({
  content: z.string().trim().min(1, 'Content is required.').max(20000),
  name: z.string().trim().max(200),
  email: z
    .string()
    .trim()
    .max(254)
    .refine(
      (value) => !value || z.email().safeParse(value).success,
      'Enter a valid email address.',
    ),
  categoryId: z.string(),
});
export type QuestionValues = z.infer<typeof questionSchema>;

/** New questions default to the signed-in Admin as author. */
export const toQuestionForm = (question: Question | undefined, me: User): QuestionValues => ({
  content: question?.content ?? '',
  name: question?.name ?? me.name ?? '',
  email: question?.email ?? me.email ?? '',
  categoryId: question?.categoryId ?? '',
});

/** Edits preserve the original timestamp and author. */
export const toQuestionInput = (
  values: QuestionValues,
  question: Question | undefined,
  me: User,
): QuestionInput => ({
  content: values.content.trim(),
  name: values.name.trim(),
  email: values.email.trim(),
  categoryId: values.categoryId || null,
  createDate: question ? question.createDate : new Date().toISOString(),
  userId: question ? question.userId : me.id,
});

export const answerSchema = z.object({
  content: z.string().trim().min(1, 'Content is required.').max(20000),
});
export type AnswerValues = z.infer<typeof answerSchema>;

/** Request field is `createdDate` (response uses `createDate`). Edits keep author/timestamp. */
export const toAnswerInput = (
  values: AnswerValues,
  questionId: string,
  answer: Answer | undefined,
  me: User,
): AnswerInput => ({
  content: values.content.trim(),
  createdDate: answer ? answer.createDate : new Date().toISOString(),
  questionId,
  userId: answer ? answer.userId : me.id,
});
