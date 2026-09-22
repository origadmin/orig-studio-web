import {Fragment, memo, useMemo, type ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import {Link} from '@tanstack/react-router';
import {ArrowLeft, Save, CheckCircle, XCircle, Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {StatusDot, type StatusDotStatus} from '@/components/common/StatusDot';
import {EditableHeading} from '@/components/common/EditableHeading';
import {useMediaQuery} from '@/hooks/useMediaQuery';
import {useSaveShortcut} from '@/hooks/useSaveShortcut';
import {cn} from '@/lib/utils';

export type SaveState = 'idle' | 'saving' | 'success' | 'error';

export interface HeaderBadgeConfig {
  type: 'media-type' | 'state' | 'featured' | 'custom';
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  statusDot?: StatusDotStatus;
  pillClass?: string;
  label: string;
  ariaLabel: string;
  className?: string;
  visible?: boolean;
}

export interface EncodingStatusConfig {
  status: StatusDotStatus;
  label?: string;
  ariaLabel?: string;
}

export interface BreadcrumbEntry {
  label: string;
  /** Omit for the trailing (current) crumb. */
  to?: string;
}

export interface EditPageHeaderProps {
  title: string;
  isDirty: boolean;
  isSaving: boolean;
  saveState: SaveState;
  onBack: () => void;
  onSave: () => void;
  badges: HeaderBadgeConfig[];
  encodingStatus?: EncodingStatusConfig;
  /** Editable media title — rendered as text + pencil (see EditableHeading). */
  editableTitle?: string;
  onTitleChange?: (value: string) => void;
  /** Breadcrumb trail above the title (same structure as the admin page). */
  breadcrumbItems?: BreadcrumbEntry[];
  /** Leading icon of the title row (e.g. the media-type icon). */
  icon?: ReactNode;
  /** Muted description next to the badges, as on the admin page. */
  subtitle?: string;
}

const BADGE_PRIORITY: Record<HeaderBadgeConfig['type'], number> = {
  'state': 0,
  'media-type': 1,
  'featured': 3,
  'custom': 2,
};

function SaveButtonIcon({saveState}: { saveState: SaveState }) {
  switch (saveState) {
    case 'saving':
      return <Loader2 className="w-4 h-4 mr-2 animate-spin"/>;
    case 'success':
      return <CheckCircle className="w-4 h-4 mr-2 text-success"/>;
    case 'error':
      return <XCircle className="w-4 h-4 mr-2 text-destructive"/>;
    default:
      return <Save className="w-4 h-4 mr-2"/>;
  }
}

function getSaveButtonText(saveState: SaveState, t: (key: string) => string): string {
  switch (saveState) {
    case 'saving':
      return t('mediaEdit.saving');
    case 'success':
      return t('mediaEdit.saved');
    case 'error':
      return t('mediaEdit.saveFailed');
    default:
      return t('common.save');
  }
}

function DirtyIndicator() {
  const {t} = useTranslation();
  return (
    <span className="text-primary" aria-label={t('mediaEdit.dirtyAria')}>*</span>
  );
}

function BadgeOverflow({count, items}: { count: number; items: HeaderBadgeConfig[] }) {
  const {t} = useTranslation();
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="text-xs cursor-default"
            aria-label={t('mediaEdit.moreBadges', {count})}
          >
            +{count}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="flex flex-col gap-1">
            {items.map((badge) => (
              <span key={badge.type} className="text-xs">
                {badge.label}
              </span>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const HeaderActions = memo(function HeaderActions({
  saveState,
  isDirty,
  onBack,
  onSave,
}: {
  saveState: SaveState;
  isDirty: boolean;
  onBack: () => void;
  onSave: () => void;
}) {
  const {t} = useTranslation();
  const saveDisabled = saveState === 'saving';

  return (
    // 返回 / 保存 (primary last) — matches the admin media header, which has
    // neither a preview button nor an overflow menu. The portal's "预览" opened
    // the same URL as 返回 (redundant), and the "⋯" menu held only a delete
    // (the admin keeps delete in the page body, not the header). Both removed.
    <div className="flex items-center gap-2 shrink-0">
      <Button variant="outline" onClick={onBack} aria-label={t('mediaEdit.backAria')}>
        <ArrowLeft className="w-4 h-4 mr-2"/>
        {t('common.back')}
      </Button>

      {/* Same button as the admin media header: icon (carrying mr-2) + label,
          default variant, no tooltip wrapper. Ctrl+S is bound by the header
          itself (see useSaveShortcut below) so every page using this header
          gets the shortcut without wiring it again. */}
      <Button
        onClick={onSave}
        disabled={saveDisabled}
        className={cn(isDirty && saveState === 'idle' && 'ring-2 ring-primary/30')}
        aria-label={t('mediaEdit.saveAria')}
        title="Ctrl+S"
      >
        <SaveButtonIcon saveState={saveState}/>
        {getSaveButtonText(saveState, t)}
      </Button>
    </div>
  );
});

export function EditPageHeader({
  title,
  isDirty,
  saveState,
  onBack,
  onSave,
  badges,
  encodingStatus,
  editableTitle,
  onTitleChange,
  breadcrumbItems,
  icon,
  subtitle,
}: EditPageHeaderProps) {
  const {t} = useTranslation();
  const isSm = useMediaQuery('(min-width: 640px)');
  const isLg = useMediaQuery('(min-width: 1024px)');

  const maxBadges = useMemo(() => {
    if (isLg) return Infinity;
    if (isSm) return 2;
    return 1;
  }, [isSm, isLg]);

  const sortedBadges = useMemo(() =>
    badges
      .filter(b => b.visible !== false)
      .sort((a, b) => BADGE_PRIORITY[a.type] - BADGE_PRIORITY[b.type]),
    [badges]
  );
  const visibleBadges = maxBadges < sortedBadges.length ? sortedBadges.slice(0, maxBadges) : sortedBadges;
  const overflowBadges = maxBadges < sortedBadges.length ? sortedBadges.slice(maxBadges) : [];

  // The shared header owns Ctrl+S: pages only implement onSave.
  useSaveShortcut(onSave, {enabled: saveState !== 'saving'});

  const typeColors: Record<string, string> = {
    'media-type': 'bg-primary/10 text-primary',
    'featured': 'bg-warning/10 text-warning border border-warning/30',
    'custom': 'bg-muted text-muted-foreground',
  };

  return (
    // Same markup + classes as the admin media page header: breadcrumb row,
    // then icon + 3xl title with the actions on the right, then a badge /
    // description row. Copying the admin structure is what keeps the two pages
    // from drifting apart (the portal used to have its own sticky strip).
    <header>
      {breadcrumbItems && breadcrumbItems.length > 0 && (
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            {breadcrumbItems.map((item, i) => (
              <Fragment key={`${item.label}-${i}`}>
                {i > 0 && <BreadcrumbSeparator/>}
                <BreadcrumbItem>
                  {item.to ? (
                    <BreadcrumbLink asChild>
                      <Link to={item.to}>{item.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex justify-between items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            {icon && (
              <span className="h-8 w-8 shrink-0 flex items-center justify-center text-sky-600">
                {icon}
              </span>
            )}
            {editableTitle !== undefined && onTitleChange ? (
              <EditableHeading
                value={editableTitle}
                onChange={onTitleChange}
                placeholder={t('mediaEdit.unnamedMedia')}
                ariaLabel={t('mediaEdit.titleAria')}
                editLabel={t('mediaEdit.editTitle', '修改标题')}
                className="text-3xl font-bold tracking-tight"
              />
            ) : (
              <span className="truncate">
                {title || t('mediaEdit.unnamedMedia')}
                {isDirty && <DirtyIndicator/>}
              </span>
            )}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 shrink-0">
              {visibleBadges.map((badge) => {
                if (badge.statusDot) {
                  return (
                    <StatusDot
                      key={badge.type}
                      status={badge.statusDot}
                      label={badge.label}
                      className={badge.className}
                    />
                  );
                }
                const colorClass = typeColors[badge.type] || typeColors['custom'];
                return (
                  <span
                    key={badge.type}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0',
                      colorClass,
                      badge.className
                    )}
                    aria-label={badge.ariaLabel}
                  >
                    {badge.label}
                  </span>
                );
              })}
              {isSm && encodingStatus && (
                <StatusDot status={encodingStatus.status} label={encodingStatus.label}/>
              )}
              {overflowBadges.length > 0 && (
                <BadgeOverflow count={overflowBadges.length} items={overflowBadges}/>
              )}
            </span>
            {subtitle && (
              <>
                <span className="h-4 w-px bg-border shrink-0 hidden sm:block"/>
                <p className="text-sm text-muted-foreground min-w-0 flex-1">{subtitle}</p>
              </>
            )}
          </div>
        </div>

        <HeaderActions
          saveState={saveState}
          isDirty={isDirty}
          onBack={onBack}
          onSave={onSave}
        />
      </div>
    </header>
  );
}

export default EditPageHeader;
