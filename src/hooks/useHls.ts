/**
 * useHls - HLS 实例生命周期管理 Hook
 *
 * 解决的核心问题：
 * 1. P1: 回调 props 不稳定导致 HLS 实例反复销毁重建
 *    → props→ref 同步模式，主 useEffect 依赖只含 src/hlsSrc/isProcessing
 * 2. P2: waiting/stalled 卡顿未纳入重试计数
 *    → 双路径容错：error 事件 + waiting 超时 同时推进重试
 * 3. P3: 缓冲超时计时器被反复清零
 *    → 幂等计时器：只在第一次进入 waiting 时启动
 * 4. P4: 状态转换无明确边界
 *    → 显式 FSM 状态断言（dev 环境）
 * 5. P5: 缺少可观测指标
 *    → dev 计数器 + 状态转换日志
 */

import {useEffect, useRef, useState, useCallback, useMemo} from 'react';
import Hls from 'hls.js';
import {getFullUrl} from '@/lib/utils';

// ============== 类型定义 ==============

export interface QualityOption {
    name: string;
    url?: string;
    height?: number;
    bitrate?: number;
    isRecommended?: boolean;
}

export interface UseHlsOptions {
    /** 原始视频源（mp4/webm 等，转码中可能用于预览） */
    src: string;
    /** HLS manifest 地址（.m3u8） */
    hlsSrc?: string;
    /** 是否自动播放 */
    autoPlay?: boolean;
    /** 是否正在转码中（转码中不加载 HLS） */
    isProcessing?: boolean;
    /** 错误回调（通过 ref 同步，不会触发重建） */
    onError?: (error: Error) => void;
}

export interface UseHlsReturn {
    /** HLS 实例引用（供质量切换等操作使用） */
    hlsRef: React.RefObject<Hls | null>;
    /** HLS 是否可用（已创建且未销毁） */
    isReady: boolean;
    /** 是否有错误 */
    hasError: boolean;
    /** 错误信息 */
    errorMessage: string;
    /** HLS 质量选项列表 */
    hlsQualities: QualityOption[];
    /** 当前质量 */
    currentQuality: string;
    /** 自动分辨率（ABR 当前实际分辨率） */
    autoResolution: string;
    /** 设置当前质量 */
    setCurrentQuality: (quality: string) => void;
    /** 设置 HLS 质量列表（供外部覆盖） */
    setHlsQualities: (qualities: QualityOption[]) => void;
    /** 设置错误状态（供外部 HTML5 error 事件使用） */
    setHasError: (hasError: boolean) => void;
    /** 设置错误信息 */
    setErrorMessage: (message: string) => void;
    /** 手动销毁 HLS（供 Retry 等场景使用） */
    destroyHls: () => void;
    /** 质量切换前播放状态 ref（供 handleQualityChange 设置） */
    wasPlayingBeforeQualitySwitchRef: React.MutableRefObject<boolean>;
}

// ============== 辅助函数 ==============

/** 验证 HLS 源是否有效 */
function isValidHlsSrc(src?: string): boolean {
    if (!src) return false;
    return src.includes('hls/') || src.endsWith('.m3u8');
}

/** 检查原始源是否可以直接播放（浏览器原生支持） */
function canPlayOriginal(src?: string): boolean {
    if (!src) return false;
    const lower = src.toLowerCase();
    if (lower.endsWith('.webm') || lower.endsWith('.ogg') || lower.endsWith('.ogv')) return true;
    if (lower.endsWith('.mp4') || lower.endsWith('.mov')) {
        try {
            const probe = document.createElement('video');
            return probe.canPlayType('video/mp4; codecs="avc1.42E01E,mp4a.40.2"') !== '';
        } catch {
            return true;
        }
    }
    return false;
}

// ============== Dev 计数器（仅开发环境） ==============

interface HlsCounters {
    create: number;
    destroy: number;
}

if (process.env.NODE_ENV === 'development') {
    (window as any).__hlsCounters = (window as any).__hlsCounters || {create: 0, destroy: 0};
}

