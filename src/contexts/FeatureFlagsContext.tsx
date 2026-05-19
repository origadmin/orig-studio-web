import React, {createContext, useContext, useMemo} from 'react';
import {usePortalConfig} from '@/hooks/queries';

interface FeatureFlags {
    multiTenant: boolean;
    auditLog: boolean;
    advancedRBAC: boolean;
    reviewWorkflow: boolean;
    enterpriseNotification: boolean;
    [key: string]: boolean;
}

const defaultFeatures: FeatureFlags = {
    multiTenant: false,
    auditLog: false,
    advancedRBAC: false,
    reviewWorkflow: false,
    enterpriseNotification: false,
};

const FeatureFlagsContext = createContext<FeatureFlags>(defaultFeatures);

export const useFeatureFlag = (flag: string): boolean => {
    const flags = useContext(FeatureFlagsContext);
    return flags[flag] ?? false;
};

export const useFeatureFlags = (): FeatureFlags => {
    return useContext(FeatureFlagsContext);
};

export const FeatureFlagsProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const {data: config} = usePortalConfig();
    const features = useMemo<FeatureFlags>(() => {
        if (!config?.features) return defaultFeatures;
        return {...defaultFeatures, ...config.features};
    }, [config?.features]);

    return (
        <FeatureFlagsContext.Provider value={features}>
            {children}
        </FeatureFlagsContext.Provider>
    );
};
