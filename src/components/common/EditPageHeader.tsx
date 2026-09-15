import {memo, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {ArrowLeft, Save, Play, MoreHorizontal, Trash2, CheckCircle, XCircle, Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {StatusDot, type StatusDotStatus} from '@/components/common/StatusDot';
import {useMediaQuery} from '@/hooks/useMediaQuery';
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

export interface EditPageHeaderProps {
  title: string;
  isDirty: boolean;
  isSaving: boolean;
  saveState: SaveState;
  onBack: () => void;
  onSave: () => void;
  onPreview?: () => void;
  onDelete: () => void;
  badges: HeaderBadgeConfig[];
  encodingStatus?: EncodingStatusConfig;
  /** When provided, the title renders as an inline editable input (BUG-135, mirrors admin's title-in-h1 pattern). */
  editableTitle?: string;
  onTitleChange?: (value: string) => void;
  /**
   * Page-level identity rendered as a small line ABOVE the media title, so the
   * user can tell which page they are on (the media title alone does not say
   * "you are editing"). Mirrors the admin page's breadcrumb row.
   */
  pageTitle?: string;
  /** Optional breadcrumb tail for the identity line, e.g. the list it came from. */
  breadcrumb?: string;
}

const BADGE_PRIORITY: Record<HeaderBadgeConfig['type'], number> = {
  'state': 0,
  'media-type': 1,
  'featured': 3,
  'custom': 2,
};

const BackNavigation = memo(function BackNavigation({onBack}: { onBack: () => void }) {
  const {t} = useTranslation();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onBack}
      aria-label={t('mediaEdit.backAria')}
    >
      <ArrowLeft className="w-4 h-4"/>
      <span className="hidden sm:inline">{t('mediaEdit.back')}</span>
    </Button>
  );
});

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

const TitleWithBadges = memo(function TitleWithBadges({
  title,
  isDirty,
  badges,
  encodingStatus,
  maxBadges,
  showEncodingStatus,
  editableTitle,
  onTitleChange,
}: {
  title: string;
  isDirty: boolean;
  badges: HeaderBadgeConfig[];
  encodingStatus?: EncodingStatusConfig;
  maxBadges: number;
  showEncodingStatus: boolean;
  editableTitle?: string;
  onTitleChange?: (value: string) => void;
}) {
  const {t} = useTranslation();
  const sortedBadges = useMemo(() =>
    badges
      .filter(b => b.visible !== false)
      .sort((a, b) => BADGE_PRIORITY[a.type] - BADGE_PRIORITY[b.type]),
    [badges]
  );

  const visibleBadges = maxBadges < sortedBadges.length
    ? sortedBadges.slice(0, maxBadges)
    : sortedBadges;
  const overflowBadges = maxBadges < sortedBadges.length
    ? sortedBadges.slice(maxBadges)
    : [];
  const overflowCount = overflowBadges.length;

  return (
    <div className="flex items-center gap-2 min-w-0">
      {editableTitle !== undefined && onTitleChange ? (
        <Input
          value={editableTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t('mediaEdit.unnamedMedia')}
          aria-label={t('mediaEdit.titleAria')}
          className="text-lg font-bold tracking-tight border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring px-0 h-auto py-0 bg-transparent placeholder:text-muted-foreground/50 flex-1 min-w-0"
        />
      ) : (
        <h1 className="text-lg font-bold tracking-tight truncate">
          {title || t('mediaEdit.unnamedMedia')}
          {isDirty && <DirtyIndicator/>}
        </h1>
      )}
      {(visibleBadges.length > 0 || (showEncodingStatus && encodingStatus) || overflowCount > 0) && (
        <div className="flex items-center gap-1.5 shrink-0">
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
            const typeColors: Record<string, string> = {
              'media-type': 'bg-primary/10 text-primary',
              'featured': 'bg-warning/10 text-warning border border-warning/30',
              'custom': badge.pillClass || 'bg-muted text-muted-foreground',
            };
            const colorClass = typeColors[badge.type] || typeColors['custom'];
            return (
              <span
                key={badge.type}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
                  colorClass,
                  badge.className
                )}
                aria-label={badge.ariaLabel}
              >
                {badge.label}
              </span>
            );
          })}
          {showEncodingStatus && encodingStatus && (
            <StatusDot
              status={encodingStatus.status}
              label={encodingStatus.label}
            />
          )}
          {overflowCount > 0 && (
            <BadgeOverflow count={overflowCount} items={overflowBadges}/>
          )}
        </div>
      )}
    </div>
  );
});

