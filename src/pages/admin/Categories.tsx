import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import {Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator} from '@/components/ui/breadcrumb';
import {
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Plus,
  FolderTree,
  Activity,
  Layers,
  Film,
  Folder,
  CornerDownRight,
  Leaf,
  PlusSquare,
  Edit3,
  Trash2,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { adminCategoryApi, type Category } from '@/lib/api/category';
import type { CategoryTreeNode } from '@/lib/utils/categoryTree';
import { useCategoryTree } from '@/hooks/useCategoryTree';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const Categories: React.FC = () => {
  const { t } = useTranslation();
  const {
    tree,
    visibleNodes,
    expandedIds,
    loading,
    loadCategories,
    toggleExpand,
    expandAll,
    collapseAll,
    expandNode,
    stats,
  } = useCategoryTree();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog state
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'addChild'>('create');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<CategoryTreeNode | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryTreeNode | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
    slug: '',
    description: '',
    parent_id: undefined,
    order: 0,
    status: 1,
  });

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ---- Max Depth (computed from tree) ----
  const maxDepth = useMemo(() => {
    let max = 0;
    const walk = (nodes: CategoryTreeNode[]) => {
      for (const node of nodes) {
        if (node.depth > max) max = node.depth;
        walk(node.children);
      }
    };
    walk(tree);
    return max;
  }, [tree]);

  // ---- Indent style (matches prototype pl-6 / pl-12 / pl-20) ----
  const getIndentStyle = (depth: number): React.CSSProperties => {
    let px: number;
    if (depth === 0) px = 24;
    else if (depth === 1) px = 48;
    else if (depth === 2) px = 80;
    else px = 80 + (depth - 2) * 32;
    return { paddingLeft: `${px}px` };
  };

  // ---- Dialog handlers ----

  const openCreateDialog = useCallback(() => {
    setDialogMode('create');
    setCurrentCategory(null);
    setFormData({ name: '', slug: '', description: '', parent_id: undefined, order: 0, status: 1 });
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((category: CategoryTreeNode) => {
    setDialogMode('edit');
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      parent_id: category.parent_id ?? undefined,
      order: category.order ?? 0,
      status: category.status ?? 1,
    });
    setDialogOpen(true);
  }, []);

  const openAddChildDialog = useCallback((category: CategoryTreeNode) => {
    setDialogMode('addChild');
    setCurrentCategory(category);
    setFormData({ name: '', slug: '', description: '', parent_id: category.id, order: 0, status: 1 });
    setDialogOpen(true);
  }, []);

  const openDeleteDialog = useCallback((category: CategoryTreeNode) => {
    setDeleteTarget(category);
    setDeleteDialogOpen(true);
  }, []);

  // ---- Action handlers ----

  const handleDialogSubmit = useCallback(
    async () => {
      try {
        if (dialogMode === 'create' || dialogMode === 'addChild') {
          await adminCategoryApi.create(formData);
          await loadCategories();
          if (dialogMode === 'addChild' && formData.parent_id) {
            expandNode(formData.parent_id);
          }
        } else if (dialogMode === 'edit' && currentCategory) {
          await adminCategoryApi.update(currentCategory.id, formData);
          await loadCategories();
        }
        setDialogOpen(false);
      } catch (err) {
        console.error('Failed to submit category:', err);
      }
    },
    [dialogMode, currentCategory, formData, loadCategories, expandNode]
  );

  const handleToggleStatus = useCallback(
    async (category: CategoryTreeNode) => {
      const newStatus = category.status === 1 ? 2 : 1;
      try {
        await adminCategoryApi.patch(category.id, { status: newStatus });
        await loadCategories();
      } catch (err) {
        console.error('Failed to toggle category status:', err);
      }
    },
    [loadCategories]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await adminCategoryApi.delete(deleteTarget.id);
      await loadCategories();
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  }, [deleteTarget, loadCategories]);

  const handleView = useCallback((category: CategoryTreeNode) => {
    window.open(`/categories/${category.slug}`, '_blank');
  }, []);

  const handleSearch = useCallback(() => {
    loadCategories({ keyword: searchKeyword });
  }, [searchKeyword, loadCategories]);

  const handleReset = useCallback(() => {
    setSearchKeyword('');
    setStatusFilter('all');
    loadCategories();
  }, [loadCategories]);

  // ---- Delete warning text ----
  const deleteWarningText = deleteTarget
    ? deleteTarget.children.length > 0
      ? t('admin.deleteCategoryWithChildrenWarning', {
          count: deleteTarget.children.length,
        }) ||
        `This category has ${deleteTarget.children.length} sub-categories. They will become top-level categories. Are you sure you want to delete this category? This action cannot be undone.`
      : t('admin.deleteCategoryConfirm') ||
        'Are you sure you want to delete this category? This action cannot be undone.'
    : '';

  // ---- Tree select options for parent selector ----
  const getTreeSelectOptions = (excludeId?: number) => {
    const result: { id: number; name: string; depth: number }[] = [];
    const excludeSet = new Set<number>();
    if (excludeId !== undefined) {
      excludeSet.add(excludeId);
      // Find and collect descendants of excludeId
      const findAndCollect = (nodes: CategoryTreeNode[]): boolean => {
        for (const node of nodes) {
          if (node.id === excludeId) {
            excludeSet.add(node.id);
            const collect = (n: CategoryTreeNode[]) => {
              for (const child of n) {
                excludeSet.add(child.id);
                collect(child.children);
              }
            };
            collect(node.children);
            return true;
          }
          if (findAndCollect(node.children)) return true;
        }
        return false;
      };
      findAndCollect(tree);
    }

    const dfs = (nodes: CategoryTreeNode[]) => {
      for (const node of nodes) {
        if (excludeSet.has(node.id)) continue;
        result.push({ id: node.id, name: node.name, depth: node.depth });
        dfs(node.children);
      }
    };
    dfs(tree);
    return result;
  };

  // ---- Icon for tree depth ----
  const getDepthIcon = (depth: number, hasChildren: boolean) => {
    if (depth === 0) return <Folder className="w-4 h-4 text-indigo-600" />;
    if (depth === 1) return <Film className="w-4 h-4 text-sky-600" />;
    return <Leaf className="w-4 h-4 text-emerald-600" />;
  };

  // ---- Derived pagination text ----
  const startItem = visibleNodes.length > 0 ? 1 : 0;
  const endItem = visibleNodes.length;
  const totalCount = stats.total;
  const activeCapacityPct =
    stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-8">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/admin">{t('admin.title', 'Admin')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator/>
          <BreadcrumbItem>
            <BreadcrumbPage>{t('admin.categories') || 'Categories'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              {t('admin.categoriesManagement') || t('admin.categories') || 'Categories Management'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t('admin.manageCategoriesDesc') ||
                'Manage hierarchical content categories with parent-child relationships.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4" />
            {t('admin.newCategory') || 'New Category'}
          </Button>
        </div>
      </div>

      {/* Stats Grid (4 Bento cards) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-md transition-all group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {t('admin.totalCategories') || 'Total Categories'}
                </p>
                <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">
                  {stats.total}
                </h3>
              </div>
              <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <FolderTree className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {t('admin.active') || 'Active'}
                </p>
                <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">
                  {stats.active}
                </h3>
                <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {activeCapacityPct}% {t('admin.capacity') || 'capacity'}
                </p>
              </div>
              <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {t('admin.maxDepth') || 'Max Depth'}
                </p>
                <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">
                  {maxDepth + 1}
                </h3>
              </div>
              <div className="w-11 h-11 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {t('admin.totalMedia') || 'Total Media'}
                </p>
                <h3 className="text-3xl font-extrabold tabular-nums text-slate-800 mt-1">
                  {stats.subCategories}
                </h3>
              </div>
              <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Film className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Table */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder={t('admin.searchCategories') || 'Search categories...'}
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.allStatus') || 'All Status'}</SelectItem>
              <SelectItem value="active">{t('admin.active') || 'Active'}</SelectItem>
              <SelectItem value="inactive">{t('admin.inactive') || 'Inactive'}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5" />
            {t('admin.reset') || 'Reset'}
          </Button>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <Table className="w-full text-left">
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 w-1/3">
                  {t('admin.name') || 'Name'}
                </TableHead>
                <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {t('admin.slug') || 'Slug'}
                </TableHead>
                <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {t('admin.mediaCount') || 'Media Count'}
                </TableHead>
                <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {t('admin.status') || 'Active'}
                </TableHead>
                <TableHead className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-right">
                  {t('admin.actions') || 'Actions'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-50">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <Spinner className="mx-auto" />
                  </TableCell>
                </TableRow>
              ) : visibleNodes.length > 0 ? (
                visibleNodes.map((node) => (
                  <TableRow key={node.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="px-6 py-3.5 text-sm text-slate-700" style={getIndentStyle(node.depth)}>
                      <div className="flex items-center gap-2">
                        {node.hasChildren ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className={`text-slate-400 hover:text-slate-600 transition-transform ${
                              expandedIds.has(node.id) ? 'rotate-90' : ''
                            }`}
                            onClick={() => toggleExpand(node.id)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        ) : (
                          <CornerDownRight className="w-4 h-4 text-slate-300" />
                        )}
                        {getDepthIcon(node.depth, node.hasChildren)}
                        <span
                          className={
                            node.depth === 0 ? 'font-semibold text-slate-900' : 'text-slate-700'
                          }
                        >
                          {node.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-3.5 font-mono text-xs text-slate-500">/{node.slug}</TableCell>
                    <TableCell className="px-6 py-3.5">
                      <Badge
                        variant={
                          node.depth === 0
                            ? 'soft-primary'
                            : node.depth === 1
                              ? 'soft-info'
                              : 'soft-success'
                        }
                      >
                        {(node.media_count || 0).toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-3.5">
                      <Switch
                        checked={node.status === 1}
                        onCheckedChange={() => handleToggleStatus(node)}
                      />
                    </TableCell>
                    <TableCell className="px-6 py-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                          title={t('admin.addChild') || 'Add Child'}
                          onClick={() => openAddChildDialog(node)}
                        >
                          <PlusSquare className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                          title={t('admin.edit') || 'Edit'}
                          onClick={() => openEditDialog(node)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title={t('admin.delete') || 'Delete'}
                          onClick={() => openDeleteDialog(node)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                          title={t('admin.view') || 'View'}
                          onClick={() => handleView(node)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-sm text-slate-500">
                    {t('admin.noCategoriesFound') || 'No categories found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {t('admin.showing') || 'Showing'} {startItem} {t('admin.to') || 'to'} {endItem}{' '}
              {t('admin.of') || 'of'} {totalCount} {t('admin.categories') || 'categories'}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="default" size="icon-sm" className="font-medium">
                1
              </Button>
              <Button variant="ghost" size="icon-sm" className="text-slate-600">
                2
              </Button>
              <Button variant="ghost" size="icon-sm" className="text-slate-600">
                3
              </Button>
              <Button variant="outline" size="icon-sm">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Create / Edit / AddChild Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('admin.categoryDetails') ||
                (dialogMode === 'create'
                  ? t('admin.newCategory') || 'Create Category'
                  : dialogMode === 'edit'
                    ? t('admin.editCategory') || 'Edit Category'
                    : t('admin.addChildCategory') || 'Add Child Category')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {dialogMode === 'create'
                ? 'Create a new category'
                : dialogMode === 'edit'
                  ? 'Edit category details'
                  : 'Add a child category'}
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <Label className="text-slate-700 block mb-1">
                {t('admin.categoryName') || t('admin.name') || 'Category Name'}
              </Label>
              <Input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('admin.enterCategoryName') || 'Enter category name'}
              />
            </div>
            <div>
              <Label className="text-slate-700 block mb-1">
                {t('admin.parentCategory') || t('admin.parent') || 'Parent Category'}
              </Label>
              {dialogMode === 'addChild' && currentCategory ? (
                <Input
                  value={currentCategory.name}
                  disabled
                  className="bg-slate-100 cursor-not-allowed"
                />
              ) : (
                <Select
                  value={formData.parent_id !== undefined && formData.parent_id !== null ? String(formData.parent_id) : ''}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      parent_id: value ? Number(value) : undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.noParentTopLevel') || 'No Parent (Top Level)'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t('admin.noParentTopLevel') || 'No Parent (Top Level)'}
                    </SelectItem>
                    {getTreeSelectOptions(dialogMode === 'edit' ? currentCategory?.id : undefined).map(
                      (opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>
                          {'  '.repeat(opt.depth)}
                          {opt.name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-slate-700 block mb-1">
                {t('admin.slug') || 'Slug'}
              </Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-slate-500 font-mono text-xs">
                  /doc/
                </span>
                <Input
                  className="flex-1 rounded-l-none"
                  type="text"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder={t('admin.enterCategorySlug') || 'Enter slug'}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="block text-sm font-medium text-slate-700">
                  {t('admin.activeStatus') || 'Active Status'}
                </span>
                <span className="text-xs text-slate-400">
                  {t('admin.visibleInNav') || 'Visible in portal navigation'}
                </span>
              </div>
              <Switch
                checked={formData.status === 1}
                onCheckedChange={() =>
                  setFormData({ ...formData, status: formData.status === 1 ? 2 : 1 })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('admin.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleDialogSubmit}>
              {t('admin.saveChanges') || 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('admin.deleteCategory') || 'Delete Category'}
            </DialogTitle>
            <DialogDescription>
              {deleteWarningText}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('admin.cancel') || 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('admin.delete') || 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories;
