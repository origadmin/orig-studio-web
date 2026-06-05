/**
 * QuickStartGrid - Grid of category cards for quick access.
 * Shows up to 8 categories in a 2x4 grid.
 *
 * Migrated to compose the shadcn Card primitive (Card, CardHeader,
 * CardTitle, CardDescription) for a consistent card surface.
 */
import React from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Folder } from 'lucide-react';
import { useDocCategoryTree } from '@/hooks/useDocNav';
import { Spinner } from '@/components/ui/spinner';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

const QuickStartGrid: React.FC = () => {
  const { t } = useTranslation();
  const { data: tree, isLoading } = useDocCategoryTree();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  const categories = (tree ?? []).slice(0, 8);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold mb-4">{t('doc.quickStart')}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            {...{ to: '/categories/$slug', params: { slug: cat.slug } } as any}
            className="group block"
          >
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-primary/5">
              <CardHeader className="flex-row items-center gap-3 space-y-0 p-4">
                <Folder size={20} className="text-primary shrink-0" />
                <CardTitle className="text-sm font-medium truncate">
                  {cat.name}
                </CardTitle>
              </CardHeader>
              {cat.media_count !== undefined && cat.media_count > 0 && (
                <CardContent className="px-4 pb-4 pt-0">
                  <CardDescription>
                    {cat.media_count} articles
                  </CardDescription>
                </CardContent>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default QuickStartGrid;
