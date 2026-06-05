/**
 * RecentlyUpdated - List of recently updated articles for the Doc Home page.
 * Shows the latest 5 articles with title, time, and summary.
 *
 * Migrated to compose the shadcn Card primitive (Card, CardHeader, CardContent)
 * + Item primitive for a list-style card.
 */
import React from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Clock, FileText } from 'lucide-react';
import { useDocLatestArticles } from '@/hooks/useDocNav';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Item, ItemContent, ItemTitle, ItemDescription, ItemMedia } from '@/components/ui/item';
import { formatDate } from '@/lib/format';

const RecentlyUpdated: React.FC = () => {
  const { t } = useTranslation();
  const { data: articles, isLoading } = useDocLatestArticles(5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  const items = articles ?? [];

  if (items.length === 0) {
    return (
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">{t('doc.recentlyUpdated')}</h2>
        <Card>
          <CardContent className="py-10 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('doc.noArticles')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('doc.noArticlesDesc')}</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold mb-4">{t('doc.recentlyUpdated')}</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('doc.recentlyUpdated')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((article) => (
            <Link
              key={article.id}
              to="/articles/$slug"
              params={{ slug: article.slug }}
              className="block"
            >
              <Item variant="ghost" size="default" className="hover:bg-muted/50">
                <ItemMedia>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="line-clamp-2">{article.title}</ItemTitle>
                  {article.summary && (
                    <ItemDescription>{article.summary}</ItemDescription>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Clock size={12} />
                    <span>{formatDate(article.update_time || article.create_time)}</span>
                  </div>
                </ItemContent>
              </Item>
            </Link>
          ))}
        </CardContent>
      </Card>
    </section>
  );
};

export default RecentlyUpdated;
