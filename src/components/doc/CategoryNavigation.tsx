/**
 * CategoryNavigation - Full category navigation cards for the Doc Home page.
 * Shows all categories with article counts in a grid.
 *
 * Uses shadcn Card primitives (Card, CardHeader, CardTitle, CardDescription,
 * CardContent) for consistent card layout.
 */
import React from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { FileText, Folder, FolderOpen } from 'lucide-react';
import { useDocCategoryTree } from '@/hooks/useDocNav';
import { Spinner } from '@/components/ui/spinner';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

const CategoryNavigation: React.FC = () => {
  const { t } = useTranslation();
  const { data: tree, isLoading } = useDocCategoryTree();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  const categories = tree ?? [];

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold mb-4">{t('doc.browseByCategory')}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            {...{ to: "/categories/$slug", params: { slug: cat.slug } } as any}
            className="group block"
          >
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-primary/5">
              <CardHeader className="flex-row items-start gap-3 space-y-0 p-4">
                <FolderOpen size={20} className="text-primary shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm font-medium truncate">
                    {cat.name}
                  </CardTitle>
                  {cat.description && (
                    <CardDescription className="line-clamp-2 mt-0.5">
                      {cat.description}
                    </CardDescription>
                  )}
                </div>
              </CardHeader>
              {(cat.media_count !== undefined || cat.hasChildren) && (
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {cat.media_count !== undefined && (
                      <span className="flex items-center gap-1">
                        <FileText size={11} />
                        {cat.media_count} articles
                      </span>
                    )}
                    {cat.hasChildren && (
                      <span className="flex items-center gap-1">
                        <Folder size={11} />
                        {cat.descendantCount} subcategories
                      </span>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryNavigation;
