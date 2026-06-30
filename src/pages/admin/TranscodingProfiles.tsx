/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 */

import {useEffect, useState, useMemo} from "react";
import {useTranslation} from "react-i18next";
import {Link} from "@tanstack/react-router";
import {encodingApi, type EncodeProfile} from "../../lib/api/media";
import {Button} from "../../components/ui/button";
import {Input} from "../../components/ui/input";
import {Label} from "../../components/ui/label";
import {Badge} from "../../components/ui/badge";
import {Switch} from "../../components/ui/switch";
import {Card, CardContent} from "../../components/ui/card";
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
    Sliders, Search, RotateCcw, Plus, Upload, Edit, Trash2, Copy,
    Play, Pause, ChevronRight, ChevronLeft, X
} from "lucide-react";
import {AdminPageTemplate} from "../../components/AdminPageTemplate";

export default function TranscodingProfiles() {
    const {t} = useTranslation();

    const [profiles, setProfiles] = useState<EncodeProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingProfile, setEditingProfile] = useState<Partial<EncodeProfile> | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Filter / selection state
    const [searchQuery, setSearchQuery] = useState('');
    const [codecFilter, setCodecFilter] = useState<string>('-');
    const [resolutionFilter, setResolutionFilter] = useState<string>('-');
    const [selectedRows, setSelectedRows] = useState<number[]>([]);

    // Pagination
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // Add Profile modal (matches prototype)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newProfile, setNewProfile] = useState<Partial<EncodeProfile>>({
        is_active: true,
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

    // Available filter options
    const availableCodecs = useMemo(() => {
        const set = new Set<string>();
        profiles.forEach(p => {
            if (p.video_codec) set.add(p.video_codec);
        });
        return Array.from(set);
    }, [profiles]);

    const availableResolutions = useMemo(() => {
        const set = new Set<string>();
        profiles.forEach(p => {
            if (!p.resolution) return;
            const height = p.resolution.split('x')[1] || p.resolution;
            if (height) set.add(height);
        });
        return Array.from(set).sort((a, b) => parseInt(a) - parseInt(b));
    }, [profiles]);

    // Filtering
    const filteredProfiles = useMemo(() => {
        let result = [...profiles];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.video_codec.toLowerCase().includes(q) ||
                p.resolution.toLowerCase().includes(q)
            );
        }

        if (codecFilter && codecFilter !== '-') {
            result = result.filter(p => p.video_codec === codecFilter);
        }

        if (resolutionFilter && resolutionFilter !== '-') {
            result = result.filter(p => {
                const height = p.resolution.split('x')[1] || p.resolution;
                return height === resolutionFilter;
            });
        }

        return result;
    }, [profiles, searchQuery, codecFilter, resolutionFilter]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredProfiles.length);
    const paginatedProfiles = filteredProfiles.slice(startIndex, endIndex);

    // Selection
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

    // Bulk actions
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

    // Row actions
    const handleEdit = (p: EncodeProfile) => {
        setEditingProfile({...p});
        setIsDialogOpen(true);
    };

    const handleDuplicate = (p: EncodeProfile) => {
        const {id: _id, ...rest} = p;
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
        try {
            if (editingProfile.id) {
                setProfiles(prev => prev.map(p =>
                    p.id === editingProfile.id ? {...p, ...editingProfile} as EncodeProfile : p
                ));
                await encodingApi.profiles.update(editingProfile.id, editingProfile);
            } else {
                await encodingApi.profiles.create(editingProfile);
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
        try {
            await encodingApi.profiles.create(newProfile);
            setIsAddModalOpen(false);
            setNewProfile({is_active: true});
            fetchProfiles();
        } catch (error) {
            console.error("Failed to create profile:", error);
            fetchProfiles();
        }
    };

    const resetFilters = () => {
        setSearchQuery('');
        setCodecFilter('-');
        setResolutionFilter('-');
    };

    // ffmpeg command preview
    const ffmpegCommand = useMemo(() => {
        const ext = newProfile.extension || 'mp4';
        const codec = newProfile.video_codec || 'libx264';
        const res = newProfile.resolution || '1920x1080';
        return `ffmpeg -i input_file \\
  -c:v ${codec} -crf 23 \\
  -vf "scale=${res.replace('x', ':')}" \\
  -c:a aac -b:a 192k \\
  output.${ext}`;
    }, [newProfile.extension, newProfile.video_codec, newProfile.resolution]);

    const pageActions = (
        <Button
            variant="outline"
            onClick={() => {
                setNewProfile({is_active: true});
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
                    <SelectItem value="-">{t('admin.allCodecs', 'All Codecs')}</SelectItem>
                    {availableCodecs.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={resolutionFilter} onValueChange={setResolutionFilter}>
                <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder={t('admin.allResolutions', 'All Resolutions')}/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="-">{t('admin.allResolutions', 'All Resolutions')}</SelectItem>
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
            {/* ═══ Table ════════════════════════════════ */}
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
                                <TableCell colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    {t('admin.loading', 'Loading profiles...')}
                                </TableCell>
                            </TableRow>
                        ) : paginatedProfiles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="px-4 py-8 text-center">
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
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                                            {p.video_codec}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-xs font-mono text-muted-foreground">
                                        {p.resolution}
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
                                        —
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

                {/* ═══ Pagination ════════════════════════════════ */}
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
                            onClick={() => setPage(p => Math.max(1, p - 1))}
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
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        >
                            <ChevronRight className="w-4 h-4"/>
                        </Button>
                    </div>
                </div>
            </div>

            {/* ═══ Bulk Action Bar ════════════════════════════════ */}
            {selectedRows.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
                    <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl shadow-primary/40 border border-primary-foreground/10">
                        <span className="text-sm font-bold">
                            {selectedRows.length} {t('admin.itemsSelected', 'Items Selected')}
                        </span>
                        <div className="h-6 w-px bg-primary-foreground/20" />
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBulkEnable}
                                className="flex items-center gap-2 hover:bg-primary-foreground/10 rounded-full text-sm font-semibold text-primary-foreground"
                            >
                                <Play className="w-4 h-4" />
                                {t('admin.enable', 'Enable')}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBulkDisable}
                                className="flex items-center gap-2 hover:bg-primary-foreground/10 rounded-full text-sm font-semibold text-primary-foreground"
                            >
                                <Pause className="w-4 h-4" />
                                {t('admin.disable', 'Disable')}
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 rounded-full text-sm font-semibold"
                            >
                                <Trash2 className="w-4 h-4" />
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
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* ═══ New Profile Modal ════════════════════════════════ */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            {t('admin.newTranscodingProfile', 'New Transcoding Profile')}
                        </DialogTitle>
                        <DialogDescription>
                            {t(
                                'admin.newTranscodingProfileDesc',
                                'Define encoding parameters and processing commands.'
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-2">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="np-name">
                                    {t('admin.profileName', 'Profile Name')}
                                </Label>
                                <Input
                                    id="np-name"
                                    value={newProfile.name || ''}
                                    onChange={(e) => setNewProfile({...newProfile, name: e.target.value})}
                                    placeholder="e.g. 1080p Main Performance"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="np-ext">
                                    {t('admin.outputExtension', 'Output Extension')}
                                </Label>
                                <Select
                                    value={newProfile.extension || 'mp4'}
                                    onValueChange={(v) => setNewProfile({...newProfile, extension: v})}
                                >
                                    <SelectTrigger id="np-ext">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mp4">.mp4</SelectItem>
                                        <SelectItem value="mkv">.mkv</SelectItem>
                                        <SelectItem value="webm">.webm</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="np-res">
                                    {t('admin.resolution', 'Resolution')}
                                </Label>
                                <Input
                                    id="np-res"
                                    value={newProfile.resolution || ''}
                                    onChange={(e) => setNewProfile({...newProfile, resolution: e.target.value})}
                                    placeholder="1920x1080"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="np-vcodec">
                                    {t('admin.videoCodec', 'Video Codec')}
                                </Label>
                                <Select
                                    value={newProfile.video_codec || 'libx264'}
                                    onValueChange={(v) => setNewProfile({...newProfile, video_codec: v})}
                                >
                                    <SelectTrigger id="np-vcodec">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="libx264">libx264 (H.264)</SelectItem>
                                        <SelectItem value="libx265">libx265 (H.265/HEVC)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="np-acodec">
                                    {t('admin.audioCodec', 'Audio Codec')}
                                </Label>
                                <Select
                                    value={newProfile.audio_codec || 'aac'}
                                    onValueChange={(v) => setNewProfile({...newProfile, audio_codec: v})}
                                >
                                    <SelectTrigger id="np-acodec">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="aac">aac (Advanced Audio Coding)</SelectItem>
                                        <SelectItem value="flac">flac (Lossless)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="p-4 bg-zinc-900 rounded-lg font-mono text-xs text-indigo-300 leading-relaxed">
                            <span className="text-zinc-500"># Generated FFmpeg Command</span>
                            <br />
                            {ffmpegCommand.split('\n').map((line, i) => (
                                <div key={i}>{line || '\u00A0'}</div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                            {t('admin.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={handleCreateNew}>
                            {t('admin.saveProfile', 'Save Profile')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ Edit Profile Dialog ════════════════════════════════ */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingProfile?.id
                                ? t('admin.editProfile', 'Edit Profile')
                                : t('admin.addProfile', 'Add Profile')}
                        </DialogTitle>
                        <DialogDescription>
                            {editingProfile?.id
                                ? t('admin.editProfileDesc', 'Update the profile settings')
                                : t('admin.addProfileDesc', 'Create a new transcoding profile')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="ep-name" className="text-right">
                                {t('admin.name', 'Name')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="ep-name"
                                value={editingProfile?.name || ''}
                                onChange={(e) => setEditingProfile({...editingProfile, name: e.target.value})}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="ep-ext" className="text-right">
                                {t('admin.extension', 'Extension')} <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={editingProfile?.extension || ''}
                                onValueChange={(v) => setEditingProfile({...editingProfile, extension: v})}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select extension" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mp4">MP4</SelectItem>
                                    <SelectItem value="webm">WebM</SelectItem>
                                    <SelectItem value="mkv">MKV</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="ep-res" className="text-right">
                                {t('admin.resolution', 'Resolution')}
                            </Label>
                            <Input
                                id="ep-res"
                                value={editingProfile?.resolution || ''}
                                onChange={(e) => setEditingProfile({...editingProfile, resolution: e.target.value})}
                                placeholder="1920x1080"
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="ep-vcodec" className="text-right">
                                {t('admin.videoCodec', 'Video Codec')}
                            </Label>
                            <Select
                                value={editingProfile?.video_codec || ''}
                                onValueChange={(v) => setEditingProfile({...editingProfile, video_codec: v})}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select video codec" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="libx264">libx264 (H.264)</SelectItem>
                                    <SelectItem value="libx265">libx265 (H.265/HEVC)</SelectItem>
                                    <SelectItem value="libvpx-vp9">libvpx-vp9 (VP9)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="ep-active" className="text-right">
                                {t('admin.active', 'Active')}
                            </Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Switch
                                    id="ep-active"
                                    checked={editingProfile?.is_active ?? true}
                                    onCheckedChange={(checked) => setEditingProfile({
                                        ...editingProfile,
                                        is_active: checked === true,
                                    })}
                                />
                                <Label htmlFor="ep-active" className="text-sm font-medium leading-none cursor-pointer">
                                    {t('admin.enableProfile', 'Enable this profile')}
                                </Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            {t('admin.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={handleSave}>
                            {t('admin.save', 'Save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminPageTemplate>
    );
}
