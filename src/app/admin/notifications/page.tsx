'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Image as ImageIcon,
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
import { LoadingState, ConfirmDialog } from '@/components/shared';
import { MultiCombobox, type MultiComboboxOption } from '@/components/ui/multi-combobox';
import { Combobox } from '@/components/ui/combobox';

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

  // Target options for searchable selects
  const [targetOptions, setTargetOptions] = useState<MultiComboboxOption[]>([]);
  const [targetOptionsLoading, setTargetOptionsLoading] = useState(false);

  // Fetch target options when target type changes
  const fetchTargetOptions = useCallback(async (targetType: NotificationTargetType) => {
    if (!SPECIFIC_TYPES.includes(targetType)) {
      setTargetOptions([]);
      return;
    }
    setTargetOptionsLoading(true);
    try {
      if (targetType === 'SPECIFIC_ORGANIZATION') {
        const res = await adminApi.getOrganizationsList({ limit: 200, lang: locale as 'tr' | 'en' });
        if (res.success && res.data?.data) {
          setTargetOptions(res.data.data.map((o: { id: number; name: string }) => ({
            value: String(o.id),
            label: `${o.name} (ID: ${o.id})`,
          })));
        }
      } else if (targetType === 'SPECIFIC_AGENCY') {
        const res = await adminApi.getAgenciesList({ limit: 200, lang: locale as 'tr' | 'en' });
        if (res.success && res.data?.data) {
          setTargetOptions(res.data.data.map((a: { id: number; name: string }) => ({
            value: String(a.id),
            label: `${a.name} (ID: ${a.id})`,
          })));
        }
      } else if (targetType === 'SPECIFIC_CLIENT') {
        const res = await adminApi.getUsers(1, 200);
        if (res.success && res.data?.data) {
          setTargetOptions(res.data.data.map((u: { id: number; firstName: string; lastName: string; email: string }) => ({
            value: String(u.id),
            label: `${u.firstName} ${u.lastName} — ${u.email} (ID: ${u.id})`,
          })));
        }
      } else if (targetType === 'ORGANIZATION_CATEGORY') {
        const res = await adminApi.getOrganizationCategories();
        if (res.success && res.data) {
          const cats = Array.isArray(res.data) ? res.data : (res.data as { data?: { id: number; name: string }[] }).data || [];
          setTargetOptions(cats.map((c: { id: number; name: string }) => ({
            value: String(c.id),
            label: `${c.name} (ID: ${c.id})`,
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
  };

  const openEdit = (notification: AdminNotificationDto) => {
    setEditingNotification(notification);
    setFormTitle(notification.title);
    setFormBody(notification.body);
    setFormTargetType(notification.targetType);
    setFormTargetId(notification.targetId ? String(notification.targetId) : '');
    setFormTargetIds(notification.targetId ? [String(notification.targetId)] : []);
    setFormImage(null);
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
      // Create one notification per selected target
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
        toast.success(`${successCount} bildirim oluşturuldu${errorCount > 0 ? `, ${errorCount} hata` : ''}`);
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
  const totalPages = meta ? Math.ceil((meta.total || meta.totalCount || 0) / limit) : 1;

  const renderForm = (isEdit: boolean) => (
    <div className="space-y-4">
      <div>
        <Label>{t.common.appName === 'TourOps' ? 'Başlık' : 'Title'}</Label>
        <Input
          value={formTitle}
          onChange={(e) => setFormTitle(e.target.value)}
          placeholder={locale === 'tr' ? 'Bildirim başlığı' : 'Notification title'}
        />
      </div>
      <div>
        <Label>{t.notifications.body}</Label>
        <Textarea
          value={formBody}
          onChange={(e) => setFormBody(e.target.value)}
          placeholder={locale === 'tr' ? 'Bildirim içeriği' : 'Notification content'}
          rows={4}
        />
      </div>
      <div>
        <Label>{t.notifications.targetType}</Label>
        <Select value={formTargetType} onValueChange={(v) => { setFormTargetType(v as NotificationTargetType); setFormTargetIds([]); setFormTargetId(''); }}>
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
      {SPECIFIC_TYPES.includes(formTargetType) && (
        <div>
          <Label>
            {formTargetType === 'SPECIFIC_ORGANIZATION' ? 'İşletme Seçin' :
             formTargetType === 'SPECIFIC_AGENCY' ? 'Acente Seçin' :
             formTargetType === 'SPECIFIC_CLIENT' ? 'Müşteri Seçin' :
             'Kategori Seçin'}
          </Label>
          {isEdit ? (
            <Combobox
              options={targetOptions.map(o => ({ value: o.value, label: o.label }))}
              value={formTargetIds[0] || formTargetId}
              onValueChange={(v) => { setFormTargetIds([v]); setFormTargetId(v); }}
              placeholder={locale === 'tr' ? 'Ara ve seç...' : 'Search and select...'}
              searchPlaceholder={locale === 'tr' ? 'İsme göre ara...' : 'Search by name...'}
              emptyText={targetOptionsLoading ? 'Yükleniyor...' : (locale === 'tr' ? 'Sonuç bulunamadı' : 'No results')}
            />
          ) : (
            <MultiCombobox
              options={targetOptions}
              values={formTargetIds}
              onValuesChange={setFormTargetIds}
              placeholder={locale === 'tr' ? 'Ara ve seç...' : 'Search and select...'}
              searchPlaceholder={locale === 'tr' ? 'İsme göre ara...' : 'Search by name...'}
              emptyText={locale === 'tr' ? 'Sonuç bulunamadı' : 'No results'}
              loading={targetOptionsLoading}
            />
          )}
          {!isEdit && formTargetIds.length > 1 && (
            <p className="text-xs text-slate-500 mt-1">
              {formTargetIds.length} seçildi — her biri için ayrı bildirim oluşturulacak
            </p>
          )}
        </div>
      )}
      <div>
        <Label>{t.notifications.image}</Label>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setFormImage(e.target.files?.[0] || null)}
        />
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
                    <TableHead>{locale === 'tr' ? 'Başlık' : 'Title'}</TableHead>
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-slate-500">
                    {t.admin.paginationTotal}: {meta?.total || meta?.totalCount || 0} {t.admin.paginationRecords}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      {t.admin.previous}
                    </Button>
                    <span className="flex items-center text-sm px-2">
                      {t.admin.paginationPage} {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {t.admin.nextPage}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.notifications.create}</DialogTitle>
          </DialogHeader>
          {renderForm(false)}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingNotification(null); }}>
        <DialogContent>
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
