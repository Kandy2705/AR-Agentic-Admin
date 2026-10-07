import { ArrowLeft, MessageSquareReply, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useConfirmedAction } from '@/components/feedback/useConfirmedAction';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/button-styles';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DetailList } from '@/components/ui/DetailList';
import { IconButton } from '@/components/ui/IconButton';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, QueryView } from '@/components/ui/states';
import { useI18n } from '@/i18n/context';
import { idOf, newest } from '@/lib/utils';
import type { Answer, Question } from '@/types/api';
import { useAnswers, useCategories, useDeleteAnswer, useDeleteQuestion, useQuestion } from './api';
import { AnswerDialog, QuestionDialog } from './dialogs';

type Editing =
  { kind: 'question'; question: Question } | { kind: 'answer'; answer?: Answer } | null;

export default function QuestionDetailPage() {
  const { id = '' } = useParams();
  const { t, formatDate } = useI18n();
  const navigate = useNavigate();
  const question = useQuestion(id);
  const answers = useAnswers(id);
  const categories = useCategories();
  const deleteQuestion = useDeleteQuestion();
  const deleteAnswer = useDeleteAnswer(id);
  const runConfirmed = useConfirmedAction();
  const [editing, setEditing] = useState<Editing>(null);

  const categoryName = (categoryId: string | null) =>
    categories.data?.find((category) => category.id === categoryId)?.name ??
    categoryId ??
    t('Uncategorized');

  return (
    <>
      <PageHeader
        title={t('Question details')}
        description={t('Read the question and manage its answer thread.')}
        actions={
          <Link to="/questions" className={buttonClasses()}>
            <ArrowLeft /> {t('Back')}
          </Link>
        }
      />

      <QueryView query={question}>
        {(q) => (
          <Card>
            <CardHeader
              title={t('Content')}
              actions={<Badge tone="brand">{categoryName(q.categoryId)}</Badge>}
            />
            <CardBody className="space-y-6">
              <blockquote className="rounded-xl border-l-4 border-brand-400 bg-brand-50/50 px-5 py-4 text-[15px] leading-relaxed whitespace-pre-wrap">
                {q.content || '—'}
              </blockquote>
              <DetailList
                items={[
                  [t('Name'), q.name || '—'],
                  [t('Email'), q.email || '—'],
                  [t('Created'), formatDate(q.createDate)],
                  [t('User ID'), <code className="text-[13px]">{q.userId || '—'}</code>],
                ]}
              />
              <div className="flex flex-wrap gap-2 border-t border-line pt-5">
                <Button
                  icon={<Pencil />}
                  disabled={!categories.data}
                  onClick={() => setEditing({ kind: 'question', question: q })}
                >
                  {t('Edit question')}
                </Button>
                <Button
                  variant="danger-outline"
                  icon={<Trash2 />}
                  onClick={() =>
                    void runConfirmed({
                      title: t('Delete question?'),
                      run: () => deleteQuestion.mutateAsync(id),
                      onDone: () => navigate('/questions'),
                    })
                  }
                >
                  {t('Delete')}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </QueryView>

      <Card className="mt-6">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <MessageSquareReply className="size-5 text-brand-500" aria-hidden />
              {t('Answers')}
            </span>
          }
          actions={
            <Button
              variant="primary"
              icon={<Plus />}
              onClick={() => setEditing({ kind: 'answer' })}
            >
              {t('Add answer')}
            </Button>
          }
        />
        <QueryView query={answers}>
          {(rows) =>
            rows.length ? (
              <ul className="divide-y divide-line">
                {newest(rows, (a) => a.createDate).map((answer, index) => (
                  <li key={answer.id ?? index} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs text-muted">
                        {t('Created')}: {formatDate(answer.createDate)} · {t('Author ID')}:{' '}
                        <code>{answer.userId || '—'}</code>
                      </p>
                      {answer.id && (
                        <div className="flex shrink-0 gap-1">
                          <IconButton
                            label={t('Edit answer')}
                            icon={<Pencil />}
                            onClick={() => setEditing({ kind: 'answer', answer })}
                          />
                          <IconButton
                            label={t('Delete')}
                            icon={<Trash2 />}
                            tone="danger"
                            onClick={() =>
                              void runConfirmed({
                                title: t('Delete answer?'),
                                run: () => deleteAnswer.mutateAsync(idOf(answer)),
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 leading-relaxed whitespace-pre-wrap">
                      {answer.content || '—'}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No answers yet"
                description="Write the first answer to this question."
              />
            )
          }
        </QueryView>
      </Card>

      <Notice className="mt-6">
        {t(
          'The backend does not expose a workflow status for questions. No status is inferred or written by this portal.',
        )}
      </Notice>

      {editing?.kind === 'question' && categories.data && (
        <QuestionDialog
          question={editing.question}
          categories={categories.data}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === 'answer' && (
        <AnswerDialog questionId={id} answer={editing.answer} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
