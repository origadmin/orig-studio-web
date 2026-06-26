import {useTranslation} from 'react-i18next';
import {Label} from '@/components/ui/label';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Separator} from '@/components/ui/separator';
import {formatFileSize, formatDuration} from '@/lib/format';
import type {Media} from '@/lib/api/media';

export interface MediaEditFormState {
    title: string;
    description: string;
    category_id: string | number;
    tags: string;
    privacy: number;
    state: string;
    enable_comments: boolean;
    allow_download: boolean;
    featured?: boolean;
    listable?: boolean;
}

interface MediaEditFormProps {
    form: MediaEditFormState;
    setForm: (form: MediaEditFormState) => void;
    media: Media;
    categories: any;
    isAdmin: boolean;
    /** Whether to show admin-only fields (featured, listable). Portal should pass false even for admin users. */
    showAdminOnlyFields?: boolean;
}

export function MediaEditForm({form, setForm, media, categories, isAdmin, showAdminOnlyFields = true}: MediaEditFormProps) {
    const {t} = useTranslation();
    const categoriesList = (categories as any)?.items
        ? (categories as any).items
        : Array.isArray(categories) ? categories : [];

    const na = t('common.na', 'N/A');
    const techResolution = media.width && media.height ? `${media.width} x ${media.height}` : na;
    const techDuration = media.duration ? formatDuration(media.duration) : na;
    const techMimeType = media.mime_type || na;
    const techFileSize = media.size ? formatFileSize(Number(media.size)) : na;
    const techExtension = media.extension || na;

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="title">{t('media.editForm.title', 'Title')}</Label>
                <Input
                    id="title"
                    value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">{t('media.editForm.description', 'Description')}</Label>
                <textarea
                    id="description"
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                    placeholder={t('media.editForm.descriptionPlaceholder', 'Describe your media...')}
                />
            </div>

            <div className="space-y-2">
                <Label>{t('media.editForm.category', 'Category')}</Label>
                <Select
                    value={form.category_id !== '' && form.category_id !== undefined ? String(form.category_id) : '_none_'}
                    onValueChange={val => setForm({...form, category_id: val === '_none_' ? '' : val})}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t('media.editForm.selectCategory', 'Select category')}/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_none_">{t('media.editForm.noCategory', 'No category')}</SelectItem>
                        {categoriesList.map((cat: any) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                                {cat.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="tags">{t('media.editForm.tags', 'Tags (comma separated)')}</Label>
                <Input
                    id="tags"
                    value={form.tags}
                    onChange={e => setForm({...form, tags: e.target.value})}
                    placeholder={t('media.editForm.tagsPlaceholder', 'e.g. tutorial, coding, devops')}
                />
                {form.tags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {form.tags.split(',').map((tag, i) => tag.trim() && (
                            <Badge key={i} variant="secondary" className="text-xs">{tag.trim()}</Badge>
                        ))}
                    </div>
                )}
            </div>

            <Separator/>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{t('media.editForm.technicalInfo', 'Technical Info')}</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('media.editForm.resolution', 'Resolution')}</Label>
                        <p className="text-sm font-mono">{techResolution}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('media.editForm.duration', 'Duration')}</Label>
                        <p className="text-sm font-mono">{techDuration}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('media.editForm.mimeType', 'MIME Type')}</Label>
                        <p className="text-sm font-mono">{techMimeType}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('media.editForm.fileSize', 'File Size')}</Label>
                        <p className="text-sm font-mono">{techFileSize}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('media.editForm.extension', 'Extension')}</Label>
                        <p className="text-sm font-mono">{techExtension}</p>
                    </div>
                </div>
            </div>

            <Separator/>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('media.editForm.privacy', 'Privacy')}</Label>
                    <Select
                        value={String(form.privacy)}
                        onValueChange={val => setForm({...form, privacy: Number(val)})}
                    >
                        <SelectTrigger>
                            <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">{t('common.public', 'Public')}</SelectItem>
                            <SelectItem value="3">{t('common.unlisted', 'Unlisted')}</SelectItem>
                            <SelectItem value="2">{t('common.private', 'Private')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {isAdmin && (
                    <div className="space-y-2">
                        <Label>{t('media.editForm.state', 'State')}</Label>
                        <Select
                            value={form.state}
                            onValueChange={val => setForm({...form, state: val})}
                        >
                            <SelectTrigger>
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="draft">{t('admin.draftStatus', 'Draft')}</SelectItem>
                                <SelectItem value="active">{t('admin.publishedStatus', 'Published')}</SelectItem>
                                <SelectItem value="deleted">{t('admin.deletedStatus', 'Deleted')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <Separator/>

            <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="enable_comments"
                        checked={form.enable_comments}
                        onChange={e => setForm({...form, enable_comments: e.target.checked})}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <div>
                        <Label htmlFor="enable_comments" className="cursor-pointer">{t('media.editForm.allowComments', 'Allow Comments')}</Label>
                        <p className="text-xs text-muted-foreground">{t('media.editForm.allowCommentsDesc', 'Users can leave comments')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="allow_download"
                        checked={form.allow_download}
                        onChange={e => setForm({...form, allow_download: e.target.checked})}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <div>
                        <Label htmlFor="allow_download" className="cursor-pointer">{t('media.editForm.allowDownload', 'Allow Download')}</Label>
                        <p className="text-xs text-muted-foreground">{t('media.editForm.allowDownloadDesc', 'Users can download the original file')}</p>
                    </div>
                </div>
            </div>

            {showAdminOnlyFields && (
                <>
                    <Separator/>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="featured"
                                checked={form.featured ?? false}
                                onChange={e => setForm({...form, featured: e.target.checked})}
                                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                            />
                            <div>
                                <Label htmlFor="featured" className="cursor-pointer">{t('media.editForm.featured', 'Featured')}</Label>
                                <p className="text-xs text-muted-foreground">{t('media.editForm.featuredDesc', 'Show in featured section')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="listable"
                                checked={form.listable ?? false}
                                onChange={e => setForm({...form, listable: e.target.checked})}
                                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                            />
                            <div>
                                <Label htmlFor="listable" className="cursor-pointer">{t('media.editForm.listable', 'Listable')}</Label>
                                <p className="text-xs text-muted-foreground">{t('media.editForm.listableDesc', 'Show in video listings')}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
