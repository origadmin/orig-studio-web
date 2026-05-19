import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import PortalLayout from '@/layout/PortalLayout';
import DocPortalLayout from '@/layout/DocPortalLayout';
import { ModuleConfigProvider, useModuleState } from '@/contexts/ModuleConfigContext';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';

const LayoutSwitcher: React.FC = () => {
    const { layout } = useModuleState();

    if (layout === 'doc') {
        return <DocPortalLayout />;
    }

    return <PortalLayout />;
};

export const Route = createFileRoute('/_portal')({
    component: () => (
        <ModuleConfigProvider>
            <FeatureFlagsProvider>
                <LayoutSwitcher />
            </FeatureFlagsProvider>
        </ModuleConfigProvider>
    ),
});
