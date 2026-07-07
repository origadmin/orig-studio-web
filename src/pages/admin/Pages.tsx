import React, {useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {Link} from '@tanstack/react-router';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Switch} from '@/components/ui/switch';
import {Label} from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Plus,
    Pencil,
    Trash2,
    FileText,
    Eye,
    Globe,
} from 'lucide-react';
import {adminPortalApi, type CustomPage, type CreateCustomPageRequest} from '@/lib/api/portal';

const Pages: React.FC = () => {
    const {t} = useTranslation();
    const [pages, setPages] = useState<CustomPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPage, setEditingPage] = useState<CustomPage | null>(null);
    const [form, setForm] = useState<CreateCustomPageRequest>({
        title: '',
        slug: '',
        type: 'static',
        content_format: 'markdown',
        content: '',
        layout: 'default',
        is_published: false,
    });

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        try {
            const res = await adminPortalApi.listPages();
            setPages(res.items || []);
        } catch (error) {
            console.error('Failed to fetch pages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingPage(null);
        setForm({
            title: '',
            slug: '',
            type: 'static',
            content_format: 'markdown',
            content: '',
            layout: 'default',
            is_published: false,
        });
        setDialogOpen(true);
    };

    const handleEdit = (page: CustomPage) => {
        setEditingPage(page);
        setForm({
            title: page.title,
            slug: page.slug,
            type: page.type,
            content_format: page.content_format,
            content: page.content,
            layout: page.layout,
            is_published: page.is_published,
            seo_title: page.seo_title,
            seo_description: page.seo_description,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editingPage) {
                await adminPortalApi.updatePage(editingPage.id, form);
            } else {
                await adminPortalApi.createPage(form);
            }
            setDialogOpen(false);
            fetchPages();
        } catch (error) {
            console.error('Failed to save page:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('admin.confirmDelete', 'Are you sure?'))) return;
        try {
            await adminPortalApi.deletePage(id);
            fetchPages();
        } catch (error) {
            console.error('Failed to delete page:', error);
        }
    };

    const handleTogglePublish = async (page: CustomPage) => {
        try {
            await adminPortalApi.updatePage(page.id, {is_published: !page.is_published});
            fetchPages();
        } catch (error) {
            console.error('Failed to toggle publish:', error);
        }
    };

    const generateSlug = (title: string) => {
        return title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '');
    };

    if (loading) {
        return <div className="flex items-center justify-center p-8"><p>{t('common.loading', 'Loading...')}</p></div>;
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            <Breadcrumb className="mb-4">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/admin">{t('admin.breadcrumb.dashboard', '仪表盘')}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('admin.breadcrumb.pages', '自定义页面')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('admin.pages.title', 'Custom Pages')}</h1>
                    <p className="text-muted-foreground">{t('admin.pages.description', 'Manage custom pages and portal navigation')}</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4"/>
                    {t('admin.pages.create', 'New Page')}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5"/>
                        {t('admin.pages.list', 'Pages')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {pages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {t('admin.pages.empty', 'No custom pages yet. Create one to get started.')}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pages.map(page => (
                                <div key={page.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-4 w-4 text-muted-foreground"/>
                                        <div>
                                            <div className="font-medium flex items-center gap-2">
                                                {page.title}
                                                {page.is_published ? (
                                                    <Badge variant="default" className="text-xs">
                                                        <Globe className="h-3 w-3 mr-1"/>
                                                        {t('admin.pages.published', 'Published')}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {t('admin.pages.draft', 'Draft')}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                /p/{page.slug} · {page.type} · <Eye className="h-3 w-3 inline"/>{page.view_count}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 mr-2">
                                            <Switch
                                                checked={page.is_published}
                                                onCheckedChange={() => handleTogglePublish(page)}
                                            />
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(page)}>
                                            <Pencil className="h-4 w-4"/>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(page.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="p-0 gap-0 overflow-hidden max-h-[calc(100vh-4rem)] overflow-y-auto max-w-2xl">
                    <DialogHeader className="mx-0 px-6 py-5 border-b border-border">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            {editingPage ? <Pencil className="w-5 h-5 text-primary"/> : <Plus className="w-5 h-5 text-primary"/>}
                            {editingPage ? t('admin.pages.edit', 'Edit Page') : t('admin.pages.create', 'New Page')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            {editingPage ? t('admin.pages.editDesc', 'Update page content, settings and SEO information') : t('admin.pages.createDesc', 'Create a new custom page for your portal')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('admin.pages.form.title', 'Title')}</Label>
                                <Input
                                    value={form.title}
                                    onChange={e => {
                                        setForm(prev => ({
                                            ...prev,
                                            title: e.target.value,
                                            slug: prev.slug || generateSlug(e.target.value),
                                        }));
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('admin.pages.form.slug', 'Slug')}</Label>
                                <Input
                                    value={form.slug}
                                    onChange={e => setForm(prev => ({...prev, slug: e.target.value}))}
                                    placeholder="page-slug"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('admin.pages.form.type', 'Type')}</Label>
                                <select
                                    className="w-full h-9 rounded-input border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={form.type}
                                    onChange={e => setForm(prev => ({...prev, type: e.target.value as any}))}
                                >
                                    <option value="static">Static</option>
                                    <option value="markdown">Markdown</option>
                                    <option value="rich_text">Rich Text</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('admin.pages.form.format', 'Content Format')}</Label>
                                <select
                                    className="w-full h-9 rounded-input border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={form.content_format}
                                    onChange={e => setForm(prev => ({...prev, content_format: e.target.value as any}))}
                                >
                                    <option value="markdown">Markdown</option>
                                    <option value="html">HTML</option>
                                    <option value="plain">Plain Text</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('admin.pages.form.content', 'Content')}</Label>
                            <textarea
                                className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={form.content}
                                onChange={e => setForm(prev => ({...prev, content: e.target.value}))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('admin.pages.form.seoTitle', 'SEO Title')}</Label>
                                <Input
                                    value={form.seo_title || ''}
                                    onChange={e => setForm(prev => ({...prev, seo_title: e.target.value}))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('admin.pages.form.seoDescription', 'SEO Description')}</Label>
                                <Input
                                    value={form.seo_description || ''}
                                    onChange={e => setForm(prev => ({...prev, seo_description: e.target.value}))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mx-0 px-6 py-4 bg-muted/50 border-t border-border flex-row justify-end gap-3">
                        <Button variant="outline" className="rounded-lg h-10 px-5 border-border/60" onClick={() => setDialogOpen(false)}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg shadow-primary/20 h-10 px-6 font-medium" onClick={handleSave} disabled={!form.title || !form.slug}>
                            {t('common.save', 'Save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Pages;
