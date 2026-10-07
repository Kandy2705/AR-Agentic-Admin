import { Download, Pencil, RefreshCw, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useNotify } from '@/components/feedback/useNotify';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Field, Input, Select } from '@/components/ui/form';
import { IconButton } from '@/components/ui/IconButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowLink } from '@/components/ui/RowLink';
import { Pagination } from '@/components/ui/Pagination';
import { QueryView } from '@/components/ui/states';
import { PAGE_SIZE } from '@/config/env';
import { useCurrentUser } from '@/features/auth/auth-context';
import { useI18n } from '@/i18n/context';
import { datedFilename, downloadCsv } from '@/lib/csv';
import { dateInput, idOf } from '@/lib/utils';
import { ROLES, type Role, type User } from '@/types/api';
import { fetchAllUsers, useUpdateUser, useUsers } from './api';
import { toProfilePayload } from './schema';
import { UserFormDialog } from './UserFormDialog';

/** Filters live in the URL so the view is shareable and survives refresh. */
function useUserFilters() {
  const [params, setParams] = useSearchParams();
  const role = params.get('role') ?? '';
  const status = params.get('status') ?? '';
  return {
    search: params.get('q') ?? '',
    role: (ROLES as readonly string[]).includes(role) ? (role as Role) : ('' as const),
    status: status === 'true' || status === 'false' ? status : '',
    page: Math.max(1, Math.floor(Number(params.get('page'))) || 1),
    update: (next: Record<string, string>) =>
      setParams((current) => {
        const merged = new URLSearchParams(current);
        for (const [key, value] of Object.entries(next)) {
          if (value) merged.set(key, value);
          else merged.delete(key);
        }
        return merged;
      }),
  };
}

export default function UsersPage() {
  const { t } = useI18n();
  const notify = useNotify();
  const me = useCurrentUser();
  const filters = useUserFilters();
  const [editing, setEditing] = useState<User | null>(null);
  const [exporting, setExporting] = useState(false);
  const updateUser = useUpdateUser();

  const apiFilters = {
    search: filters.search,
    role: filters.role,
    isActive: filters.status === '' ? ('' as const) : filters.status === 'true',
  };
  const users = useUsers({ page: filters.page, pageSize: PAGE_SIZE, ...apiFilters });

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    filters.update({
      q: String(data.get('q') ?? '').trim(),
      role: String(data.get('role') ?? ''),
      status: String(data.get('status') ?? ''),
      page: '',
    });
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAllUsers(apiFilters);
      downloadCsv(datedFilename('users'), rows, [
        { header: 'ID', value: (u) => u.id },
        { header: t('Name'), value: (u) => u.name },
        { header: t('Email'), value: (u) => u.email },
        { header: t('Phone'), value: (u) => u.phone },
        { header: t('Birthday'), value: (u) => dateInput(u.birthday) },
        { header: t('Gender'), value: (u) => u.gender },
        { header: t('Role'), value: (u) => u.role },
        { header: t('Status'), value: (u) => (u.isActive ? t('Active') : t('Disabled')) },
      ]);
    } catch (error) {
      notify.error(error);
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<User>[] = [
    {
      header: t('Name'),
      cell: (user) => (
        <div className="flex items-center gap-3">
          <Avatar name={user.name} />
          <div className="min-w-0">
            {user.id ? (
              <Link
                to={`/users/${encodeURIComponent(user.id)}`}
                className="block truncate font-medium hover:text-brand-600"
              >
                {user.name || user.email || user.id}
              </Link>
            ) : (
              <span className="font-medium">{user.name || '—'}</span>
            )}
            <span className="block truncate text-xs text-muted">{user.email || '—'}</span>
          </div>
        </div>
      ),
    },
    {
      header: t('Role'),
      cell: (user) => (
        <Badge tone={user.role === 'Admin' ? 'brand' : 'neutral'}>{t(user.role ?? '—')}</Badge>
      ),
    },
    {
      header: t('Status'),
      cell: (user) => (
        <Badge tone={user.isActive ? 'success' : 'danger'}>
          {t(user.isActive ? 'Active' : 'Disabled')}
        </Badge>
      ),
    },
    { header: t('Phone'), cell: (user) => <span className="text-muted">{user.phone || '—'}</span> },
    {
      header: t('Actions'),
      className: 'w-px text-right',
      cell: (user) =>
        user.id && (
          <div className="flex items-center justify-end gap-1">
            <IconButton label={t('Edit user')} icon={<Pencil />} onClick={() => setEditing(user)} />
            <RowLink to={`/users/${encodeURIComponent(user.id)}`}>{t('Details')}</RowLink>
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('Users')}
        description={t('Manage account access and user profiles.')}
        actions={
          <>
            <Button icon={<Download />} loading={exporting} onClick={() => void exportCsv()}>
              {t('Export CSV')}
            </Button>
            <Button
              icon={<RefreshCw />}
              loading={users.isFetching}
              onClick={() => void users.refetch()}
            >
              {t('Refresh')}
            </Button>
          </>
        }
      />
      <Card>
        <form
          key={`${filters.search}|${filters.role}|${filters.status}`}
          onSubmit={applyFilters}
          className="grid gap-3 border-b border-line p-5 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end"
        >
          <Field label={t('Search')}>
            {({ id }) => (
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
                <Input
                  id={id}
                  name="q"
                  defaultValue={filters.search}
                  maxLength={100}
                  placeholder={t('Search by name or email')}
                  className="pl-9"
                />
              </div>
            )}
          </Field>
          <Field label={t('Role')}>
            {({ id }) => (
              <Select id={id} name="role" defaultValue={filters.role}>
                <option value="">{t('All roles')}</option>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {t(role)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('Status')}>
            {({ id }) => (
              <Select id={id} name="status" defaultValue={filters.status}>
                <option value="">{t('All statuses')}</option>
                <option value="true">{t('Active')}</option>
                <option value="false">{t('Disabled')}</option>
              </Select>
            )}
          </Field>
          <Button type="submit" variant="primary">
            {t('Apply filters')}
          </Button>
        </form>
        <QueryView query={users}>
          {(page) => (
            <>
              <DataTable
                caption={t('Users')}
                columns={columns}
                rows={page.items}
                rowKey={(user, index) => user.id ?? `row-${index}`}
              />
              <Pagination
                page={page.page}
                totalPages={page.totalPages}
                totalItems={page.totalItems}
                disabled={users.isFetching}
                onPageChange={(next) => filters.update({ page: String(next) })}
              />
            </>
          )}
        </QueryView>
      </Card>

      {editing && (
        <UserFormDialog
          open
          onClose={() => setEditing(null)}
          user={editing}
          withRole
          roleLocked={editing.id === me.id}
          title={t('Edit user')}
          submit={(values) =>
            updateUser.mutateAsync({
              id: idOf(editing),
              body: {
                ...toProfilePayload(values),
                role: editing.id === me.id ? (editing.role ?? values.role) : values.role,
              },
            })
          }
        />
      )}
    </>
  );
}
