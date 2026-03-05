'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  Search,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { preReservationRequestApi, tourApi, restaurantApi } from '@/lib/mockApi';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState, ErrorState } from '@/components/shared';
import type { RequestStatus } from '@/types';

const statusColors: Record<RequestStatus, { bg: string; text: string; icon: React.ElementType }> = {
  Pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  Approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  Rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
};

export default function AdminRequestsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: preReservationRequestApi.list,
  });

  const { data: tours } = useQuery({
    queryKey: ['admin-tours'],
    queryFn: tourApi.list,
  });

  const { data: restaurants } = useQuery({
    queryKey: ['admin-restaurants'],
    queryFn: restaurantApi.list,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RequestStatus }) =>
      preReservationRequestApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
    },
  });

  if (requestsLoading) return <LoadingState />;

  const tourMap = new Map(tours?.map(t => [t.id, t.name]) || []);
  const restaurantMap = new Map(restaurants?.map(r => [r.id, r.name]) || []);

  const filteredRequests = requests?.filter(
    (request) => statusFilter === 'all' || request.status === statusFilter
  ) || [];

  const statusLabels: Record<RequestStatus, string> = {
    Pending: t.requests.pending,
    Approved: t.requests.approved,
    Rejected: t.requests.rejected,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl">
            <ClipboardList className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t.admin.requestManagement}</h1>
            <p className="text-slate-500">{t.requests.description}</p>
          </div>
        </div>
        <Badge className="bg-amber-100 text-amber-700">
          {requests?.length || 0} {t.admin.requests}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-amber-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600">{t.requests.pending}</p>
              <p className="text-2xl font-bold text-amber-800">
                {requests?.filter(r => r.status === 'Pending').length || 0}
              </p>
            </div>
            <Clock className="h-8 w-8 text-amber-500" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">{t.requests.approved}</p>
              <p className="text-2xl font-bold text-green-800">
                {requests?.filter(r => r.status === 'Approved').length || 0}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">{t.requests.rejected}</p>
              <p className="text-2xl font-bold text-red-800">
                {requests?.filter(r => r.status === 'Rejected').length || 0}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t.common.filter} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}</SelectItem>
              <SelectItem value="Pending">{t.requests.pending}</SelectItem>
              <SelectItem value="Approved">{t.requests.approved}</SelectItem>
              <SelectItem value="Rejected">{t.requests.rejected}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>{t.requests.list}</CardTitle>
          <CardDescription>{t.requests.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.tours.name}</TableHead>
                <TableHead>{t.roles.restaurant}</TableHead>
                <TableHead>{t.requests.headcount}</TableHead>
                <TableHead>{t.requests.date}</TableHead>
                <TableHead>{t.requests.time}</TableHead>
                <TableHead>{t.requests.status}</TableHead>
                <TableHead className="text-right">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => {
                const statusStyle = statusColors[request.status];
                const StatusIcon = statusStyle.icon;
                return (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-violet-600" />
                        </div>
                        <span className="font-medium">
                          {tourMap.get(request.tourId) || 'Unknown Tour'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {restaurantMap.get(request.restaurantId) || 'Unknown Restaurant'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Users className="h-4 w-4" />
                        {request.headcount}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(request.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {request.timeStart} - {request.timeEnd}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusStyle.bg} ${statusStyle.text}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusLabels[request.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === 'Pending' && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() =>
                              updateStatusMutation.mutate({ id: request.id, status: 'Approved' })
                            }
                            disabled={updateStatusMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() =>
                              updateStatusMutation.mutate({ id: request.id, status: 'Rejected' })
                            }
                            disabled={updateStatusMutation.isPending}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
