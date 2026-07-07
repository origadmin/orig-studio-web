/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 */

import {useEffect, useState, useMemo} from "react";
import type {ComponentProps} from "react";
import {useTranslation} from "react-i18next";
import {encodingApi, type EncodeProfile} from "../../lib/api/media";
import {formatDateTime} from "../../lib/format";
import {Button} from "../../components/ui/button";
import {Input} from "../../components/ui/input";
import {Label} from "../../components/ui/label";
import {Badge} from "../../components/ui/badge";
import {Switch} from "../../components/ui/switch";
import {Checkbox} from "../../components/ui/checkbox";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "../../components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "../../components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import {
    Search, RotateCcw, Plus, Edit, Trash2, Copy,
    Play, Pause, ChevronRight, ChevronLeft, X, Settings
} from "lucide-react";
import {AdminPageTemplate} from "../../components/AdminPageTemplate";

const CODEC_OPTIONS = [
    {value: 'h264', label: 'H.264 (libx264)', badgeVariant: 'soft-success' as const},
    {value: 'h265', label: 'H.265 (libx265)', badgeVariant: 'soft-info' as const},
    {value: 'vp9', label: 'VP9 (libvpx-vp9)', badgeVariant: 'soft-warning' as const},
];

const EXTENSION_OPTIONS = [
    {value: 'mp4', label: 'MP4'},
    {value: 'webm', label: 'WebM'},
    {value: 'gif', label: 'GIF (Preview)'},
];

const CODEC_BY_EXT: Record<string, string[]> = {
    mp4: ['h264', 'h265'],
    webm: ['vp9'],
    gif: ['-'],
};

const RESOLUTION_OPTIONS = [
    {value: '240', label: '240p (426×240)', width: '426', height: '240'},
    {value: '360', label: '360p (640×360)', width: '640', height: '360'},
    {value: '480', label: '480p (854×480)', width: '854', height: '480'},
    {value: '720', label: '720p (1280×720)', width: '1280', height: '720'},
    {value: '1080', label: '1080p (1920×1080)', width: '1920', height: '1080'},
    {value: '1440', label: '1440p (2560×1440)', width: '2560', height: '1440'},
    {value: '2160', label: '2160p (3840×2160)', width: '3840', height: '2160'},
];

const VIDEO_BITRATE_MAP: Record<string, string> = {
    '240': '700k', '360': '1200k', '480': '2000k',
    '720': '4000k', '1080': '8000k', '1440': '16000k', '2160': '35000k',
};
const AUDIO_BITRATE_MAP: Record<string, string> = {
    '240': '96k', '360': '96k', '480': '128k',
    '720': '128k', '1080': '192k', '1440': '192k', '2160': '192k',
};

function defaultAudioCodec(videoCodec: string): string {
    return videoCodec === 'vp9' ? 'opus' : 'aac';
}

function codecLabel(codec: string): string {
    const found = CODEC_OPTIONS.find(c => c.value === codec);
    return found ? found.label : codec;
}

function codecBadgeVariant(codec: string): ComponentProps<typeof Badge>['variant'] {
    const found = CODEC_OPTIONS.find(c => c.value === codec);
    if (found) return found.badgeVariant;
    if (codec === '-' || codec === '') return 'soft-danger';
    return 'soft-neutral';
}

function codecShortDisplay(codec: string): string {
    const map: Record<string, string> = {h264: 'H.264', h265: 'H.265', vp9: 'VP9'};
    return map[codec] || codec?.toUpperCase() || '-';
}

