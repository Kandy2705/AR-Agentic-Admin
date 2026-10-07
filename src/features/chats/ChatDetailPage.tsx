import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { useConfirmedAction } from '@/components/feedback/useConfirmedAction';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/button-styles';
import { Card, CardHeader } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, QueryView } from '@/components/ui/states';
import { useI18n } from '@/i18n/context';
import { cn } from '@/lib/cn';
import { idOf, oldest } from '@/lib/utils';
import { useDeleteHistory, useDeleteMessage, useMessages } from './api';

const bubbleTones = [
  'bg-brand-50 border-brand-100',
  'bg-emerald-50 border-emerald-100',
  'bg-amber-50 border-amber-100',
  'bg-sky-50 border-sky-100',
];

/**
 * `contact_person` is a free-form string — we display it as-is and only use it to
 * group colours; no user/assistant role is invented.
 */
function toneFor(person: string, people: string[]) {
  const index = people.indexOf(person);
  return bubbleTones[(index < 0 ? 0 : index) % bubbleTones.length];
}

export default function ChatDetailPage() {
  const { id = '' } = useParams();
  const { t, formatDate } = useI18n();
  const navigate = useNavigate();
  const messages = useMessages(id);
  const removeHistory = useDeleteHistory();
  const removeMessage = useDeleteMessage(id);
  const runConfirmed = useConfirmedAction();

  return (
    <>
      <PageHeader
        title={t('Conversation')}
        description={<code className="text-xs">{id}</code>}
        actions={
          <>
            <Link to="/chats" className={buttonClasses()}>
              <ArrowLeft /> {t('Back')}
            </Link>
            <Button
              icon={<RefreshCw />}
              loading={messages.isFetching}
              onClick={() => void messages.refetch()}
            >
              {t('Refresh')}
            </Button>
            <Button
              variant="danger-outline"
              icon={<Trash2 />}
              onClick={() =>
                void runConfirmed({
                  title: t('Delete conversation?'),
                  description: t('All messages in this conversation will be deleted.'),
                  run: () => removeHistory.mutateAsync(id),
                  onDone: () => navigate('/chats'),
                })
              }
            >
              {t('Delete conversation')}
            </Button>
          </>
        }
      />
      <Card>
        <CardHeader title={t('Messages')} />
        <QueryView query={messages}>
          {(rows) => {
            if (!rows.length) {
              return (
                <EmptyState
                  title="No messages yet"
                  description="This conversation has no messages."
                />
              );
            }
            const sorted = oldest(rows, (message) => message.contact_time);
            const people = [...new Set(sorted.map((message) => message.contact_person ?? ''))];
            return (
              <ol className="space-y-3 p-5">
                {sorted.map((message, index) => (
                  <li
                    key={message.id ?? index}
                    className={cn(
                      'group rounded-2xl border px-4 py-3',
                      toneFor(message.contact_person ?? '', people),
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-[13px]">
                        {message.contact_person || t('Participant')}
                      </strong>
                      <div className="flex items-center gap-1">
                        <time className="text-xs text-muted">
                          {formatDate(message.contact_time)}
                        </time>
                        {message.id && (
                          <IconButton
                            label={t('Delete message')}
                            icon={<Trash2 />}
                            tone="danger"
                            className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
                            onClick={() =>
                              void runConfirmed({
                                title: t('Delete message?'),
                                run: () => removeMessage.mutateAsync(idOf(message)),
                              })
                            }
                          />
                        )}
                      </div>
                    </div>
                    <p className="mt-1 leading-relaxed whitespace-pre-wrap">
                      {message.content || '—'}
                    </p>
                  </li>
                ))}
              </ol>
            );
          }}
        </QueryView>
      </Card>
    </>
  );
}
