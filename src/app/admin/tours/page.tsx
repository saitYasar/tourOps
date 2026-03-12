'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Search,
  Image as ImageIcon,
  Users,
  Eye,
  Building2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
} from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { adminApi } from '@/lib/api';
import type { ApiTourDto } from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { LoadingState, EmptyState, ErrorState, TourStatusBadge } from '@/components/shared';

function resolveImageUrl(url?: string | null): string | null {
  return url || null;
}

const ITEMS_PER_PAGE = 12;

export default function AdminToursPage() {
  const { t, locale } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);

  const lang = (locale === 'de' ? 'en' : locale) as 'tr' | 'en';

  const { data: toursResponse, isLoading, error } = useQuery({
    queryKey: ['admin-tours', page, statusFilter, lang],
    queryFn: async () => {
      const status = statusFilter !== 'all' ? statusFilter : undefined;
      const result = await adminApi.getTours(page, ITEMS_PER_PAGE, lang, status);
      if (!result.success) throw new Error(result.error);
      return { data: result.data || [], meta: result.meta };
    },
  });

  const tours = toursResponse?.data || [];
  const meta = toursResponse?.meta;
  const totalPages = meta?.totalPages || 1;

  // Client-side search filter (on top of server-side status filter)
  const filteredTours = tours.filter(
    (tour) =>
      tour.tourName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.tourCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Tour detail query
  const { data: tourDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-tour-detail', selectedTourId, lang],
    queryFn: async () => {
      if (!selectedTourId) return null;
      const result = await adminApi.getTourById(selectedTourId, lang);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!selectedTourId,
  });

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  if (error) return <ErrorState message={t.admin.tourLoadError} />;

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
          {meta?.total || meta?.totalCount || tours.length} {t.admin.tours}
        </Badge>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t.admin.tourSearchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t.tours.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.admin.allStatuses}</SelectItem>
                <SelectItem value="draft">{t.tours.draft}</SelectItem>
                <SelectItem value="published">{t.tours.published}</SelectItem>
                <SelectItem value="cancelled">{t.tours.cancelled}</SelectItem>
                <SelectItem value="completed">{t.tours.completed}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && <LoadingState />}

      {/* Tours Grid */}
      {!isLoading && filteredTours.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={t.tours.list}
          description={t.tours.noTours}
        />
      ) : !isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTours.map((tour) => {
            const coverUrl = resolveImageUrl(tour.coverImageUrl);
            return (
              <Card
                key={tour.id}
                className="border-0 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTourId(tour.id)}
              >
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
                  {tour.agency && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Building2 className="h-3 w-3" />
                      <span>{tour.agency.name}</span>
                    </div>
                  )}
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

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            {t.admin.previous}
          </Button>
          <span className="text-sm text-slate-500">
            {t.admin.paginationPage} {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            {t.admin.nextPage}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Tour Detail Dialog */}
      <Dialog open={!!selectedTourId} onOpenChange={(open) => !open && setSelectedTourId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {isDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingState />
            </div>
          ) : tourDetail ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {tourDetail.tourName}
                  <TourStatusBadge status={tourDetail.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Cover Image */}
                {resolveImageUrl(tourDetail.coverImageUrl) && (
                  <div>
                    <p className="text-sm text-slate-500 mb-2">{t.tours.coverImage}</p>
                    <div className="w-full h-56 rounded-lg overflow-hidden bg-slate-100">
                      <img
                        src={resolveImageUrl(tourDetail.coverImageUrl)!}
                        alt={tourDetail.tourName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Gallery */}
                {tourDetail.galleryImages && tourDetail.galleryImages.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-500 mb-2">{t.tours.gallery} ({tourDetail.galleryImages.length})</p>
                    <div className="grid grid-cols-4 gap-2">
                      {tourDetail.galleryImages.map((img) => {
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

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">{t.tours.tourCode}</p>
                    <p className="font-mono font-medium">{tourDetail.tourCode}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t.tours.status}</p>
                    <TourStatusBadge status={tourDetail.status} />
                  </div>
                  <div>
                    <p className="text-slate-500">{t.tours.startDate}</p>
                    <p className="font-medium">{formatDate(tourDetail.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t.tours.endDate}</p>
                    <p className="font-medium">{formatDate(tourDetail.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t.tours.minParticipants}</p>
                    <p className="font-medium">{tourDetail.minParticipants || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t.tours.maxParticipants}</p>
                    <p className="font-medium">{tourDetail.maxParticipants || '-'}</p>
                  </div>
                </div>

                {/* Agency */}
                {tourDetail.agency && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">{t.admin.tourAgency}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span>{tourDetail.agency.name}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Description */}
                {tourDetail.description && (
                  <>
                    <Separator />
                    <div className="text-sm">
                      <p className="text-slate-500">{t.tours.tourDescription}</p>
                      <p className="mt-1">{tourDetail.description}</p>
                    </div>
                  </>
                )}

                {/* Stops */}
                {tourDetail.stops && tourDetail.stops.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        {t.tours.stops} ({tourDetail.stops.length})
                      </p>
                      <div className="space-y-2">
                        {tourDetail.stops.map((stop, index) => (
                          <div key={stop.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg text-sm">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-600 text-xs font-bold shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {stop.organization?.name || `${t.tours.organization} #${stop.organizationId}`}
                              </p>
                              {stop.organization?.address && (
                                <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {stop.organization.address}
                                </p>
                              )}
                              <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" />
                                {formatDate(stop.scheduledStartTime)} - {formatDate(stop.scheduledEndTime)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Participants */}
                {tourDetail.participants && tourDetail.participants.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        {t.admin.tourParticipants} ({tourDetail.participants.length})
                      </p>
                      <div className="space-y-1">
                        {tourDetail.participants.map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              <span>{p.clientName || `#${p.clientId}`}</span>
                            </div>
                            {p.status && (
                              <Badge variant="outline" className="text-xs">
                                {p.status}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
