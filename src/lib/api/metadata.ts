// Metadata API
import {api} from "../request";

export interface MediaMetadata {
    id: string;
    media_id: string;
    title: string;
    description: string;
    duration: number;
    width: number;
    height: number;
    format: string;
    codec: string;
    bitrate: number;
    frame_rate: number;
    resolution: string;
    aspect_ratio: string;
    file_size: number;
    create_time: string;
    update_time: string;
    // 高级元数据
    key_frames?: KeyFrame[];
    audio_waveform?: AudioWaveform;
    text_content?: TextContent;
    scene_changes?: SceneChange[];
}

export interface KeyFrame {
    id: string;
    time: number;
    url: string;
    thumbnail_url: string;
}

export interface AudioWaveform {
    id: string;
    samples: number[];
    url: string;
}

export interface TextContent {
    id: string;
    transcript: string;
    keywords: string[];
    entities: Entity[];
}

export interface Entity {
    type: string;
    text: string;
    confidence: number;
}

export interface SceneChange {
    id: string;
    time: number;
    description: string;
}

export const metadataApi = {
    // 获取媒体元数据（使用 short_token）
    getByMediaId: (token: string) =>
        api.get<MediaMetadata>(`/medias/${token}/metadata`),

    // 触发元数据挖掘（使用 short_token）
    triggerMining: (token: string) =>
        api.post<{ success: boolean; message: string }>(`/medias/${token}/metadata/mining`),

    // 获取元数据挖掘状态（使用 short_token）
    getMiningStatus: (token: string) =>
        api.get<{ status: string; progress: number; message: string }>(`/medias/${token}/metadata/status`),

    // 获取关键帧（使用 short_token）
    getKeyFrames: (token: string) =>
        api.get<KeyFrame[]>(`/medias/${token}/metadata/key-frames`),

    // 获取音频波形（使用 short_token）
    getAudioWaveform: (token: string) =>
        api.get<AudioWaveform>(`/medias/${token}/metadata/audio-waveform`),

    // 获取文本内容（使用 short_token）
    getTextContent: (token: string) =>
        api.get<TextContent>(`/medias/${token}/metadata/text-content`),

    // 获取场景变化（使用 short_token）
    getSceneChanges: (token: string) =>
        api.get<SceneChange[]>(`/medias/${token}/metadata/scene-changes`),
};