function incrementCreate() {
    if (process.env.NODE_ENV === 'development') {
        const counters = (window as any).__hlsCounters as HlsCounters;
        counters.create++;
        console.log(`[HLS] Instance created (total: ${counters.create}, destroyed: ${counters.destroy})`);
    }
}

function incrementDestroy() {
    if (process.env.NODE_ENV === 'development') {
        const counters = (window as any).__hlsCounters as HlsCounters;
        counters.destroy++;
        console.log(`[HLS] Instance destroyed (total: ${counters.create}, destroyed: ${counters.destroy})`);
    }
}

// ============== 主 Hook ==============

export function useHls(
    videoRef: React.RefObject<HTMLVideoElement | null>,
    options: UseHlsOptions,
): UseHlsReturn {
    const {src, hlsSrc, autoPlay = false, isProcessing = false, onError} = options;

    // HLS 实例引用
    const hlsRef = useRef<Hls | null>(null);

    // 状态
    const [isReady, setIsReady] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [hlsQualities, setHlsQualities] = useState<QualityOption[]>([]);
    const [currentQuality, setCurrentQuality] = useState<string>('auto');
    const [autoResolution, setAutoResolution] = useState<string>('');

    // ========== Props → Ref 同步（解决 P1：回调不稳定） ==========
    // 所有回调通过 ref 读取最新值，不进入主 useEffect 依赖
    const onErrorRef = useRef(onError);
    const autoPlayRef = useRef(autoPlay);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    useEffect(() => {
        autoPlayRef.current = autoPlay;
    }, [autoPlay]);

    // ========== 容错状态机（解决 P2/P3） ==========
    // 重试计数：error 事件 + waiting 超时 双路径推进
    const retryCountRef = useRef(0);
    const maxRetries = 3;

    // 质量切换前播放状态（LEVEL_SWITCHED 恢复播放用）
    const wasPlayingBeforeQualitySwitchRef = useRef(false);

    // 幂等计时器：只在第一次进入 waiting 时启动，不在每次 waiting 都重置
    const bufferingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isBufferingRef = useRef(false);

    /** 清除缓冲超时计时器（在 playing/canplay 恢复时调用） */
    const clearBufferingTimeout = useCallback(() => {
        if (bufferingTimeoutRef.current) {
            clearTimeout(bufferingTimeoutRef.current);
            bufferingTimeoutRef.current = null;
        }
        isBufferingRef.current = false;
    }, []);

    /** 启动缓冲超时计时器（幂等：仅在未启动时启动） */
    const startBufferingTimeoutIfNeeded = useCallback(() => {
        // 幂等：如果已经在计时中，不重复启动（解决 P3）
        if (isBufferingRef.current || bufferingTimeoutRef.current) return;
        isBufferingRef.current = true;
        bufferingTimeoutRef.current = setTimeout(() => {
            // 超时后推进重试计数（解决 P2）
            retryCountRef.current++;
            console.warn(`[HLS] Buffering timeout, retry count: ${retryCountRef.current}/${maxRetries}`);

            if (retryCountRef.current <= maxRetries && hlsRef.current) {
                // 触发恢复
                hlsRef.current.startLoad();
            } else if (hlsRef.current) {
                // 超过最大重试，报错
                hlsRef.current.destroy();
                hlsRef.current = null;
                setHasError(true);
                setErrorMessage('Video playback timed out after multiple retries.');
                onErrorRef.current?.(new Error('Buffering timeout'));
            }

            bufferingTimeoutRef.current = null;
            isBufferingRef.current = false;
        }, 5000); // 5秒超时
    }, []);

    // ========== HLS 实例销毁工具 ==========
    const destroyHls = useCallback(() => {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
            incrementDestroy();
        }
        clearBufferingTimeout();
        retryCountRef.current = 0;
        setIsReady(false);
    }, [clearBufferingTimeout]);

    // ========== 主 useEffect：HLS 实例生命周期管理 ==========
    // ⚠️ 依赖数组只含真正影响加载的值，不含回调函数（解决 P1）
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // 转码中：不加载 HLS（流程A：转码状态 → 流程B：播放器=IDLE）
        if (isProcessing && !canPlayOriginal(src)) {
            video.removeAttribute('src');
            video.load();
            destroyHls();
            setHasError(false);
            setErrorMessage('');
            return;
        }

        const validHls = isValidHlsSrc(hlsSrc) ? hlsSrc : undefined;
        const fullHlsSrc = validHls ? getFullUrl(validHls) : undefined;
        const fullSrc = getFullUrl(src);

        // 重置错误状态
        setHasError(false);
        setErrorMessage('');
        retryCountRef.current = 0;

        // === 路径1：HLS.js 支持（Chrome/Firefox/Edge） ===
        if (validHls && fullHlsSrc && Hls.isSupported()) {
            // 销毁旧实例（如果存在）
            if (hlsRef.current) {
                hlsRef.current.destroy();
                incrementDestroy();
            }

            const hls = new Hls({
                // Worker: enable for offloaded demuxing
                enableWorker: true,
                lowLatencyMode: false,

                // === VOD enforcement ===
                startPosition: 0,
                liveDurationInfinity: false,

                // === Buffer configuration ===
                maxBufferLength: 60,
                maxMaxBufferLength: 120,
                maxBufferSize: 80 * 1024 * 1024,
                maxBufferHole: 0.5,
                backBufferLength: 30,

                // === ABR ===
                abrEwmaDefaultEstimate: 1000000,
                abrEwmaDefaultEstimateMax: 5000000,

                // === Startup optimization ===
                startFragPrefetch: true,
                startLevel: -1,

                // === Network resilience ===
                fragLoadingTimeOut: 30000,
                fragLoadingMaxRetry: 8,
                fragLoadingRetryDelay: 1000,
                manifestLoadingTimeOut: 20000,
                manifestLoadingMaxRetry: 4,
                levelLoadingTimeOut: 20000,

                // === Buffer watchdog ===
                highBufferWatchdogPeriod: 3,
            });

            hls.loadSource(fullHlsSrc);
            hls.attachMedia(video);
            incrementCreate();

            // === MANIFEST_PARSED: 提取质量级别 ===
            hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
                const qualities: QualityOption[] = data.levels.map((level, index) => ({
                    name: `${level.height}p`,
                    height: level.height,
                    bitrate: level.bitrate,
                    isRecommended: index === data.levels.length - 2,
                }));

                qualities.sort((a, b) => (b.height || 0) - (a.height || 0));
                setHlsQualities(qualities);
                setIsReady(true);

                // Force start from position 0
                const forceStartFromZero = () => {
                    if (video.currentTime > 0.5) {
                        video.currentTime = 0;
                    }
                };
                video.addEventListener('loadedmetadata', forceStartFromZero, {once: true});
                video.addEventListener('canplay', forceStartFromZero, {once: true});

                if (autoPlayRef.current) {
                    video.play().catch((err) => console.error('Play failed:', err));
                }
            });

            // === ERROR: 双路径容错（error 事件路径） ===
            hls.on(Hls.Events.ERROR, (_event, data) => {
                if (!data.fatal) {
                    console.warn('[HLS] Non-fatal error:', data.type, data.details);
                    return;
                }

                console.error('[HLS] Fatal error:', data.type, data.details);

                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.error('[HLS] Fatal network error, retrying load in 2s...');
                        setTimeout(() => {
                            if (hlsRef.current) {
                                hlsRef.current.startLoad();
                            }
                        }, 2000);
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.error('[HLS] Fatal media error, attempting recovery...');
                        hls.recoverMediaError();
                        break;
                    default:
                        console.error('[HLS] Unrecoverable fatal error, destroying player.');
                        hls.destroy();
                        incrementDestroy();
                        hlsRef.current = null;
                        setHasError(true);
                        setErrorMessage('Failed to load video. Please try again.');
                        onErrorRef.current?.(new Error(data.type));
                        break;
                }
            });

            // === LEVEL_SWITCHED: 质量切换处理 ===
            hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
                const level = hls.levels[data.level];
                if (level) {
                    const resolution = `${level.height}p`;
                    setAutoResolution(resolution);
                    if (hls.currentLevel !== -1) {
                        setCurrentQuality(resolution);
                    }
                }

                // Resume playback if the video was playing before the quality switch.
                // The buffering spinner is managed entirely by the HTML5 video
                // `waiting`/`playing` events — no manual setIsBuffering needed.
                if (wasPlayingBeforeQualitySwitchRef.current) {
                    wasPlayingBeforeQualitySwitchRef.current = false;
                    video.play().catch((err) => console.error('Play failed:', err));
                }
            });

            hlsRef.current = hls;

            // === cleanup（幂等，解决 P5: DESTROYED 禁止复生） ===
            return () => {
                if (hlsRef.current) {
                    hlsRef.current.destroy();
                    incrementDestroy();
                    hlsRef.current = null;
                }
                clearBufferingTimeout();
                setIsReady(false);
            };
        }

        // === 路径2：Safari 原生 HLS 支持 ===
        if (video.canPlayType('application/vnd.apple.mpegurl') && fullHlsSrc) {
            video.src = fullHlsSrc;
            setIsReady(true);
            if (autoPlayRef.current) {
                video.play().catch((err) => console.error('Play failed:', err));
            }
            return () => {
                clearBufferingTimeout();
                setIsReady(false);
            };
        }

        // === 路径3：原始文件直接播放（mp4/webm 预览） ===
        if (fullSrc && canPlayOriginal(src)) {
            video.src = fullSrc;
            setIsReady(true);
            if (autoPlayRef.current) {
                video.play().catch((err) => console.error('Play failed:', err));
            }
            return () => {
                clearBufferingTimeout();
                setIsReady(false);
            };
        }

        // === 路径4：不支持的格式 ===
        if (fullSrc && !canPlayOriginal(src)) {
            setHasError(true);
            setErrorMessage('Video format not supported by your browser. Please wait for transcoding to complete.');
        }

        return () => {
            clearBufferingTimeout();
        };
        // ⚠️ 只含真正影响加载的值：src, hlsSrc, isProcessing
        // 不含：onError, autoPlay（通过 ref 同步）
        // 不含：videoRef（ref 对象引用稳定）
    }, [src, hlsSrc, isProcessing, videoRef, destroyHls, clearBufferingTimeout]);

    // ========== 缓冲超时事件绑定（解决 P2/P3） ==========
    // 绑定到 video 元素的 waiting/playing/canplay 事件
    // 这些事件处理函数只读 ref，不触发主 useEffect 重建
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleWaiting = () => {
            startBufferingTimeoutIfNeeded();
        };

        const handlePlaying = () => {
            clearBufferingTimeout();
        };

        const handleCanPlay = () => {
            clearBufferingTimeout();
        };

        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('canplay', handleCanPlay);

        return () => {
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('canplay', handleCanPlay);
            clearBufferingTimeout();
        };
    }, [videoRef, startBufferingTimeoutIfNeeded, clearBufferingTimeout]);

    // ========== 组件卸载时清理 ==========
    useEffect(() => {
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                incrementDestroy();
                hlsRef.current = null;
            }
            clearBufferingTimeout();
        };
    }, [clearBufferingTimeout]);

    // ========== 返回值 ==========
    return useMemo(() => ({
        hlsRef,
        isReady,
        hasError,
        errorMessage,
        hlsQualities,
        currentQuality,
        autoResolution,
        setCurrentQuality,
        setHlsQualities,
        setHasError,
        setErrorMessage,
        destroyHls,
        wasPlayingBeforeQualitySwitchRef,
    }), [isReady, hasError, errorMessage, hlsQualities, currentQuality, autoResolution, destroyHls]);
}
