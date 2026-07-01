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
    Play, Pause, ChevronRight, ChevronLeft, X
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
    const vcodec = vcodecMap[codecShort] || codecShort || 'libx264';
    const res = profile.resolution || '720';
    const vb = profile.video_bitrate || '2500k';
    const ab = profile.audio_bitrate || '128k';
    const acodec = profile.audio_codec || 'aac';

    if (ext === 'gif') {
        const fps = profile.bento_parameters?.match(/--fps\s+(\d+)/)?.[1] || '10';
        const scale = profile.bento_parameters?.match(/--scale\s+(\d+)/)?.[1] || '320';
        return `ffmpeg -i input_file \\
  -vf "fps=${fps},scale=${scale}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \\
  -loop 0 \\
  output.gif`;
    }

    const crfMap: Record<string, string> = {libx264: '23', libx265: '28', 'libvpx-vp9': '32'};
    const crf = crfMap[vcodec] || '23';
    const movflags = ext === 'mp4' ? ' -movflags +faststart' : '';

    return `ffmpeg -i input_file \\
  -c:v ${vcodec} -preset medium -crf ${crf} -b:v ${vb} \\
  -vf "scale=-2:${res}" \\
  -c:a ${acodec} -b:a ${ab} \\
  -pix_fmt yuv420p${movflags} \\
  output.${ext}`;
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
            if (height && height !== '-') set.add(height);
        });
        return Array.from(set).sort((a, b) => parseInt(a) - parseInt(b));
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

    const handleSave = async () => {
        if (!editingProfile) return;
        if (!editingProfile.name || !editingProfile.extension) {
            alert("Name and Extension are required fields");
            return;
        }
        const saveData = {...editingProfile};
        if (saveData.extension === 'gif') {
            saveData.video_codec = '-';
            saveData.audio_codec = '';
            saveData.resolution = saveData.resolution || '-';
        }
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
        const saveData = {...newProfile};
        if (saveData.extension === 'gif') {
            saveData.video_codec = '-';
            saveData.audio_codec = '';
            saveData.resolution = saveData.resolution || '-';
        }
        try {
            await encodingApi.profiles.create(saveData);
            setIsAddModalOpen(false);
            setNewProfile({is_active: true, extension: 'mp4', video_codec: 'h264', audio_codec: 'aac'});
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
                setNewProfile({is_active: true, extension: 'mp4', video_codec: 'h264', audio_codec: 'aac'});
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
                                {t('admin.outputExtension', 'Output Extension')} <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={profile.extension || 'mp4'}
                                onValueChange={(v) => update({extension: v})}
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
                            <Input
                                id={`profile-res-${profile.id || 'new'}`}
                                value={profile.resolution || ''}
                                onChange={(e) => update({resolution: e.target.value})}
                                placeholder={isGif ? "e.g. -" : "e.g. 720"}
                                disabled={isGif}
                                className="h-10"
                            />
                        </div>
                        {!isGif && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor={`profile-vcodec-${profile.id || 'new'}`}>
                                        {t('admin.videoCodec', 'Video Codec')}
                                    </Label>
                                    <Select
                                        value={profile.video_codec || 'h264'}
                                        onValueChange={(v) => update({video_codec: v})}
                                    >
                                        <SelectTrigger id={`profile-vcodec-${profile.id || 'new'}`} className="h-10">
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CODEC_OPTIONS.map(o => (
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
                                        value={profile.audio_codec || 'aac'}
                                        onValueChange={(v) => update({audio_codec: v})}
                                    >
                                        <SelectTrigger id={`profile-acodec-${profile.id || 'new'}`} className="h-10">
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="aac">AAC</SelectItem>
                                            <SelectItem value="flac">FLAC</SelectItem>
                                            <SelectItem value="opus">Opus</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}
                        {isGif && (
                            <div className="sm:col-span-2 space-y-2">
                                <Label htmlFor={`profile-bento-${profile.id || 'new'}`}>
                                    {t('admin.bentoParameters', 'GIF Parameters')}
                                </Label>
                                <Input
                                    id={`profile-bento-${profile.id || 'new'}`}
                                    value={profile.bento_parameters || ''}
                                    onChange={(e) => update({bento_parameters: e.target.value})}
                                    placeholder="--fps 10 --scale 320"
                                    className="h-10"
                                />
                            </div>
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
                    <div className="p-4 bg-muted rounded-lg font-mono text-xs text-foreground/90 leading-relaxed border border-border/50">
                        <span className="text-muted-foreground"># Generated FFmpeg Command</span>
                        <br/>
                        {ffmpegCmd.split('\n').map((line, i) => (
                            <div key={i}>{line || '\u00A0'}</div>
                        ))}
                    </div>
                </div>
            </>
        );
    };

    return (
        <AdminPageTemplate
            title={t('admin.transcodingProfiles', '转码配置')}
            description={t('admin.transcodingProfilesDesc', '管理全局视频编码参数和分辨率预设。')}
            actions={pageActions}
            searchPlaceholder={t('admin.searchProfiles', '搜索配置...')}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            filters={pageFilters}
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
