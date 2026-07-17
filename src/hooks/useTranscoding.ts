import {useEffect, useState, useRef} from "react";
import {api} from "@/lib/request";

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

const SSE_PATH = "/admin/medias/transcoding/events";

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

    const connectionRef = useRef<{ close: () => void } | null>(null);
    const mountedRef = useRef(true);
    const mediaIdRef = useRef(mediaId);
    const intentionalCloseRef = useRef(false);

    useEffect(() => {
        mediaIdRef.current = mediaId;
    }, [mediaId]);

    const disconnect = () => {
        intentionalCloseRef.current = true;
        if (connectionRef.current) {
            connectionRef.current.close();
            connectionRef.current = null;
        }
        if (mountedRef.current) {
            setSseStatus({connected: false, reconnecting: false, disabled: false});
        }
    };

    const connect = () => {
        if (!mountedRef.current) return;

        intentionalCloseRef.current = false;

        if (connectionRef.current) {
            connectionRef.current.close();
            connectionRef.current = null;
        }

        const params: Record<string, unknown> = {};
        if (mediaIdRef.current) {
            params.media_id = mediaIdRef.current;
        }

        if (mountedRef.current) {
            setSseStatus({connected: false, reconnecting: true, disabled: false});
        }

        const conn = api.sse(SSE_PATH, {
            params,
            onOpen: () => {
                if (mountedRef.current && !intentionalCloseRef.current) {
                    setSseStatus({connected: true, reconnecting: false, disabled: false});
                }
            },
            onMessage: (event) => {
                if (event.event === "transcoding_progress" && mountedRef.current && !intentionalCloseRef.current) {
                    try {
                        const data: TranscodingEvent = JSON.parse(event.data);
                        setLastEvent(data);
                    } catch (err) {
                        console.error("Failed to parse transcoding event:", err);
                    }
                }
            },
            onError: () => {
                if (mountedRef.current && !intentionalCloseRef.current) {
                    setSseStatus(prev => ({...prev, connected: false}));
                }
            },
            onClose: () => {
                if (mountedRef.current && !intentionalCloseRef.current) {
                    setSseStatus({connected: false, reconnecting: false, disabled: false});
                }
            },
            maxReconnectAttempts: 10,
            initialReconnectDelay: 1000,
            maxReconnectDelay: 30000,
        });

        connectionRef.current = conn;
    };

    useEffect(() => {
        mountedRef.current = true;
        connect();

        return () => {
            mountedRef.current = false;
            disconnect();
        };
    }, []);

    useEffect(() => {
        if (connectionRef.current && !intentionalCloseRef.current) {
            connect();
        }
    }, [mediaId]);

    return {lastEvent, sseStatus, connect, disconnect};
}
