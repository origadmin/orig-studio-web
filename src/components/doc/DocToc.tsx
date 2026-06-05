/**
 * DocToc - Right-side Table of Contents for the Doc Layout.
 * Reads headings from DocTocContext and highlights the active one.
 * Only visible on xl+ screens. Hidden on article pages with no headings.
 *
 * Migrated to compose the shadcn NavigationMenu (vertical) primitive for
 * anchor links, keeping the existing public behaviour.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';
import { useDocTocContext } from '@/contexts/DocTocContext';

const DocToc: React.FC = () => {
  const { t } = useTranslation();
  const { headings, activeId } = useDocTocContext();

  if (headings.length === 0) {
    return null;
  }

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <aside className="hidden xl:block w-48 fixed top-12 right-0 bottom-0 overflow-y-auto py-6 px-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {t('doc.tocTitle')}
      </h4>
      <NavigationMenu orientation="vertical" className="max-w-full w-full justify-start">
        <NavigationMenuList className="flex-col items-stretch space-x-0 space-y-1">
          {headings.map((h) => (
            <NavigationMenuItem key={h.id}>
              <NavigationMenuLink
                asChild
                className={cn(
                  navigationMenuTriggerStyle(),
                  'w-full justify-start text-left text-sm font-normal',
                  h.level === 3 && 'pl-6',
                  activeId === h.id
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => handleClick(h.id)}
              >
                <button type="button" className="w-full text-left">
                  {h.text}
                </button>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </aside>
  );
};

export default DocToc;
