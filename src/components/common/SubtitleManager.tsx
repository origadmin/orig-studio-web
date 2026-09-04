import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {toast} from 'sonner';
import {AlertCircle, ExternalLink, Plus, Settings2, Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Separator} from '@/components/ui/separator';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Alert, AlertTitle} from '@/components/ui/alert';
import {subtitleApi} from '@/lib/api/subtitle';
import {getFullUrl} from '@/lib/utils';

interface SubtitleManagerProps {
    /** 媒体 short_token（字幕端点均以 token 寻址） */
    shortToken: string;
    /** 是否显示语言清单管理（仅 admin——语言清单是全站配置，G5 可配置化） */
    showLangManager?: boolean;
}

/**
 * 字幕管理面板（BUG-186 G5 第 5 项收口）——admin 媒体编辑页与门户属主编辑页
 * 共用。上传（srt/vtt 统一转 vtt，行号级失败原因）/ 列表 / 删除；语言清单
 * 管理仅 admin（showLangManager）。
 */
export function SubtitleManager({shortToken, showLangManager = false}: SubtitleManagerProps) {
    const {t} = useTranslation();

    const [subtitleList, setSubtitleList] = useState<any[]>([]);
    const [subtitleLanguages, setSubtitleLanguages] = useState<Array<{code: string; label: string}>>([]);
    const [subtitleLang, setSubtitleLang] = useState('');
    const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
    const [subtitleUploading, setSubtitleUploading] = useState(false);
    const [subtitleDeleting, setSubtitleDeleting] = useState<string | null>(null);
    const [subtitleMsg, setSubtitleMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);

    // 语言清单管理（admin only）
    const [langDialogOpen, setLangDialogOpen] = useState(false);
    const [langList, setLangList] = useState<Array<{code: string; label: string}>>([]);
    const [newLangCode, setNewLangCode] = useState('');
    const [newLangLabel, setNewLangLabel] = useState('');
    const [langError, setLangError] = useState('');
    const [langSaving, setLangSaving] = useState(false);

    useEffect(() => {
        if (!shortToken) return;
        subtitleApi.getByMediaId(shortToken).then((list) => setSubtitleList(Array.isArray(list) ? list : [])).catch(() => setSubtitleList([]));
        subtitleApi.getLanguages().then((langs) => setSubtitleLanguages(Array.isArray(langs) ? langs : [])).catch(() => {});
    }, [shortToken]);

    const reloadList = async () => {
        const list = await subtitleApi.getByMediaId(shortToken);
        setSubtitleList(Array.isArray(list) ? list : []);
    };

    const handleSubtitleUpload = async () => {
        if (!shortToken || !subtitleFile || !subtitleLang) {
            setSubtitleMsg({kind: 'err', text: t('mediaEdit.subtitleNeedFileLang', '请选择语言并选择字幕文件')});
            return;
        }
        setSubtitleUploading(true);
        setSubtitleMsg(null);
        try {
            const created = await subtitleApi.upload(shortToken, subtitleFile, subtitleLang);
            setSubtitleMsg({kind: created.status === 'failed' ? 'err' : 'ok', text: created.error_message || t('mediaEdit.subtitleUploaded', '字幕已上传')});
            setSubtitleFile(null);
            setSubtitleLang('');
            await reloadList();
        } catch (e: any) {
            setSubtitleMsg({kind: 'err', text: e?.message || t('common.unknownError', '未知错误')});
        } finally {
            setSubtitleUploading(false);
        }
    };

    const handleSubtitleDelete = async (id: string) => {
        setSubtitleDeleting(id);
        try {
            await subtitleApi.delete(id);
            await reloadList();
        } catch (e: any) {
            setSubtitleMsg({kind: 'err', text: e?.message || t('mediaEdit.subtitleDeleteFailed', '删除失败')});
        } finally {
            setSubtitleDeleting(null);
        }
    };

    // ---- 语言清单管理（G5：增删即持久化） ----
    const openLanguageDialog = async () => {
        setLangError('');
        setNewLangCode('');
        setNewLangLabel('');
        try {
            const langs = await subtitleApi.getAdminLanguages();
            setLangList(langs || []);
            setLangDialogOpen(true);
        } catch (e: any) {
            setLangError(e?.message || t('mediaEdit.langLoadFailed', '加载语言列表失败'));
            setLangDialogOpen(true);
        }
    };

    const addLanguageRow = () => {
        const code = newLangCode.trim().toLowerCase();
        const label = newLangLabel.trim();
        if (!code || !label) {
            setLangError(t('mediaEdit.langNeedBoth', '语言代码和名称都不能为空'));
            return;
        }
        if (langList.some((l) => l.code === code)) {
            setLangError(t('mediaEdit.langDuplicate', '语言代码已存在'));
            return;
        }
        const next = [...langList, {code, label}];
        setLangList(next);
        setNewLangCode('');
        setNewLangLabel('');
        setLangError('');
        void persistLanguages(next);
    };

    const persistLanguages = async (list: Array<{code: string; label: string}>) => {
        if (list.length === 0) {
            setLangError(t('mediaEdit.langNeedOne', '至少保留一种语言'));
            return;
        }
        setLangSaving(true);
        setLangError('');
        try {
            const saved = await subtitleApi.saveAdminLanguages(list);
            setSubtitleLanguages(Array.isArray(saved) ? saved : list);
            toast.success(t('mediaEdit.langSaved', '语言清单已保存'));
        } catch (e: any) {
            setLangError(e?.message || t('mediaEdit.langSaveFailed', '保存语言清单失败'));
            toast.error(t('mediaEdit.langSaveFailed', '保存语言清单失败'));
        } finally {
            setLangSaving(false);
        }
    };

    const removeLanguageRow = (code: string) => {
        const next = langList.filter((l) => l.code !== code);
        if (next.length === 0) {
            setLangError(t('mediaEdit.langNeedOne', '至少保留一种语言'));
            return;
        }
        setLangList(next);
        setLangError('');
        void persistLanguages(next);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-semibold">{t('mediaEdit.subtitles', '字幕管理')}</CardTitle>
                    {showLangManager && (
                        <Button variant="outline" size="sm" className="h-8"
                                title={t('mediaEdit.manageLanguages', '管理语言清单')}
                                onClick={openLanguageDialog}>
                            <Settings2 className="w-4 h-4 mr-1"/>
                            {t('mediaEdit.manageLanguages', '管理语言')}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {subtitleMsg && (
                    <div className={`text-xs px-3 py-2 rounded-lg ${subtitleMsg.kind === 'ok' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {subtitleMsg.text}
                    </div>
                )}
                {/* 添加字幕 */}
                <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">{t('mediaEdit.addSubtitle', '添加字幕')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold uppercase tracking-wider">{t('mediaEdit.subtitleLanguage', '语言')}</Label>
                            <Select value={subtitleLang} onValueChange={setSubtitleLang}>
                                <SelectTrigger className="h-9 w-full"><SelectValue placeholder={t('mediaEdit.selectLanguage', '选择语言')}/></SelectTrigger>
                                <SelectContent>
                                    {subtitleLanguages.map((l) => (
                                        <SelectItem key={l.code} value={l.code}>{l.label} ({l.code})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold uppercase tracking-wider">{t('mediaEdit.subtitleFile', '文件 (SRT/VTT，统一转 VTT)')}</Label>
                            <Input type="file" accept=".srt,.vtt"
                                   className="w-full bg-card h-9"
                                   onChange={(e) => setSubtitleFile(e.target.files?.[0] || null)}/>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold uppercase tracking-wider invisible">.</Label>
                            <Button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold"
                                    disabled={subtitleUploading}
                                    onClick={handleSubtitleUpload}>
                                {subtitleUploading ? t('common.loading', '上传中...') : t('mediaEdit.subtitleUpload', '上传')}
                            </Button>
                        </div>
                    </div>
                </div>

                <Separator/>

                {/* 当前字幕列表（failed 显示行号级错误） */}
                <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">{t('mediaEdit.currentSubtitles', '当前字幕')}</h3>
                    <Table>
                        <TableHeader className="text-muted-foreground border-b border-border uppercase">
                            <TableRow>
                                <TableHead className="pb-2 font-bold">{t('mediaEdit.subtitleLanguage', '语言')}</TableHead>
                                <TableHead className="pb-2 font-bold">{t('mediaEdit.subtitleLabel', '标签')}</TableHead>
                                <TableHead className="pb-2 font-bold">{t('mediaEdit.subtitleStatus', '状态')}</TableHead>
                                <TableHead className="pb-2 font-bold">{t('mediaEdit.subtitleLink', '链接')}</TableHead>
                                <TableHead className="pb-2 font-bold w-[80px]">{t('mediaEdit.subtitleAction', '操作')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/10">
                            {subtitleList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                        {t('mediaEdit.noSubtitles', '暂无字幕')}
                                    </TableCell>
                                </TableRow>
                            ) : subtitleList.map((s: any) => (
                                <TableRow key={s.id}>
                                    <TableCell className="py-2.5">{s.language}</TableCell>
                                    <TableCell className="py-2.5">{s.label || '-'}</TableCell>
                                    <TableCell className="py-2.5">
                                        {s.status === 'active' ? (
                                            <Badge variant="soft-success">{t('mediaEdit.subtitleActive', '已生效')}</Badge>
                                        ) : s.status === 'failed' ? (
                                            <span className="text-xs text-destructive flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3"/>
                                                {t('mediaEdit.subtitleFailed', '格式错误')}
                                            </span>
                                        ) : (
                                            <Badge variant="soft-neutral">{s.status}</Badge>
                                        )}
                                        {s.error_message && (
                                            <div className="text-[11px] text-destructive mt-0.5 max-w-[260px] truncate" title={s.error_message}>
                                                {s.error_message}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-2.5">
                                        {s.file_url ? (
                                            <a href={getFullUrl(s.file_url)} target="_blank" rel="noreferrer"
                                               className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                                                <ExternalLink className="w-3 h-3"/>{s.file_url.split('/').pop()}
                                            </a>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell className="py-2.5">
                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive"
                                                disabled={subtitleDeleting === s.id}
                                                onClick={() => handleSubtitleDelete(s.id)}>
                                            <Trash2 className="w-3.5 h-3.5"/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            {/* 语言清单管理对话框（admin only） */}
            {showLangManager && (
                <Dialog open={langDialogOpen} onOpenChange={setLangDialogOpen}>
                    <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
                        <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                                <Settings2 className="w-5 h-5"/>
                                {t('mediaEdit.manageLanguages', '管理语言清单')}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="p-6 space-y-4">
                            {langError && (
                                <Alert variant="destructive">
                                    <AlertTitle className="text-xs">{langError}</AlertTitle>
                                </Alert>
                            )}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider">{t('mediaEdit.langCurrent', '当前语言')}</Label>
                                {langList.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-2">{t('mediaEdit.langEmpty', '暂无语言，请添加')}</p>
                                ) : (
                                    langList.map((l) => (
                                        <div key={l.code} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted">
                                            <span className="text-sm font-medium">{l.label} <span className="text-muted-foreground">({l.code})</span></span>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                                                    disabled={langSaving}
                                                    onClick={() => removeLanguageRow(l.code)}
                                                    title={t('mediaEdit.langRemove', '移除')}>
                                                <Trash2 className="w-4 h-4"/>
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                            <Separator/>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider">{t('mediaEdit.langAdd', '添加语言')}</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input className="h-9 bg-card" placeholder={t('mediaEdit.langCode', '代码 (zh)')}
                                           value={newLangCode} onChange={(e) => setNewLangCode(e.target.value)}/>
                                    <Input className="h-9 bg-card" placeholder={t('mediaEdit.langLabel', '名称 (中文)')}
                                           value={newLangLabel} onChange={(e) => setNewLangLabel(e.target.value)}/>
                                </div>
                                <Button variant="outline" size="sm" className="w-full" onClick={addLanguageRow}>
                                    <Plus className="w-4 h-4 mr-1"/>{t('mediaEdit.langAddRow', '添加')}
                                </Button>
                            </div>
                        </div>
                        <DialogFooter className="mx-0 px-6 py-4 border-t border-border">
                            <DialogClose asChild>
                                <Button variant="outline" size="sm">{t('common.cancel', '取消')}</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </Card>
    );
}