function SaveButtonIcon({saveState}: { saveState: SaveState }) {
  switch (saveState) {
    case 'saving':
      return <Loader2 className="w-4 h-4 animate-spin"/>;
    case 'success':
      return <CheckCircle className="w-4 h-4 text-success"/>;
    case 'error':
      return <XCircle className="w-4 h-4 text-destructive"/>;
    default:
      return <Save className="w-4 h-4"/>;
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

const HeaderActions = memo(function HeaderActions({
  saveState,
  isDirty,
  onBack,
  onSave,
  onPreview,
  onDelete,
  hasPreview,
}: {
  saveState: SaveState;
  isDirty: boolean;
  onBack: () => void;
  onSave: () => void;
  onPreview?: () => void;
  onDelete: () => void;
  hasPreview: boolean;
}) {
  const {t} = useTranslation();
  const isSaving = saveState === 'saving';
  const saveDisabled = isSaving;

  return (
    // Order mirrors the admin media header: 返回 / 预览 / 保存 (primary last), so
    // the two pages read the same even though the admin header is its own impl.
    <div className="flex items-center gap-2 shrink-0">
      <BackNavigation onBack={onBack}/>

      {hasPreview && onPreview && (
        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="hidden sm:inline-flex"
          aria-label={t('mediaEdit.previewAria')}
        >
          <Play className="w-4 h-4"/>
          <span className="hidden md:inline">{t('mediaEdit.preview')}</span>
        </Button>
      )}

      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              onClick={onSave}
              disabled={saveDisabled}
              className={cn(isDirty && saveState === 'idle' && 'ring-2 ring-primary/30')}
              aria-label={t('mediaEdit.saveAria')}
            >
              <SaveButtonIcon saveState={saveState}/>
              <span className="hidden md:inline">{getSaveButtonText(saveState, t)}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Ctrl+S</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label={t('mediaEdit.moreActionsAria')}>
            <MoreHorizontal className="w-4 h-4"/>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {hasPreview && onPreview && (
            <>
              <DropdownMenuItem onClick={onPreview} className="sm:hidden">
                <Play className="w-4 h-4 mr-2"/>
                {t('mediaEdit.preview')}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="sm:hidden"/>
            </>
          )}
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
            aria-label={t('mediaEdit.deleteAria')}
          >
            <Trash2 className="w-4 h-4 mr-2"/>
            {t('common.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

export function EditPageHeader({
  title,
  isDirty,
  isSaving: _isSaving,
  saveState,
  onBack,
  onSave,
  onPreview,
  onDelete,
  badges,
  encodingStatus,
  editableTitle,
  onTitleChange,
  pageTitle,
  breadcrumb,
}: EditPageHeaderProps) {
  const isSm = useMediaQuery('(min-width: 640px)');
  const isLg = useMediaQuery('(min-width: 1024px)');

  const maxBadges = useMemo(() => {
    if (isLg) return Infinity;
    if (isSm) return 2;
    return 1;
  }, [isSm, isLg]);

  const showEncodingStatus = isSm;

  return (
    <div
      className="sticky top-14 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 px-8 py-2 min-h-12 sm:min-h-14"
    >
      <div className="h-full flex items-center justify-between gap-4">
        {/* Left: page identity line + media title. The identity line answers
            "which page am I on" — the media title alone does not. The back
            control lives with the actions on the right (mirrors admin). */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          {(pageTitle || breadcrumb) && (
            <div className="text-xs text-muted-foreground truncate leading-5">
              {pageTitle && <span className="font-medium">{pageTitle}</span>}
              {pageTitle && breadcrumb && <span className="px-1 opacity-60">·</span>}
              {breadcrumb}
            </div>
          )}
          <TitleWithBadges
            title={title}
            isDirty={isDirty}
            badges={badges}
            encodingStatus={encodingStatus}
            maxBadges={maxBadges}
            showEncodingStatus={showEncodingStatus}
            editableTitle={editableTitle}
            onTitleChange={onTitleChange}
          />
        </div>
        <HeaderActions
          saveState={saveState}
          isDirty={isDirty}
          onBack={onBack}
          onSave={onSave}
          onPreview={onPreview}
          onDelete={onDelete}
          hasPreview={!!onPreview}
        />
      </div>
    </div>
  );
}
