/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 */

import {useEffect, useState, useCallback, useRef} from "react";
import {mediaApi} from "@/lib/api/media";

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

const MAX_RECONNECT_ATTEMPTS = 3;

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

    const disconnect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (mountedRef.current) {
            setSseStatus({connected: false, reconnecting: false, disabled: false});
        }
        reconnectAttemptsRef.current = 0;
    }, []);

    const connect = useCallback(() => {
        if (!mountedRef.current) return;

        disconnect();

        const sseUrl = mediaApi.getSSEUrl(mediaId);
        const eventSource = new EventSource(sseUrl);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            if (mountedRef.current) {
                reconnectAttemptsRef.current = 0;
                setSseStatus({connected: true, reconnecting: false, disabled: false});
            }
        };

        eventSource.onerror = () => {
            if (!mountedRef.current) return;

            reconnectAttemptsRef.current += 1;

            eventSource.close();
            eventSourceRef.current = null;

            if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                setSseStatus({connected: false, reconnecting: false, disabled: true});
                return;
            }

            setSseStatus({connected: false, reconnecting: true, disabled: false});
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
    }, [mediaId, disconnect]);

    useEffect(() => {
        if (!sseStatus.reconnecting) return;

        let delay = 1000;
        const maxDelay = 10000;
        let timerId: ReturnType<typeof setTimeout>;

        const attemptReconnect = () => {
            if (!mountedRef.current || !sseStatus.reconnecting) return;
            connect();
            delay = Math.min(delay * 2, maxDelay);
            timerId = setTimeout(attemptReconnect, delay);
        };

        timerId = setTimeout(attemptReconnect, delay);
        return () => clearTimeout(timerId);
    }, [sseStatus.reconnecting, connect]);

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