function buildFfmpegCommand(profile: Partial<EncodeProfile>): string {
    const ext = profile.extension || 'mp4';
    const codecShort = profile.video_codec || 'h264';
    const vcodecMap: Record<string, string> = {h264: 'libx264', h265: 'libx265', vp9: 'libvpx-vp9'};
    const vcodec = vcodecMap[codecShort] || 'libx264';
    const res = profile.resolution || '720';
    const resOpt = RESOLUTION_OPTIONS.find(r => r.value === res);
    const width = resOpt?.width || '1280';
    const height = resOpt?.height || '720';
    const vb = VIDEO_BITRATE_MAP[res] || profile.video_bitrate || '4000k';
    const ab = AUDIO_BITRATE_MAP[res] || profile.audio_bitrate || '128k';
    const acodec = profile.audio_codec || defaultAudioCodec(codecShort);
    const levelMap: Record<string, string> = {'240': '3.0', '360': '3.0', '480': '3.0', '720': '4.1', '1080': '4.2', '1440': '5.1', '2160': '5.2'};
    const level = levelMap[res] || '4.1';

    if (ext === 'gif') {
        return [
            '# GIF Preview (first 3s, palette-based)',
            `-vf  "fps=5,scale=320:-1:flags=lanczos,palettegen"`,
            `-t   3`,
            `-y   palette.png`,
            '',
            '# Then combine with palette:',
            `-i   palette.png`,
            `-lavfi "fps=5,scale=320:-1:flags=lanczos[x];[x][1:v]paletteuse"`,
            `-t   3`,
            `-y   preview.gif`,
        ].join('\n');
    }

    const lines: string[] = [];
    lines.push(`-c:v ${vcodec}`);

    if (vcodec === 'libx264') {
        lines.push(`-filter:v  "scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos"`);
        lines.push(`-pix_fmt   yuv420p`);
        lines.push(`-crf       23`);
        lines.push(`-preset    medium`);
        lines.push(`-profile:v main`);
        lines.push(`-level     ${level}`);
        lines.push(`-force_key_frames "expr:gte(t,n_forced*4)"`);
        lines.push(`-x264-params   keyint=240:keyint_min=120`);
        lines.push(`-maxrate   ${vb}`);
        lines.push(`-bufsize   ${vb}`);
    } else if (vcodec === 'libx265') {
        lines.push(`-filter:v  "scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos"`);
        lines.push(`-pix_fmt   yuv420p`);
        lines.push(`-crf       28`);
        lines.push(`-preset    medium`);
        lines.push(`-profile:v main`);
        lines.push(`-level     ${level}`);
        lines.push(`-force_key_frames "expr:gte(t,n_forced*4)"`);
        lines.push(`-x265-params   keyint=240:keyint_min=120`);
        lines.push(`-maxrate   ${vb}`);
        lines.push(`-bufsize   ${vb}`);
    } else {
        lines.push(`-filter:v  "scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos"`);
        lines.push(`-crf       31`);
        lines.push(`-b:v       0`);
        lines.push(`-quality   good`);
        lines.push(`-cpu-used  2`);
    }

    lines.push(`-c:a ${acodec}`);
    lines.push(`-b:a ${ab}`);
    lines.push(`-f hls`);
    lines.push(`-hls_time 6`);
    lines.push(`-hls_list_size 0`);
    lines.push(`-hls_segment_filename "hls/{profile}/segment_%03d.ts"`);
    lines.push(`-y  hls/{profile}/index.m3u8`);
    return lines.join('\n');
}

