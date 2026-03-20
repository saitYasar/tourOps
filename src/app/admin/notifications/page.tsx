'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Image as ImageIcon,
  Search,
  X,
  Check,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import { useLanguage } from '@/contexts/LanguageContext';
import { adminApi, type AdminNotificationDto, type NotificationTargetType } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { LoadingState, ConfirmDialog, AdminPagination } from '@/components/shared';

const TARGET_TYPES: NotificationTargetType[] = [
  'ALL_CLIENTS',
  'ALL_AGENCIES',
  'ALL_ORGANIZATIONS',
  'SPECIFIC_ORGANIZATION',
  'SPECIFIC_AGENCY',
  'SPECIFIC_CLIENT',
  'ORGANIZATION_CATEGORY',
];

const SPECIFIC_TYPES: NotificationTargetType[] = [
  'SPECIFIC_ORGANIZATION',
  'SPECIFIC_AGENCY',
  'SPECIFIC_CLIENT',
  'ORGANIZATION_CATEGORY',
];

interface TargetOption {
  value: string;
  label: string;
}

export default function AdminNotificationsPage() {
  const { t, locale } = useLanguage();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingNotification, setEditingNotification] = useState<AdminNotificationDto | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formTargetType, setFormTargetType] = useState<NotificationTargetType>('ALL_CLIENTS');
  const [formTargetIds, setFormTargetIds] = useState<string[]>([]);
  const [formTargetId, setFormTargetId] = useState('');
  const [formImage, setFormImage] = useState<File | null>(null);

  // Target options for inline search
  const [targetOptions, setTargetOptions] = useState<TargetOption[]>([]);
  const [targetOptionsLoading, setTargetOptionsLoading] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');

  // Image input ref
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Fetch target options when target type changes
  const fetchTargetOptions = useCallback(async (targetType: NotificationTargetType) => {
    if (!SPECIFIC_TYPES.includes(targetType)) {
      setTargetOptions([]);
      return;
    }
    setTargetOptionsLoading(true);
    try {
      if (targetType === 'SPECIFIC_ORGANIZATION') {
        const res = await adminApi.getOrganizationsList({ limit: 100, lang: locale as 'tr' | 'en' });
        if (res.success && res.data?.data) {
          setTargetOptions(res.data.data.map((o: { id: number; name: string }) => ({
            value: String(o.id),
            label: o.name,
          })));
        }
      } else if (targetType === 'SPECIFIC_AGENCY') {
        const res = await adminApi.getAgenciesList({ limit: 100, lang: locale as 'tr' | 'en' });
        if (res.success && res.data?.data) {
          setTargetOptions(res.data.data.map((a: { id: number; name: string }) => ({
            value: String(a.id),
            label: a.name,
          })));
        }
      } else if (targetType === 'SPECIFIC_CLIENT') {
        const res = await adminApi.getUsers(1, 200);
        if (res.success && res.data?.data) {
          setTargetOptions(res.data.data.map((u: { id: number; firstName: string; lastName: string; email: string }) => ({
            value: String(u.id),
            label: `${u.firstName} ${u.lastName} — ${u.email}`,
          })));
        }
      } else if (targetType === 'ORGANIZATION_CATEGORY') {
        const res = await adminApi.getOrganizationCategories();
        if (res.success && res.data) {
          const cats = Array.isArray(res.data) ? res.data : (res.data as { data?: { id: number; name: string }[] }).data || [];
          setTargetOptions(cats.map((c: { id: number; name: string }) => ({
            value: String(c.id),
            label: c.name,
          })));
        }
      }
    } catch {
      setTargetOptions([]);
    } finally {
      setTargetOptionsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (SPECIFIC_TYPES.includes(formTargetType)) {
      fetchTargetOptions(formTargetType);
    } else {
      setTargetOptions([]);
    }
  }, [formTargetType, fetchTargetOptions]);

  // Filtered options based on search
  const filteredTargetOptions = targetSearch.trim()
    ? targetOptions.filter(o => o.label.toLowerCase().includes(targetSearch.toLowerCase()))
    : targetOptions;

  // Fetch notifications
  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-notifications', page, limit],
    queryFn: () => adminApi.listNotifications(page, limit),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (formData: FormData) => adminApi.createNotification(formData),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
        toast.success(t.notifications.created);
        resetForm();
        setCreateOpen(false);
      } else {
        toast.error(res.error || t.notifications.createError);
      }
    },
    onError: (error) => {
      toast.error((error as Error).message || t.notifications.createError);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      adminApi.updateNotification(id, formData),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
        toast.success(t.notifications.updated);
        resetForm();
        setEditOpen(false);
        setEditingNotification(null);
      } else {
        toast.error(res.error || t.notifications.updateError);
      }
    },
    onError: (error) => {
      toast.error((error as Error).message || t.notifications.updateError);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteNotification(id),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
        toast.success(t.notifications.deleted);
      } else {
        toast.error(res.error || t.notifications.deleteError);
      }
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error((error as Error).message || t.notifications.deleteError);
      setDeleteId(null);
    },
  });

  const resetForm = () => {
    setFormTitle('');
    setFormBody('');
    setFormTargetType('ALL_CLIENTS');
    setFormTargetIds([]);
    setFormTargetId('');
    setFormImage(null);
    setTargetSearch('');
  };

  const openEdit = (notification: AdminNotificationDto) => {
    setEditingNotification(notification);
    setFormTitle(notification.title);
    setFormBody(notification.body);
    setFormTargetType(notification.targetType);
    setFormTargetId(notification.targetId ? String(notification.targetId) : '');
    setFormTargetIds(notification.targetId ? [String(notification.targetId)] : []);
    setFormImage(null);
    setTargetSearch('');
    setEditOpen(true);
  };

  const buildFormData = (targetId?: string) => {
    const fd = new FormData();
    fd.append('title', formTitle);
    fd.append('body', formBody);
    fd.append('targetType', formTargetType);
    if (SPECIFIC_TYPES.includes(formTargetType)) {
      const id = targetId || formTargetId;
      if (id) fd.append('targetId', id);
    }
    if (formImage) {
      fd.append('image', formImage);
    }
    return fd;
  };

  // Multi-create mutation for batch creating
  const [isMultiCreating, setIsMultiCreating] = useState(false);

  const handleCreate = async () => {
    if (!formTitle.trim() || !formBody.trim()) return;

    const needsTarget = SPECIFIC_TYPES.includes(formTargetType);
    const hasMultiple = needsTarget && formTargetIds.length > 1;
    const hasSingle = needsTarget && (formTargetIds.length === 1 || formTargetId);

    if (needsTarget && formTargetIds.length === 0 && !formTargetId) return;

    if (hasMultiple) {
      setIsMultiCreating(true);
      let successCount = 0;
      let errorCount = 0;
      for (const tid of formTargetIds) {
        try {
          const res = await adminApi.createNotification(buildFormData(tid));
          if (res.success) successCount++;
          else errorCount++;
        } catch {
          errorCount++;
        }
      }
      setIsMultiCreating(false);
      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
        toast.success(`${successCount} ${t.notifications.created}${errorCount > 0 ? `, ${errorCount} hata` : ''}`);
        resetForm();
        setCreateOpen(false);
      } else {
        toast.error(t.notifications.createError);
      }
    } else if (hasSingle) {
      const tid = formTargetIds[0] || formTargetId;
      createMutation.mutate(buildFormData(tid));
    } else {
      createMutation.mutate(buildFormData());
    }
  };

  const handleUpdate = () => {
    if (!editingNotification || !formTitle.trim() || !formBody.trim()) return;
    const tid = formTargetIds[0] || formTargetId;
    updateMutation.mutate({ id: editingNotification.id, formData: buildFormData(tid) });
  };

  if (isLoading) return <LoadingState />;

  const notifications = result?.success ? result.data?.data || [] : [];
  const meta = result?.success ? result.data?.meta : null;

  const getTargetLabel = (targetType: NotificationTargetType) => {
    switch (targetType) {
      case 'SPECIFIC_ORGANIZATION': return t.notifications.selectOrganization;
      case 'SPECIFIC_AGENCY': return t.notifications.selectAgency;
      case 'SPECIFIC_CLIENT': return t.notifications.selectClient;
      case 'ORGANIZATION_CATEGORY': return t.notifications.selectCategory;
      default: return '';
    }
  };

  const toggleTargetId = (id: string, isEdit: boolean) => {
    if (isEdit) {
      // Single select for edit
      setFormTargetIds([id]);
      setFormTargetId(id);
    } else {
      // Multi select for create
      if (formTargetIds.includes(id)) {
        setFormTargetIds(formTargetIds.filter(v => v !== id));
      } else {
        setFormTargetIds([...formTargetIds, id]);
      }
    }
  };

  const renderTargetSelector = (isEdit: boolean) => {
    if (!SPECIFIC_TYPES.includes(formTargetType)) return null;

    const selectedOptions = targetOptions.filter(o =>
      isEdit ? (o.value === formTargetIds[0] || o.value === formTargetId) : formTargetIds.includes(o.value)
    );

    return (
      <div>
        <Label>{getTargetLabel(formTargetType)}</Label>

        {/* Selected items */}
        {selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 mt-1">
            {selectedOptions.map(opt => (
              <Badge key={opt.value} variant="secondary" className="text-xs gap-1 pr-1">
                {opt.label}
                <button
                  type="button"
                  className="ml-0.5 hover:text-red-600 rounded-full"
                  onClick={() => {
                    if (isEdit) {
                      setFormTargetIds([]);
                      setFormTargetId('');
                    } else {
                      setFormTargetIds(formTargetIds.filter(v => v !== opt.value));
                    }
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {!isEdit && formTargetIds.length > 0 && (
              <button
                type="button"
                className="text-xs text-red-500 hover:text-red-700 ml-1"
                onClick={() => setFormTargetIds([])}
              >
                {t.notifications.clearAll}
              </button>
            )}
          </div>
        )}

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={targetSearch}
            onChange={(e) => setTargetSearch(e.target.value)}
            placeholder={t.notifications.searchByName}
            className="pl-9 pr-8"
          />
          {targetSearch && (
            <button
              type="button"
              onClick={() => setTargetSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Options list (always inline, scrollable) */}
        <div className="mt-2 border rounded-lg max-h-[200px] overflow-y-auto">
          {targetOptionsLoading ? (
            <div className="py-6 text-center text-sm text-slate-500">{t.common.loading}</div>
          ) : filteredTargetOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">{t.notifications.noResults}</div>
          ) : (
            filteredTargetOptions.map((opt) => {
              const isSelected = isEdit
                ? (opt.value === formTargetIds[0] || opt.value === formTargetId)
                : formTargetIds.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left border-b last:border-b-0 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                  onClick={() => toggleTargetId(opt.value, isEdit)}
                >
                  <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-sm truncate">{opt.label}</span>
                  <span className="text-xs text-slate-400 ml-auto shrink-0">ID: {opt.value}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Selected count info */}
        {!isEdit && formTargetIds.length > 1 && (
          <p className="text-xs text-slate-500 mt-1.5">
            {formTargetIds.length} {t.notifications.selected} — {t.notifications.eachWillBeCreated}
          </p>
        )}
      </div>
    );
  };

  const renderForm = (isEdit: boolean) => (
    <div className="space-y-4">
      <div>
        <Label>{t.notifications.notifTitle}</Label>
        <Input
          value={formTitle}
          onChange={(e) => setFormTitle(e.target.value)}
          placeholder={t.notifications.notifTitlePlaceholder}
        />
      </div>
      <div>
        <Label>{t.notifications.body}</Label>
        <Textarea
          value={formBody}
          onChange={(e) => setFormBody(e.target.value)}
          placeholder={t.notifications.notifBodyPlaceholder}
          rows={4}
        />
      </div>
      <div>
        <Label>{t.notifications.targetType}</Label>
        <Select value={formTargetType} onValueChange={(v) => { setFormTargetType(v as NotificationTargetType); setFormTargetIds([]); setFormTargetId(''); setTargetSearch(''); }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TARGET_TYPES.map((tt) => (
              <SelectItem key={tt} value={tt}>
                {t.notifications.targetTypes[tt]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {renderTargetSelector(isEdit)}

      {/* Image Upload */}
      <div>
        <Label>{t.notifications.image}</Label>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFormImage(e.target.files?.[0] || null)}
        />
        {formImage ? (
          <div className="mt-1 flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="h-12 w-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={URL.createObjectURL(formImage)}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{formImage.name}</p>
              <p className="text-xs text-slate-400">{(formImage.size / 1024).toFixed(0)} KB</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
              >
                {t.notifications.changeImage}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => setFormImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="mt-1 w-full flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
          >
            <Upload className="h-6 w-6 text-slate-400" />
            <span className="text-sm text-slate-500">{t.notifications.imageUpload}</span>
          </button>
        )}
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            resetForm();
            isEdit ? setEditOpen(false) : setCreateOpen(false);
          }}
        >
          {t.common.cancel}
        </Button>
        <Button
          onClick={isEdit ? handleUpdate : handleCreate}
          disabled={createMutation.isPending || updateMutation.isPending || isMultiCreating}
        >
          {createMutation.isPending || updateMutation.isPending || isMultiCreating
            ? t.common.loading
            : isEdit
            ? t.common.update
            : t.common.create}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t.notifications.title}
              </CardTitle>
              <CardDescription>{t.admin.notificationManagement}</CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {t.notifications.create}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t.notifications.noNotifications}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>{t.notifications.notifTitle}</TableHead>
                    <TableHead>{t.notifications.targetType}</TableHead>
                    <TableHead>{t.notifications.targetId}</TableHead>
                    <TableHead>{t.notifications.image}</TableHead>
                    <TableHead>{t.common.createdAt}</TableHead>
                    <TableHead>{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((n: AdminNotificationDto) => (
                    <TableRow key={n.id}>
                      <TableCell className="font-mono text-sm">{n.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{n.title}</p>
                          <p className="text-sm text-slate-500 line-clamp-1">{n.body}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {t.notifications.targetTypes[n.targetType] || n.targetType}
                        </Badge>
                      </TableCell>
                      <TableCell>{n.targetId || '-'}</TableCell>
                      <TableCell>
                        {n.imageUrl ? (
                          <ImageIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(n.createdAt).toLocaleDateString(locale)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(n)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {t.common.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteId(n.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t.common.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <AdminPagination
                page={page}
                limit={limit}
                total={meta?.total || meta?.totalCount || notifications.length}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.notifications.create}</DialogTitle>
          </DialogHeader>
          {renderForm(false)}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingNotification(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.notifications.edit}</DialogTitle>
          </DialogHeader>
          {renderForm(true)}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title={t.notifications.delete}
        description={t.notifications.deleteConfirm}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
        variant="destructive"
      />
    </div>
  );
}
