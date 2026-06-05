/**
 * DocNavTreeNode - Recursive tree node for the documentation sidebar.
 * Renders a category with expand/collapse, and its child articles.
 *
 * Migrated to compose the shadcn Collapsible primitive for expand/collapse
 * while keeping the public export signature (React.FC) and behaviour.
 */
import React from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { ChevronRight, FolderOpen, Folder } from 'lucide-react';
import type { CategoryTreeNode } from '@/lib/utils/categoryTree';
import { useDocCategoryArticles } from '@/hooks/useDocNav';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface DocNavTreeNodeProps {
  node: CategoryTreeNode;
  currentSlug?: string;
}

const DocNavTreeNode: React.FC<DocNavTreeNodeProps> = ({ node, currentSlug }) => {
  const location = useLocation();

  // Lazy-load articles when expanding
  const [open, setOpen] = React.useState(false);
  const { data: articlesData } = useDocCategoryArticles(open ? node.id : undefined);
  const articles = articlesData?.items ?? [];

  const isCategoryActive = location.pathname.includes(`/categories/${node.slug}`);
  const hasChildren = node.hasChildren || articles.length > 0;

  if (!hasChildren) {
    return (
      <li role="treeitem">
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
            isCategoryActive
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-accent'
          )}
          style={{ paddingLeft: `${node.depth * 12 + 12}px` }}
        >
          <span className="w-4 shrink-0" />
          <Link
            {...{ to: '/categories/$slug', params: { slug: node.slug } } as any}
            className="flex items-center gap-1.5 flex-1 min-w-0"
          >
            <Folder size={14} className="shrink-0 text-muted-foreground" />
            <span className="truncate">{node.name}</span>
          </Link>
        </div>
      </li>
    );
  }

  return (
    <li role="treeitem">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors',
              isCategoryActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent'
            )}
            style={{ paddingLeft: `${node.depth * 12 + 12}px` }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(!open);
              }}
              className="shrink-0 w-4 h-4 flex items-center justify-center"
              aria-label={open ? 'Collapse' : 'Expand'}
            >
              <ChevronRight
                size={14}
                className={cn('transition-transform', open && 'rotate-90')}
              />
            </button>
            <Link
              {...{ to: '/categories/$slug', params: { slug: node.slug } } as any}
              className="flex items-center gap-1.5 flex-1 min-w-0"
              onClick={(e) => e.stopPropagation()}
            >
              {open ? (
                <FolderOpen size={14} className="shrink-0 text-muted-foreground" />
              ) : (
                <Folder size={14} className="shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{node.name}</span>
            </Link>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {articles.length > 0 && (
            <ul role="group" className="space-y-0.5">
              {articles.map((article) => {
                const isArticleActive = currentSlug === article.slug;
                return (
                  <li key={article.id} role="treeitem">
                    <Link
                      to="/articles/$slug"
                      params={{ slug: article.slug }}
                      className={cn(
                        'block px-3 py-1 rounded-md text-sm transition-colors',
                        isArticleActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent'
                      )}
                      style={{ paddingLeft: `${(node.depth + 1) * 12 + 12}px` }}
                    >
                      {article.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {node.children.length > 0 && (
            <ul role="group" className="space-y-0.5">
              {node.children.map((child) => (
                <DocNavTreeNode
                  key={child.id}
                  node={child}
                  currentSlug={currentSlug}
                />
              ))}
            </ul>
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
};

export default DocNavTreeNode;
