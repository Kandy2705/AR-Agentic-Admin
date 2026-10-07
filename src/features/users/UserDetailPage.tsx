import { ArrowLeft, Lock, Pencil, Unlock } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useConfirm } from '@/components/feedback/confirm-context';
import { useNotify } from '@/components/feedback/useNotify';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/button-styles';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DetailList } from '@/components/ui/DetailList';
import { PageHeader } from '@/components/ui/PageHeader';
import { QueryView } from '@/components/ui/states';
import { useCurrentUser } from '@/features/auth/auth-context';
import { useI18n } from '@/i18n/context';
import { dateInput, idOf } from '@/lib/utils';
import type { User } from '@/types/api';
import { useSetUserStatus, useUpdateUser, useUser } from './api';
import { toProfilePayload } from './schema';
import { UserFormDialog } from './UserFormDialog';

export default function UserDetailPage() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const user = useUser(id);

  return (
    <>
      <PageHeader
        title={t('User details')}
        description={t('Profile and account permissions.')}
        actions={
          <Link to="/users" className={buttonClasses()}>
            <ArrowLeft /> {t('Back')}
          </Link>
        }
      />
      <QueryView query={user}>{(data) => <UserProfileCard user={data} />}</QueryView>
    </>
  );
}

function UserProfileCard({ user }: { user: User }) {
  const { t } = useI18n();
  const me = useCurrentUser();
  const confirm = useConfirm();
  const notify = useNotify();
  const updateUser = useUpdateUser();
  const setStatus = useSetUserStatus();
  const [editing, setEditing] = useState(false);
  const isSelf = user.id === me.id;

  const toggleStatus = async () => {
    const disabling = user.isActive;
    const ok = await confirm({
      title: t(disabling ? 'Disable account' : 'Enable account'),
      description: `${user.email ?? ''}. ${t(
        disabling
          ? 'The user will lose application access.'
          : 'Application access will be restored.',
      )}`,
      confirmLabel: t('Continue'),
      tone: disabling ? 'danger' : 'primary',
    });
    if (!ok) return;
    try {
      await setStatus.mutateAsync({ id: idOf(user), isActive: !user.isActive });
      notify.saved();
    } catch (error) {
      notify.error(error);
    }
  };

  return (
    <Card>
      <CardHeader title={t('Profile')} />
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
        <div className="flex flex-wrap gap-2 border-t border-line pt-5">
          <Button variant="primary" icon={<Pencil />} onClick={() => setEditing(true)}>
            {t('Edit user')}
          </Button>
          <Button
            variant={user.isActive ? 'danger-outline' : 'secondary'}
            icon={user.isActive ? <Lock /> : <Unlock />}
            loading={setStatus.isPending}
            disabled={isSelf}
            title={isSelf ? t('You cannot disable your own account here.') : undefined}
            onClick={() => void toggleStatus()}
          >
            {t(user.isActive ? 'Disable account' : 'Enable account')}
          </Button>
        </div>
      </CardBody>
      <UserFormDialog
        open={editing}
        onClose={() => setEditing(false)}
        user={user}
        withRole
        roleLocked={isSelf}
        title={t('Edit user')}
        submit={(values) =>
          updateUser.mutateAsync({
            id: idOf(user),
            body: {
              ...toProfilePayload(values),
              role: isSelf ? (user.role ?? values.role) : values.role,
            },
          })
        }
      />
    </Card>
  );
}
