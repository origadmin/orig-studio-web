/**
 * PrevNextNav - Previous/Next article navigation at the bottom of article pages.
 * Shows links to the previous and next articles in the same category.
 *
 * Migrated to compose the shadcn Pagination primitive (PaginationPrevious +
 * PaginationNext) for consistent styling. Public prop signature preserved.
 *
 * Note: shadcn's PaginationPrevious/Next render their own chevron and
 * "Previous"/"Next" label, which act as the "Previous Article" / "Next Article"
 * label the previous implementation rendered manually. We forward the article
 * title as the children node so the design system primitives are still the
 * source of truth for the icon and label colour.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pagination, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';

interface PrevNextNavProps {
  prev?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
}

const PrevNextNav: React.FC<PrevNextNavProps> = ({ prev, next }) => {
  const { t } = useTranslation();

  if (!prev && !next) return null;

  return (
    <nav
      aria-label={t('doc.tocTitle') /* generic landmark label */}
      className="pt-8 mt-8 border-t"
    >
      <Pagination className="justify-between gap-4 w-full">
        {prev ? (
          <PaginationPrevious
            href={`/articles/${prev.slug}`}
            className="text-sm font-normal min-w-0 flex-1 justify-start"
          >
            <span className="truncate max-w-[200px]">{prev.title}</span>
          </PaginationPrevious>
        ) : (
          <span className="flex-1" />
        )}

        {next ? (
          <PaginationNext
            href={`/articles/${next.slug}`}
            className="text-sm font-normal min-w-0 flex-1 justify-end"
          >
            <span className="truncate max-w-[200px]">{next.title}</span>
          </PaginationNext>
        ) : (
          <span className="flex-1" />
        )}
      </Pagination>
    </nav>
  );
};

export default PrevNextNav;
