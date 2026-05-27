import { Spinner } from '@/components/ui/spinner';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, RotateCcw } from 'lucide-react';
import { adminCategoryApi, type Category } from '@/lib/api/category';
import type { CategoryTreeNode } from '@/lib/utils/categoryTree';
import { useCategoryTree } from '@/hooks/useCategoryTree';
import { CategoryTreeTable } from '@/components/admin/CategoryTreeTable';
import { CategoryDialog, type CategoryDialogMode } from '@/components/admin/CategoryDialog';
import { CategoryStatsCards } from '@/components/admin/CategoryStatsCards';
import { AdminPageTemplate } from '@/components/admin/AdminPageTemplate';

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

  // Dialog state
  const [dialogMode, setDialogMode] = useState<CategoryDialogMode>('create');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<CategoryTreeNode | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryTreeNode | null>(null);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ---- Dialog handlers ----

  const openCreateDialog = useCallback(() => {
    setDialogMode('create');
    setCurrentCategory(null);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((category: CategoryTreeNode) => {
    setDialogMode('edit');
    setCurrentCategory(category);
    setDialogOpen(true);
  }, []);

  const openAddChildDialog = useCallback((category: CategoryTreeNode) => {
    setDialogMode('addChild');
    setCurrentCategory(category);
    setDialogOpen(true);
  }, []);

  const openDeleteDialog = useCallback((category: CategoryTreeNode) => {
    setDeleteTarget(category);
    setDeleteDialogOpen(true);
  }, []);

  // ---- Action handlers ----

  const handleDialogSubmit = useCallback(
    async (data: Partial<Category>) => {
      if (dialogMode === 'create' || dialogMode === 'addChild') {
        await adminCategoryApi.create(data);
        await loadCategories();
        // Auto-expand parent after adding child
        if (dialogMode === 'addChild' && data.parent_id) {
          expandNode(data.parent_id);
        }
      } else if (dialogMode === 'edit' && currentCategory) {
        await adminCategoryApi.update(currentCategory.id, data);
        await loadCategories();
      }
    },
    [dialogMode, currentCategory, loadCategories, expandNode]
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
    // Server-side search returns flat list; reload with keyword
    loadCategories({ keyword: searchKeyword });
  }, [searchKeyword, loadCategories]);

  const handleReset = useCallback(() => {
    setSearchKeyword('');
    loadCategories();
  }, [loadCategories]);

  // ---- Delete warning text ----

  const deleteWarningText = deleteTarget
    ? deleteTarget.children.length > 0
      ? t('admin.deleteCategoryWithChildrenWarning', {
          count: deleteTarget.children.length,
        }) ||
        `This category has ${deleteTarget.children.length} sub-categories. They will become top-level categories. Are you sure you want to delete this category? This action cannot be undone.`
      : t('admin.deleteCategoryConfirm')
    : '';

  return (
    <AdminPageTemplate
      title={t('admin.categories')}
      description="Manage your content categories"
      searchPlaceholder={t('admin.search') || t('admin.categories') + '...'}
      searchValue={searchKeyword}
      onSearchChange={setSearchKeyword}
      onSearchSubmit={handleSearch}
      filters={
        <>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button variant="default" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </>
      }
      stats={<CategoryStatsCards stats={stats} />}
    >
      {/* Tree table */}
      <CategoryTreeTable
        nodes={visibleNodes}
        expandedIds={expandedIds}
        onToggleExpand={toggleExpand}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onCreate={openCreateDialog}
        onEdit={openEditDialog}
        onDelete={openDeleteDialog}
        onToggleStatus={handleToggleStatus}
        onAddChild={openAddChildDialog}
        onView={handleView}
        loading={loading}
      />

      {/* Create/Edit/AddChild Dialog */}
      <CategoryDialog
        mode={dialogMode}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tree={tree}
        currentCategory={currentCategory}
        onSubmit={handleDialogSubmit}
      />

      {/* Delete Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('admin.deleteCategory')}
            </AlertDialogTitle>
            <AlertDialogDescription>{deleteWarningText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('admin.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              {t('admin.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageTemplate>
  );
};

export default Categories;
