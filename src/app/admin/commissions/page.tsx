'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Percent,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';

import { useLanguage } from '@/contexts/LanguageContext';
import {
  adminApi,
  type SystemCommissionDto,
  type CreateSystemCommissionDto,
  type UpdateSystemCommissionDto,
  type CommissionScope,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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

const SCOPES: CommissionScope[] = ['global', 'category', 'organization'];

export default function AdminCommissionsPage() {
  const { t, locale } = useLanguage();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [filterScope, setFilterScope] = useState<string>('');

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingCommission, setEditingCommission] = useState<SystemCommissionDto | null>(null);

  // Form state
  const [formScope, setFormScope] = useState<CommissionScope>('global');
  const [formScopeId, setFormScopeId] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formActive, setFormActive] = useState(true);

  // Fetch commissions
  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-commissions', page, limit, filterScope],
    queryFn: () => adminApi.listSystemCommissions(page, limit, filterScope || undefined, undefined),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateSystemCommissionDto) => adminApi.createSystemCommission(data),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['admin-commissions'] });
        toast.success(t.commissions.created);
        resetForm();
        setCreateOpen(false);
      } else {
        toast.error(res.error || t.commissions.createError);
      }
    },
    onError: (error) => {
      toast.error((error as Error).message || t.commissions.createError);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSystemCommissionDto }) =>
      adminApi.updateSystemCommission(id, data),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['admin-commissions'] });
        toast.success(t.commissions.updated);
        resetForm();
        setEditOpen(false);
        setEditingCommission(null);
      } else {
        toast.error(res.error || t.commissions.updateError);
      }
    },
    onError: (error) => {
      toast.error((error as Error).message || t.commissions.updateError);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteSystemCommission(id),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['admin-commissions'] });
        toast.success(t.commissions.deleted);
      } else {
        toast.error(res.error || t.commissions.deleteError);
      }
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error((error as Error).message || t.commissions.deleteError);
      setDeleteId(null);
    },
  });

  const resetForm = () => {
    setFormScope('global');
    setFormScopeId('');
    setFormValue('');
    setFormDescription('');
    setFormActive(true);
  };

  const openEdit = (commission: SystemCommissionDto) => {
    setEditingCommission(commission);
    setFormScope(commission.scope);
    setFormScopeId(commission.scopeId ? String(commission.scopeId) : '');
    setFormValue(String(commission.value));
    setFormDescription(commission.description || '');
    setFormActive(commission.active);
    setEditOpen(true);
  };

  const handleCreate = () => {
    if (!formValue) return;
    const data: CreateSystemCommissionDto = {
      scope: formScope,
      value: Number(formValue),
      active: formActive,
    };
    if (formScope !== 'global' && formScopeId) {
      data.scopeId = Number(formScopeId);
    }
    if (formDescription.trim()) {
      data.description = formDescription.trim();
    }
    createMutation.mutate(data);
  };

  const handleUpdate = () => {
    if (!editingCommission || !formValue) return;
    const data: UpdateSystemCommissionDto = {
      scope: formScope,
      value: Number(formValue),
      active: formActive,
    };
    if (formScope !== 'global' && formScopeId) {
      data.scopeId = Number(formScopeId);
    }
    if (formDescription.trim()) {
      data.description = formDescription.trim();
    }
    updateMutation.mutate({ id: editingCommission.id, data });
  };

  if (isLoading) return <LoadingState />;

  const commissions = result?.success ? result.data?.data || [] : [];
  const meta = result?.success ? result.data?.meta : null;
  const totalPages = meta ? Math.ceil((meta.total || meta.totalCount || 0) / limit) : 1;

  const scopeBadgeColor = (scope: string) => {
    switch (scope) {
      case 'global': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'category': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'organization': return 'bg-green-100 text-green-700 border-green-200';
      default: return '';
    }
  };

  const renderForm = (isEdit: boolean) => (
    <div className="space-y-4">
      <div>
        <Label>{t.commissions.scope}</Label>
        <Select value={formScope} onValueChange={(v) => setFormScope(v as CommissionScope)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCOPES.map((s) => (
              <SelectItem key={s} value={s}>
                {t.commissions.scopeTypes[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {formScope !== 'global' && (
        <div>
          <Label>{t.commissions.scopeId}</Label>
          <Input
            type="number"
            value={formScopeId}
            onChange={(e) => setFormScopeId(e.target.value)}
            placeholder="ID"
          />
        </div>
      )}
      <div>
        <Label>{t.commissions.value}</Label>
        <Input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          placeholder="0"
        />
      </div>
      <div>
        <Label>{t.commissions.description}</Label>
        <Input
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          placeholder={locale === 'tr' ? 'Komisyon açıklaması' : 'Commission description'}
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={formActive} onCheckedChange={setFormActive} />
        <Label>{t.commissions.active}</Label>
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
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending
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
                <Percent className="h-5 w-5" />
                {t.commissions.title}
              </CardTitle>
              <CardDescription>{t.admin.commissionManagement}</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={filterScope} onValueChange={setFilterScope}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t.common.all} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common.all}</SelectItem>
                  {SCOPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t.commissions.scopeTypes[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                {t.commissions.create}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Percent className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t.commissions.noCommissions}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>{t.commissions.scope}</TableHead>
                    <TableHead>{t.commissions.scopeId}</TableHead>
                    <TableHead>{t.commissions.value}</TableHead>
                    <TableHead>{t.commissions.description}</TableHead>
                    <TableHead>{t.commissions.active}</TableHead>
                    <TableHead>{t.common.createdAt}</TableHead>
                    <TableHead>{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((c: SystemCommissionDto) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm">{c.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={scopeBadgeColor(c.scope)}>
                          {t.commissions.scopeTypes[c.scope] || c.scope}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.scopeId || '-'}</TableCell>
                      <TableCell className="font-semibold">%{c.value}</TableCell>
                      <TableCell className="text-sm text-slate-500 max-w-[200px] truncate">
                        {c.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.active ? 'default' : 'secondary'}>
                          {c.active ? t.admin.statusActive : t.admin.statusInactive}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(c.createdAt).toLocaleDateString(locale)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(c)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {t.common.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteId(c.id)}
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
            <DialogTitle>{t.commissions.create}</DialogTitle>
          </DialogHeader>
          {renderForm(false)}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingCommission(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.commissions.edit}</DialogTitle>
          </DialogHeader>
          {renderForm(true)}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title={t.commissions.delete}
        description={t.commissions.deleteConfirm}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
        variant="destructive"
      />
    </div>
  );
}
