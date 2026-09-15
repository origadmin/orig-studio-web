import {useEffect, useRef, useState} from 'react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Pencil} from 'lucide-react';
import {cn} from '@/lib/utils';

export interface EditableHeadingProps {
  value: string;
  onChange: (value: string) => void;
  /** Shown when the value is empty. */
  placeholder?: string;
  /** Size/weight classes for the heading text (and the input while editing). */
  className?: string;
  ariaLabel?: string;
  /** Tooltip / aria label of the pencil affordance. */
  editLabel?: string;
  disabled?: boolean;
}

/**
 * Heading that renders the title as plain TEXT with an explicit pencil button.
 *
 * Why not an always-on transparent <Input> (the previous pattern): clicking
 * anywhere in the title entered edit mode and the caret landed mid-text, which
 * reads as "the title is a text box", not as a heading. Here the input only
 * appears after the pencil is pressed; Enter/blur commits, Escape cancels.
 */
export function EditableHeading({
  value,
  onChange,
  placeholder,
  className,
  ariaLabel,
  editLabel,
  disabled,
}: EditableHeadingProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the draft in sync when the value changes from outside (e.g. reload).
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const start = () => {
    if (disabled) return;
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value);
  };

  if (!editing) {
    const empty = !value;
    return (
      <span className="inline-flex items-center gap-2 min-w-0 flex-1">
        <span
          className={cn('truncate', empty && 'text-muted-foreground/50', className)}
          title={value || placeholder}
        >
          {value || placeholder}
        </span>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={start}
            className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={editLabel || ariaLabel}
            title={editLabel}
          >
            <Pencil className="h-4 w-4"/>
          </Button>
        )}
      </span>
    );
  }

  return (
    <Input
      ref={inputRef}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
        }
      }}
      onBlur={commit}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={cn(
        'border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring px-0 h-auto py-0 bg-transparent placeholder:text-muted-foreground/50 flex-1 min-w-0',
        className
      )}
    />
  );
}

export default EditableHeading;
