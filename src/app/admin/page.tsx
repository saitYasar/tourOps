'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Briefcase,
  Clock,
  CheckCircle2,
  Shield,
  Activity,
  TrendingUp,
  Ban,
  AlertTriangle,
  Users,
} from 'lucide-react';
import Link from 'next/link';

import { useLanguage } from '@/contexts/LanguageContext';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/shared';

export default function AdminDashboardPage() {
  const { t } = useLanguage();

  // Fetch all organizations in a single call (to avoid rate limiting)
  // API max limit is 100
  const { data: orgsResult, isLoading: orgsLoading, error: orgsError } = useQuery({
    queryKey: ['admin-organizations-all'],
    queryFn: () => adminApi.getCompanies({ type: 'organization', limit: 100 }),
  });

  // Fetch all agencies in a single call
  const { data: agenciesResult, isLoading: agenciesLoading, error: agenciesError } = useQuery({
    queryKey: ['admin-agencies-all'],
    queryFn: () => adminApi.getCompanies({ type: 'agency', limit: 100 }),
  });

  const isLoading = orgsLoading || agenciesLoading;

  if (isLoading) {
    return <LoadingState />;
  }

  // Check for errors
  const hasError = orgsError || agenciesError ||
    (orgsResult && !orgsResult.success) ||
    (agenciesResult && !agenciesResult.success);

  // Get error message for display
  const errorMessage = orgsResult?.error || agenciesResult?.error;

  // Get organizations list and count by status
  const organizations = orgsResult?.success ? orgsResult.data?.data || [] : [];
  const totalOrgs = orgsResult?.success ? orgsResult.data?.meta?.total || organizations.length : 0;
  const pendingOrgs = organizations.filter(org => org.status === 'pending').length;
  const activeOrgs = organizations.filter(org => org.status === 'active').length;
  const suspendedOrgs = organizations.filter(org => org.status === 'suspended').length;

  // Get agencies list and count by status
  const agencies = agenciesResult?.success ? agenciesResult.data?.data || [] : [];
  const totalAgencies = agenciesResult?.success ? agenciesResult.data?.meta?.total || agencies.length : 0;
  const pendingAgencies = agencies.filter(agency => agency.status === 'pending').length;

  // Calculate inactive (pasif) - organizations that are suspended
  const inactiveOrgs = suspendedOrgs;

  // Agencies by status
  const activeAgencies = agencies.filter(agency => agency.status === 'active').length;
  const suspendedAgencies = agencies.filter(agency => agency.status === 'suspended').length;

  // Combined company stats (organizations + agencies)
  const totalCompanies = totalOrgs + totalAgencies;
  const activeCompanies = activeOrgs + activeAgencies;
  const inactiveCompanies = inactiveOrgs + suspendedAgencies;
  const pendingCompanies = pendingOrgs + pendingAgencies;

  const hasAnyError = !orgsResult?.success || !agenciesResult?.success;

  const statsCards = [
    {
      title: t.admin.totalCompanyLabel,
      value: totalCompanies,
      icon: Building2,
      color: 'bg-orange-500',
      hasError: hasAnyError,
    },
    {
      title: t.admin.activeCompanyLabel,
      value: activeCompanies,
      icon: CheckCircle2,
      color: 'bg-green-500',
      hasError: hasAnyError,
    },
    {
      title: t.admin.inactiveCompanyLabel,
      value: inactiveCompanies,
      icon: Ban,
      color: 'bg-red-500',
      hasError: hasAnyError,
    },
    {
      title: t.admin.pendingApproval,
      value: pendingCompanies,
      icon: Clock,
      color: 'bg-amber-500',
      hasError: hasAnyError,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t.admin.title}</h1>
              <p className="text-slate-500">{t.admin.description}</p>
            </div>
          </div>
        </div>
        <Badge className="bg-red-600 text-white px-4 py-2">
          {t.roles.admin}
        </Badge>
      </div>

      {/* Error Alert */}
      {hasError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">{t.admin.apiConnectionError}</p>
            <p className="text-xs text-red-600">
              {errorMessage || t.admin.someDataLoadError}
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className={`border-0 shadow-sm ${stat.hasError ? 'border-2 border-red-200' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.title}</p>
                  <p className={`text-3xl font-bold mt-1 ${stat.hasError ? 'text-red-400' : 'text-slate-900'}`}>
                    {stat.hasError ? '!' : stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.hasError ? 'bg-red-400' : stat.color}`}>
                  {stat.hasError ? (
                    <AlertTriangle className="h-6 w-6 text-white" />
                  ) : (
                    <stat.icon className="h-6 w-6 text-white" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization Status */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-600" />
              {t.admin.orgStatuses}
            </CardTitle>
            <CardDescription>{t.admin.orgStatusDistribution}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">{t.admin.pendingApproval}</span>
                </div>
                <Badge className="bg-amber-500">{pendingOrgs}</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">{t.admin.statusActive}</span>
                </div>
                <Badge className="bg-green-500">{activeOrgs}</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Ban className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800">{t.admin.statusSuspended}</span>
                </div>
                <Badge className="bg-red-500">{suspendedOrgs}</Badge>
              </div>
            </div>
            <Link href="/admin/restaurants">
              <Button className="w-full mt-4" variant="outline">
                {t.admin.manageOrgs}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Agency Status */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              {t.admin.agencyStatuses}
            </CardTitle>
            <CardDescription>{t.admin.agencyStatusDistribution}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">{t.admin.pendingApproval}</span>
                </div>
                <Badge className="bg-amber-500">{pendingAgencies}</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">{t.admin.statusActive}</span>
                </div>
                <Badge className="bg-green-500">{activeAgencies}</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Ban className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800">{t.admin.statusSuspended}</span>
                </div>
                <Badge className="bg-red-500">{suspendedAgencies}</Badge>
              </div>
            </div>
            <Link href="/admin/agencies">
              <Button className="w-full mt-4" variant="outline">
                {t.admin.manageAgencies}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>{t.admin.quickActions}</CardTitle>
          <CardDescription>{t.admin.quickAccessMenu}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin/restaurants">
              <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                <Building2 className="h-8 w-8 text-orange-500" />
                <span className="text-sm font-medium">{t.admin.orgsLabel}</span>
                <span className="text-xs text-slate-400">{totalOrgs} {t.admin.record}</span>
              </Button>
            </Link>
            <Link href="/admin/restaurants?status=pending">
              <Button variant="outline" className="w-full h-24 flex flex-col gap-2 border-amber-200 bg-amber-50 hover:bg-amber-100">
                <Clock className="h-8 w-8 text-amber-500" />
                <span className="text-sm font-medium">{t.admin.pendingApprovals}</span>
                <span className="text-xs text-amber-600">{pendingOrgs + pendingAgencies} {t.admin.waiting}</span>
              </Button>
            </Link>
            <Link href="/admin/agencies">
              <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                <Briefcase className="h-8 w-8 text-blue-500" />
                <span className="text-sm font-medium">{t.admin.agenciesLabel}</span>
                <span className="text-xs text-slate-400">{totalAgencies} {t.admin.record}</span>
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                <Users className="h-8 w-8 text-violet-500" />
                <span className="text-sm font-medium">{t.admin.usersLabel}</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="border-0 shadow-sm bg-slate-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-slate-600" />
            {t.admin.systemInfo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-white rounded-xl">
              <p className="text-xs text-slate-500">{t.admin.apiStatus}</p>
              <p className={`text-lg font-semibold ${hasError ? 'text-red-600' : 'text-green-600'}`}>
                {hasError ? t.admin.hasErrorLabel : t.admin.running}
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl">
              <p className="text-xs text-slate-500">{t.admin.totalOrgLabel}</p>
              <p className="text-lg font-semibold text-slate-900">{totalOrgs}</p>
            </div>
            <div className="p-4 bg-white rounded-xl">
              <p className="text-xs text-slate-500">{t.admin.totalAgencyLabel}</p>
              <p className="text-lg font-semibold text-slate-900">{totalAgencies}</p>
            </div>
            <div className="p-4 bg-white rounded-xl">
              <p className="text-xs text-slate-500">{t.admin.inactiveOrgInfoLabel}</p>
              <p className="text-lg font-semibold text-red-600">{inactiveOrgs}</p>
            </div>
            <div className="p-4 bg-white rounded-xl">
              <p className="text-xs text-slate-500">{t.admin.version}</p>
              <p className="text-lg font-semibold text-slate-900">v1.0.0</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
