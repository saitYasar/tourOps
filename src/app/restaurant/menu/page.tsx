'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  ImageIcon,
  FolderTree,
  Upload,
  X,
  Eye,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Box,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  serviceCategoryApi,
  serviceApi,
  organizationApi,
} from '@/lib/api';
import { getCurrencySymbol } from '@/lib/utils';
import type {
  ClientStopMenuCategoryDto,
  ClientStopMenuServiceDto,
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
  CreateServiceDto,
  UpdateServiceDto,
  PriceType,
} from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { LoadingState, EmptyState, ErrorState, ConfirmDialog, ImageCropper, ServiceDetailDialog } from '@/components/shared';

// ============================================
// Types
// ============================================

interface CategoryFormData {
  name: string;
  displayOrder: number;
  parentId?: number;
}

interface ServiceFormData {
  title: string;
  description: string;
  basePrice: number;
  priceType: PriceType;
  serviceCategoryId: number;
  dailyStock: number | null;
}

const initialCategoryForm: CategoryFormData = {
  name: '',
  displayOrder: 0,
};

const initialServiceForm: ServiceFormData = {
  title: '',
  description: '',
  basePrice: 0,
  priceType: 'fixed',
  serviceCategoryId: 0,
  dailyStock: null,
};

const PRICE_TYPE_OPTIONS: { value: PriceType; labelKey: 'fixed' | 'perPerson' | 'perHour' | 'perDay' }[] = [
  { value: 'fixed', labelKey: 'fixed' },
  { value: 'per_person', labelKey: 'perPerson' },
  { value: 'per_hour', labelKey: 'perHour' },
  { value: 'per_day', labelKey: 'perDay' },
];

// ============================================
// Price Type Badge Component
// ============================================
function PriceTypeBadge({ priceType, t }: { priceType: PriceType; t: ReturnType<typeof useLanguage>['t'] }) {
  const labelMap: Record<PriceType, string> = {
    fixed: t.menu.fixed,
    per_person: t.menu.perPerson,
    per_hour: t.menu.perHour,
    per_day: t.menu.perDay,
  };
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
      {labelMap[priceType] || priceType}
    </Badge>
  );
}

