import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/button-styles';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/states';
import { useI18n } from '@/i18n/context';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <Card>
      <EmptyState
        title="Page not found"
        description="The page you requested does not exist."
        action={
          <Link to="/dashboard" className={buttonClasses('primary')}>
            <ArrowLeft /> {t('Dashboard')}
          </Link>
        }
      />
    </Card>
  );
}
