'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  ImageIcon,
  FolderTree,
  Clock,
  Upload,
  X,
  Eye,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  serviceCategoryApi,
  serviceApi,
  organizationApi,
} from '@/lib/api';
import type {
  ServiceCategoryDto,
  ServiceDto,
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
import { LoadingState, EmptyState, ErrorState, ConfirmDialog, ImageCropper } from '@/components/shared';

// ============================================
// Types
// ============================================

interface CategoryFormData {
  name: string;
  order: number;
}

interface ServiceFormData {
  title: string;
  subTitle: string;
  description: string;
  basePrice: number;
  priceType: PriceType;
  estimatedDurationMinutes: number;
  serviceCategoryId: number;
}

const initialCategoryForm: CategoryFormData = {
  name: '',
  order: 0,
};

const initialServiceForm: ServiceFormData = {
  title: '',
  subTitle: '',
  description: '',
  basePrice: 0,
  priceType: 'fixed',
  estimatedDurationMinutes: 0,
  serviceCategoryId: 0,
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
}: {
  services: ServiceDto[];
  t: ReturnType<typeof useLanguage>['t'];
}) {
  if (!services.length) return null;

  const priceLabel = (type: PriceType) => {
    if (type === 'fixed') return '';
    if (type === 'per_person') return `/ ${t.menu.perPerson}`;
    if (type === 'per_hour') return `/ ${t.menu.perHour}`;
    if (type === 'per_day') return `/ ${t.menu.perDay}`;
    return '';
  };

  return (
    <div className="space-y-1">
      {services.map((s) => (
        <div key={s.id} className="flex gap-3 p-2 rounded-lg hover:bg-white/60 transition-colors">
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
                <p className="text-sm font-semibold text-stone-800 leading-tight">{s.title}</p>
                {s.subTitle && (
                  <p className="text-xs text-stone-500 mt-0.5 leading-tight">{s.subTitle}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-emerald-700">{Number(s.basePrice).toFixed(2)} ₺</p>
                {s.priceType !== 'fixed' && (
                  <p className="text-[10px] text-stone-400">{priceLabel(s.priceType)}</p>
                )}
              </div>
            </div>
            {s.description && (
              <p className="text-[11px] text-stone-400 mt-1 line-clamp-2 leading-snug">{s.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
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
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryDto | null>(null);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategoryDto | null>(null);
  const [editingService, setEditingService] = useState<ServiceDto | null>(null);
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
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState('');
  const serviceFileInputRef = useRef<HTMLInputElement>(null);

  // Drag state
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  // ============================================
  // Queries
  // ============================================

  const {
    data: categories,
    isLoading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: async () => {
      const res = await serviceCategoryApi.getAll();
      if (!res.success) throw new Error(res.error);
      return res.data!;
    },
  });

  // Load services when a category is selected
  const {
    data: services,
    isLoading: servicesLoading,
  } = useQuery({
    queryKey: ['servicesByCategory', selectedCategory?.id],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const res = await serviceApi.getByCategory(selectedCategory.id);
      if (!res.success) throw new Error(res.error);
      return res.data!;
    },
    enabled: !!selectedCategory,
  });

  // Load all services for preview
  const {
    data: previewData,
  } = useQuery({
    queryKey: ['allServicesForPreview', categories?.map(c => c.id).join(',')],
    queryFn: async () => {
      if (!categories?.length) return [];
      const results = await Promise.all(
        categories.map(async (cat) => {
          const res = await serviceApi.getByCategory(cat.id);
          return { category: cat, services: res.success ? res.data! : [] };
        })
      );
      return results;
    },
    enabled: !!categories?.length && isPreviewOpen,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceCategories'] });
      toast.success(`${t.menu.categories} ${t.menu.created}`);
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
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['serviceCategories'] });
      toast.success(`${t.menu.categories} ${t.menu.updated}`);
      if (selectedCategory?.id === updated.id) {
        setSelectedCategory(updated);
      }
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
      queryClient.invalidateQueries({ queryKey: ['serviceCategories'] });
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
      queryClient.invalidateQueries({ queryKey: ['servicesByCategory', selectedCategory?.id] });
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
      queryClient.invalidateQueries({ queryKey: ['servicesByCategory', selectedCategory?.id] });
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
      queryClient.invalidateQueries({ queryKey: ['servicesByCategory', selectedCategory?.id] });
      toast.success(`${t.menu.services} ${t.menu.deleted}`);
      setDeleteTarget(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // ============================================
  // Category Form Handlers
  // ============================================

  const openCreateCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm(initialCategoryForm);
    setIsCategoryFormOpen(true);
  };

  const openEditCategoryForm = (category: ServiceCategoryDto) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      order: category.order ?? 0,
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
          order: categoryForm.order,
        },
      });
    } else {
      createCategoryMutation.mutate({
        data: {
          name: categoryForm.name,
          order: categoryForm.order,
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

  const openEditServiceForm = (service: ServiceDto) => {
    setEditingService(service);
    setServiceForm({
      title: service.title,
      subTitle: service.subTitle || '',
      description: service.description || '',
      basePrice: Number(service.basePrice),
      priceType: service.priceType,
      estimatedDurationMinutes: service.estimatedDurationMinutes || 0,
      serviceCategoryId: service.serviceCategoryId,
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
      toast.error(t.common.required);
      return;
    }
    if (!serviceForm.basePrice) {
      toast.error(t.common.required);
      return;
    }

    if (editingService) {
      updateServiceMutation.mutate({
        id: editingService.id,
        data: {
          title: serviceForm.title,
          subTitle: serviceForm.subTitle || undefined,
          description: serviceForm.description || undefined,
          basePrice: serviceForm.basePrice,
          priceType: serviceForm.priceType,
          estimatedDurationMinutes: serviceForm.estimatedDurationMinutes || undefined,
          serviceCategoryId: serviceForm.serviceCategoryId,
        },
        image: serviceImageFile || undefined,
      });
    } else {
      createServiceMutation.mutate({
        data: {
          title: serviceForm.title,
          subTitle: serviceForm.subTitle || undefined,
          description: serviceForm.description || undefined,
          basePrice: serviceForm.basePrice,
          priceType: serviceForm.priceType,
          estimatedDurationMinutes: serviceForm.estimatedDurationMinutes || undefined,
          serviceCategoryId: serviceForm.serviceCategoryId,
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

    const list = [...categories];
    const fromIdx = list.findIndex((c) => c.id === fromId);
    const toIdx = list.findIndex((c) => c.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [dragged] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, dragged);

    try {
      const updates = list
        .map((cat, i) => ({ id: cat.id, newOrder: i, oldOrder: cat.order ?? 0 }))
        .filter(({ newOrder, oldOrder }) => newOrder !== oldOrder);

      await Promise.all(
        updates.map(({ id, newOrder }) =>
          serviceCategoryApi.update(id, { order: newOrder })
        )
      );

      queryClient.invalidateQueries({ queryKey: ['serviceCategories'] });
    } catch {
      toast.error(t.common.error);
    }
  };

  const currentCategory = selectedCategory && categories
    ? categories.find((c) => c.id === selectedCategory.id) || null
    : null;

  const isCategoryPending = createCategoryMutation.isPending || updateCategoryMutation.isPending;
  const isServicePending = createServiceMutation.isPending || updateServiceMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <Header title={t.menu.title} description={t.menu.description} organizationStatus={orgStatus} lang={locale}>
        <Button variant="outline" onClick={() => setIsPreviewOpen(true)} disabled={!categories?.length}>
          <Eye className="h-4 w-4 mr-2" />
          {t.menu.preview}
        </Button>
      </Header>

      <div className="flex-1 p-6">
        <div className="grid gap-6 lg:grid-cols-3 h-full">
          {/* Left Panel: Category List */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-medium">{t.menu.categories}</CardTitle>
              <Button size="sm" onClick={openCreateCategoryForm}>
                <Plus className="h-4 w-4 mr-1" />
                {t.common.create}
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {categoriesLoading ? (
                <LoadingState message={t.common.loading} />
              ) : categoriesError ? (
                <ErrorState onRetry={() => refetchCategories()} />
              ) : !categories?.length ? (
                <EmptyState
                  icon={FolderTree}
                  title={t.menu.noCategories}
                  description={t.menu.noCategories}
                  actionLabel={t.menu.newCategory}
                  onAction={openCreateCategoryForm}
                />
              ) : (
                <div className="space-y-0.5">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory?.id === cat.id;
                    const isDragging = draggedId === cat.id;
                    const isDragOver = dragOverId === cat.id;

                    return (
                      <div
                        key={cat.id}
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
                        onClick={() => setSelectedCategory(cat)}
                      >
                        <div
                          className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-slate-200 rounded flex-shrink-0"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <GripVertical className="h-3.5 w-3.5 text-slate-300" />
                        </div>
                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <FolderTree className="h-3 w-3 text-slate-400" />
                        </div>
                        <span className="text-sm font-medium truncate flex-1">{cat.name}</span>
                      </div>
                    );
                  })}
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
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-slate-700">{t.menu.services}</h3>
                    <Button size="sm" onClick={openCreateServiceForm}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t.menu.newService}
                    </Button>
                  </div>

                  {servicesLoading ? (
                    <LoadingState message={t.common.loading} />
                  ) : !services?.length ? (
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
                          <div className="flex">
                            <div className="w-24 h-24 bg-slate-100 flex-shrink-0">
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
                            <CardContent className="flex-1 p-3">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-medium text-sm">{service.title}</h4>
                                  {service.subTitle && (
                                    <p className="text-xs text-slate-500 line-clamp-1">
                                      {service.subTitle}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-sm font-semibold text-primary">
                                      {Number(service.basePrice).toFixed(2)} TL
                                    </span>
                                    <PriceTypeBadge priceType={service.priceType} t={t} />
                                  </div>
                                  {service.estimatedDurationMinutes && service.estimatedDurationMinutes > 0 && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <Clock className="h-3 w-3 text-slate-400" />
                                      <span className="text-xs text-slate-500">
                                        {service.estimatedDurationMinutes} dk
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1">
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
              {editingCategory ? t.menu.editCategory : t.menu.newCategory}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">{t.menu.categoryName} *</Label>
                <Input
                  id="categoryName"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t.menu.categoryName}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">{t.menu.displayOrder}</Label>
                <Input
                  id="order"
                  type="number"
                  min={0}
                  value={categoryForm.order || ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      order: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCategoryForm}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={isCategoryPending}>
                {isCategoryPending
                  ? t.common.loading
                  : editingCategory
                  ? t.common.update
                  : t.common.create}
              </Button>
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
                <Label htmlFor="serviceSubTitle">{t.menu.serviceSubTitle}</Label>
                <Input
                  id="serviceSubTitle"
                  value={serviceForm.subTitle}
                  onChange={(e) =>
                    setServiceForm((prev) => ({ ...prev, subTitle: e.target.value }))
                  }
                  placeholder={t.menu.serviceSubTitle}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceDesc">{t.menu.serviceDescription}</Label>
                <Textarea
                  id="serviceDesc"
                  value={serviceForm.description}
                  onChange={(e) =>
                    setServiceForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder={t.menu.serviceDescription}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basePrice">{t.menu.basePrice} (TL) *</Label>
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
              <Button type="submit" disabled={isServicePending}>
                {isServicePending
                  ? t.common.loading
                  : editingService
                  ? t.common.update
                  : t.common.create}
              </Button>
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
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden bg-transparent border-0 shadow-none [&>button]:hidden">
          {/* Phone Frame */}
          <div className="mx-auto w-[375px] bg-stone-50 rounded-[2rem] shadow-2xl border-[6px] border-stone-800 overflow-hidden relative">
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
              </div>

              {/* Menu content */}
              <div className="px-4 py-4 space-y-5">
                {previewData?.map(({ category, services: catServices }) => (
                  catServices.length > 0 && (
                    <div key={category.id}>
                      <div className="bg-gradient-to-r from-stone-800 to-stone-700 px-4 py-3 rounded-xl mb-3">
                        <h3 className="text-lg font-bold text-white">{category.name}</h3>
                      </div>
                      <PreviewServiceList services={catServices} t={t} />
                    </div>
                  )
                ))}

                {(!previewData || previewData.every(d => d.services.length === 0)) && (
                  <div className="py-16 text-center">
                    <FolderTree className="h-10 w-10 text-stone-300 mx-auto mb-3" />
                    <p className="text-sm text-stone-400">{t.menu.noCategories}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 text-center border-t border-stone-200 bg-white">
                <p className="text-[10px] text-stone-400">Powered by TourOps</p>
              </div>
            </div>

            {/* Phone bottom bar */}
            <div className="bg-stone-800 flex justify-center py-2">
              <div className="w-28 h-1 bg-stone-600 rounded-full" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
