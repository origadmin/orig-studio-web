import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';

export interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  isDeleting: boolean;
  onConfirm: () => void;
  /** Custom description text. Defaults to delete-specific message. */
  description?: string;
  /** Custom confirm button label. Defaults to "确认删除". */
  confirmLabel?: string;
  /** Confirm button variant. Defaults to "destructive". */
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /** Loading state label. Defaults to "删除中...". */
  loadingLabel?: string;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  isDeleting,
  onConfirm,
  description,
  confirmLabel,
  confirmVariant,
  loadingLabel,
}: DeleteConfirmDialogProps) {
  const {t} = useTranslation();
  const isCustomDialog = !!(description || confirmLabel);
  const variant = confirmVariant || (isCustomDialog ? 'default' : 'destructive');
  const confirmText = confirmLabel || t('deleteConfirm.title');
  const loadingText = loadingLabel || (isCustomDialog ? t('deleteConfirm.processing') : t('deleteConfirm.deleting'));
  const descText = description || t('deleteConfirm.deleteDesc', {title});

  return (
    <AlertDialog open={open} onOpenChange={isDeleting ? undefined : onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isCustomDialog ? title : t('deleteConfirm.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {descText}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? loadingText : confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
