import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Building2, Lock, MapPin, MessagesSquare, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Brand } from '@/components/layout/Brand';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input } from '@/components/ui/form';
import { Notice } from '@/components/ui/Notice';
import { useI18n } from '@/i18n/context';
import { errorMessageKey } from '@/lib/errors';
import { useAuth } from './auth-context';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});
type LoginValues = z.infer<typeof schema>;

export function LoginPage() {
  const { t } = useI18n();
  const { login, message } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(message || null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    document.title = `${t('Sign in')} | Agentic AR`;
  }, [t]);

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      await login(email, password);
    } catch (reason) {
      setError(errorMessageKey(reason));
    }
  });

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-sidebar p-12 text-white lg:flex lg:flex-col">
        <div
          aria-hidden
          className="absolute -top-40 -left-40 size-[520px] rounded-full bg-brand-500/25 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -right-32 -bottom-48 size-[460px] rounded-full bg-fuchsia-500/10 blur-3xl"
        />
        <Brand className="relative" />
        <div className="relative my-auto max-w-lg">
          <span className="text-xs font-semibold tracking-[0.3em] text-brand-300">
            CAMPUS INTELLIGENCE
          </span>
          <h1 className="mt-4 text-4xl leading-tight font-semibold">
            {t('A connected campus.')}
            <br />
            <span className="bg-gradient-to-r from-brand-300 to-fuchsia-300 bg-clip-text text-transparent">
              {t('One clear view.')}
            </span>
          </h1>
          <p className="mt-4 text-slate-400">
            {t('Your workspace for campus destinations, student support and AI conversations.')}
          </p>
          <div aria-hidden className="relative mt-14 h-56">
            <div className="absolute inset-0 m-auto size-56 rounded-full border border-white/10" />
            <div className="absolute inset-0 m-auto size-36 rounded-full border border-dashed border-brand-400/40" />
            <div className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-2xl bg-brand-500 shadow-2xl shadow-brand-500/40">
              <Building2 className="size-7" />
            </div>
            <span className="absolute top-4 left-1/2 ml-16 flex size-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <MessagesSquare className="size-5 text-brand-200" />
            </span>
            <span className="absolute bottom-6 left-1/2 -ml-28 flex size-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <MapPin className="size-5 text-fuchsia-200" />
            </span>
          </div>
        </div>
        <small className="relative text-xs tracking-[0.3em] text-slate-500">
          AGENTIC AR / ADMIN PORTAL
        </small>
      </section>

      {/* Form */}
      <main id="main-content" className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Brand className="text-ink lg:invisible" />
          <LanguageSwitcher />
        </div>
        <div className="m-auto w-full max-w-sm py-10">
          <span className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <Badge tone="brand">{t('Admin workspace')}</Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">{t('Welcome back')}</h2>
          <p className="mt-1 text-muted">
            {t('Sign in with an active Admin account to continue.')}
          </p>

          <form
            noValidate
            onSubmit={onSubmit}
            className="mt-8"
            aria-busy={isSubmitting || undefined}
          >
            <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
              <Field
                label={t('Email address')}
                required
                error={errors.email && t(errors.email.message!)}
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    type="email"
                    autoComplete="username"
                    maxLength={254}
                    placeholder="admin@example.edu.vn"
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                    {...register('email')}
                  />
                )}
              </Field>
              <Field
                label={t('Password')}
                required
                error={errors.password && t(errors.password.message!)}
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                    {...register('password')}
                  />
                )}
              </Field>
              <Checkbox
                label={t('Show password')}
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
              />
              <div aria-live="assertive">{error && <Notice tone="danger">{t(error)}</Notice>}</div>
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                className="h-11 w-full"
              >
                {t('Sign in')}
                <ArrowRight />
              </Button>
            </fieldset>
          </form>
          <p className="mt-6 flex items-center gap-2 text-xs text-muted">
            <Lock className="size-3.5 shrink-0" aria-hidden />
            {t('Your session is stored in this tab only. No password is stored.')}
          </p>
        </div>
      </main>
    </div>
  );
}
