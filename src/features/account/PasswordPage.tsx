import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { useNotify } from '@/components/feedback/useNotify';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/button-styles';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { TextField } from '@/components/ui/fields';
import { Field, Input } from '@/components/ui/form';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth, useCurrentUser } from '@/features/auth/auth-context';
import { useI18n } from '@/i18n/context';
import { errorMessageKey } from '@/lib/errors';
import { authService } from '@/services/auth.service';

const OTP_COOLDOWN_S = 60;

const schema = z
  .object({
    otpCode: z.string().trim().min(1, 'OTP code is required.').max(20),
    oldPassword: z.string().min(1, 'Password is required.'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ['confirm'],
    message: 'The passwords do not match.',
  })
  .refine((v) => v.newPassword !== v.oldPassword, {
    path: ['newPassword'],
    message: 'Choose a new password different from the old password.',
  });
type PasswordValues = z.infer<typeof schema>;

/** Seconds left on the OTP resend cooldown. */
function useCooldown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= now) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until, now]);
  return {
    seconds: Math.max(0, Math.ceil((until - now) / 1000)),
    start: () => {
      setNow(Date.now());
      setUntil(Date.now() + OTP_COOLDOWN_S * 1000);
    },
  };
}

export default function PasswordPage() {
  const { t } = useI18n();
  const { logout } = useAuth();
  const user = useCurrentUser();
  const notify = useNotify();
  const cooldown = useCooldown();
  const [sending, setSending] = useState(false);
  const email = user.email ?? '';
  const form = useForm<PasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { otpCode: '', oldPassword: '', newPassword: '', confirm: '' },
  });
  const { isSubmitting, errors } = form.formState;

  const sendOtp = async () => {
    setSending(true);
    try {
      if (!(await authService.requestOtp(email))) {
        throw new Error('The OTP could not be sent. Please try again.');
      }
      notify.success('OTP sent. Check your email.');
      cooldown.start();
    } catch (error) {
      notify.error(error);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await authService.changePassword({
        email,
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
        otpCode: values.otpCode.trim(),
      });
      logout('Password changed. Please sign in again.');
    } catch (error) {
      form.setError('root', { message: errorMessageKey(error) });
    }
  });

  return (
    <>
      <PageHeader
        title={t('Change password')}
        description={t('Verify your email and set a new password.')}
        actions={
          <Link to="/profile" className={buttonClasses()}>
            <ArrowLeft /> {t('Back')}
          </Link>
        }
      />
      <Card className="max-w-2xl">
        <CardHeader title={t('Account security')} />
        <CardBody>
          <form noValidate onSubmit={onSubmit} aria-busy={isSubmitting || undefined}>
            <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
              <Field label={t('Email')}>
                {({ id }) => <Input id={id} type="email" value={email} readOnly />}
              </Field>
              <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
                <TextField
                  form={form}
                  name="otpCode"
                  label={t('OTP code')}
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={20}
                />
                <Button
                  icon={<Mail />}
                  loading={sending}
                  disabled={cooldown.seconds > 0 || !email}
                  onClick={() => void sendOtp()}
                  className={errors.otpCode ? 'sm:mb-[22px]' : undefined}
                >
                  {cooldown.seconds > 0 ? `${t('Send OTP')} (${cooldown.seconds}s)` : t('Send OTP')}
                </Button>
              </div>
              <TextField
                form={form}
                name="oldPassword"
                label={t('Old password')}
                type="password"
                required
                autoComplete="current-password"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  form={form}
                  name="newPassword"
                  label={t('New password')}
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <TextField
                  form={form}
                  name="confirm"
                  label={t('Confirm password')}
                  type="password"
                  required
                  autoComplete="new-password"
                />
              </div>
              {errors.root?.message && <Notice tone="danger">{t(errors.root.message)}</Notice>}
              <div>
                <Button type="submit" variant="primary" icon={<KeyRound />} loading={isSubmitting}>
                  {t('Change password')}
                </Button>
              </div>
            </fieldset>
          </form>
        </CardBody>
      </Card>
      <Notice className="mt-4 max-w-2xl">
        {t(
          'The portal signs out locally after a password change. Server-side session revocation is managed by the backend.',
        )}
      </Notice>
    </>
  );
}
