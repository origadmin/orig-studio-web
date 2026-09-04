import React, {useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle} from 'react';
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    SkipBack, SkipForward, Settings, Subtitles, PictureInPicture,
    MonitorPlay, AlertCircle, X, SkipForward as NextIcon
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {formatDuration} from '@/lib/format';
import {getFullUrl} from '@/lib/utils';
import {usePlayerSettings} from '@/hooks/usePlayerSettings';
import {useHls, type QualityOption} from '@/hooks/useHls';
import {useTranslation} from 'react-i18next';
import SpritePreview from './SpritePreview';

export interface VideoPlayerHandle {
    play: () => void;
    pause: () => void;
    seek: (time: number) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
}

export interface NextVideoInfo {
    title: string;
    thumbnail: string;
    channelName?: string;
    duration?: number;
}

interface VideoPlayerProps {
    src: string;
    hlsSrc?: string;
    poster?: string;
    autoPlay?: boolean;
    onTimeUpdate?: (time: number) => void;
    onPlay?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
    onError?: (error: Error) => void;
    className?: string;
    qualities?: QualityOption[];
    subtitles?: Array<{ label: string; src: string; language: string }>;
    hasAudioTracks?: boolean;
    isPlaying?: boolean;
    currentTime?: number;
    onPlayingChange?: (playing: boolean) => void;
    onTimeChange?: (time: number) => void;
    onAutoPlayNext?: () => void;
    /** Controlled auto-play next flag. When provided, overrides the internal player setting. */
    autoPlayNext?: boolean;
    /** Information about the next video to show in the YouTube-style autoplay countdown overlay. */
    nextVideo?: NextVideoInfo | null;
    /** When true, the video is still being processed (transcoding) and
     *  should not attempt playback. Shows a processing overlay instead. */
    isProcessing?: boolean;
    /** WebVTT sprite sheet URL for progress bar hover preview */
    spriteVttUrl?: string;
    /** Signed sprite sheet image URL (BUG-286); overrides the VTT's unsigned reference */
    spriteImageUrl?: string;
    /** Whether to enable sprite preview on progress bar hover (default: true) */
    enableSpritePreview?: boolean;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(({
                                                                             src,
                                                                             hlsSrc,
                                                                             poster,
                                                                             autoPlay = false,
                                                                             onTimeUpdate,
                                                                             onPlay,
                                                                             onPause,
                                                                             onEnded,
                                                                             onError,
                                                                             className = '',
                                                                             qualities: externalQualities,
                                                                             subtitles,
                                                                             hasAudioTracks = false,
                                                                             // 受控模式
                                                                             isPlaying: controlledIsPlaying,
                                                                             currentTime: controlledCurrentTime,
                                                                             onPlayingChange,
                                                                             onTimeChange,
                                                                             onAutoPlayNext,
                                                                             autoPlayNext: controlledAutoPlayNext,
                                                                             nextVideo,
                                                                             isProcessing = false,
                                                                            spriteVttUrl,
                                                                            spriteImageUrl,
                                                                            enableSpritePreview = true,
                                                                         }, ref) => {

    const {t} = useTranslation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const settingsMenuRef = useRef<HTMLDivElement>(null);
    const lastClickTimeRef = useRef<number>(0);
    const centerOverlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ========== HLS 实例生命周期管理（通过 useHls Hook） ==========
    // 解决 P1-P5：回调不触发重建、双路径容错、幂等计时器、状态边界、可观测
    const {
        hlsRef,
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
    } = useHls(videoRef, {
        src,
        hlsSrc,
        autoPlay,
        isProcessing,
        onError,
    });

    // 状态管理
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [showPlaybackMenu, setShowPlaybackMenu] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [buffered, setBuffered] = useState(0);
    const [showCenterOverlay, setShowCenterOverlay] = useState(false);
    const [centerOverlayIcon, setCenterOverlayIcon] = useState<'play' | 'pause'>('play');

    // Sprite preview state
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverRatio, setHoverRatio] = useState<number>(0);
    const [progressBarRect, setProgressBarRect] = useState<DOMRect | null>(null);
    const [playerRect, setPlayerRect] = useState<DOMRect | null>(null);
    const spriteRafRef = useRef<number>(0);
    const isDraggingProgress = useRef(false);
    const [isBuffering, setIsBuffering] = useState(false);

    // Autoplay countdown (YouTube-style)
    const [showAutoplayCountdown, setShowAutoplayCountdown] = useState(false);
    const [autoplayCountdown, setAutoplayCountdown] = useState(5);
    const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Subtitle state
    const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
    const [currentSubtitle, setCurrentSubtitle] = useState<string>('off');
    const [activeCue, setActiveCue] = useState<string>('');

    // Use global player settings
    const {
        volume,
        isMuted,
        playbackRate,
        autoPlayNext: internalAutoPlayNext,
        setVolume,
        setIsMuted,
        setPlaybackRate,
    } = usePlayerSettings();

    // When parent provides controlledAutoPlayNext, use it; otherwise fall back to internal setting
    const autoPlayNext = controlledAutoPlayNext !== undefined ? controlledAutoPlayNext : internalAutoPlayNext;

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
        play: () => {
            videoRef.current?.play();
        },
        pause: () => {
            videoRef.current?.pause();
        },
        seek: (time: number) => {
            if (videoRef.current) {
                videoRef.current.currentTime = time;
                setCurrentTime(time);
            }
        },
        getCurrentTime: () => videoRef.current?.currentTime || 0,
        getDuration: () => videoRef.current?.duration || 0,
    }));

    // 合并外部和 HLS 质量选项
    const allQualities = useMemo(() => {
        if (externalQualities && externalQualities.length > 0) {
            return externalQualities;
        }
        if (hlsQualities.length > 0) {
            return hlsQualities;
        }
        return [];
    }, [externalQualities, hlsQualities]);

    // 检测功能是否可用
    const hasSubtitles = useMemo(() => subtitles && subtitles.length > 0, [subtitles]);
    const hasQualityOptions = useMemo(() => allQualities.length > 0, [allQualities]);
    const supportsPiP = useMemo(() => typeof document !== 'undefined' && 'pictureInPictureEnabled' in document, []);
    const supportsFullscreen = useMemo(() => typeof document !== 'undefined' && !!document.fullscreenEnabled, []);

    // NOTE: HLS 实例生命周期管理已迁移到 useHls Hook
    // - isValidHlsSrc / canPlayOriginal → useHls 内部辅助函数
    // - HLS useEffect → useHls 主 useEffect
    // - 依赖数组只含 src/hlsSrc/isProcessing，回调通过 ref 同步
    // - 双路径容错（error + waiting 超时）、幂等计时器在 useHls 内实现

    // Apply global settings to video element
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        video.volume = volume;
        video.muted = isMuted;
        video.playbackRate = playbackRate;
    }, [volume, isMuted, playbackRate]);

    // Sync controlled state
    useEffect(() => {
        if (controlledIsPlaying !== undefined) {
            setIsPlaying(controlledIsPlaying);
        }
    }, [controlledIsPlaying]);

    useEffect(() => {
        if (controlledCurrentTime !== undefined && videoRef.current) {
            const diff = Math.abs(videoRef.current.currentTime - controlledCurrentTime);
            if (diff > 0.5) { // Only seek if difference is significant
                videoRef.current.currentTime = controlledCurrentTime;
            }
        }
    }, [controlledCurrentTime]);

    // Click outside to close menu
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
                setShowSettingsMenu(false);
                setShowPlaybackMenu(false);
                setShowSubtitleMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Show center overlay icon
    const showCenterIcon = useCallback((icon: 'play' | 'pause') => {
        setCenterOverlayIcon(icon);
        setShowCenterOverlay(true);

        if (centerOverlayTimeoutRef.current) {
            clearTimeout(centerOverlayTimeoutRef.current);
        }

        centerOverlayTimeoutRef.current = setTimeout(() => {
            setShowCenterOverlay(false);
        }, 1500);
    }, []);

    // ========== 基础操作函数 (必须在 handleVideoClick 之前定义) ==========

    // Play/Pause toggle
    // Read video.paused directly instead of relying on the React `isPlaying`
    // state.  `isPlaying` is captured in the useCallback closure and can be
    // stale when the user clicks rapidly — the state update from the previous
    // click may not have re-rendered yet, causing every click to take the same
    // branch (e.g. always play, never pause).  The DOM property `paused` is
    // always in sync with the actual playback state.
    const togglePlay = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            try {
                await video.play();
            } catch (err) {
                console.error('Play error:', err);
            }
        } else {
            video.pause();
        }
    }, []);

    // Mute toggle
    const toggleMute = useCallback(() => {
        if (!videoRef.current) return;
        const newMuted = !isMuted;
        videoRef.current.muted = newMuted;
        setIsMuted(newMuted);
        if (!newMuted && volume === 0) {
            videoRef.current.volume = 0.5;
            setVolume(0.5);
        }
    }, [isMuted, volume, setIsMuted, setVolume]);

    // Fullscreen toggle
    const toggleFullscreen = useCallback(async () => {
        if (!containerRef.current || !supportsFullscreen) return;

        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (err) {
            console.log('Fullscreen error:', err);
        }
    }, [supportsFullscreen]);

    // Picture-in-Picture
    const togglePiP = useCallback(async () => {
        if (!videoRef.current || !supportsPiP) return;

        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (err) {
            console.log('PiP error:', err);
        }
    }, [supportsPiP]);

    // ========== 复合交互函数 (依赖上面的基础函数) ==========

    // Handle single click for play/pause and double click for fullscreen
    const handleVideoClick = useCallback((e: React.MouseEvent<HTMLVideoElement>) => {
        e.preventDefault();

        const now = Date.now();
        const timeDiff = now - lastClickTimeRef.current;

        if (timeDiff < 300) {
            // Double click - toggle fullscreen
            toggleFullscreen();
            lastClickTimeRef.current = 0;
        } else {
            // Single click - toggle play/pause
            lastClickTimeRef.current = now;
            // Read video.paused directly to determine the correct icon.
            // Using the `isPlaying` state here would show the wrong icon on
            // rapid clicks because the React state update hasn't re-rendered yet.
            const video = videoRef.current;
            const wasPaused = video ? video.paused : true;
            togglePlay();
            // After toggle: if it was paused, we're now playing → show 'play' icon
            // (meaning "play action just happened"); if it was playing, we're now
            // paused → show 'pause' icon (meaning "pause action just happened").
            showCenterIcon(wasPaused ? 'play' : 'pause');
        }
    }, [togglePlay, toggleFullscreen, showCenterIcon]);

    // Handle video events
    const handleTimeUpdate = useCallback(() => {
        if (!videoRef.current) return;
        const time = videoRef.current.currentTime;
        setCurrentTime(time);
        onTimeUpdate?.(time);
        onTimeChange?.(time);

        // Update buffered progress — only update state when the change is
        // significant (>1%) to avoid excessive re-renders on every timeUpdate tick
        if (videoRef.current.buffered.length > 0) {
            const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
            const duration = videoRef.current.duration;
            if (duration > 0) {
                const newBuffered = bufferedEnd / duration;
                setBuffered(prev => {
                    // Skip update if change is less than 1% to reduce re-renders
                    if (Math.abs(newBuffered - prev) < 0.01) return prev;
                    return newBuffered;
                });
            }
        }
    }, [onTimeUpdate, onTimeChange]);

    const handleLoadedMetadata = useCallback(() => {
        if (!videoRef.current) return;
        const d = videoRef.current.duration;
        if (d && isFinite(d)) {
            setDuration(d);
        }
    }, []);

    const handleDurationChange = useCallback(() => {
        if (!videoRef.current) return;
        const d = videoRef.current.duration;
        if (d && isFinite(d)) {
            setDuration(d);
        }
    }, []);

    const handleEnded = useCallback(() => {
        setIsPlaying(false);
        onPlayingChange?.(false);
        onEnded?.();
        // YouTube-style autoplay: show countdown overlay instead of navigating immediately.
        // The overlay lets the user cancel or see what's coming next.
        if (autoPlayNext && nextVideo) {
            setAutoplayCountdown(5);
            setShowAutoplayCountdown(true);
        }
    }, [onPlayingChange, onEnded, autoPlayNext, nextVideo]);

    // Autoplay countdown timer
    useEffect(() => {
        if (!showAutoplayCountdown) {
            if (autoplayTimerRef.current) {
                clearInterval(autoplayTimerRef.current);
                autoplayTimerRef.current = null;
            }
            return;
        }
        autoplayTimerRef.current = setInterval(() => {
            setAutoplayCountdown(prev => {
                if (prev <= 1) {
                    // Countdown finished — trigger auto-play next
                    if (autoplayTimerRef.current) {
                        clearInterval(autoplayTimerRef.current);
                        autoplayTimerRef.current = null;
                    }
                    setShowAutoplayCountdown(false);
                    onAutoPlayNext?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => {
            if (autoplayTimerRef.current) {
                clearInterval(autoplayTimerRef.current);
                autoplayTimerRef.current = null;
            }
        };
    }, [showAutoplayCountdown, onAutoPlayNext]);

    const cancelAutoplay = useCallback(() => {
        setShowAutoplayCountdown(false);
        setAutoplayCountdown(5);
    }, []);

    const playNow = useCallback(() => {
        setShowAutoplayCountdown(false);
        setAutoplayCountdown(5);
        onAutoPlayNext?.();
    }, [onAutoPlayNext]);

    const handleWaiting = useCallback(() => {
        setIsBuffering(true);
    }, []);

    const handlePlaying = useCallback(() => {
        setIsBuffering(false);
    }, []);

    const handleCanPlay = useCallback(() => {
        setIsBuffering(false);
    }, []);

    const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;
        const error = video.error;
        setHasError(true);
        setErrorMessage(error ? `Video error: ${error.message}` : 'Failed to load video');
        onError?.(new Error(errorMessage));
    }, [onError, errorMessage]);

    // Seek
    const getProgressRatio = useCallback((clientX: number, bar: DOMRect) => {
        return Math.max(0, Math.min(1, (clientX - bar.left) / bar.width));
    }, []);

    const handleProgressMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!enableSpritePreview) return;
        const bar = e.currentTarget.getBoundingClientRect();
        const clientX = e.clientX;

        if (spriteRafRef.current) cancelAnimationFrame(spriteRafRef.current);

        spriteRafRef.current = requestAnimationFrame(() => {
            const ratio = getProgressRatio(clientX, bar);
            setHoverRatio(ratio);
            setHoverTime(ratio * duration);
            setProgressBarRect(bar);
            setPlayerRect(containerRef.current?.getBoundingClientRect() ?? bar);
        });
    }, [enableSpritePreview, duration, getProgressRatio]);

    const handleProgressMouseLeave = useCallback(() => {
        if (spriteRafRef.current) cancelAnimationFrame(spriteRafRef.current);
        setHoverTime(null);
    }, []);

    const handleProgressPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!videoRef.current || !duration) return;
        isDraggingProgress.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        const bar = e.currentTarget.getBoundingClientRect();
        const ratio = getProgressRatio(e.clientX, bar);
        const seekTime = ratio * duration;
        videoRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
        onTimeChange?.(seekTime);
    }, [duration, onTimeChange, getProgressRatio]);

    const handleProgressPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingProgress.current || !videoRef.current || !duration) return;
        const bar = e.currentTarget.getBoundingClientRect();
        const ratio = getProgressRatio(e.clientX, bar);
        const seekTime = ratio * duration;
        videoRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
        onTimeChange?.(seekTime);
    }, [duration, onTimeChange, getProgressRatio]);

    const handleProgressPointerUp = useCallback(() => {
        isDraggingProgress.current = false;
    }, []);

    // Volume
    const handleVolumeChange = useCallback((value: number[]) => {
        if (!videoRef.current) return;
        const newVolume = value[0];
        videoRef.current.volume = newVolume;
        setVolume(newVolume);
    }, [setVolume]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Playback speed
    const handlePlaybackRateChange = useCallback((rate: number) => {
        if (!videoRef.current) return;
        videoRef.current.playbackRate = rate;
        setPlaybackRate(rate);
        setShowPlaybackMenu(false);
    }, [setPlaybackRate]);

    // Quality selection with smooth switching
    const handleQualityChange = useCallback((quality: string) => {
        if (!hlsRef.current) {
            setCurrentQuality(quality);
            setShowSettingsMenu(false);
            return;
        }

        // Read video.paused directly instead of the `isPlaying` state to avoid
        // stale closure values.
        const video = videoRef.current;
        wasPlayingBeforeQualitySwitchRef.current = video ? !video.paused : false;
        // Do NOT manually set setIsBuffering(true) here.  The HTML5 video
        // element's `waiting`/`playing` events naturally manage the buffering
        // spinner.  If the quality switch causes a stall, `waiting` fires and
        // the spinner appears; when playback resumes, `playing` fires and the
        // spinner disappears.  If the switch is seamless (no stall), no
        // spinner should appear at all — this matches YouTube's behavior.

        if (quality === 'auto') {
            hlsRef.current.currentLevel = -1;
            setCurrentQuality('auto');
        } else {
            const height = parseInt(quality.replace('p', ''), 10);
            const levelIndex = hlsRef.current.levels.findIndex(level => level.height === height);

            if (levelIndex !== -1) {
                hlsRef.current.currentLevel = levelIndex;
                setCurrentQuality(quality);
            }
        }

        setShowSettingsMenu(false);
    }, []);

    // Skip forward/backward
    const skip = useCallback((seconds: number) => {
        if (!videoRef.current) return;
        const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        onTimeChange?.(newTime);
    }, [duration, onTimeChange]);

    // Controls visibility with improved logic
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    }, [isPlaying]);

    const hideControlsImmediately = useCallback(() => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (isPlaying) {
            setShowControls(false);
        }
    }, [isPlaying]);

    useEffect(() => {
        const handleMouseMove = () => {
            showControlsTemporarily();
        };

        const handleMouseLeave = () => {
            hideControlsImmediately();
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('mousemove', handleMouseMove);
            container.addEventListener('mouseleave', handleMouseLeave);
        }

        // Touch support for mobile
        const handleTouchStart = () => {
            showControlsTemporarily();
        };

        if (container) {
            container.addEventListener('touchstart', handleTouchStart);
        }

        return () => {
            if (container) {
                container.removeEventListener('mousemove', handleMouseMove);
                container.removeEventListener('mouseleave', handleMouseLeave);
                container.removeEventListener('touchstart', handleTouchStart);
            }
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [showControlsTemporarily, hideControlsImmediately]);

    // Cleanup center overlay timeout on unmount
    useEffect(() => {
        return () => {
            if (centerOverlayTimeoutRef.current) {
                clearTimeout(centerOverlayTimeoutRef.current);
            }
        };
    }, []);

    // Reset autoplay countdown when video source changes (new video loaded)
    useEffect(() => {
        setShowAutoplayCountdown(false);
        setAutoplayCountdown(5);
        setCurrentSubtitle('off');
        setActiveCue('');
    }, [src, hlsSrc]);

    // Subtitle track handling - listen for cue changes
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleCueChange = (track: TextTrack) => () => {
            const activeCues = track.activeCues;
            if (activeCues && activeCues.length > 0) {
                const text = Array.from(activeCues)
                    .map(cue => (cue as VTTCue).text || '')
                    .join('\n');
                setActiveCue(text);
            } else {
                setActiveCue('');
            }
        };

        const tracks = video.textTracks;
        const cueListeners: Array<{track: TextTrack; listener: () => void}> = [];

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            track.mode = 'hidden';
            const listener = handleCueChange(track);
            track.addEventListener('cuechange', listener);
            cueListeners.push({track, listener});
        }

        return () => {
            cueListeners.forEach(({track, listener}) => {
                track.removeEventListener('cuechange', listener);
            });
        };
    }, [subtitles, src, hlsSrc]);

    // Handle subtitle selection change
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !subtitles) return;

        const tracks = video.textTracks;
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            if (currentSubtitle === 'off') {
                track.mode = 'hidden';
            } else {
                const trackLang = track.language || track.label;
                if (trackLang === currentSubtitle || track.label === currentSubtitle) {
                    track.mode = 'hidden';
                } else {
                    track.mode = 'disabled';
                }
            }
        }

        if (currentSubtitle === 'off') {
            setActiveCue('');
        }
    }, [currentSubtitle, subtitles, src, hlsSrc]);

    const handleSubtitleChange = useCallback((label: string) => {
        setCurrentSubtitle(label);
        setShowSubtitleMenu(false);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle shortcuts when player is focused or in fullscreen
            const container = containerRef.current;
            if (!container || !document.activeElement?.closest('.video-player-container')) {
                if (!document.fullscreenElement) return;
            }

            switch (e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    {
                        const video = videoRef.current;
                        const wasPaused = video ? video.paused : true;
                        togglePlay();
                        showCenterIcon(wasPaused ? 'play' : 'pause');
                    }
                    break;
                case 'm':
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    skip(-10);
                    break;
                case 'arrowright':
                    e.preventDefault();
                    skip(10);
                    break;
                case 'arrowup':
                    e.preventDefault();
                    if (videoRef.current) {
                        const newVol = Math.min(1, videoRef.current.volume + 0.1);
                        videoRef.current.volume = newVol;
                        setVolume(newVol);
                    }
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    if (videoRef.current) {
                        const newVol = Math.max(0, videoRef.current.volume - 0.1);
                        videoRef.current.volume = newVol;
                        setVolume(newVol);
                    }
                    break;
                case 'p':
                    e.preventDefault();
                    togglePiP();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, toggleMute, toggleFullscreen, togglePiP, skip, showCenterIcon, setVolume]);

    const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

    return (
        <div
            ref={containerRef}
            className={`relative bg-black overflow-hidden aspect-video group video-player-container rounded-xl ${className}`}
            tabIndex={0}
            role="application"
            aria-label={t('videoPlayer.player')}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                onClick={handleVideoClick}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onDurationChange={handleDurationChange}
                onEnded={handleEnded}
                onWaiting={handleWaiting}
                onPlaying={handlePlaying}
                onCanPlay={handleCanPlay}
                onPlay={() => {
                    setIsPlaying(true);
                    onPlayingChange?.(true);
                    onPlay?.();
                }}
                onPause={() => {
                    setIsPlaying(false);
                    onPlayingChange?.(false);
                    onPause?.();
                    setShowControls(true);
                }}
                onError={handleError}
                poster={poster ? getFullUrl(poster) : undefined}
                className="w-full h-full cursor-pointer object-contain"
                playsInline
                preload="metadata"
                crossOrigin="anonymous"
            >
                {subtitles?.map((sub, index) => (
                    <track
                        key={`${sub.src}-${index}`}
                        kind="subtitles"
                        src={getFullUrl(sub.src)}
                        srcLang={sub.language}
                        label={sub.label}
                        default={false}
                    />
                ))}
            </video>

            {/* Center overlay icon (shows on click) */}
            {showCenterOverlay && !isBuffering && (
                <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                    aria-hidden="true"
                >
                    <div className="w-[clamp(3rem,15vw,6rem)] h-[clamp(3rem,15vw,6rem)] bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center animate-fade-in">
                        {centerOverlayIcon === 'play' ? (
                            <Play className="text-white fill-white ml-2" style={{width: 'clamp(1.5rem,8vw,3.5rem)', height: 'clamp(1.5rem,8vw,3.5rem)'}}/>
                        ) : (
                            <Pause className="text-white fill-white" style={{width: 'clamp(1.5rem,8vw,3.5rem)', height: 'clamp(1.5rem,8vw,3.5rem)'}}/>
                        )}
                    </div>
                </div>
            )}

            {/* Buffering indicator */}
            {isBuffering && (
                <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                    aria-hidden="true"
                >
                    <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"/>
                </div>
            )}

            {/* Center play button overlay when paused - only shows when controls are visible */}
            {!isPlaying && !hasError && showControls && !showCenterOverlay && (
                <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                >
                    <div
                        className="w-[clamp(2.5rem,12vw,5rem)] h-[clamp(2.5rem,12vw,5rem)] bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center cursor-pointer pointer-events-auto transition-transform hover:scale-110"
                        onClick={(e) => {
                            e.stopPropagation();
                            togglePlay();
                            showCenterIcon('play');
                        }}
                        role="button"
                        aria-label={t('videoPlayer.playVideo')}
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                togglePlay();
                                showCenterIcon('play');
                            }
                        }}
                    >
                        <Play className="text-white fill-white ml-2" style={{width: 'clamp(1.25rem,7vw,3rem)', height: 'clamp(1.25rem,7vw,3rem)'}}/>
                    </div>
                </div>
            )}

            {/* Error overlay */}
            {hasError && (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 gap-4 p-8"
                    role="alert"
                    aria-live="assertive"
                >
                    <AlertCircle size={64} className="text-destructive"/>
                    <p className="text-white text-lg font-medium text-center max-w-md">{errorMessage}</p>
                    <Button
                        variant="secondary"
                        onClick={() => window.location.reload()}
                        className="mt-2"
                    >
                        {t('videoPlayer.retry')}
                    </Button>
                </div>
            )}

            {/* Processing overlay — shown when video is still transcoding */}
            {isProcessing && (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20 gap-4 p-8"
                    role="status"
                    aria-live="polite"
                    aria-label={t('videoPlayer.processing')}
                >
                    <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"/>
                    <p className="text-white text-lg font-medium text-center">{t('videoPlayer.processing')}</p>
                    <p className="text-white/60 text-sm text-center max-w-sm">
                        {t('videoPlayer.processingDesc')}
                    </p>
                </div>
            )}

            {/* Subtitle rendering overlay */}
            {activeCue && currentSubtitle !== 'off' && (
                <div
                    className="absolute bottom-20 inset-x-0 z-20 pointer-events-none flex justify-center px-4"
                    aria-hidden="true"
                >
                    <div className="bg-black/80 text-white text-lg md:text-xl font-medium px-4 py-2 rounded-lg text-center max-w-[80%] leading-relaxed whitespace-pre-line">
                        {activeCue}
                    </div>
                </div>
            )}

            {/* Autoplay countdown overlay (YouTube-style) */}
            {showAutoplayCountdown && nextVideo && (
                <div
                    className="absolute inset-0 z-30 flex items-end justify-end p-6 md:p-10"
                    style={{background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%)'}}
                >
                    {/* Cancel button - top right */}
                    <button
                        onClick={cancelAutoplay}
                        className="absolute top-4 right-4 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
                        aria-label={t('videoPlayer.cancelAutoplay', 'Cancel')}
                    >
                        <X size={20}/>
                    </button>

                    {/* Next video — one integrated card (YouTube-style): thumbnail is the
                        visual主体, info + actions + countdown overlaid on it. */}
                    {/* Width tracks the player (28% of container), clamped so it never
                        blows up on huge players nor collapses on tiny ones. */}
                    <div className="relative w-[28%] max-w-[320px] min-w-[220px] aspect-video rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/20 bg-black">
                        <img
                            src={getFullUrl(nextVideo.thumbnail)}
                            alt={nextVideo.title}
                            className="w-full h-full object-cover"
                        />
                        {/* legibility gradient */}
                        <div
                            className="absolute inset-0"
                            style={{background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.15) 100%)'}}
                        />

                        {/* Next up badge — top left */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 text-white text-xs font-medium bg-black/45 backdrop-blur-sm px-2 py-1 rounded">
                            <NextIcon size={13}/>
                            {t('videoPlayer.nextUp', 'Next up')}
                        </div>

                        {/* Countdown ring — centered, high contrast */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative w-16 h-16">
                                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="16" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5"/>
                                    <circle
                                        cx="18" cy="18" r="16"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeDasharray={`${(autoplayCountdown / 5) * 100.53} 100.53`}
                                        style={{transition: 'stroke-dasharray 1s linear'}}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-white text-lg font-bold tabular-nums">{autoplayCountdown}</span>
                                </div>
                            </div>
                        </div>

                        {/* Title + channel — bottom left */}
                        <div className="absolute bottom-3 left-3 right-28 pr-1">
                            <h3 className="text-white font-semibold text-sm line-clamp-2 leading-tight drop-shadow">
                                {nextVideo.title}
                            </h3>
                            {nextVideo.channelName && (
                                <p className="text-white/80 text-xs mt-0.5 truncate">{nextVideo.channelName}</p>
                            )}
                        </div>

                        {/* Play now — bottom right overlay */}
                        <button
                            onClick={playNow}
                            className="absolute bottom-3 right-3 flex items-center gap-2 bg-white text-black px-4 py-1.5 rounded-full font-medium text-sm hover:bg-white/90 transition-colors shadow-lg"
                        >
                            <NextIcon size={16}/>
                            {t('videoPlayer.playNow', 'Play now')}
                        </button>
                    </div>
                </div>
            )}

            {/* Controls overlay */}
            <div
                className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 z-10 pointer-events-none ${
                    showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
                }`}
                role="toolbar"
                aria-label={t('videoPlayer.controls')}
            >
                {/* Gradient background */}
                <div
                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"/>

                {/* Top controls area (can add more here) */}
                <div className="relative flex-1"/>

                {/* Bottom controls */}
                <div className="relative px-4 pb-4 pt-12 pointer-events-auto">
                    {/* Progress bar */}
                    <div
                        className="relative h-1.5 group/hover:h-2.5 transition-all mb-4 cursor-pointer"
                        role="slider"
                        aria-label="Video progress"
                        aria-valuemin={0}
                        aria-valuemax={Math.floor(duration)}
                        aria-valuenow={Math.floor(currentTime)}
                        tabIndex={0}
                        onPointerDown={handleProgressPointerDown}
                        onPointerMove={handleProgressPointerMove}
                        onPointerUp={handleProgressPointerUp}
                        onMouseMove={enableSpritePreview ? handleProgressMouseMove : undefined}
                        onMouseLeave={enableSpritePreview ? handleProgressMouseLeave : undefined}
                    >
                        {/* Buffered progress */}
                        <div className="absolute inset-0 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white/50 rounded-full transition-all"
                                style={{width: `${buffered * 100}%`}}
                                aria-hidden="true"
                            />
                        </div>
                        {/* Played progress */}
                        <div className="absolute inset-0 flex items-center">
                            <div
                                className="h-full bg-red-600 rounded-full transition-all"
                                style={{width: `${(currentTime / (duration || 1)) * 100}%`}}
                            >
                                <div
                                    className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-red-600 rounded-full opacity-0 group-hover/hover:opacity-100 transition-opacity shadow-lg border-2 border-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Control buttons */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Play/Pause */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-white hover:bg-white/10 rounded-full focus-visible:ring-2 focus-visible:ring-white"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    togglePlay();
                                }}
                                aria-label={isPlaying ? 'Pause' : 'Play'}
                            >
                                {isPlaying ?
                                    <Pause size={24} fill="currentColor" aria-hidden="true"/> :
                                    <Play size={24} fill="currentColor" className="ml-1" aria-hidden="true"/>
                                }
                            </Button>

                            {/* Skip backward */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-white hover:bg-white/10 rounded-full focus-visible:ring-2 focus-visible:ring-white"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    skip(-10);
                                }}
                                aria-label="Rewind 10 seconds"
                            >
                                <SkipBack size={20} aria-hidden="true"/>
                            </Button>

                            {/* Skip forward */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-white hover:bg-white/10 rounded-full focus-visible:ring-2 focus-visible:ring-white"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    skip(10);
                                }}
                                aria-label="Forward 10 seconds"
                            >
                                <SkipForward size={20} aria-hidden="true"/>
                            </Button>

                            {/* Volume */}
                            <div className="flex items-center gap-2 group/volume">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 text-white hover:bg-white/10 rounded-full focus-visible:ring-2 focus-visible:ring-white"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleMute();
                                    }}
                                    aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                                >
                                    {isMuted || volume === 0 ?
                                        <VolumeX size={20} aria-hidden="true"/> :
                                        <Volume2 size={20} aria-hidden="true"/>
                                    }
                                </Button>
                                <div
                                    className="w-0 group-hover/volume:w-24 overflow-hidden transition-all duration-300"
                                    role="slider"
                                    aria-label="Volume"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={Math.round((isMuted ? 0 : volume) * 100)}
                                >
                                    <input
                                        type="range"
                                        value={isMuted ? 0 : volume}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        onChange={(e) => handleVolumeChange([parseFloat(e.target.value)])}
                                        className="w-24 h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer accent-white"
                                        aria-hidden="true"
                                    />
                                </div>
                            </div>

                            {/* Time display */}
                            <span
                                className="text-white text-sm font-medium min-w-[100px] tabular-nums"
                                aria-label={`Time: ${formatDuration(Math.floor(currentTime))} of ${formatDuration(Math.floor(duration))}`}
                            >
                                {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
                            </span>
                        </div>

                        <div className="flex items-center gap-2" ref={settingsMenuRef}>
                            {/* Subtitles - conditionally rendered */}
                            {hasSubtitles ? (
                                <div className="relative">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-10 w-10 text-white hover:bg-white/10 rounded-full focus-visible:ring-2 focus-visible:ring-white ${currentSubtitle !== 'off' ? 'bg-white/20' : ''}`}
                                        title={t('videoPlayer.subtitles')}
                                        aria-label={t('videoPlayer.subtitles')}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowSubtitleMenu(!showSubtitleMenu);
                                            setShowPlaybackMenu(false);
                                            setShowSettingsMenu(false);
                                        }}
                                        aria-expanded={showSubtitleMenu}
                                        aria-haspopup="menu"
                                    >
                                        <Subtitles size={20} aria-hidden="true"/>
                                        {currentSubtitle !== 'off' && (
                                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-red-500 rounded-full"/>
                                        )}
                                    </Button>
                                    {showSubtitleMenu && (
                                        <div
                                            className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden min-w-[160px] shadow-xl z-50"
                                            role="menu"
                                            aria-label="Subtitle options"
                                        >
                                            <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-white/10">
                                                {t('videoPlayer.subtitles', 'Subtitles')}
                                            </div>
                                            <button
                                                role="menuitemradio"
                                                aria-checked={currentSubtitle === 'off'}
                                                className={`w-full text-left px-4 py-2 text-white hover:bg-white/10 transition-colors text-sm flex items-center justify-between ${
                                                    currentSubtitle === 'off' ? 'bg-white/10 font-semibold' : ''
                                                }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSubtitleChange('off');
                                                }}
                                            >
                                                <span>{t('videoPlayer.off', 'Off')}</span>
                                                {currentSubtitle === 'off' && (
                                                    <span className="text-blue-400 text-xs">✓</span>
                                                )}
                                            </button>
                                            {subtitles?.map((sub) => (
                                                <button
                                                    key={sub.language}
                                                    role="menuitemradio"
                                                    aria-checked={currentSubtitle === sub.label || currentSubtitle === sub.language}
                                                    className={`w-full text-left px-4 py-2 text-white hover:bg-white/10 transition-colors text-sm flex items-center justify-between ${
                                                        currentSubtitle === sub.label || currentSubtitle === sub.language ? 'bg-white/10 font-semibold' : ''
                                                    }`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSubtitleChange(sub.label);
                                                    }}
                                                >
                                                    <span>{sub.label}</span>
                                                    {(currentSubtitle === sub.label || currentSubtitle === sub.language) && (
                                                        <span className="text-blue-400 text-xs">✓</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : null}

                            {/* Audio tracks - conditionally rendered */}
                            {hasAudioTracks ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 text-white hover:bg-white/10 rounded-full focus-visible:ring-2 focus-visible:ring-white"
                                    title={t('videoPlayer.audioTracks')}
                                    aria-label={t('videoPlayer.audioTracks')}
                                >
                                    <MonitorPlay size={20} aria-hidden="true"/>
                                </Button>
                            ) : null}

                            {/* Playback speed */}
                            <div className="relative">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-10 px-3 text-white hover:bg-white/10 rounded-full text-sm font-medium focus-visible:ring-2 focus-visible:ring-white"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowPlaybackMenu(!showPlaybackMenu);
                                        setShowSettingsMenu(false);
                                        setShowSubtitleMenu(false);
                                    }}
                                    aria-label={`Playback speed: ${playbackRate}x`}
                                    aria-expanded={showPlaybackMenu}
                                    aria-haspopup="menu"
                                >
                                    {playbackRate}x
                                </Button>
                                {showPlaybackMenu && (
                                    <div
                                        className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden min-w-[120px] shadow-xl z-50"
                                        role="menu"
                                        aria-label="Playback speed options"
                                    >
                                        {playbackRates.map((rate) => (
                                            <button
                                                key={rate}
                                                role="menuitemradio"
                                                aria-checked={playbackRate === rate}
                                                className={`w-full text-left px-4 py-2 text-white hover:bg-white/10 transition-colors text-sm ${
                                                    playbackRate === rate ? 'bg-white/10 font-semibold' : ''
                                                }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePlaybackRateChange(rate);
                                                }}
                                            >
                                                {rate}x{rate === 1 ? ' (Normal)' : ''}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Settings (Quality) */}
                            <div className="relative">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-10 w-10 text-white hover:bg-white/10 rounded-full focus-visible:ring-2 focus-visible:ring-white ${
                                        !hasQualityOptions ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                    onClick={(e) => {
                                        if (!hasQualityOptions) return;
                                        e.stopPropagation();
                                        setShowSettingsMenu(!showSettingsMenu);
                                        setShowPlaybackMenu(false);
                                        setShowSubtitleMenu(false);
                                    }}
                                    disabled={!hasQualityOptions}
                                    title={hasQualityOptions ? t('videoPlayer.qualitySettings') : t('videoPlayer.qualitySettings')}
                                    aria-label={t('videoPlayer.qualitySettings')}
                                    aria-expanded={showSettingsMenu}
                                    aria-haspopup="menu"
                                >
                                    <Settings size={20} aria-hidden="true"/>
                                </Button>
                                {showSettingsMenu && hasQualityOptions && (
                                    <div
                                        className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden min-w-[160px] shadow-xl z-50"
                                        role="menu"
                                        aria-label="Quality options"
                                    >
                                        {/* Quality header */}
                                        <div
                                            className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-white/10">
                                            Quality
                                        </div>

                                        {/* Auto option */}
                                        <button
                                            role="menuitemradio"
                                            aria-checked={currentQuality === 'auto'}
                                            className={`w-full text-left px-4 py-2 text-white hover:bg-white/10 transition-colors text-sm flex items-center justify-between ${
                                                currentQuality === 'auto' ? 'bg-white/10 font-semibold' : ''
                                            }`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleQualityChange('auto');
                                            }}
                                        >
                                            <span>Auto{autoResolution ? ` (${autoResolution})` : ''}</span>
                                            {currentQuality === 'auto' && (
                                                <span className="text-blue-400 text-xs">✓</span>
                                            )}
                                        </button>

                                        {/* Quality options */}
                                        {allQualities.map((q) => (
                                            <button
                                                key={q.name}
                                                role="menuitemradio"
                                                aria-checked={currentQuality === q.name}
                                                className={`w-full text-left px-4 py-2 text-white hover:bg-white/10 transition-colors text-sm flex items-center justify-between ${
                                                    currentQuality === q.name ? 'bg-white/10 font-semibold' : ''
                                                }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleQualityChange(q.name);
                                                }}
                                            >
                                                <span>{q.name}</span>
                                                {currentQuality === q.name ? (
                                                    <span className="text-blue-400 text-xs">✓</span>
                                                ) : q.isRecommended ? (
                                                    <span className="text-[10px] bg-info/20 text-blue-400 px-1.5 py-0.5 rounded">{t('videoPlayer.featured')}</span>
                                                ) : null}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Picture-in-Picture - conditionally enabled */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-10 w-10 text-white hover:bg-white/10 rounded-full focus-visible:ring-2 focus-visible:ring-white ${
                                    !supportsPiP ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    togglePiP();
                                }}
                                disabled={!supportsPiP}
                                title={supportsPiP ? 'Picture-in-Picture' : 'Picture-in-Picture not supported'}
                                aria-label="Picture-in-Picture mode"
                            >
                                <PictureInPicture size={20} aria-hidden="true"/>
                            </Button>

                            {/* Fullscreen - conditionally enabled */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-10 w-10 text-white hover:bg-white/10 rounded-full focus-visible:ring-2 focus-visible:ring-white ${
                                    !supportsFullscreen ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFullscreen();
                                }}
                                disabled={!supportsFullscreen}
                                title={supportsFullscreen ? (isFullscreen ? 'Exit fullscreen' : 'Fullscreen') : 'Fullscreen not supported'}
                                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                            >
                                {isFullscreen ?
                                    <Minimize size={20} aria-hidden="true"/> :
                                    <Maximize size={20} aria-hidden="true"/>
                                }
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sprite preview on progress bar hover — rendered at player container level
                so that absolute positioning is relative to the player container, not the
                bottom controls area. This avoids padding/offset miscalculations. */}
            {hoverTime !== null && enableSpritePreview && progressBarRect && playerRect && (
                <SpritePreview
                    hoverTime={hoverTime}
                    hoverRatio={hoverRatio}
                    progressBarRect={progressBarRect}
                    playerRect={playerRect}
                    vttUrl={spriteVttUrl ?? null}
                    imageUrl={spriteImageUrl ?? null}
                    duration={duration}
                />
            )}
        </div>
    );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
