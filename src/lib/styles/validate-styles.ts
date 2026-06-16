/*
 * Style Validation Utility
 * 
 * Enforces design system compliance by validating class names in components.
 * 
 * Rules:
 * 1. All components must use predefined .c-xxx class names
 * 2. No inline Tailwind classes allowed on core components (button, card, input, etc.)
 * 3. Custom styles must be added via CSS in @layer components
 * 
 * Usage:
 *   import {validateStyles} from '@/lib/styles/validate-styles';
 *   validateStyles(componentName, className);
 */

const VALID_COMPONENT_CLASSES = new Set([
    // Button classes
    'c-button',
    'c-button--primary',
    'c-button--secondary',
    'c-button--outline',
    'c-button--ghost',
    'c-button--destructive',
    'c-button--small',
    'c-button--icon',
    'c-button--icon-small',
    'c-button--disabled',
    
    // Card classes
    'c-card',
    'c-card--hover',
    'c-card--elevated',
    'c-card__header',
    'c-card__body',
    'c-card__footer',
    
    // Input classes
    'c-input',
    'c-input--error',
    'c-input--disabled',
    
    // Select classes
    'c-select',
    
    // Table classes
    'c-table',
    'c-table__header',
    'c-table__head-cell',
    'c-table__body',
    'c-table__row',
    'c-table__cell',
    
    // Badge classes
    'c-badge',
    'c-badge--primary',
    'c-badge--success',
    'c-badge--warning',
    'c-badge--destructive',
    'c-badge--info',
    'c-badge--default',
    
    // Stat Card classes
    'c-stat-card',
    'c-stat-card__label',
    'c-stat-card__value',
    'c-stat-card__icon',
    'c-stat-card__icon--sky',
    'c-stat-card__icon--amber',
    'c-stat-card__icon--emerald',
    'c-stat-card__icon--red',
    
    // Page Layout classes
    'c-page',
    'c-page__header',
    'c-page__title',
    'c-page__description',
    
    // Filter Bar classes
    'c-filter-bar',
    
    // Modal classes
    'c-modal',
    'c-modal__backdrop',
    'c-modal__content',
    'c-modal__header',
    'c-modal__title',
    'c-modal__body',
    'c-modal__footer',
]);

const FORBIDDEN_TAILWIND_CLASSES = new Set([
    // Button-related forbidden classes
    'bg-indigo-600',
    'bg-slate-100',
    'bg-white',
    'bg-red-600',
    'text-white',
    'text-slate-700',
    'hover:bg-indigo-700',
    'hover:bg-slate-200',
    'hover:bg-slate-50',
    'border-slate-200',
    'h-9',
    'h-8',
    'px-4',
    'px-3',
    'py-2.5',
    'py-1.5',
    'rounded-lg',
    'text-sm',
    'font-medium',
    
    // Card-related forbidden classes
    'border',
    'shadow-sm',
    'shadow-md',
    'rounded-xl',
    
    // Input-related forbidden classes
    'focus:ring-2',
    'focus:ring-indigo-500/20',
    'focus:border-indigo-400',
]);

interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export function validateStyles(componentName: string, className?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!className || className.trim() === '') {
        return { isValid: true, errors, warnings };
    }
    
    const classes = className.split(/\s+/).filter(c => c.length > 0);
    
    for (const cls of classes) {
        // Check for forbidden Tailwind classes
        if (FORBIDDEN_TAILWIND_CLASSES.has(cls)) {
            errors.push(
                `[${componentName}] Forbidden Tailwind class "${cls}" - use .c-xxx component class instead`
            );
        }
        
        // Check if c-* class is valid
        if (cls.startsWith('c-') && !VALID_COMPONENT_CLASSES.has(cls)) {
            warnings.push(
                `[${componentName}] Unknown component class "${cls}" - check if it's defined in index.css`
            );
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

export function assertStyles(componentName: string, className?: string): void {
    const result = validateStyles(componentName, className);
    
    if (result.errors.length > 0) {
        console.error('Style Validation Failed:', result.errors);
        if (process.env.NODE_ENV === 'development') {
            throw new Error(`Style validation failed for ${componentName}: ${result.errors.join('; ')}`);
        }
    }
    
    if (result.warnings.length > 0) {
        console.warn('Style Validation Warnings:', result.warnings);
    }
}
