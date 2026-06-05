/**
 * MobileSidebarDrawer - Slide-out sidebar drawer for mobile devices.
 * Shows the same DocNavTree as the desktop sidebar.
 *
 * Migrated to compose the shadcn Sheet primitive (side="left") — the Sheet
 * content already includes a backdrop overlay and an animated close button,
 * so the manual backdrop + close X have been removed in favour of the
 * built-in SheetClose affordance.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '@/components/ui/spinner';
import { useDocCategoryTree } from '@/hooks/useDocNav';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import DocNavTree from './DocNavTree';

interface MobileSidebarDrawerProps {
  open: boolean;
  onClose: () => void;
}

const MobileSidebarDrawer: React.FC<MobileSidebarDrawerProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { data: tree, isLoading } = useDocCategoryTree();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="left"
        className="w-72 p-0 bg-sidebar text-sidebar-foreground"
      >
        <SheetHeader className="px-4 h-12 border-b flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-sm font-semibold">
            {t('doc.browseByCategory')}
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100%-3rem)] py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-5 w-5" />
            </div>
          ) : (
            <DocNavTree tree={tree ?? []} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileSidebarDrawer;
