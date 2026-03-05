'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Search, Trash2, MoreHorizontal, MapPin } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { tourApi, regionApi } from '@/lib/mockApi';
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

export default function AdminToursPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: tours, isLoading: toursLoading } = useQuery({
    queryKey: ['admin-tours'],
    queryFn: tourApi.list,
  });

  const { data: regions } = useQuery({
    queryKey: ['admin-regions'],
    queryFn: regionApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tourApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tours'] });
      setDeleteId(null);
    },
  });

  if (toursLoading) return <LoadingState />;

  const regionMap = new Map(regions?.map(r => [r.id, r.name]) || []);

  const filteredTours = tours?.filter(
    (tour) =>
      tour.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-xl">
            <Calendar className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t.admin.tourManagement}</h1>
            <p className="text-slate-500">{t.tours.description}</p>
          </div>
        </div>
        <Badge className="bg-violet-100 text-violet-700">
          {tours?.length || 0} {t.admin.tours}
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

      {/* Tours Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>{t.tours.list}</CardTitle>
          <CardDescription>{t.tours.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.tours.name}</TableHead>
                <TableHead>{t.tours.region}</TableHead>
                <TableHead>{t.tours.startDate}</TableHead>
                <TableHead>{t.tours.capacity}</TableHead>
                <TableHead>{t.tours.status}</TableHead>
                <TableHead className="text-right">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTours.map((tour) => (
                <TableRow key={tour.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-violet-600" />
                      </div>
                      <span className="font-medium">{tour.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="h-4 w-4" />
                      {regionMap.get(tour.regionId) || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {new Date(tour.startDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-slate-500">{tour.capacity}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        tour.status === 'Published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }
                    >
                      {tour.status === 'Published' ? t.tours.published : t.tours.draft}
                    </Badge>
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
                          onClick={() => setDeleteId(tour.id)}
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
        description={t.tours.deleteConfirm}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        variant="destructive"
      />
    </div>
  );
}
