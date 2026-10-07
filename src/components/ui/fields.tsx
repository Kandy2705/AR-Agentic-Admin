import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { get, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form';
import { useI18n } from '@/i18n/context';
import { Checkbox, Field, Input, Select, Textarea } from './form';

/** react-hook-form aware fields: register + label + translated error in one line. */
interface BaseProps<V extends FieldValues> {
  form: UseFormReturn<V>;
  name: Path<V>;
  label: string;
  help?: ReactNode;
  required?: boolean;
  className?: string;
}

function useFieldError<V extends FieldValues>(form: UseFormReturn<V>, name: Path<V>) {
  const { t } = useI18n();
  const message = get(form.formState.errors, name)?.message as string | undefined;
  return message ? t(message) : undefined;
}

export function TextField<V extends FieldValues>({
  form,
  name,
  label,
  help,
  required,
  className,
  ...input
}: BaseProps<V> & Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'form'>) {
  const error = useFieldError(form, name);
  return (
    <Field label={label} required={required} help={help} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          {...input}
          {...form.register(name)}
        />
      )}
    </Field>
  );
}

export function TextAreaField<V extends FieldValues>({
  form,
  name,
  label,
  help,
  required,
  className,
  ...input
}: BaseProps<V> & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name' | 'form'>) {
  const error = useFieldError(form, name);
  return (
    <Field label={label} required={required} help={help} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <Textarea
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          {...input}
          {...form.register(name)}
        />
      )}
    </Field>
  );
}

export function SelectField<V extends FieldValues>({
  form,
  name,
  label,
  help,
  required,
  className,
  options,
  ...select
}: BaseProps<V> &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name' | 'form'> & {
    options: { value: string; label: string }[];
  }) {
  const error = useFieldError(form, name);
  return (
    <Field label={label} required={required} help={help} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <Select
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          {...select}
          {...form.register(name)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

export function CheckboxField<V extends FieldValues>({
  form,
  name,
  label,
}: Pick<BaseProps<V>, 'form' | 'name' | 'label'>) {
  return <Checkbox label={label} {...form.register(name)} />;
}
