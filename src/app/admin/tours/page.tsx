'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Search, Image as ImageIcon, Users, Eye } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { adminApi } from '@/lib/api';
import type { ApiTourDto } from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingState, EmptyState, TourStatusBadge } from '@/components/shared';

function resolveImageUrl(url?: string | null): string | null {
  return url || null;
}

export default function AdminToursPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTour, setSelectedTour] = useState<ApiTourDto | null>(null);

  const { data: tours, isLoading } = useQuery({
    queryKey: ['admin-tours'],
    queryFn: async () => {
      const result = await adminApi.getTours(1, 100);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
  });

  if (isLoading) return <LoadingState />;

  const filteredTours = tours?.filter(
    (tour) =>
      tour.tourName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.tourCode.toLowerCase().includes(searchTerm.toLowerCase())
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

      {/* Tours Grid */}
      {filteredTours.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={t.tours.list}
          description={t.tours.noTours}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTours.map((tour) => {
            const coverUrl = resolveImageUrl(tour.coverImageUrl);
            return (
              <Card key={tour.id} className="border-0 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTour(tour)}>
                {/* Cover Image */}
                <div className="h-40 bg-slate-100 relative">
                  {coverUrl ? (
                    <img src={coverUrl} alt={tour.tourName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <TourStatusBadge status={tour.status} />
                  </div>
                </div>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold truncate">{tour.tourName}</h3>
                    <span className="text-xs font-mono text-slate-400">{tour.tourCode}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(tour.startDate)} - {formatDate(tour.endDate)}</span>
                    </div>
                    {tour.maxParticipants && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{tour.maxParticipants}</span>
                      </div>
                    )}
                  </div>
                  {tour.galleryImages && tour.galleryImages.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <ImageIcon className="h-3 w-3" />
                      <span>{tour.galleryImages.length} fotoğraf</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tour Detail Dialog */}
      <Dialog open={!!selectedTour} onOpenChange={(open) => !open && setSelectedTour(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedTour && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedTour.tourName}
                  <TourStatusBadge status={selectedTour.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Cover Image */}
                {resolveImageUrl(selectedTour.coverImageUrl) && (
                  <div>
                    <p className="text-sm text-slate-500 mb-2">{t.tours.coverImage}</p>
                    <div className="w-full h-56 rounded-lg overflow-hidden bg-slate-100">
                      <img
                        src={resolveImageUrl(selectedTour.coverImageUrl)!}
                        alt={selectedTour.tourName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Gallery */}
                {selectedTour.galleryImages && selectedTour.galleryImages.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-500 mb-2">{t.tours.gallery} ({selectedTour.galleryImages.length})</p>
                    <div className="grid grid-cols-4 gap-2">
                      {selectedTour.galleryImages.map((img) => {
                        const imgSrc = resolveImageUrl(img.imageUrl);
                        if (!imgSrc) return null;
                        return (
                          <div key={img.id} className="h-24 rounded-lg overflow-hidden bg-slate-100">
                            <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">{t.tours.tourCode}</p>
                    <p className="font-mono font-medium">{selectedTour.tourCode}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t.tours.status}</p>
                    <TourStatusBadge status={selectedTour.status} />
                  </div>
                  <div>
                    <p className="text-slate-500">{t.tours.startDate}</p>
                    <p className="font-medium">{formatDate(selectedTour.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t.tours.endDate}</p>
                    <p className="font-medium">{formatDate(selectedTour.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t.tours.minParticipants}</p>
                    <p className="font-medium">{selectedTour.minParticipants || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t.tours.maxParticipants}</p>
                    <p className="font-medium">{selectedTour.maxParticipants || '-'}</p>
                  </div>
                </div>
                {selectedTour.description && (
                  <div className="text-sm">
                    <p className="text-slate-500">{t.tours.tourDescription}</p>
                    <p className="mt-1">{selectedTour.description}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
