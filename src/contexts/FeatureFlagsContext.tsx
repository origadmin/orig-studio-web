import React, {createContext, useContext, useMemo} from 'react';
import {usePortalConfig} from '@/hooks/queries';

interface FeatureFlags {
    // CE features (always available)
    multiTenant: boolean;
    auditLog: boolean;
    advancedRBAC: boolean;
    reviewWorkflow: boolean;
    enterpriseNotification: boolean;
    // EE features (controlled by feature flags)
    drm: boolean;
    liveRooms: boolean;
    payment: boolean;
    promotion: boolean;
    ads: boolean;
    [key: string]: boolean;
}

const defaultFeatures: FeatureFlags = {
    multiTenant: true,
    auditLog: true,
    advancedRBAC: true,
    reviewWorkflow: true,
    enterpriseNotification: true,
    drm: true,
    liveRooms: true,
    payment: true,
    promotion: true,
    ads: true,
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
