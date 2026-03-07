'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  ArrowLeft,
  Edit3,
  Save,
  X,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  Navigation,
  ExternalLink,
  Calendar,
  Hash,
  Landmark,
  User,
  FileText,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';

import { useLanguage } from '@/contexts/LanguageContext';
import {
  adminApi,
  type AgencyResponseDto,
  type CompanyStatus,
  type AdminUpdateAgencyDto,
} from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingState, ConfirmDialog } from '@/components/shared';

type AgencyDetail = AgencyResponseDto & {
  coverImageUrl?: string | null;
};

function resolveAgencyImageUrl(agency: AgencyDetail): string | null {
  return agency.coverImageUrl || null;
}

const statusColors: Record<CompanyStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  active: 'bg-green-100 text-green-700 border-green-200',
  suspended: 'bg-red-100 text-red-700 border-red-200',
};

const statusIcons: Record<CompanyStatus, typeof Clock> = {
  pending: Clock,
  active: CheckCircle,
  suspended: XCircle,
};

export default function AgencyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const id = Number(params.id);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<AdminUpdateAgencyDto>({});
  const [imgError, setImgError] = useState(false);
  const [statusUpdateTarget, setStatusUpdateTarget] = useState<CompanyStatus | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const a = t.admin as Record<string, string>;

  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-agency-detail', id],
    queryFn: () => adminApi.getAgencyById(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: AdminUpdateAgencyDto) => adminApi.updateAgency(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agency-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-agencies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-agencies-counts'] });
      toast.success(a.saveSuccess);
      setEditMode(false);
    },
    onError: (error) => {
      toast.error((error as Error).message || a.saveError);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: CompanyStatus) =>
      adminApi.updateCompanyStatus({ type: 'agency', id, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agency-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-agencies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-agencies-counts'] });
      toast.success(a.agencyStatusUpdated);
      setStatusUpdateTarget(null);
    },
    onError: (error) => {
      toast.error((error as Error).message || a.statusUpdateError);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteAgency(id),
    onSuccess: () => {
      toast.success(a.deleteSuccess);
      router.push('/admin/agencies');
    },
    onError: (error) => {
      toast.error((error as Error).message || a.deleteError);
    },
  });

  if (isLoading) return <LoadingState message={t.common.loading} />;

  if (!result?.success || !result.data) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.push('/admin/agencies')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {a.backToList}
        </Button>
        <div className="mt-8 text-center">
          <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">{a.notFound}</p>
        </div>
      </div>
    );
  }

  const agency = result.data as AgencyDetail;
  const coverUrl = resolveAgencyImageUrl(agency);
  const status = agency.status as CompanyStatus;
  const StatusIcon = statusIcons[status];

  const enterEditMode = () => {
    setForm({
      name: agency.name,
      description: agency.description || '',
      email: agency.email,
      phone: agency.phone?.toString() || '',
      address: agency.address || '',
      legalName: agency.legalName || '',
      taxNumber: agency.taxNumber?.toString() || '',
      taxOffice: agency.taxOffice || '',
    });
    setEditMode(true);
  };

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: typeof Mail }) => (
    <div>
      <span className="text-slate-400 block text-xs mb-0.5">{label}</span>
      <span className="text-slate-700 flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3 text-slate-400" />}
        {value || '-'}
      </span>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/agencies')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {a.backToList}
          </Button>
          <div className="p-2.5 bg-blue-100 rounded-xl">
            <Briefcase className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{agency.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${statusColors[status]} text-xs`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {a[`agencyStatus${status.charAt(0).toUpperCase()}${status.slice(1)}` as string] || status}
              </Badge>
              <span className="text-xs text-slate-400">ID: {agency.id}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!editMode ? (
            <Button onClick={enterEditMode} variant="outline" size="sm">
              <Edit3 className="h-4 w-4 mr-1" />
              {a.editMode}
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setEditMode(false)}
                variant="outline"
                size="sm"
              >
                <X className="h-4 w-4 mr-1" />
                {a.cancelEdit}
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {updateMutation.isPending ? a.saving : a.saveChanges}
              </Button>
            </>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {a.deleteButton}
          </Button>
        </div>
      </div>

      {/* Cover Image */}
      {coverUrl && !imgError && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{a.coverImage}</h3>
            <div className="h-48 rounded-xl overflow-hidden bg-slate-100">
              <img
                src={coverUrl}
                alt={agency.name}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Info */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              {a.generalInfo}
            </h3>
            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.nameLabel}</label>
                  <Input
                    value={form.name || ''}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.descriptionLabel}</label>
                  <Textarea
                    value={form.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <InfoRow label={a.nameLabel} value={agency.name} />
                <InfoRow label={a.descriptionLabel} value={agency.description} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-500" />
              {a.contactInfo}
            </h3>
            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.emailLabel}</label>
                  <Input
                    type="email"
                    value={form.email || ''}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.phoneLabel}</label>
                  <Input
                    value={form.phone || ''}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="text-slate-400 block text-xs mb-0.5">{a.emailLabel}</span>
                  <a
                    href={`mailto:${agency.email}`}
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Mail className="h-3 w-3" />
                    {agency.email}
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs mb-0.5">{a.phoneLabel}</span>
                  <span className="text-slate-700 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400" />
                    {agency.phoneCountryCode ? `+${agency.phoneCountryCode} ` : ''}
                    {agency.phone || '-'}
                  </span>
                </div>
                {/* Authorized Person - from AgencyResponseDto doesn't have this, but show if available */}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              {a.addressLocation}
            </h3>
            {editMode ? (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{a.addressLabel}</label>
                <Textarea
                  value={form.address || ''}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                />
              </div>
            ) : (
              <InfoRow label={a.addressLabel} value={agency.address} icon={MapPin} />
            )}
          </CardContent>
        </Card>

        {/* Tax & Legal */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-blue-500" />
              {a.taxLegalInfo}
            </h3>
            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.legalNameLabel}</label>
                  <Input
                    value={form.legalName || ''}
                    onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.taxNumberLabel}</label>
                  <Input
                    value={form.taxNumber || ''}
                    onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{a.taxOfficeLabel}</label>
                  <Input
                    value={form.taxOffice || ''}
                    onChange={(e) => setForm({ ...form, taxOffice: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <InfoRow label={a.legalNameLabel} value={agency.legalName} icon={FileText} />
                <InfoRow label={a.taxNumberLabel} value={agency.taxNumber?.toString()} icon={Hash} />
                <InfoRow label={a.taxOfficeLabel} value={agency.taxOffice} icon={Landmark} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timestamps & Status Actions */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {a.createdAt}: {new Date(agency.createdAt).toLocaleString('tr-TR')}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {a.updatedAt}: {new Date(agency.updatedAt).toLocaleString('tr-TR')}
              </span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {status !== 'active' && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setStatusUpdateTarget('active')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {a.agencyApprove}
                </Button>
              )}
              {status !== 'suspended' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setStatusUpdateTarget('suspended')}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {a.agencySuspend}
                </Button>
              )}
              {status !== 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusUpdateTarget('pending')}
                  className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  {a.setPending || 'Beklemeye Al'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Update Confirmation */}
      <ConfirmDialog
        open={!!statusUpdateTarget}
        onOpenChange={() => setStatusUpdateTarget(null)}
        title={a.statusLabel}
        description={
          statusUpdateTarget
            ? `"${agency.name}" - ${a[`agencyStatus${statusUpdateTarget.charAt(0).toUpperCase()}${statusUpdateTarget.slice(1)}` as string] || statusUpdateTarget}`
            : ''
        }
        onConfirm={() => statusUpdateTarget && statusMutation.mutate(statusUpdateTarget)}
        variant={statusUpdateTarget === 'suspended' ? 'destructive' : 'default'}
        confirmLabel={a.saveChanges}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={() => setDeleteOpen(false)}
        title={a.deleteConfirmTitle}
        description={a.deleteConfirmDesc}
        onConfirm={() => deleteMutation.mutate()}
        variant="destructive"
        confirmLabel={deleteMutation.isPending ? a.deleting : a.deleteButton}
      />
    </div>
  );
}
