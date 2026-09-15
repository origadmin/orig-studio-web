import { Spinner } from '@/components/ui/spinner';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const SettingsLayout = lazy(() => import('@/pages/settings/SettingsLayout'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh] bg-background text-foreground">
    <Spinner />
  </div>
);

export const Route = createFileRoute('/_authenticated/settings')({
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <SettingsLayout />
    </Suspense>
  ),
});