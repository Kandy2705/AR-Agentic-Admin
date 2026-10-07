import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Building2,
  ChevronRight,
  Clock,
  Download,
  MessageSquareText,
  MessagesSquare,
  RefreshCw,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, LoadingState, QueryView } from '@/components/ui/states';
import { useCurrentUser } from '@/features/auth/auth-context';
import { useI18n } from '@/i18n/context';
import { cn } from '@/lib/cn';
import { datedFilename, downloadCsv } from '@/lib/csv';
import type { DashboardSummary } from '@/types/api';
import { useDashboardSummary, useRecentConversations, useRecentQuestions } from './api';

interface Metric {
  label: string;
  value: number;
  to: string;
  icon: LucideIcon;
  tone: string;
}

const tones = [
  'from-brand-500 to-brand-600',
  'from-sky-500 to-cyan-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
];

export default function DashboardPage() {
  const { t, formatNumber, formatDate } = useI18n();
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const summary = useDashboardSummary();
  const questions = useRecentQuestions();
  const conversations = useRecentConversations();

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void questions.refetch();
    void conversations.refetch();
  };

  const exportSummary = (data: DashboardSummary) =>
    downloadCsv(
      datedFilename('agentic-ar-summary'),
      Object.entries(data) as [keyof DashboardSummary, number][],
      [
        { header: t('Metric'), value: ([key]) => key },
        { header: t('Value'), value: ([, value]) => value },
      ],
    );

  return (
    <>
      <PageHeader
        title={t('Dashboard')}
        description={t('A clear view of your campus, community and conversations.')}
        actions={
          <>
            <Button
              icon={<Download />}
              disabled={!summary.data}
              onClick={() => summary.data && exportSummary(summary.data)}
            >
              {t('Export report')}
            </Button>
            <Button icon={<RefreshCw />} onClick={refreshAll} loading={summary.isFetching}>
              {t('Refresh')}
            </Button>
          </>
        }
      />

      <section className="relative mb-6 overflow-hidden rounded-card bg-gradient-to-br from-brand-600 via-brand-500 to-fuchsia-500 p-6 text-white shadow-card sm:p-8">
        <div aria-hidden className="absolute -top-16 -right-10 size-56 rounded-full bg-white/10" />
        <div
          aria-hidden
          className="absolute -right-24 -bottom-24 size-72 rounded-full bg-white/5"
        />
        <span className="relative text-xs font-semibold tracking-[0.25em] text-white/70">
          AGENTIC AR / CONTROL CENTER
        </span>
        <h2 className="relative mt-2 text-2xl font-semibold">
          {t('Welcome back')}, {user.name || 'Admin'}.
        </h2>
        <p className="relative mt-1 text-white/80">
          {t('One workspace to keep your campus connected.')}
        </p>
      </section>

      <QueryView query={summary} loading={<LoadingState rows={2} className="p-0" />}>
        {(data) => {
          const metrics: Metric[] = [
            {
              label: 'Total users',
              value: data.totalUsers,
              to: '/users',
              icon: Users,
              tone: tones[0],
            },
            {
              label: 'Total buildings',
              value: data.totalBuildings,
              to: '/buildings',
              icon: Building2,
              tone: tones[1],
            },
            {
              label: 'Total questions',
              value: data.totalQuestions,
              to: '/questions',
              icon: MessageSquareText,
              tone: tones[2],
            },
            {
              label: 'Conversations',
              value: data.totalHistories,
              to: '/chats',
              icon: MessagesSquare,
              tone: tones[3],
            },
          ];
          const activeShare = data.totalUsers ? (data.activeUsers / data.totalUsers) * 100 : 0;
          return (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                {metrics.map(({ label, value, to, icon: Icon, tone }) => (
                  <Link
                    key={to}
                    to={to}
                    className="group rounded-card border border-line bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 sm:p-5"
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={cn(
                          'inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md',
                          tone,
                        )}
                      >
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <ChevronRight className="size-4 text-slate-300 transition group-hover:text-brand-500" />
                    </div>
                    <p className="mt-4 text-[13px] text-muted">{t(label)}</p>
                    <strong className="mt-1 block text-3xl font-semibold tracking-tight tabular-nums">
                      {formatNumber(value)}
                    </strong>
                  </Link>
                ))}
              </div>

              <Card className="mt-4 grid grid-cols-3 gap-6 p-5 lg:grid-cols-[repeat(3,minmax(0,1fr))_2fr]">
                {(
                  [
                    ['Answers', data.totalAnswers],
                    ['Categories', data.totalCategories],
                    ['Messages', data.totalChatboxes],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[13px] text-muted">{t(label)}</p>
                    <strong className="text-xl font-semibold tabular-nums">
                      {formatNumber(value)}
                    </strong>
                  </div>
                ))}
                <div className="col-span-3 lg:col-span-1">
                  <div className="flex justify-between text-[13px]">
                    <span>
                      {t('Active users')}{' '}
                      <strong className="tabular-nums">{formatNumber(data.activeUsers)}</strong>
                    </span>
                    <span className="text-muted">
                      {t('Disabled users')} {formatNumber(data.disabledUsers)}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={t('Active users')}
                    aria-valuemin={0}
                    aria-valuemax={data.totalUsers}
                    aria-valuenow={data.activeUsers}
                    className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                      style={{ width: `${activeShare}%` }}
                    />
                  </div>
                </div>
              </Card>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                <Clock className="size-3.5" aria-hidden />
                {t('Last refreshed')}: {formatDate(new Date(summary.dataUpdatedAt).toISOString())}
              </p>
            </>
          );
        }}
      </QueryView>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t('Recent questions')}
            actions={<ViewAll to="/questions" label={t('View all')} />}
          />
          <QueryView query={questions}>
            {(rows) =>
              rows.length ? (
                <ul className="divide-y divide-line">
                  {rows.map((question, index) => (
                    <li key={question.id ?? index}>
                      <Link
                        to={
                          question.id
                            ? `/questions/${encodeURIComponent(question.id)}`
                            : '/questions'
                        }
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-brand-50/40"
                      >
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                          <MessageSquareText className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {question.content || '—'}
                          </span>
                          <span className="text-xs text-muted">
                            {question.name || '—'} · {formatDate(question.createDate)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState />
              )
            }
          </QueryView>
        </Card>

        <Card>
          <CardHeader
            title={t('Recent conversations')}
            actions={<ViewAll to="/chats" label={t('View all')} />}
          />
          <QueryView query={conversations}>
            {(page) =>
              page.items.length ? (
                <ul className="divide-y divide-line">
                  {page.items.map((item, index) => (
                    <li key={item.id ?? index}>
                      <Link
                        to={item.id ? `/chats/${encodeURIComponent(item.id)}` : '/chats'}
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-brand-50/40"
                      >
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <MessagesSquare className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {item.header || t('Conversation')}
                          </span>
                          <span className="text-xs text-muted">{formatDate(item.create_date)}</span>
                        </span>
                        <ChevronRight className="size-4 text-slate-300" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState />
              )
            }
          </QueryView>
        </Card>
      </div>
    </>
  );
}

function ViewAll({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:text-brand-700"
    >
      {label}
      <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}
