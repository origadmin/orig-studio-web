import {useState, useEffect, useMemo, useCallback} from 'react';
import {useLocation} from '@tanstack/react-router';
import {useAuth} from '@/hooks/useAuth';
import {channelApi, type ChannelDetail, type ChannelQueryParams} from '@/lib/api/channel';

interface UseChannelOptions {
    enabled?: boolean;
}

interface UseChannelReturn {
    channel: ChannelDetail | null;
    loading: boolean;
    error: string | null;
    isOwner: boolean;
    isFromMeChannel: boolean;
    refetch: () => void;
}

/**
 * useChannel Hook v4.0 (F019)
 *
 * 支持多种路由来源:
 * - /c/{token}            → 路径参数方式 (getByToken)
 * - /@{handle}            → Handle resolution (resolveHandle)
 * - /me/channel           → 当前用户频道 (getMyChannel)
 *
 * 注意: /channel/{id} 路由已删除（2026-08-07 URL 规范统一），
 * 频道唯一 canonical path 为 /c/{id}。
 */
const useChannel = (options: UseChannelOptions = {}): UseChannelReturn => {
    const {enabled = true} = options;

    const location = useLocation();
    const pathname = location.pathname;

    let handle: string | undefined;
    let token: string | undefined;
    let id: string | undefined;

    if (pathname.startsWith('/@')) {
        handle = pathname.slice(2);
    } else if (pathname.startsWith('/c/')) {
        token = pathname.slice(3);
    }

    const {user, isAuthenticated} = useAuth();

    const [channel, setChannel] = useState<ChannelDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isFromMeChannel = useMemo(() => {
        return !handle && !token && !id;
    }, [handle, token, id]);

    const fetchChannel = useCallback(async () => {
        if (!enabled) return;

        let isMounted = true;

        try {
            setLoading(true);
            setError(null);

            let ch: ChannelDetail | null = null;

            if (token) {
                // Mode 1: 路径参数方式 (RESTful, 推荐)
                const res = await channelApi.getByToken(token);
                ch = res.channel;
            } else if (handle) {
                // Mode 2: @handle resolution (F019: uses resolveHandle API)
                const res = await channelApi.resolveHandle(handle);
                const resolution = (res as any).resolution ?? res;
                if (resolution.type === 1 || resolution.type === 'channel') {
                    ch = resolution.channel as ChannelDetail | null;
                }
            } else if (isAuthenticated) {
                // Mode 3: 我的频道
                const res = await channelApi.getMyChannel();
                ch = res.channel;
            } else {
                if (isMounted) {
                    setError('请先登录');
                    return;
                }
            }

            if (isMounted) {
                setChannel(ch);
            }
        } catch (err: any) {
            console.error('Failed to fetch channel:', err);
            if (isMounted) {
                setError(err.message || '加载频道失败');
            }
        } finally {
            if (isMounted) {
                setLoading(false);
            }
        }

        return () => {
            isMounted = false;
        };
    }, [token, handle, isAuthenticated, enabled]);

    useEffect(() => {
        fetchChannel();
    }, [fetchChannel]);

    const isOwner = useMemo(() => {
        if (!user || !channel) return false;

        if (isFromMeChannel) return true;

        return String(user.id) === String(channel.user_id);
    }, [user, channel, isFromMeChannel]);

    return {
        channel,
        loading,
        error,
        isOwner,
        isFromMeChannel,
        refetch: fetchChannel,
    };
};

export default useChannel;
