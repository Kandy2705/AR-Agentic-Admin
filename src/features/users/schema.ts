import { z } from 'zod';
import { dateInput } from '@/lib/utils';
import { ROLES, type ProfileUpdate, type Role, type User } from '@/types/api';

const today = () => new Date().toISOString().slice(0, 10);

/** Form model (strings, as edited in inputs). */
export const userFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine(
      (value) => !value || /^[+\d][\d\s().-]{5,}$/.test(value),
      'Enter a valid phone number.',
    ),
  birthday: z
    .string()
    .refine((value) => !value || value <= today(), 'Birthday cannot be in the future.'),
  gender: z.string().trim().max(80),
  role: z.enum(ROLES as [Role, ...Role[]]),
});
export type UserFormValues = z.infer<typeof userFormSchema>;

/** Data mapper: DTO → form values. */
export function toUserForm(user: User): UserFormValues {
  return {
    name: user.name ?? '',
    phone: user.phone ?? '',
    birthday: dateInput(user.birthday),
    gender: user.gender ?? '',
    role: user.role ?? 'Customer',
  };
}

/** Data mapper: form values → request payload. An empty birthday keeps the current value. */
export function toProfilePayload(values: Omit<UserFormValues, 'role'>): ProfileUpdate {
  return {
    name: values.name.trim(),
    phone: values.phone.trim(),
    birthday: values.birthday ? `${values.birthday}T00:00:00Z` : null,
    gender: values.gender.trim(),
  };
}
