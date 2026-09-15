import {useKeyboardShortcut} from '@/hooks/useEditPage';

/**
 * Ctrl/Cmd+S → save, the one platform shortcut that is expected on every
 * editing surface.
 *
 * Shortcut policy (see docs/modules/shared/engineering/keyboard-shortcuts.md):
 * - a shortcut belongs to the component that owns the action, not to a page, so
 *   declaration lives next to `onSave` (the shared EditPageHeader declares it,
 *   pages only implement `onSave`);
 * - it must be opt-in per surface (`enabled`), never a global window listener
 *   that fires on pages where nothing can be saved;
 * - the browser default (Save page dialog) is always suppressed while enabled.
 */
export function useSaveShortcut(onSave: () => void, options?: {enabled?: boolean}) {
  const enabled = options?.enabled ?? true;
  useKeyboardShortcut('ctrl+s', onSave, {enabled, preventDefault: true});
}
