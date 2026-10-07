import { FormDialog } from '@/components/ui/FormDialog';
import { SelectField, TextAreaField, TextField } from '@/components/ui/fields';
import { useCurrentUser } from '@/features/auth/auth-context';
import { useDialogForm } from '@/hooks/useDialogForm';
import { useI18n } from '@/i18n/context';
import { idOf } from '@/lib/utils';
import type { Answer, Category, Question } from '@/types/api';
import { useSaveAnswer, useSaveCategory, useSaveQuestion } from './api';
import {
  answerSchema,
  categorySchema,
  questionSchema,
  toAnswerInput,
  toQuestionForm,
  toQuestionInput,
} from './schema';

export function CategoryDialog({
  category,
  onClose,
}: {
  category?: Category;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const save = useSaveCategory();
  const { form, onSubmit } = useDialogForm({
    schema: categorySchema,
    defaultValues: { name: category?.name ?? '' },
    onClose,
    submit: ({ name }) =>
      save.mutateAsync({ id: category ? idOf(category) : undefined, name: name.trim() }),
  });
  return (
    <FormDialog
      open
      size="sm"
      onClose={onClose}
      title={t(category ? 'Edit category' : 'Add category')}
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={form.formState.errors.root?.message && t(form.formState.errors.root.message)}
    >
      <TextField form={form} name="name" label={t('Name')} required maxLength={200} />
    </FormDialog>
  );
}

export function QuestionDialog({
  question,
  categories,
  onClose,
}: {
  question?: Question;
  categories: Category[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const me = useCurrentUser();
  const save = useSaveQuestion();
  const { form, onSubmit } = useDialogForm({
    schema: questionSchema,
    defaultValues: toQuestionForm(question, me),
    onClose,
    submit: (values) =>
      save.mutateAsync({
        id: question ? idOf(question) : undefined,
        body: toQuestionInput(values, question, me),
      }),
  });
  return (
    <FormDialog
      open
      size="lg"
      onClose={onClose}
      title={t(question ? 'Edit question' : 'Add question')}
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={form.formState.errors.root?.message && t(form.formState.errors.root.message)}
    >
      <TextAreaField form={form} name="content" label={t('Content')} required maxLength={20000} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField form={form} name="name" label={t('Name')} maxLength={200} />
        <TextField form={form} name="email" label={t('Email')} type="email" maxLength={254} />
      </div>
      <SelectField
        form={form}
        name="categoryId"
        label={t('Category')}
        options={[
          { value: '', label: t('Uncategorized') },
          ...categories
            .filter((category) => category.id)
            .map((category) => ({ value: idOf(category), label: category.name || idOf(category) })),
        ]}
      />
    </FormDialog>
  );
}

export function AnswerDialog({
  questionId,
  answer,
  onClose,
}: {
  questionId: string;
  answer?: Answer;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const me = useCurrentUser();
  const save = useSaveAnswer(questionId);
  const { form, onSubmit } = useDialogForm({
    schema: answerSchema,
    defaultValues: { content: answer?.content ?? '' },
    onClose,
    submit: (values) =>
      save.mutateAsync({
        id: answer ? idOf(answer) : undefined,
        body: toAnswerInput(values, questionId, answer, me),
      }),
  });
  return (
    <FormDialog
      open
      size="lg"
      onClose={onClose}
      title={t(answer ? 'Edit answer' : 'Add answer')}
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={form.formState.errors.root?.message && t(form.formState.errors.root.message)}
    >
      <TextAreaField
        form={form}
        name="content"
        label={t('Content')}
        required
        rows={8}
        maxLength={20000}
      />
    </FormDialog>
  );
}