export default function TranscodingProfiles() {
    const {t} = useTranslation();

    const [profiles, setProfiles] = useState<EncodeProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingProfile, setEditingProfile] = useState<Partial<EncodeProfile> | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [codecFilter, setCodecFilter] = useState<string>('all');
    const [resolutionFilter, setResolutionFilter] = useState<string>('all');
    const [selectedRows, setSelectedRows] = useState<number[]>([]);

    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newProfile, setNewProfile] = useState<Partial<EncodeProfile>>({
        is_active: true,
        extension: 'mp4',
        video_codec: 'h264',
        audio_codec: 'aac',
        resolution: '720',
    });

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const response = await encodingApi.profiles.list();
            setProfiles((Array.isArray(response?.profiles) ? response.profiles : []));
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const availableCodecs = useMemo(() => {
        const set = new Set<string>();
        profiles.forEach(p => {
            if (p.video_codec && p.video_codec !== '-') set.add(p.video_codec);
        });
        return Array.from(set);
    }, [profiles]);

    const availableResolutions = useMemo(() => {
        const set = new Set<string>();
        profiles.forEach(p => {
            if (!p.resolution || p.resolution === '-') return;
            const height = p.resolution.split('x').pop() || p.resolution;
            if (height && height !== '-' && RESOLUTION_OPTIONS.find(r => r.value === height)) {
                set.add(height);
            }
        });
        return RESOLUTION_OPTIONS.filter(r => set.has(r.value)).map(r => r.value);
    }, [profiles]);

    const filteredProfiles = useMemo(() => {
        let result = [...profiles];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q) ||
                (p.video_codec || '').toLowerCase().includes(q) ||
                (p.resolution || '').toLowerCase().includes(q)
            );
        }

        if (codecFilter && codecFilter !== 'all') {
            result = result.filter(p => p.video_codec === codecFilter);
        }

        if (resolutionFilter && resolutionFilter !== 'all') {
            result = result.filter(p => {
                const height = (p.resolution || '').split('x').pop() || p.resolution;
                return height === resolutionFilter;
            });
        }

        return result;
    }, [profiles, searchQuery, codecFilter, resolutionFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredProfiles.length);
    const paginatedProfiles = filteredProfiles.slice(startIndex, endIndex);

    const toggleSelectAll = () => {
        if (selectedRows.length === filteredProfiles.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(filteredProfiles.map(p => p.id));
        }
    };

    const toggleSelectRow = (id: number) => {
        setSelectedRows(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const clearSelection = () => setSelectedRows([]);

    const handleBulkEnable = async () => {
        try {
            setProfiles(prev => prev.map(p =>
                selectedRows.includes(p.id) ? {...p, is_active: true} : p
            ));
            for (const id of selectedRows) {
                const profile = profiles.find(p => p.id === id);
                if (profile) {
                    await encodingApi.profiles.update(profile.id, {...profile, is_active: true});
                }
            }
            clearSelection();
        } catch (error) {
            console.error("Failed to bulk enable profiles:", error);
            fetchProfiles();
        }
    };

    const handleBulkDisable = async () => {
        try {
            setProfiles(prev => prev.map(p =>
                selectedRows.includes(p.id) ? {...p, is_active: false} : p
            ));
            for (const id of selectedRows) {
                const profile = profiles.find(p => p.id === id);
                if (profile) {
                    await encodingApi.profiles.update(profile.id, {...profile, is_active: false});
                }
            }
            clearSelection();
        } catch (error) {
            console.error("Failed to bulk disable profiles:", error);
            fetchProfiles();
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedRows.length} profiles?`)) return;
        try {
            setProfiles(prev => prev.filter(p => !selectedRows.includes(p.id)));
            for (const id of selectedRows) {
                await encodingApi.profiles.delete(id);
            }
            clearSelection();
        } catch (error) {
            console.error("Failed to bulk delete profiles:", error);
            fetchProfiles();
        }
    };

    const handleEdit = (p: EncodeProfile) => {
        setEditingProfile({...p});
        setIsDialogOpen(true);
    };

    const handleDuplicate = (p: EncodeProfile) => {
        const {id: _id, create_time: _c, update_time: _u, ...rest} = p;
        const dup: Partial<EncodeProfile> = {
            ...rest,
            name: `${p.name} (Copy)`,
        };
        setEditingProfile(dup);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this profile?")) return;
        try {
            setProfiles(prev => prev.filter(p => p.id !== id));
            await encodingApi.profiles.delete(id);
        } catch (error) {
            console.error("Failed to delete profile:", error);
            fetchProfiles();
        }
    };

    const handleToggleActive = async (profile: EncodeProfile) => {
        try {
            setProfiles(prev => prev.map(p =>
                p.id === profile.id ? {...p, is_active: !p.is_active} : p
            ));
            await encodingApi.profiles.update(profile.id, {...profile, is_active: !profile.is_active});
        } catch (error) {
            console.error("Failed to toggle profile status:", error);
            fetchProfiles();
        }
    };

    const autoFillProfile = (p: Partial<EncodeProfile>): Partial<EncodeProfile> => {
        const filled = {...p};
        if (filled.extension === 'gif') {
            filled.video_codec = '-';
            filled.audio_codec = '';
            filled.resolution = '-';
            filled.video_bitrate = '';
            filled.audio_bitrate = '';
            filled.bento_parameters = '--fps 5 --scale 320';
        } else {
            const res = filled.resolution || '720';
            filled.video_bitrate = VIDEO_BITRATE_MAP[res] || filled.video_bitrate || '4000k';
            filled.audio_bitrate = AUDIO_BITRATE_MAP[res] || filled.audio_bitrate || '128k';
            const vc = filled.video_codec || 'h264';
            filled.audio_codec = filled.audio_codec || defaultAudioCodec(vc);
            filled.bento_parameters = `--video-bitrate ${filled.video_bitrate} --audio-bitrate ${filled.audio_bitrate}`;
        }
        return filled;
    };

    const handleSave = async () => {
        if (!editingProfile) return;
        if (!editingProfile.name || !editingProfile.extension) {
            alert("Name and Extension are required fields");
            return;
        }
        const saveData = autoFillProfile(editingProfile);
        try {
            if (editingProfile.id) {
                setProfiles(prev => prev.map(p =>
                    p.id === editingProfile.id ? {...p, ...saveData} as EncodeProfile : p
                ));
                await encodingApi.profiles.update(editingProfile.id, saveData);
            } else {
                await encodingApi.profiles.create(saveData);
                fetchProfiles();
            }
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Failed to save profile:", error);
            fetchProfiles();
        }
    };

    const handleCreateNew = async () => {
        if (!newProfile.name || !newProfile.extension) {
            alert("Name and Extension are required fields");
            return;
        }
        const saveData = autoFillProfile(newProfile);
        try {
            await encodingApi.profiles.create(saveData);
            setIsAddModalOpen(false);
            setNewProfile({is_active: true, extension: 'mp4', video_codec: 'h264', audio_codec: 'aac', resolution: '720'});
            fetchProfiles();
        } catch (error) {
            console.error("Failed to create profile:", error);
            fetchProfiles();
        }
    };

    const resetFilters = () => {
        setSearchQuery('');
        setCodecFilter('all');
        setResolutionFilter('all');
    };

    const newProfileFfmpeg = useMemo(() => buildFfmpegCommand(newProfile), [newProfile]);
    const editingProfileFfmpeg = useMemo(
        () => editingProfile ? buildFfmpegCommand(editingProfile) : '',
        [editingProfile]
    );

    const isGifNew = newProfile.extension === 'gif';
    const isGifEdit = editingProfile?.extension === 'gif';

    const pageActions = (
        <Button
            variant="outline"
            onClick={() => {
                setNewProfile({is_active: true, extension: 'mp4', video_codec: 'h264', audio_codec: 'aac', resolution: '720'});
                setIsAddModalOpen(true);
            }}
            className="gap-2 h-9"
        >
            <Plus className="w-4 h-4"/>
            {t('admin.newProfile', 'New Profile')}
        </Button>
    );

    const pageFilters = (
        <>
            <Select value={codecFilter} onValueChange={setCodecFilter}>
                <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder={t('admin.allCodecs', 'All Codecs')}/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('admin.allCodecs', 'All Codecs')}</SelectItem>
                    {availableCodecs.map(c => (
                        <SelectItem key={c} value={c}>{codecShortDisplay(c)}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={resolutionFilter} onValueChange={setResolutionFilter}>
                <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder={t('admin.allResolutions', 'All Resolutions')}/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('admin.allResolutions', 'All Resolutions')}</SelectItem>
                    {availableResolutions.map(r => (
                        <SelectItem key={r} value={r}>{r}p</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button
                variant="outline"
                onClick={resetFilters}
                className="gap-1.5 h-9 px-3"
            >
                <RotateCcw className="w-3.5 h-3.5"/>
                {t('admin.reset', 'Reset')}
            </Button>
        </>
    );

    const renderProfileForm = (
        profile: Partial<EncodeProfile>,
        setProfile: (p: Partial<EncodeProfile>) => void,
        isGif: boolean,
        ffmpegCmd: string,
    ) => {
        const update = (patch: Partial<EncodeProfile>) => setProfile({...profile, ...patch});
        const currentVCodec = profile.video_codec || 'h264';
        return (
            <>
                <div className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2 space-y-2">
                            <Label htmlFor={`profile-name-${profile.id || 'new'}`}>
                                {t('admin.profileName', 'Profile Name')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id={`profile-name-${profile.id || 'new'}`}
                                value={profile.name || ''}
                                onChange={(e) => update({name: e.target.value})}
                                placeholder="e.g. h264-720p"
                                className="h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`profile-ext-${profile.id || 'new'}`}>
                                {t('admin.outputExtension', 'Format')} <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={profile.extension || 'mp4'}
                                onValueChange={(v) => {
                                    const allowedCodecs = CODEC_BY_EXT[v] || ['h264'];
                                    const defaultCodec = allowedCodecs[0];
                                    let audioCodec = 'aac';
                                    if (v === 'webm' || defaultCodec === 'vp9') audioCodec = 'opus';
                                    if (v === 'gif') audioCodec = '';
                                    let newRes = profile.resolution;
                                    if (v === 'gif') newRes = '-';
                                    else if (!newRes || newRes === '-') newRes = '720';
                                    update({
                                        extension: v,
                                        video_codec: defaultCodec,
                                        audio_codec: audioCodec,
                                        resolution: newRes,
                                    });
                                }}
                            >
                                <SelectTrigger id={`profile-ext-${profile.id || 'new'}`} className="h-10">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    {EXTENSION_OPTIONS.map(o => (
                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`profile-res-${profile.id || 'new'}`}>
                                {t('admin.resolution', 'Resolution')}
                            </Label>
                            {isGif ? (
                                <Input
                                    value="GIF Preview (320px)"
                                    disabled
                                    className="h-10"
                                />
                            ) : (
                                <Select
                                    value={profile.resolution || '720'}
                                    onValueChange={(v) => update({resolution: v})}
                                >
                                    <SelectTrigger id={`profile-res-${profile.id || 'new'}`} className="h-10">
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {RESOLUTION_OPTIONS.map(o => (
                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        {!isGif && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor={`profile-vcodec-${profile.id || 'new'}`}>
                                        {t('admin.videoCodec', 'Video Codec')}
                                    </Label>
                                    <Select
                                        value={profile.video_codec || 'h264'}
                                        onValueChange={(v) => update({
                                            video_codec: v,
                                            audio_codec: defaultAudioCodec(v),
                                        })}
                                    >
                                        <SelectTrigger id={`profile-vcodec-${profile.id || 'new'}`} className="h-10">
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CODEC_OPTIONS.filter(o => {
                                                const allowed = CODEC_BY_EXT[profile.extension || 'mp4'] || ['h264', 'h265'];
                                                return allowed.includes(o.value);
                                            }).map(o => (
                                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`profile-acodec-${profile.id || 'new'}`}>
                                        {t('admin.audioCodec', 'Audio Codec')}
                                    </Label>
                                    <Select
                                        value={profile.audio_codec || defaultAudioCodec(currentVCodec)}
                                        onValueChange={(v) => update({audio_codec: v})}
                                    >
                                        <SelectTrigger id={`profile-acodec-${profile.id || 'new'}`} className="h-10">
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="aac">AAC</SelectItem>
                                            <SelectItem value="opus">Opus</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}
                        <div className="sm:col-span-2 flex items-center gap-2.5 pt-1">
                            <Switch
                                id={`active-${profile.id || 'new'}`}
                                checked={profile.is_active ?? true}
                                onCheckedChange={(checked) => update({is_active: checked === true})}
                            />
                            <Label htmlFor={`active-${profile.id || 'new'}`} className="text-sm font-medium cursor-pointer">
                                {t('admin.enableProfile', 'Enable this profile')}
                            </Label>
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-5">
                    <div className="p-4 bg-muted rounded-lg font-mono text-[11px] text-foreground/90 leading-relaxed border border-border/50 overflow-x-auto">
                        {ffmpegCmd.split('\n').map((line, i) => (
                            <div key={i} className={line.startsWith('#') ? 'text-muted-foreground italic' : ''}>
                                {line || '\u00A0'}
                            </div>
                        ))}
                    </div>
                </div>
            </>
        );
    };

    return (
        <AdminPageTemplate
            title={t('admin.transcodingProfiles', '转码配置')}
            titleIcon={<Settings className="h-8 w-8" />}
            themeColor="violet"
            description={t('admin.transcodingProfilesDesc', '管理全局视频编码参数和分辨率预设。')}
            searchPlaceholder={t('admin.searchProfiles', '搜索配置...')}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            filters={pageFilters}
            actions={pageActions}
        >
            <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-border hover:bg-transparent">
                            <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                <Checkbox
                                    checked={
                                        filteredProfiles.length > 0 &&
                                        selectedRows.length === filteredProfiles.length
                                    }
                                    onCheckedChange={toggleSelectAll}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {t('admin.profileName', 'Profile Name')}
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {t('admin.codec', 'Codec')}
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {t('admin.extension', 'Extension')}
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {t('admin.resolution', 'Resolution')}
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {t('admin.bitrate', 'Bitrate')}
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {t('admin.status', 'Status')}
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {t('admin.lastModified', 'Last Modified')}
                            </TableHead>
                            <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                                {t('admin.actions', 'Actions')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    {t('admin.loading', 'Loading profiles...')}
                                </TableCell>
                            </TableRow>
                        ) : paginatedProfiles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="px-4 py-8 text-center">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                        <Search className="h-8 w-8 mb-2 opacity-30"/>
                                        <p className="text-sm font-medium">
                                            {t('admin.noProfiles', 'No profiles found')}
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedProfiles.map((p) => (
                                <TableRow
                                    key={p.id}
                                    className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                                >
                                    <TableCell className="px-4 py-3">
                                        <Checkbox
                                            checked={selectedRows.includes(p.id)}
                                            onCheckedChange={() => toggleSelectRow(p.id)}
                                            aria-label={`Select ${p.name}`}
                                        />
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm font-medium text-foreground">
                                        {p.name}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Badge variant={codecBadgeVariant(p.video_codec)} className="text-[11px] font-bold font-mono uppercase tracking-wider">
                                            {codecShortDisplay(p.video_codec)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Badge variant="outline" className="text-[11px] font-bold font-mono uppercase">
                                            {p.extension?.toUpperCase() || '-'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs font-mono text-muted-foreground">
                                        {p.resolution === '-' ? '—' : (p.resolution ? `${p.resolution}p` : '—')}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-muted-foreground font-mono">
                                        {p.video_bitrate || '—'}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Switch
                                            checked={p.is_active}
                                            onCheckedChange={() => handleToggleActive(p)}
                                        />
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                        {p.update_time ? formatDateTime(p.update_time) : (p.create_time ? formatDateTime(p.create_time) : '—')}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => handleEdit(p)}
                                                title={t('admin.edit', 'Edit')}
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                                            >
                                                <Edit className="w-4 h-4"/>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => handleDuplicate(p)}
                                                title={t('admin.duplicate', 'Duplicate')}
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                                            >
                                                <Copy className="w-4 h-4"/>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => handleDelete(p.id)}
                                                title={t('admin.delete', 'Delete')}
                                                className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/30">
                    <p className="text-xs text-muted-foreground">
                        {t('admin.showing', 'Showing')} {filteredProfiles.length === 0 ? 0 : startIndex + 1}–
                        {endIndex} {t('admin.of', 'of')} {filteredProfiles.length} {t('admin.profiles', 'profiles')}
                    </p>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-border rounded-md"
                            disabled={safePage <= 1}
                            onClick={() => setPage(pg => Math.max(1, pg - 1))}
                        >
                            <ChevronLeft className="w-4 h-4"/>
                        </Button>
                        {Array.from({length: totalPages}, (_, i) => i + 1).slice(0, 5).map(n => (
                            <Button
                                key={n}
                                variant={safePage === n ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPage(n)}
                                className={safePage === n
                                    ? "h-8 min-w-8 px-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
                                    : "h-8 min-w-8 px-2.5 border-border text-muted-foreground rounded-md"}
                            >
                                {n}
                            </Button>
                        ))}
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-border rounded-md"
                            disabled={safePage >= totalPages}
                            onClick={() => setPage(pg => Math.min(totalPages, pg + 1))}
                        >
                            <ChevronRight className="w-4 h-4"/>
                        </Button>
                    </div>
                </div>
            </div>

            {selectedRows.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
                    <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl shadow-primary/40 border border-primary-foreground/10">
                        <span className="text-sm font-bold">
                            {selectedRows.length} {t('admin.itemsSelected', 'Items Selected')}
                        </span>
                        <div className="h-6 w-px bg-primary-foreground/20"/>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBulkEnable}
                                className="flex items-center gap-2 hover:bg-primary-foreground/10 rounded-full text-sm font-semibold text-primary-foreground"
                            >
                                <Play className="w-4 h-4"/>
                                {t('admin.enable', 'Enable')}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBulkDisable}
                                className="flex items-center gap-2 hover:bg-primary-foreground/10 rounded-full text-sm font-semibold text-primary-foreground"
                            >
                                <Pause className="w-4 h-4"/>
                                {t('admin.disable', 'Disable')}
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 rounded-full text-sm font-semibold"
                            >
                                <Trash2 className="w-4 h-4"/>
                                {t('admin.delete', 'Delete')}
                            </Button>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={clearSelection}
                            title={t('admin.clear', 'Clear')}
                            className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full"
                        >
                            <X className="w-5 h-5"/>
                        </Button>
                    </div>
                </div>
            )}

            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <DialogHeader className="px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary"/>
                            {t('admin.newTranscodingProfile', 'New Transcoding Profile')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {t('admin.newTranscodingProfileDesc', 'Define encoding parameters and processing commands.')}
                        </DialogDescription>
                    </DialogHeader>
                    {renderProfileForm(newProfile, setNewProfile, isGifNew, newProfileFfmpeg)}
                    <DialogFooter className="px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}
                                className="rounded-lg h-10 px-5 border-border/60">
                            {t('admin.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={handleCreateNew}
                                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium">
                            {t('admin.saveProfile', 'Save Profile')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <DialogHeader className="px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Edit className="w-5 h-5 text-primary"/>
                            {editingProfile?.id
                                ? t('admin.editProfile', 'Edit Profile')
                                : t('admin.addProfile', 'Add Profile')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {editingProfile?.id
                                ? t('admin.editProfileDesc', 'Update the profile settings')
                                : t('admin.addProfileDesc', 'Create a new transcoding profile')}
                        </DialogDescription>
                    </DialogHeader>
                    {editingProfile && renderProfileForm(editingProfile, setEditingProfile, isGifEdit, editingProfileFfmpeg)}
                    <DialogFooter className="px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}
                                className="rounded-lg h-10 px-5 border-border/60">
                            {t('admin.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={handleSave}
                                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium">
                            {t('admin.save', 'Save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminPageTemplate>
    );
}
