'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Shield,
  MapPin,
  Building2,
  User,
  Trash2,
  MoreHorizontal,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi, type AdminUserDto } from '@/lib/api';
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
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { LoadingState, ConfirmDialog } from '@/components/shared';

// Map backend roles to display info
const getRoleInfo = (role: string) => {
  const roleMap: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string; avatarBg: string; avatarText: string }> = {
    system_admin: { icon: Shield, color: 'bg-red-500', label: 'roleSystemAdmin', avatarBg: 'bg-red-100', avatarText: 'text-red-600' },
    organization_owner: { icon: Building2, color: 'bg-emerald-500', label: 'roleOrgOwner', avatarBg: 'bg-emerald-100', avatarText: 'text-emerald-600' },
    agency_owner: { icon: MapPin, color: 'bg-blue-500', label: 'roleAgencyOwner', avatarBg: 'bg-blue-100', avatarText: 'text-blue-600' },
    organization_user: { icon: Building2, color: 'bg-emerald-400', label: 'roleOrgUser', avatarBg: 'bg-emerald-50', avatarText: 'text-emerald-500' },
    org_user: { icon: Building2, color: 'bg-emerald-400', label: 'roleOrgUser', avatarBg: 'bg-emerald-50', avatarText: 'text-emerald-500' },
    agency_user: { icon: MapPin, color: 'bg-blue-400', label: 'roleAgencyUser', avatarBg: 'bg-blue-50', avatarText: 'text-blue-500' },
  };
  return roleMap[role] || { icon: User, color: 'bg-slate-500', label: role, avatarBg: 'bg-slate-100', avatarText: 'text-slate-600' };
};

const getStatusInfo = (status: string) => {
  const statusMap: Record<string, { color: string; label: string }> = {
    active: { color: 'bg-green-500', label: 'statusActive' },
    inactive: { color: 'bg-slate-400', label: 'statusInactive' },
    pending: { color: 'bg-amber-500', label: 'statusPending' },
  };
  return statusMap[status] || { color: 'bg-slate-400', label: status };
};

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  // Fetch users from real API
  const { data: usersResult, isLoading, error } = useQuery({
    queryKey: ['admin-users', page, limit],
    queryFn: () => adminApi.getUsers(page, limit),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(t.admin.userDeleted);
      setDeleteUserId(null);
    },
    onError: (error) => {
      toast.error((error as Error).message || t.admin.userDeleteError);
    },
  });

  if (isLoading) return <LoadingState />;

  // Get users from API response
  const users = usersResult?.success ? usersResult.data?.data || [] : [];
  const meta = usersResult?.success ? usersResult.data?.meta : null;
  const hasError = error || (usersResult && !usersResult.success);
  const errorMessage = usersResult?.error;

  // Client-side search filter
  const filteredUsers = users.filter(
    (user) =>
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t.admin.userManagement}</h1>
            <p className="text-slate-500">{t.admin.allUsers}</p>
          </div>
        </div>
        <Badge className="bg-slate-200 text-slate-700">
          {meta?.total || users.length} {t.admin.users}
        </Badge>
      </div>

      {/* Error Alert */}
      {hasError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">{t.admin.apiError}</p>
            <p className="text-xs text-red-600">{errorMessage || t.admin.usersLoadError}</p>
          </div>
        </div>
      )}

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

      {/* Users Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>{t.admin.allUsers}</CardTitle>
          <CardDescription>{t.admin.userManagement}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.auth.name}</TableHead>
                <TableHead>{t.auth.email}</TableHead>
                <TableHead>{t.admin.userRole}</TableHead>
                <TableHead>{t.admin.status}</TableHead>
                <TableHead>{t.common.createdAt}</TableHead>
                <TableHead className="text-right">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                    {hasError ? t.admin.dataLoadError : t.admin.userNotFound}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((adminUser) => {
                  const roleInfo = getRoleInfo(adminUser.role);
                  const statusInfo = getStatusInfo(adminUser.status);
                  const RoleIcon = roleInfo.icon;
                  return (
                    <TableRow key={adminUser.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full ${roleInfo.avatarBg} flex items-center justify-center font-semibold text-sm ${roleInfo.avatarText}`}>
                            {adminUser.firstName?.charAt(0)?.toUpperCase()}{adminUser.lastName?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="font-medium">{adminUser.firstName} {adminUser.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">{adminUser.email}</TableCell>
                      <TableCell>
                        <Badge className={`${roleInfo.color} text-white`}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {(t.admin as Record<string, string>)[roleInfo.label] || roleInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusInfo.color} text-white`}>
                          {(t.admin as Record<string, string>)[statusInfo.label] || statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {new Date(adminUser.createdAt).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => setDeleteUserId(adminUser.id)}
                                    disabled={adminUser.role === 'system_admin' || String(adminUser.id) === user?.id}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t.admin.deleteUser}
                                  </DropdownMenuItem>
                                </span>
                              </TooltipTrigger>
                              {(adminUser.role === 'system_admin' || String(adminUser.id) === user?.id) && (
                                <TooltipContent>
                                  {adminUser.role === 'system_admin' ? t.tooltips.cannotDeleteSystemAdmin : t.tooltips.cannotDeleteSelf}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-slate-500">
                {t.admin.paginationTotal} {meta.total} {t.admin.paginationUsers}, {t.admin.paginationPage} {meta.page} / {meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      >
                        {t.admin.previous}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {page <= 1 && <TooltipContent>{t.tooltips.firstPage}</TooltipContent>}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= meta.totalPages}
                      >
                        {t.admin.nextPage}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {page >= meta.totalPages && <TooltipContent>{t.tooltips.lastPage}</TooltipContent>}
                </Tooltip>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteUserId}
        onOpenChange={() => setDeleteUserId(null)}
        title={t.admin.deleteUser}
        description={t.common.deleteConfirm}
        onConfirm={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
        variant="destructive"
      />
    </div>
  );
}
