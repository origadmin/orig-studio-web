/**
 * Breadcrumb - Breadcrumb navigation for article pages.
 * Shows: Home > Category > Article Title
 *
 * Now composes the shadcn Breadcrumb primitive (BreadcrumbList, BreadcrumbItem,
 * BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator) for consistent styling.
 */
import React from 'react';
import { Link } from '@tanstack/react-router';
import { Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface BreadcrumbItem {
  label: string;
  to?: string;
  params?: Record<string, string>;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const { t } = useTranslation();

  return (
    <BreadcrumbRoot className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="flex items-center gap-1">
              <Home size={14} />
              <span className="hidden sm:inline">{t('nav.home')}</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.to ? (
                <BreadcrumbLink asChild>
                  <Link
                    to={item.to}
                    params={item.params}
                    className="truncate max-w-[200px]"
                  >
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate max-w-[200px]">
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </BreadcrumbRoot>
  );
};

export default Breadcrumb;
