/**
 * CascadingStatusHint atom — shows amber Badge when an ancestor is disabled.
 * Uses the shadcn Alert variant "warning" for visual consistency.
 */
import React from 'react';
import {useTranslation} from 'react-i18next';
import {AlertTriangle} from 'lucide-react';
import {Alert, AlertDescription} from '@/components/ui/alert';

export interface CascadingStatusHintProps {
    isAncestorDisabled: boolean;
}

export const CascadingStatusHint: React.FC<CascadingStatusHintProps> = React.memo(
    ({isAncestorDisabled}) => {
        const {t} = useTranslation();

        if (!isAncestorDisabled) return null;

        return (
            <Alert variant="warning" className="py-2 px-3">
                <AlertTriangle className="h-3.5 w-3.5"/>
                <AlertDescription className="text-xs">
                    {t('admin.parentDisabled')}
                </AlertDescription>
            </Alert>
        );
    },
);

CascadingStatusHint.displayName = 'CascadingStatusHint';
