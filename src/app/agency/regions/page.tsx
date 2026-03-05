'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';

import { regionApi } from '@/lib/mockApi';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Region } from '@/types';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState, EmptyState, ErrorState, ConfirmDialog } from '@/components/shared';
import { formatDate } from '@/lib/dateUtils';

export default function RegionsPage() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Region | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  // Query: Bolgeleri getir
  const {
    data: regions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['regions'],
    queryFn: regionApi.list,
  });

  // Mutation: Bolge olustur
  const createMutation = useMutation({
    mutationFn: regionApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast.success(t.regions.created);
      closeForm();
    },
    onError: () => {
      toast.error(t.common.error);
    },
  });

  // Mutation: Bölge güncelle
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Region> }) =>
      regionApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast.success(t.regions.updated);
      closeForm();
    },
    onError: () => {
      toast.error(t.common.error);
    },
  });

  // Mutation: Bolge sil
  const deleteMutation = useMutation({
    mutationFn: regionApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast.success(t.regions.deleted);
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error(t.common.error);
    },
  });

  const openCreateForm = () => {
    setEditingRegion(null);
    setFormData({ name: '', description: '' });
    setIsFormOpen(true);
  };

  const openEditForm = (region: Region) => {
    setEditingRegion(region);
    setFormData({ name: region.name, description: region.description || '' });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingRegion(null);
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(t.common.required);
      return;
    }

    if (editingRegion) {
      updateMutation.mutate({ id: editingRegion.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredRegions = regions?.filter((region) =>
    region.name.toLowerCase().includes(search.toLowerCase())
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <Header title={t.regions.title} description={t.regions.description} />

      <div className="flex-1 p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-medium">{t.regions.list}</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t.common.search}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 pl-9"
                />
              </div>
              <Button onClick={openCreateForm}>
                <Plus className="h-4 w-4 mr-2" />
                {t.regions.new}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState message={t.common.loading} />
            ) : error ? (
              <ErrorState onRetry={() => refetch()} />
            ) : !filteredRegions?.length ? (
              <EmptyState
                icon={MapPin}
                title={t.regions.notFound}
                description={
                  search
                    ? t.regions.notFoundDesc
                    : t.regions.noRegions
                }
                actionLabel={!search ? t.regions.new : undefined}
                onAction={!search ? openCreateForm : undefined}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.regions.name}</TableHead>
                    <TableHead>{t.regions.regionDescription}</TableHead>
                    <TableHead>{t.regions.createdAt}</TableHead>
                    <TableHead className="text-right">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegions.map((region) => (
                    <TableRow key={region.id}>
                      <TableCell className="font-medium">{region.name}</TableCell>
                      <TableCell className="text-slate-500 max-w-xs truncate">
                        {region.description || '-'}
                      </TableCell>
                      <TableCell>{formatDate(region.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditForm(region)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(region)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRegion ? t.regions.edit : t.regions.new}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t.regions.name} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t.regions.name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t.regions.regionDescription}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder={t.regions.regionDescription}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t.common.loading : editingRegion ? t.common.update : t.common.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t.common.delete}
        description={`"${deleteTarget?.name}" ${t.regions.deleteConfirm}`}
        confirmLabel={t.common.delete}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        variant="destructive"
      />
    </div>
  );
}
