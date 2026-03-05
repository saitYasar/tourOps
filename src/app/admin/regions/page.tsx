'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Search, Trash2, Edit, MoreHorizontal, Plus } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { regionApi } from '@/lib/mockApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { LoadingState, ErrorState, ConfirmDialog } from '@/components/shared';

export default function AdminRegionsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: regions, isLoading, error } = useQuery({
    queryKey: ['admin-regions'],
    queryFn: regionApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => regionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-regions'] });
      setDeleteId(null);
    },
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={t.common.error} />;

  const filteredRegions = regions?.filter(
    (region) =>
      region.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <MapPin className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t.admin.regionManagement}</h1>
            <p className="text-slate-500">{t.regions.description}</p>
          </div>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700">
          {regions?.length || 0} {t.admin.regions}
        </Badge>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t.common.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Regions Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>{t.regions.list}</CardTitle>
          <CardDescription>{t.regions.description}</CardDescription>
        </CardHeader>
        <CardContent>
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
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-emerald-600" />
                      </div>
                      <span className="font-medium">{region.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 max-w-xs truncate">
                    {region.description || '-'}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {new Date(region.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setDeleteId(region.id)}
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
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title={t.common.delete}
        description={t.regions.deleteConfirm}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        variant="destructive"
      />
    </div>
  );
}
