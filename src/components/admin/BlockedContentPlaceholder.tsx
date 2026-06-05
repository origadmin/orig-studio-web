/**
 * BlockedContentPlaceholder atom — uses the shadcn Empty primitive.
 */
import React from 'react';
import {ShieldOff} from 'lucide-react';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
} from '@/components/ui/empty';

export const BlockedContentPlaceholder: React.FC = React.memo(() => (
    <Empty className="border bg-muted/30 py-6">
        <EmptyHeader>
            <EmptyMedia variant="icon">
                <ShieldOff className="h-5 w-5"/>
            </EmptyMedia>
            <EmptyDescription className="italic">
                This comment has been blocked
            </EmptyDescription>
        </EmptyHeader>
    </Empty>
));

BlockedContentPlaceholder.displayName = 'BlockedContentPlaceholder';