// ============================================
// Menu Preview: Render services for a category
// ============================================
function PreviewServiceList({
  services,
  t,
  onServiceClick,
}: {
  services: ClientStopMenuServiceDto[];
  t: ReturnType<typeof useLanguage>['t'];
  onServiceClick?: (svc: ClientStopMenuServiceDto) => void;
}) {
  if (!services.length) return null;

  const priceLabel = (type: string) => {
    if (type === 'fixed') return '';
    if (type === 'per_person') return `/ ${t.menu.perPerson}`;
    if (type === 'per_hour') return `/ ${t.menu.perHour}`;
    if (type === 'per_day') return `/ ${t.menu.perDay}`;
    return '';
  };

  return (
    <div className="space-y-1">
      {services.map((s) => (
        <div key={s.id} className="flex gap-3 p-2 rounded-lg hover:bg-white/60 transition-colors cursor-pointer" onClick={() => onServiceClick?.(s)}>
          {s.imageUrl ? (
            <img src={s.imageUrl} alt={s.title} className="w-14 h-14 rounded-md object-cover flex-shrink-0 shadow-sm" />
          ) : (
            <div className="w-14 h-14 rounded-md bg-stone-100 flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-5 w-5 text-stone-300" />
            </div>
          )}
          <div className="flex-1 min-w-0 py-0.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-800 leading-tight truncate hover:text-orange-700 transition-colors" title={s.title}>{s.title}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-emerald-700">{Number(s.basePrice).toFixed(2)} {getCurrencySymbol(s.currency)}</p>
                {s.priceType !== 'fixed' && (
                  <p className="text-[10px] text-stone-400">{priceLabel(s.priceType)}</p>
                )}
              </div>
            </div>
            {s.description && (
              <p className="text-[11px] text-stone-400 mt-1 line-clamp-2 leading-snug">{s.description}</p>
            )}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                s.dailyStock === 0
                  ? 'bg-red-100 text-red-600'
                  : s.dailyStock != null
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}>
                {t.menu.stockLabel}{' '}
                {s.dailyStock == null
                  ? t.menu.stockUnlimited
                  : s.dailyStock === 0
                  ? t.menu.stockOut
                  : `${s.dailyStock} ${t.menu.stockUnit}`}
              </span>
              <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                s.remainingStock === 0
                  ? 'bg-red-100 text-red-600'
                  : s.remainingStock != null
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-50 text-emerald-600'
              }`}>
                {t.menu.remainingStockLabel}{' '}
                {s.remainingStock == null
                  ? t.menu.stockUnlimited
                  : s.remainingStock === 0
                  ? t.menu.stockOut
                  : `${s.remainingStock} ${t.menu.stockUnit}`}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Single collapsible category item
function PreviewCategoryItem({
  cat,
  depth,
  t,
  onServiceClick,
}: {
  cat: ClientStopMenuCategoryDto;
  depth: number;
  t: ReturnType<typeof useLanguage>['t'];
  onServiceClick?: (svc: ClientStopMenuServiceDto) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const hasServices = cat.services?.length > 0;
  const hasChildren = cat.child_service_categories?.length > 0;
  if (!hasServices && !hasChildren) return null;

  return (
    <div>
      {depth === 0 ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full bg-gradient-to-r from-stone-800 to-stone-700 px-4 py-3 rounded-xl mb-3 flex items-center justify-between cursor-pointer"
        >
          <h3 className="text-lg font-bold text-white">{cat.name}</h3>
          <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full px-4 py-2 mb-2 flex items-center justify-between cursor-pointer"
        >
          <h4 className="text-sm font-semibold text-stone-600 border-b border-stone-200 pb-1 flex-1 text-left">{cat.name}</h4>
          <ChevronDown className={`h-3.5 w-3.5 text-stone-400 transition-transform ml-2 ${open ? '' : '-rotate-90'}`} />
        </button>
      )}
      {open && (
        <>
          {hasServices && <PreviewServiceList services={cat.services} t={t} onServiceClick={onServiceClick} />}
          {hasChildren && (
            <PreviewCategoryTree categories={cat.child_service_categories} depth={depth + 1} t={t} onServiceClick={onServiceClick} />
          )}
        </>
      )}
    </div>
  );
}

// Recursively render menu categories with their services
function PreviewCategoryTree({
  categories,
  depth,
  t,
  onServiceClick,
}: {
  categories: ClientStopMenuCategoryDto[];
  depth: number;
  t: ReturnType<typeof useLanguage>['t'];
  onServiceClick?: (svc: ClientStopMenuServiceDto) => void;
}) {
  return (
    <>
      {categories.map((cat) => (
        <PreviewCategoryItem key={cat.id} cat={cat} depth={depth} t={t} onServiceClick={onServiceClick} />
      ))}
    </>
  );
}

// ============================================
// Category Tree Item Component
// ============================================
function CategoryTreeItem({
  cat,
  depth,
  selectedCategory,
  setSelectedCategory,
  expandedCategories,
  setExpandedCategories,
  draggedId,
  setDraggedId,
  dragOverId,
  setDragOverId,
  handleCategoryReorder,
}: {
  cat: ClientStopMenuCategoryDto;
  depth: number;
  selectedCategory: ClientStopMenuCategoryDto | null;
  setSelectedCategory: (c: ClientStopMenuCategoryDto) => void;
  expandedCategories: Set<number>;
  setExpandedCategories: React.Dispatch<React.SetStateAction<Set<number>>>;
  draggedId: number | null;
  setDraggedId: (id: number | null) => void;
  dragOverId: number | null;
  setDragOverId: (id: number | null) => void;
  handleCategoryReorder: (fromId: number, toId: number) => void;
}) {
  const isSelected = selectedCategory?.id === cat.id;
  const isDragging = draggedId === cat.id;
  const isDragOver = dragOverId === cat.id;
  const children = cat.child_service_categories || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedCategories.has(cat.id);

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat.id)) next.delete(cat.id);
      else next.add(cat.id);
      return next;
    });
  };

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', String(cat.id));
          e.dataTransfer.effectAllowed = 'move';
          setDraggedId(cat.id);
        }}
        onDragEnd={() => setDraggedId(null)}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDragOverId(cat.id);
        }}
        onDragLeave={() => setDragOverId(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverId(null);
          const fromId = parseInt(e.dataTransfer.getData('text/plain'));
          if (fromId && fromId !== cat.id) {
            handleCategoryReorder(fromId, cat.id);
          }
        }}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
          isSelected
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'hover:bg-slate-50 border border-transparent'
        } ${isDragging ? 'opacity-40' : ''} ${isDragOver ? 'border-b-2 !border-primary bg-primary/5' : ''}`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => setSelectedCategory(cat)}
      >
        <div
          className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-slate-200 rounded flex-shrink-0"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5 text-slate-300" />
        </div>
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-slate-200 rounded flex-shrink-0"
            onClick={toggleExpand}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>
        ) : (
          <div className="w-5 flex-shrink-0" />
        )}
        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${depth > 0 ? 'bg-primary/10' : 'bg-slate-100'}`}>
          <FolderTree className={`h-3 w-3 ${depth > 0 ? 'text-primary/50' : 'text-slate-400'}`} />
        </div>
        <span className="text-sm font-medium truncate flex-1">{cat.name}</span>
        {hasChildren && (
          <span className="text-[10px] text-slate-400">{children.length}</span>
        )}
      </div>
      {hasChildren && isExpanded && children.map((child) => (
        <CategoryTreeItem
          key={child.id}
          cat={child}
          depth={depth + 1}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          expandedCategories={expandedCategories}
          setExpandedCategories={setExpandedCategories}
          draggedId={draggedId}
          setDraggedId={setDraggedId}
          dragOverId={dragOverId}
          setDragOverId={setDragOverId}
          handleCategoryReorder={handleCategoryReorder}
        />
      ))}
    </>
  );
}

// ============================================
// Main Page Component
// ============================================
export default function MenuPage() {
  const queryClient = useQueryClient();
  const { t, locale } = useLanguage();

  const { data: orgResult } = useQuery({
    queryKey: ['my-organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });
  const orgStatus = orgResult?.success ? orgResult.data?.status : undefined;

  // State
  const [selectedCategory, setSelectedCategory] = useState<ClientStopMenuCategoryDto | null>(null);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ClientStopMenuCategoryDto | null>(null);
  const [editingService, setEditingService] = useState<ClientStopMenuServiceDto | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(initialCategoryForm);
  const [serviceForm, setServiceForm] = useState<ServiceFormData>(initialServiceForm);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'service';
    id: number;
    name: string;
  } | null>(null);

  // Service image states
  const [serviceImageFile, setServiceImageFile] = useState<File | null>(null);
  const [serviceImagePreview, setServiceImagePreview] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLang, setPreviewLang] = useState<'tr' | 'en' | 'de'>('tr');
  const [cropperOpen, setCropperOpen] = useState(false);
  const [detailService, setDetailService] = useState<ClientStopMenuServiceDto | null>(null);
  const [cropperSrc, setCropperSrc] = useState('');
  const serviceFileInputRef = useRef<HTMLInputElement>(null);

  // Drag state
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  // Expanded categories (for tree view)
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  // ============================================
  // Queries — single menu endpoint returns categories + services
  // ============================================

  const {
    data: menuData,
    isLoading: menuLoading,
    error: menuError,
    refetch: refetchMenu,
  } = useQuery({
    queryKey: ['menuData', locale],
    queryFn: async () => {
      const res = await serviceCategoryApi.getMenu(locale);
      if (!res.success) throw new Error(res.error);
      return res.data!;
    },
  });

  // Derive categories (same structure, used for tree)
  const categories = menuData;

  // Helper: find services for a given category id in the menu tree
  const findServicesInTree = (categoryId: number, tree: ClientStopMenuCategoryDto[]): ClientStopMenuServiceDto[] => {
    for (const cat of tree) {
      if (cat.id === categoryId) return cat.services || [];
      const found = findServicesInTree(categoryId, cat.child_service_categories || []);
      if (found.length) return found;
    }
    return [];
  };

  // Services derived from selected category in menu data
  const services = selectedCategory && menuData
    ? findServicesInTree(selectedCategory.id, menuData)
    : [];

  // Load menu for preview with different language
  const {
    data: previewMenu,
  } = useQuery({
    queryKey: ['menuPreview', previewLang],
    queryFn: async () => {
      if (previewLang === locale && menuData) return menuData;
      const res = await serviceCategoryApi.getMenu(previewLang);
      if (!res.success) throw new Error(res.error);
      return res.data!;
    },
    enabled: isPreviewOpen,
  });

  // ============================================
  // Category Mutations
  // ============================================

  const createCategoryMutation = useMutation({
    mutationFn: async ({ data }: { data: CreateServiceCategoryDto }) => {
      const res = await serviceCategoryApi.create(data);
      if (!res.success) throw new Error(res.error);
      return res.data!;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menuData'] });
      queryClient.invalidateQueries({ queryKey: ['menuPreview'] });
      toast.success(`${t.menu.categories} ${t.menu.created}`);
      if (variables.data.parentId) {
        setExpandedCategories((prev) => new Set([...prev, variables.data.parentId!]));
      }
      closeCategoryForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateServiceCategoryDto }) => {
      const res = await serviceCategoryApi.update(id, data);
      if (!res.success) throw new Error(res.error);
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuData'] });
      queryClient.invalidateQueries({ queryKey: ['menuPreview'] });
      toast.success(`${t.menu.categories} ${t.menu.updated}`);
      closeCategoryForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await serviceCategoryApi.delete(id);
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuData'] });
      queryClient.invalidateQueries({ queryKey: ['menuPreview'] });
      toast.success(`${t.menu.categories} ${t.menu.deleted}`);
      if (selectedCategory && deleteTarget?.id === selectedCategory.id) {
        setSelectedCategory(null);
      }
      setDeleteTarget(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // ============================================
  // Service Mutations
  // ============================================

  const createServiceMutation = useMutation({
    mutationFn: async ({ data, image }: { data: CreateServiceDto; image?: File }) => {
      const res = await serviceApi.create(data, image);
      if (!res.success) throw new Error(res.error);
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuData'] });
      queryClient.invalidateQueries({ queryKey: ['menuPreview'] });
      toast.success(`${t.menu.services} ${t.menu.created}`);
      closeServiceForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data, image }: { id: number; data: UpdateServiceDto; image?: File }) => {
      const res = await serviceApi.update(id, data, image);
      if (!res.success) throw new Error(res.error);
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuData'] });
      queryClient.invalidateQueries({ queryKey: ['menuPreview'] });
      toast.success(`${t.menu.services} ${t.menu.updated}`);
      closeServiceForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await serviceApi.delete(id);
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuData'] });
      queryClient.invalidateQueries({ queryKey: ['menuPreview'] });
      toast.success(`${t.menu.services} ${t.menu.deleted}`);
      setDeleteTarget(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // ============================================
  // Category Form Handlers
  // ============================================

  const openCreateCategoryForm = (parentId?: number) => {
    setEditingCategory(null);
    setCategoryForm({ ...initialCategoryForm, parentId });
    setIsCategoryFormOpen(true);
  };

  const openEditCategoryForm = (category: ClientStopMenuCategoryDto) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      displayOrder: category.displayOrder ?? 0,
    });
    setIsCategoryFormOpen(true);
  };

  const closeCategoryForm = () => {
    setIsCategoryFormOpen(false);
    setEditingCategory(null);
    setCategoryForm(initialCategoryForm);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.error(t.common.required);
      return;
    }

    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        data: {
          name: categoryForm.name,
          displayOrder: categoryForm.displayOrder,
        },
      });
    } else {
      createCategoryMutation.mutate({
        data: {
          name: categoryForm.name,
          displayOrder: categoryForm.displayOrder,
          parentId: categoryForm.parentId,
        },
      });
    }
  };

  // ============================================
  // Service Form Handlers
  // ============================================

  const openCreateServiceForm = () => {
    if (!selectedCategory) return;
    setEditingService(null);
    setServiceForm({
      ...initialServiceForm,
      serviceCategoryId: selectedCategory.id,
    });
    setServiceImageFile(null);
    setServiceImagePreview(null);
    setIsServiceFormOpen(true);
  };

  const openEditServiceForm = (service: ClientStopMenuServiceDto) => {
    setEditingService(service);
    setServiceForm({
      title: service.title,
      description: service.description || '',
      basePrice: Number(service.basePrice),
      priceType: service.priceType as PriceType,
      serviceCategoryId: service.serviceCategoryId || selectedCategory?.id || 0,
      dailyStock: service.dailyStock ?? null,
    });
    setServiceImageFile(null);
    setServiceImagePreview(service.imageUrl || null);
    setIsServiceFormOpen(true);
  };

  const closeServiceForm = () => {
    setIsServiceFormOpen(false);
    setEditingService(null);
    setServiceForm(initialServiceForm);
    setServiceImageFile(null);
    setServiceImagePreview(null);
  };

  const handleServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.title.trim()) {
      toast.error(`${t.menu.serviceTitle} ${t.common.required.toLowerCase()}`);
      return;
    }
    if (!serviceForm.basePrice) {
      toast.error(`${t.menu.basePrice} ${t.common.required.toLowerCase()}`);
      return;
    }

    if (editingService) {
      updateServiceMutation.mutate({
        id: editingService.id,
        data: {
          title: serviceForm.title,
          description: serviceForm.description || undefined,
          basePrice: serviceForm.basePrice,
          priceType: serviceForm.priceType,
          serviceCategoryId: serviceForm.serviceCategoryId,
          dailyStock: serviceForm.dailyStock,
        },
        image: serviceImageFile || undefined,
      });
    } else {
      createServiceMutation.mutate({
        data: {
          title: serviceForm.title,
          description: serviceForm.description || undefined,
          basePrice: serviceForm.basePrice,
          priceType: serviceForm.priceType,
          serviceCategoryId: serviceForm.serviceCategoryId,
          dailyStock: serviceForm.dailyStock,
        },
        image: serviceImageFile || undefined,
      });
    }
  };

  // ============================================
  // Delete Handler
  // ============================================

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'category') {
      deleteCategoryMutation.mutate(deleteTarget.id);
    } else {
      deleteServiceMutation.mutate(deleteTarget.id);
    }
  };

  // ============================================
  // Image Handlers (Service only)
  // ============================================

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropperSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = (blob: Blob) => {
    const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
    const previewUrl = URL.createObjectURL(blob);
    setServiceImageFile(file);
    setServiceImagePreview(previewUrl);
  };

  // ============================================
  // Drag & Drop Category Reorder
  // ============================================

  const handleCategoryReorder = async (fromId: number, toId: number) => {
    if (!categories) return;

    // Helper: find the sibling list that contains a given id
    const findSiblingList = (id: number): ClientStopMenuCategoryDto[] | null => {
      // Check top-level
      if (categories.some((c) => c.id === id)) return categories;
      // Check each parent's children
      for (const parent of categories) {
        if (parent.child_service_categories?.some((c) => c.id === id)) {
          return parent.child_service_categories;
        }
      }
      return null;
    };

    const fromList = findSiblingList(fromId);
    const toList = findSiblingList(toId);

    // Both must be in the same level (same parent or both top-level)
    if (!fromList || !toList || fromList !== toList) return;

    const list = [...fromList];
    const fromIdx = list.findIndex((c) => c.id === fromId);
    const toIdx = list.findIndex((c) => c.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [dragged] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, dragged);

    try {
      const updates = list
        .map((cat, i) => ({ id: cat.id, newOrder: i, oldOrder: cat.displayOrder ?? 0 }))
        .filter(({ newOrder, oldOrder }) => newOrder !== oldOrder);

      await Promise.all(
        updates.map(({ id, newOrder }) =>
          serviceCategoryApi.update(id, { displayOrder: newOrder })
        )
      );

      queryClient.invalidateQueries({ queryKey: ['menuData'] });
      queryClient.invalidateQueries({ queryKey: ['menuPreview'] });
    } catch {
      toast.error(t.common.error);
    }
  };

  // Helper: find category by id in tree
  const findCategoryInTree = (id: number, list?: ClientStopMenuCategoryDto[]): ClientStopMenuCategoryDto | null => {
    for (const cat of list || []) {
      if (cat.id === id) return cat;
      const found = findCategoryInTree(id, cat.child_service_categories);
      if (found) return found;
    }
    return null;
  };

  const currentCategory = selectedCategory && categories
    ? findCategoryInTree(selectedCategory.id, categories) || null
    : null;

  const isCategoryPending = createCategoryMutation.isPending || updateCategoryMutation.isPending;
  const isServicePending = createServiceMutation.isPending || updateServiceMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <Header title={t.menu.title} description={t.menu.description} organizationStatus={orgStatus} lang={locale}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="outline" onClick={() => setIsPreviewOpen(true)} disabled={!categories?.length}>
                <Eye className="h-4 w-4 mr-2" />
                {t.menu.preview}
              </Button>
            </span>
          </TooltipTrigger>
          {!categories?.length && <TooltipContent>{t.tooltips.noCategoriesYet}</TooltipContent>}
        </Tooltip>
      </Header>

      <div className="flex-1 p-6">
        <div className="grid gap-6 lg:grid-cols-3 h-full">
          {/* Left Panel: Category List */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-medium">{t.menu.categories}</CardTitle>
              <Button size="sm" onClick={() => openCreateCategoryForm()}>
                <Plus className="h-4 w-4 mr-1" />
                {t.common.create}
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {menuLoading ? (
                <LoadingState message={t.common.loading} />
              ) : menuError ? (
                <ErrorState onRetry={() => refetchMenu()} />
              ) : !categories?.length ? (
                <EmptyState
                  icon={FolderTree}
                  title={t.menu.noCategories}
                  description={t.menu.noCategories}
                  actionLabel={t.menu.newCategory}
                  onAction={() => openCreateCategoryForm()}
                />
              ) : (
                <div className="space-y-0.5">
                  {categories.map((cat) => (
                    <CategoryTreeItem
                      key={cat.id}
                      cat={cat}
                      depth={0}
                      selectedCategory={selectedCategory}
                      setSelectedCategory={setSelectedCategory}
                      expandedCategories={expandedCategories}
                      setExpandedCategories={setExpandedCategories}
                      draggedId={draggedId}
                      setDraggedId={setDraggedId}
                      dragOverId={dragOverId}
                      setDragOverId={setDragOverId}
                      handleCategoryReorder={handleCategoryReorder}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Panel: Selected Category Details + Services */}
          <Card className="lg:col-span-2 flex flex-col">
            {!currentCategory ? (
              <CardContent className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={FolderTree}
                  title={t.menu.selectCategory}
                  description={t.menu.selectCategory}
                />
              </CardContent>
            ) : (
              <>
                {/* Category Header */}
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-medium">
                        {currentCategory.name}
                      </CardTitle>
                      <p className="text-xs text-slate-400 mt-1">
                        {services?.length || 0} {t.menu.services.toLowerCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={openCreateServiceForm}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {t.menu.newService}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => openCreateCategoryForm(currentCategory.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Alt Kategori
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditCategoryForm(currentCategory)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setDeleteTarget({
                            type: 'category',
                            id: currentCategory.id,
                            name: currentCategory.name,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Services Section */}
                <CardContent className="flex-1 overflow-auto">
                  {!services?.length ? (
                    <EmptyState
                      icon={FolderTree}
                      title={t.menu.noServices}
                      description={t.menu.noServices}
                      actionLabel={t.menu.newService}
                      onAction={openCreateServiceForm}
                    />
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {services.map((service) => (
                        <Card key={service.id} className="overflow-hidden">
                          <div className="flex p-3 gap-3">
                            <div className="w-20 h-20 bg-slate-100 flex-shrink-0 rounded-lg overflow-hidden">
                              {service.imageUrl ? (
                                <img
                                  src={service.imageUrl}
                                  alt={service.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <ImageIcon className="h-8 w-8 text-slate-300" />
                                </div>
                              )}
                            </div>
                            <CardContent className="flex-1 p-0 overflow-hidden">
                              <div className="flex items-start justify-between gap-1">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-medium text-sm truncate" title={service.title}>{service.title}</h4>
                                  {service.description && (
                                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                                      {service.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-sm font-semibold text-primary">
                                      {Number(service.basePrice).toFixed(2)} {getCurrencySymbol(service.currency)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full ${
                                      service.dailyStock === 0
                                        ? 'bg-red-100 text-red-700'
                                        : service.dailyStock != null
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                      <Box className="h-3 w-3" />
                                      {t.menu.stockLabel}{' '}
                                      {service.dailyStock == null
                                        ? t.menu.stockUnlimited
                                        : service.dailyStock === 0
                                        ? t.menu.stockOut
                                        : `${service.dailyStock} ${t.menu.stockUnit}`}
                                    </span>
                                    <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full ${
                                      service.remainingStock === 0
                                        ? 'bg-red-100 text-red-700'
                                        : service.remainingStock != null
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                      {t.menu.remainingStockLabel}{' '}
                                      {service.remainingStock == null
                                        ? t.menu.stockUnlimited
                                        : service.remainingStock === 0
                                        ? t.menu.stockOut
                                        : `${service.remainingStock} ${t.menu.stockUnit}`}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => openEditServiceForm(service)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() =>
                                      setDeleteTarget({
                                        type: 'service',
                                        id: service.id,
                                        name: service.title,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3 w-3 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* ============================================ */}
      {/* Category Form Dialog */}
      {/* ============================================ */}
      <Dialog open={isCategoryFormOpen} onOpenChange={() => closeCategoryForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategory
                ? t.menu.editCategory
                : categoryForm.parentId
                ? 'Yeni Alt Kategori'
                : t.menu.newCategory}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit}>
            <div className="space-y-4 py-4">
              {categoryForm.parentId && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-500">Üst Kategori</p>
                  <p className="text-sm font-medium text-primary">
                    {findCategoryInTree(categoryForm.parentId, categories ?? [])?.name}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="categoryName">
                  {categoryForm.parentId ? 'Alt Kategori Adı' : t.menu.categoryName} *
                </Label>
                <Input
                  id="categoryName"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={categoryForm.parentId ? 'Örn: Izgaralar, Çorbalar...' : 'Örn: Ana Yemekler, Tatlılar, İçecekler...'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayOrder">{t.menu.displayOrder}</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  min={0}
                  value={categoryForm.displayOrder || ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      displayOrder: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCategoryForm}>
                {t.common.cancel}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button type="submit" disabled={isCategoryPending}>
                      {isCategoryPending
                        ? t.common.loading
                        : editingCategory
                        ? t.common.update
                        : t.common.create}
                    </Button>
                  </span>
                </TooltipTrigger>
                {isCategoryPending && <TooltipContent>{t.tooltips.formSubmitting}</TooltipContent>}
              </Tooltip>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* Service Form Dialog */}
      {/* ============================================ */}
      <Dialog open={isServiceFormOpen} onOpenChange={() => closeServiceForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingService ? t.menu.editService : t.menu.newService}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleServiceSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="serviceTitle">{t.menu.serviceTitle} *</Label>
                <Input
                  id="serviceTitle"
                  value={serviceForm.title}
                  onChange={(e) =>
                    setServiceForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder={t.menu.serviceTitle}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="serviceDesc">{t.menu.serviceContentsDescription}</Label>
                  <div className="relative group">
                    <span className="text-amber-500 cursor-help font-bold text-sm">*</span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-normal w-64 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed">
                      {t.menu.serviceContentsDescriptionTooltip}
                    </div>
                  </div>
                </div>
                <Textarea
                  id="serviceDesc"
                  value={serviceForm.description}
                  onChange={(e) =>
                    setServiceForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder={t.menu.serviceContentsDescription}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basePrice">{t.menu.basePrice} *</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    min={0}
                    step="0.01"
                    value={serviceForm.basePrice || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      setServiceForm((prev) => ({
                        ...prev,
                        basePrice: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.menu.priceType} *</Label>
                  <Select
                    value={serviceForm.priceType}
                    onValueChange={(v) =>
                      setServiceForm((prev) => ({ ...prev, priceType: v as PriceType }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {t.menu[opt.labelKey]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dailyStock">{t.menu.dailyStock}</Label>
                <div className="flex gap-2 mb-1.5">
                  <Button
                    type="button"
                    variant={serviceForm.dailyStock == null ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setServiceForm((prev) => ({ ...prev, dailyStock: null }))}
                  >
                    {t.menu.stockUnlimited}
                  </Button>
                  <Button
                    type="button"
                    variant={serviceForm.dailyStock === 0 ? 'destructive' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setServiceForm((prev) => ({ ...prev, dailyStock: 0 }))}
                  >
                    {t.menu.stockOut}
                  </Button>
                </div>
                <Input
                  id="dailyStock"
                  type="number"
                  min={0}
                  step="1"
                  value={serviceForm.dailyStock ?? ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setServiceForm((prev) => ({
                      ...prev,
                      dailyStock: e.target.value === '' ? null : parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder={t.menu.stockUnlimited}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>{t.menu.uploadImage}</Label>
                <input
                  ref={serviceFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {serviceImagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={serviceImagePreview}
                      alt="Preview"
                      className="w-32 h-20 rounded-lg object-cover"
                    />
                    <div className="absolute top-1 right-1 flex gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => serviceFileInputRef.current?.click()}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setServiceImageFile(null);
                          setServiceImagePreview(null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => serviceFileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t.menu.uploadImage}
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeServiceForm}>
                {t.common.cancel}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button type="submit" disabled={isServicePending}>
                      {isServicePending
                        ? t.common.loading
                        : editingService
                        ? t.common.update
                        : t.common.create}
                    </Button>
                  </span>
                </TooltipTrigger>
                {isServicePending && <TooltipContent>{t.tooltips.formSubmitting}</TooltipContent>}
              </Tooltip>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* Image Cropper Dialog */}
      {/* ============================================ */}
      <ImageCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
      />

      {/* ============================================ */}
      {/* Delete Confirm Dialog */}
      {/* ============================================ */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`${t.common.delete} ${
          deleteTarget?.type === 'category' ? t.menu.categories : t.menu.services
        }`}
        description={`"${deleteTarget?.name}" ${t.menu.deleteConfirm}`}
        confirmLabel={t.common.delete}
        onConfirm={handleDelete}
        variant="destructive"
      />

      {/* ============================================ */}
      {/* Menu Preview Dialog — Phone mockup */}
      {/* ============================================ */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-sm md:max-w-md p-0 gap-0 overflow-hidden bg-transparent border-0 shadow-none" onInteractOutside={() => setIsPreviewOpen(false)}>
          {/* Phone Frame */}
          <div className="mx-auto w-full max-w-[375px] bg-stone-50 rounded-[2rem] shadow-2xl border-[6px] border-stone-800 overflow-hidden relative">
            {/* Phone Notch */}
            <div className="bg-stone-800 flex items-center justify-center py-1">
              <div className="w-20 h-5 bg-stone-900 rounded-b-xl" />
            </div>

            {/* Scrollable Content */}
            <div className="max-h-[70vh] overflow-y-auto">
              {/* Header banner */}
              <div className="bg-gradient-to-br from-stone-800 to-stone-900 px-5 pt-6 pb-5 text-center">
                <p className="text-[10px] uppercase tracking-[3px] text-stone-400 mb-1">{t.menu.preview}</p>
                <h2 className="text-xl font-bold text-white">{t.menu.menuPreview}</h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-8 h-px bg-amber-500" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <div className="w-8 h-px bg-amber-500" />
                </div>
                {/* Language selector */}
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  {(['tr', 'en', 'de'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setPreviewLang(lang)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        previewLang === lang
                          ? 'bg-amber-500 text-white'
                          : 'bg-white/10 text-stone-400 hover:bg-white/20'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu content */}
              <div className="px-4 py-4 space-y-5">
                {previewMenu && previewMenu.length > 0 ? (
                  <PreviewCategoryTree categories={previewMenu} depth={0} t={t} onServiceClick={setDetailService} />
                ) : (
                  <div className="py-16 text-center">
                    <FolderTree className="h-10 w-10 text-stone-300 mx-auto mb-3" />
                    <p className="text-sm text-stone-400">{t.menu.noCategories}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 text-center border-t border-stone-200 bg-white">
                <p className="text-[10px] text-stone-400">Powered by HerHafta</p>
              </div>
            </div>

            {/* Phone bottom bar */}
            <div className="bg-stone-800 flex justify-center py-2">
              <div className="w-28 h-1 bg-stone-600 rounded-full" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Detail Popup */}
      <ServiceDetailDialog
        service={detailService}
        open={!!detailService}
        onOpenChange={(open) => { if (!open) setDetailService(null); }}
        t={t}
      />
    </div>
  );
}
