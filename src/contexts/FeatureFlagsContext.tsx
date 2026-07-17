import React, {createContext, useContext, useMemo} from 'react';
import {usePortalConfig} from '@/hooks/queries';

interface FeatureFlags {
    // Core video business features (primary focus)
    upload: boolean;
    transcoding: boolean;
    mediaBrowse: boolean;
    channels: boolean;
    categories: boolean;
    tags: boolean;
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
    // Secondary features (can be disabled to focus on core)
    articles: boolean;
    comments: boolean;
    playlists: boolean;
    users: boolean;
    permissions: boolean;
    notifications: boolean;
    analytics: boolean;
    pages: boolean;
    [key: string]: boolean;
}

// Core features are enabled by default and cannot be disabled
// (they represent the primary video business focus)
const coreFeatures = {
    upload: true,
    transcoding: true,
    mediaBrowse: true,
    channels: true,
    categories: true,
    tags: true,
};

const defaultFeatures: FeatureFlags = {
    ...coreFeatures,
    multiTenant: true,
    auditLog: true,
    advancedRBAC: true,
    reviewWorkflow: true,
    enterpriseNotification: true,
    drm: false,
    liveRooms: false,
    payment: false,
    promotion: false,
    ads: true,
    articles: false,
    comments: true,
    playlists: true,
    users: true,
    permissions: false,
    notifications: true,
    analytics: false,
    pages: true,
};

const FeatureFlagsContext = createContext<FeatureFlags>(defaultFeatures);

export const useFeatureFlag = (flag: string): boolean => {
    const flags = useContext(FeatureFlagsContext);
    return flags[flag] ?? false;
};

export const useFeatureFlags = (): FeatureFlags => {
    return useContext(FeatureFlagsContext);
};

// Check if a feature is a core feature (always enabled)
export const isCoreFeature = (flag: string): boolean => {
    return flag in coreFeatures;
};

export const FeatureFlagsProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const {data: config} = usePortalConfig();
    const features = useMemo<FeatureFlags>(() => {
        if (!config?.features) return defaultFeatures;
        // Core features are always enabled, cannot be overridden
        return {...defaultFeatures, ...config.features, ...coreFeatures};
    }, [config?.features]);

    return (
        <FeatureFlagsContext.Provider value={features}>
            {children}
        </FeatureFlagsContext.Provider>
    );
};
