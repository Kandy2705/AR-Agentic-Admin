import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type DefaultValues, type FieldValues } from 'react-hook-form';
import type { z } from 'zod';
import { useNotify } from '@/components/feedback/useNotify';
import { errorMessageKey } from '@/lib/errors';

interface Options<V extends FieldValues> {
  schema: z.ZodType<V, V>;
  defaultValues: DefaultValues<V>;
  submit: (values: V) => Promise<unknown>;
  onClose: () => void;
  successMessage?: string;
}

/**
 * Create/edit dialog form: zod validation → submit → toast → close.
 * Server errors are shown inside the dialog (sequence diagrams: "Dữ liệu không hợp lệ" branch).
 */
export function useDialogForm<V extends FieldValues>({
  schema,
  defaultValues,
  submit,
  onClose,
  successMessage,
}: Options<V>) {
  const notify = useNotify();
  const form = useForm<V>({ resolver: zodResolver(schema), defaultValues });
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await submit(values);
      if (successMessage) notify.success(successMessage);
      else notify.saved();
      onClose();
    } catch (error) {
      form.setError('root', { message: errorMessageKey(error) });
    }
  });
  return { form, onSubmit };
}
