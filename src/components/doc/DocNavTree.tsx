/**
 * DocNavTree - Renders the category navigation tree for the DocSidebar.
 * Uses DocNavTreeNode recursively.
 *
 * Migrated to compose the shadcn SidebarMenu primitives (SidebarMenu,
 * SidebarMenuItem) for layout consistency with the new Sidebar primitive.
 */
import React from 'react';
import { useLocation } from '@tanstack/react-router';
import type { CategoryTreeNode } from '@/lib/utils/categoryTree';
import {
  SidebarMenu,
} from '@/components/ui/sidebar';
import DocNavTreeNode from './DocNavTreeNode';

interface DocNavTreeProps {
  tree: CategoryTreeNode[];
}

const DocNavTree: React.FC<DocNavTreeProps> = ({ tree }) => {
  const location = useLocation();

  // Extract current article slug from URL
  const currentSlug = location.pathname.startsWith('/articles/')
    ? location.pathname.replace('/articles/', '')
    : undefined;

  if (tree.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        No categories available
      </div>
    );
  }

  return (
    <nav role="tree" aria-label="Documentation navigation">
      <SidebarMenu>
        {tree.map((node) => (
          <DocNavTreeNode
            key={node.id}
            node={node}
            currentSlug={currentSlug}
          />
        ))}
      </SidebarMenu>
    </nav>
  );
};

export default DocNavTree;
