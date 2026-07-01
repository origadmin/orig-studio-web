import {useEffect, useState, useCallback, useRef} from "react";
import {encodingApi} from "@/lib/api/media";

interface TranscodingEvent {
    media_id: string;
    task_id?: string;
    status: "pending" | "processing" | "success" | "failed";
    progress?: number;
    speed?: string;
    fps?: number;
    time?: number;
}

interface TranscodingSSEStatus {
    connected: boolean;
    reconnecting: boolean;
    disabled: boolean;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 30000;

export function useTranscoding(mediaId?: string): {
    lastEvent: TranscodingEvent | null;
    sseStatus: TranscodingSSEStatus;
    connect: () => void;
    disconnect: () => void;
} {
    const [lastEvent, setLastEvent] = useState<TranscodingEvent | null>(null);
    const [sseStatus, setSseStatus] = useState<TranscodingSSEStatus>({
        connected: false,
        reconnecting: false,
        disabled: false,
    });
    const eventSourceRef = useRef<EventSource | null>(null);
    const mountedRef = useRef(true);
    const reconnectAttemptsRef = useRef(0);
    const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intentionalCloseRef = useRef(false);

    const clearReconnectTimer = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    }, []);

    const scheduleReconnect = useCallback(() => {
        if (!mountedRef.current || intentionalCloseRef.current) return;
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            setSseStatus({connected: false, reconnecting: false, disabled: true});
            return;
        }
        setSseStatus({connected: false, reconnecting: true, disabled: false});
        const delay = reconnectDelayRef.current;
        reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            if (!mountedRef.current || intentionalCloseRef.current) return;
            reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, MAX_RECONNECT_DELAY);
            connectRef.current?.();
        }, delay);
    }, []);

    const connectRef = useRef<(() => void) | null>(null);

    const disconnect = useCallback(() => {
        intentionalCloseRef.current = true;
        clearReconnectTimer();
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (mountedRef.current) {
            setSseStatus({connected: false, reconnecting: false, disabled: false});
        }
        reconnectAttemptsRef.current = 0;
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
    }, [clearReconnectTimer]);

    const connect = useCallback(() => {
        if (!mountedRef.current) return;

        intentionalCloseRef.current = false;
        clearReconnectTimer();

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        const sseUrl = encodingApi.getSSEUrl(mediaId);
        const eventSource = new EventSource(sseUrl);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            if (!mountedRef.current) return;
            reconnectAttemptsRef.current = 0;
            reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
            setSseStatus({connected: true, reconnecting: false, disabled: false});
        };

        eventSource.onerror = () => {
            if (!mountedRef.current || intentionalCloseRef.current) return;
            eventSource.close();
            eventSourceRef.current = null;
            reconnectAttemptsRef.current += 1;
            scheduleReconnect();
        };

        eventSource.addEventListener("transcoding_progress", (event) => {
            try {
                const data: TranscodingEvent = JSON.parse(event.data);
                if (mountedRef.current) {
                    setLastEvent(data);
                }
            } catch (err) {
                console.error("Failed to parse transcoding event:", err);
            }
        });
    }, [mediaId, clearReconnectTimer, scheduleReconnect]);

    connectRef.current = connect;

    useEffect(() => {
        mountedRef.current = true;
        connect();
        return () => {
            mountedRef.current = false;
            disconnect();
        };
    }, [connect, disconnect]);

    return {lastEvent, sseStatus, connect, disconnect};
}
