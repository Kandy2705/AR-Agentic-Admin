import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/button-styles';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DetailList } from '@/components/ui/DetailList';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryView } from '@/components/ui/states';
import { useAuth } from '@/features/auth/auth-context';
import { toProfilePayload } from '@/features/users/schema';
import { UserFormDialog } from '@/features/users/UserFormDialog';
import { useI18n } from '@/i18n/context';
import { dateInput } from '@/lib/utils';
import { authService } from '@/services/auth.service';
import { queryKeys } from '@/services/query-keys';

export default function ProfilePage() {
  const { t } = useI18n();
  const { setUser } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const me = useQuery({ queryKey: queryKeys.me, queryFn: ({ signal }) => authService.me(signal) });

  return (
    <>
      <PageHeader
        title={t('Profile')}
        description={t('Your account and security settings.')}
        actions={
          <Link to="/password" className={buttonClasses()}>
            <KeyRound /> {t('Change password')}
          </Link>
        }
      />
      <QueryView query={me}>
        {(user) => (
          <Card>
            <CardHeader title={t('Account')} />
            <CardBody className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar name={user.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-semibold">{user.name || '—'}</h2>
                  <p className="truncate text-muted">{user.email || '—'}</p>
                </div>
                <div className="flex gap-2">
                  <Badge tone="brand">{t(user.role ?? '—')}</Badge>
                  <Badge tone={user.isActive ? 'success' : 'danger'}>
                    {t(user.isActive ? 'Active' : 'Disabled')}
                  </Badge>
                </div>
              </div>
              <DetailList
                items={[
                  ['ID', <code className="text-[13px]">{user.id || '—'}</code>],
                  [t('Email'), user.email || '—'],
                  [t('Phone'), user.phone || '—'],
                  [t('Birthday'), dateInput(user.birthday) || '—'],
                  [t('Gender'), user.gender || '—'],
                ]}
              />
              <div className="border-t border-line pt-5">
                <Button variant="primary" icon={<Pencil />} onClick={() => setEditing(true)}>
                  {t('Edit profile')}
                </Button>
              </div>
            </CardBody>
            <UserFormDialog
              open={editing}
              onClose={() => setEditing(false)}
              user={user}
              withRole={false}
              title={t('Edit profile')}
              submit={async (values) => {
                const updated = await authService.updateProfile(toProfilePayload(values));
                if (updated && typeof updated === 'object' && updated.id === user.id) {
                  queryClient.setQueryData(queryKeys.me, updated);
                  setUser({ ...user, ...updated });
                } else {
                  await queryClient.invalidateQueries({ queryKey: queryKeys.me });
                }
              }}
            />
          </Card>
        )}
      </QueryView>
    </>
  );
}
