'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Percent,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Search,
  Building2,
  Tag,
  Globe,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

import { useLanguage } from '@/contexts/LanguageContext';
import { useDebounce } from '@/hooks/useDebounce';
import {
  adminApi,
  type SystemCommissionDto,
  type CreateSystemCommissionDto,
  type UpdateSystemCommissionDto,
  type CommissionScope,
  type CategoryDto,
  type CompanyDto,
} from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
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
import { LoadingState, ConfirmDialog, AdminPagination } from '@/components/shared';

const SCOPES: CommissionScope[] = ['global', 'category', 'organization'];

export default function AdminCommissionsPage() {
  const { t, locale } = useLanguage();
  const queryClient = useQueryClient();

  // Filter & sort state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filterScope, setFilterScope] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('');

  // Reset page on filter change
  const prevFilters = useRef({ debouncedSearch, filterScope, filterActive, sortBy, sortOrder });
  useEffect(() => {
    const prev = prevFilters.current;
    if (
      prev.debouncedSearch !== debouncedSearch ||
      prev.filterScope !== filterScope ||
      prev.filterActive !== filterActive ||
      prev.sortBy !== sortBy ||
      prev.sortOrder !== sortOrder
    ) {
      setPage(1);
      prevFilters.current = { debouncedSearch, filterScope, filterActive, sortBy, sortOrder };
    }
  }, [debouncedSearch, filterScope, filterActive, sortBy, sortOrder]);

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

  // Organization search state (for form)
  const [orgSearch, setOrgSearch] = useState('');
  const [orgSearchDebounced, setOrgSearchDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setOrgSearchDebounced(orgSearch), 300);
    return () => clearTimeout(timer);
  }, [orgSearch]);

  // Fetch commissions
  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-commissions', page, limit, filterScope, filterActive, debouncedSearch, sortBy, sortOrder],
    queryFn: () => adminApi.listSystemCommissions({
      page,
      limit,
      scope: filterScope && filterScope !== 'all' ? filterScope : undefined,
      active: filterActive === 'true' ? true : filterActive === 'false' ? false : undefined,
      search: debouncedSearch || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
    }),
  });

  // Fetch scope counts via separate small queries (limit: 1 just to get meta.total)
  const { data: totalCommCount } = useQuery({
    queryKey: ['admin-commissions-count-all'],
    queryFn: () => adminApi.listSystemCommissions({ limit: 1 }),
  });
  const { data: globalCommCount } = useQuery({
    queryKey: ['admin-commissions-count-global'],
    queryFn: () => adminApi.listSystemCommissions({ limit: 1, scope: 'global' }),
  });
  const { data: categoryCommCount } = useQuery({
    queryKey: ['admin-commissions-count-category'],
    queryFn: () => adminApi.listSystemCommissions({ limit: 1, scope: 'category' }),
  });
  const { data: orgCommCount } = useQuery({
    queryKey: ['admin-commissions-count-organization'],
    queryFn: () => adminApi.listSystemCommissions({ limit: 1, scope: 'organization' }),
  });

  // Fetch categories for scope selector & table display
  const { data: categoriesResult } = useQuery({
    queryKey: ['admin-org-categories'],
    queryFn: () => adminApi.getOrganizationCategories(1, 100),
  });
  const categories: CategoryDto[] = categoriesResult?.success ? categoriesResult.data?.data || [] : [];

  // Fetch organizations for form (with search)
  const { data: orgsResult } = useQuery({
    queryKey: ['admin-orgs-commission', orgSearchDebounced],
    queryFn: () => adminApi.getOrganizationsList({ name: orgSearchDebounced || undefined, page: 1, limit: 20 }),
    enabled: formScope === 'organization',
  });
  const organizations: CompanyDto[] = orgsResult?.success ? orgsResult.data?.data || [] : [];

  // Build lookup maps for table display (fallback when API doesn't return nested objects)
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const cat of categories) map.set(cat.id, cat.name);
    return map;
  }, [categories]);

  const orgScopeIds = useMemo(() => {
    const commissions: SystemCommissionDto[] = result?.success ? result.data?.data || [] : [];
    return commissions.filter(c => c.scope === 'organization' && c.scopeId && !c.organization).map(c => c.scopeId!);
  }, [result]);

  const { data: orgDisplayResult } = useQuery({
    queryKey: ['admin-orgs-display', orgScopeIds],
    queryFn: () => adminApi.getOrganizationsList({ page: 1, limit: 100 }),
    enabled: orgScopeIds.length > 0,
  });
  const orgDisplayMap = useMemo(() => {
    const map = new Map<number, string>();
    const orgs: CompanyDto[] = orgDisplayResult?.success ? orgDisplayResult.data?.data || [] : [];
    for (const org of orgs) map.set(org.id, org.name);
    return map;
  }, [orgDisplayResult]);

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
    setOrgSearch('');
  };

  const openEdit = (commission: SystemCommissionDto) => {
    setEditingCommission(commission);
    setFormScope(commission.scope);
    setFormScopeId(commission.scopeId ? String(commission.scopeId) : '');
    setFormValue(String(commission.value));
    setFormDescription(commission.description || '');
    setFormActive(commission.active);
    // Pre-fill org search with the name if available
    if (commission.scope === 'organization' && commission.organization?.name) {
      setOrgSearch(commission.organization.name);
    } else {
      setOrgSearch('');
    }
    setEditOpen(true);
  };

  const handleCreate = () => {
    if (!formValue) return;
    if (formScope !== 'global' && !formScopeId) return;
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
    if (formScope !== 'global' && !formScopeId) return;
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

  const commissions = result?.success ? result.data?.data || [] : [];
  const meta = result?.success ? result.data?.meta : null;

  // Summary counts from meta.total
  const getCommTotal = (r: typeof totalCommCount) => (r?.success ? r.data?.meta?.total || r.data?.meta?.totalCount || 0 : 0);
  const counts = {
    total: getCommTotal(totalCommCount),
    global: getCommTotal(globalCommCount),
    category: getCommTotal(categoryCommCount),
    organization: getCommTotal(orgCommCount),
  };

  const scopeIcon = (scope: string) => {
    switch (scope) {
      case 'global': return <Globe className="h-3.5 w-3.5" />;
      case 'category': return <Tag className="h-3.5 w-3.5" />;
      case 'organization': return <Building2 className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  const scopeBadgeColor = (scope: string) => {
    switch (scope) {
      case 'global': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'category': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'organization': return 'bg-green-100 text-green-700 border-green-200';
      default: return '';
    }
  };

  const getScopeName = (c: SystemCommissionDto) => {
    if (c.scope === 'global') return '-';
    // Use nested objects from API if available
    if (c.scope === 'category' && c.scopeId) {
      return c.category?.name || categoryMap.get(c.scopeId) || `#${c.scopeId}`;
    }
    if (c.scope === 'organization' && c.scopeId) {
      return c.organization?.name || orgDisplayMap.get(c.scopeId) || `#${c.scopeId}`;
    }
    return c.scopeId ? `#${c.scopeId}` : '-';
  };

  const renderScopeIdField = () => {
    if (formScope === 'global') return null;

    if (formScope === 'category') {
      return (
        <div>
          <Label>{t.commissions.scopeTypes.category}</Label>
          <Select value={formScopeId} onValueChange={setFormScopeId}>
            <SelectTrigger>
              <SelectValue placeholder={t.commissions.selectCategory} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (formScope === 'organization') {
      const selectedOrg = organizations.find(o => String(o.id) === formScopeId);
      return (
        <div>
          <Label>{t.commissions.scopeTypes.organization}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={orgSearch}
              onChange={(e) => { setOrgSearch(e.target.value); setFormScopeId(''); }}
              placeholder={t.commissions.selectOrganization}
              className="pl-9"
            />
          </div>
          {formScopeId && selectedOrg && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
              <Building2 className="h-4 w-4 text-green-600 shrink-0" />
              <span className="font-medium text-green-800">{selectedOrg.name}</span>
              <button type="button" className="ml-auto text-green-600 hover:text-red-500" onClick={() => setFormScopeId('')}>✕</button>
            </div>
          )}
          {!formScopeId && (orgSearch || orgSearchDebounced) && (
            <div className="mt-2 border rounded-lg max-h-[200px] overflow-y-auto">
              {organizations.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  {t.commissions.noOrgFound}
                </p>
              ) : (
                organizations.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left border-b last:border-b-0"
                    onClick={() => { setFormScopeId(String(org.id)); setOrgSearch(org.name); }}
                  >
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{org.name}</p>
                      <p className="text-xs text-slate-500">{org.email}</p>
                    </div>
                    <Badge variant="outline" className="ml-auto shrink-0 text-xs">
                      {org.status === 'active' ? t.admin.statusActive : org.status}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const renderForm = (isEdit: boolean) => (
    <div className="space-y-4">
      <div>
        <Label>{t.commissions.scope}</Label>
        <Select
          value={formScope}
          onValueChange={(v) => {
            setFormScope(v as CommissionScope);
            setFormScopeId('');
            setOrgSearch('');
          }}
        >
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
      {renderScopeIdField()}
      <div>
        <Label>{t.commissions.value}</Label>
        <div className="relative">
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formValue}
            onChange={(e) => setFormValue(e.target.value)}
            placeholder="0"
            className="pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
        </div>
      </div>
      <div>
        <Label>{t.commissions.description}</Label>
        <Input
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          placeholder={t.commissions.commissionDesc}
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
          disabled={createMutation.isPending || updateMutation.isPending || (formScope !== 'global' && !formScopeId)}
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

  const handleSortChange = (val: string) => {
    switch (val) {
      case 'value_asc': setSortBy('value'); setSortOrder('ASC'); break;
      case 'value_desc': setSortBy('value'); setSortOrder('DESC'); break;
      case 'newest': setSortBy('createdAt'); setSortOrder('DESC'); break;
      case 'oldest': setSortBy('createdAt'); setSortOrder('ASC'); break;
      default: setSortBy(''); setSortOrder(''); break;
    }
  };

  const currentSortValue = sortBy === 'value' && sortOrder === 'ASC' ? 'value_asc'
    : sortBy === 'value' && sortOrder === 'DESC' ? 'value_desc'
    : sortBy === 'createdAt' && sortOrder === 'DESC' ? 'newest'
    : sortBy === 'createdAt' && sortOrder === 'ASC' ? 'oldest'
    : 'none';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-100 rounded-xl">
            <Percent className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t.commissions.title}</h1>
            <p className="text-slate-500 text-sm">{t.admin.commissionManagement}</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-2" />
          {t.commissions.create}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card
          className={`border cursor-pointer transition-all ${filterScope === '' || filterScope === 'all' ? 'ring-2 ring-violet-500 border-violet-200' : 'hover:border-slate-300'}`}
          onClick={() => { setFilterScope(''); setPage(1); }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Percent className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{counts.total}</p>
              <p className="text-xs text-slate-500">{t.commissions.totalCommissions}</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border cursor-pointer transition-all ${filterScope === 'global' ? 'ring-2 ring-purple-500 border-purple-200' : 'hover:border-slate-300'}`}
          onClick={() => { setFilterScope('global'); setPage(1); }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Globe className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{counts.global}</p>
              <p className="text-xs text-slate-500">{t.commissions.globalCommissions}</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border cursor-pointer transition-all ${filterScope === 'category' ? 'ring-2 ring-blue-500 border-blue-200' : 'hover:border-slate-300'}`}
          onClick={() => { setFilterScope('category'); setPage(1); }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Tag className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{counts.category}</p>
              <p className="text-xs text-slate-500">{t.commissions.categoryCommissions}</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border cursor-pointer transition-all ${filterScope === 'organization' ? 'ring-2 ring-green-500 border-green-200' : 'hover:border-slate-300'}`}
          onClick={() => { setFilterScope('organization'); setPage(1); }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{counts.organization}</p>
              <p className="text-xs text-slate-500">{t.commissions.orgCommissions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t.commissions.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filterActive || 'all'}
              onValueChange={(val) => { setFilterActive(val === 'all' ? '' : val); setPage(1); }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t.commissions.allStatuses} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.commissions.allStatuses}</SelectItem>
                <SelectItem value="true">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    {t.commissions.activeOnly}
                  </span>
                </SelectItem>
                <SelectItem value="false">
                  <span className="flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-slate-400" />
                    {t.commissions.inactiveOnly}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={currentSortValue} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder={t.commissions.sortDefault} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t.commissions.sortDefault}</SelectItem>
                <SelectItem value="value_asc">{t.commissions.sortValueAsc}</SelectItem>
                <SelectItem value="value_desc">{t.commissions.sortValueDesc}</SelectItem>
                <SelectItem value="newest">{t.commissions.sortNewest}</SelectItem>
                <SelectItem value="oldest">{t.commissions.sortOldest}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12">
              <LoadingState />
            </div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Percent className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">{t.commissions.noCommissions}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.commissions.scope}</TableHead>
                    <TableHead>{t.commissions.target}</TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        {t.commissions.value}
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </span>
                    </TableHead>
                    <TableHead>{t.commissions.description}</TableHead>
                    <TableHead>{t.commissions.active}</TableHead>
                    <TableHead>{t.commissions.createdDate}</TableHead>
                    <TableHead className="text-right">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((c: SystemCommissionDto) => (
                    <TableRow key={c.id} className={!c.active ? 'opacity-50' : ''}>
                      <TableCell>
                        <Badge variant="outline" className={`${scopeBadgeColor(c.scope)} gap-1.5`}>
                          {scopeIcon(c.scope)}
                          {t.commissions.scopeTypes[c.scope] || c.scope}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {c.scope === 'global' ? (
                          <span className="text-sm text-slate-400">-</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            {c.scope === 'category' ? (
                              <Tag className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            ) : (
                              <Building2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            )}
                            <span className="text-sm font-medium">{getScopeName(c)}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-lg font-bold text-violet-600">%{c.value}</span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 max-w-[200px] truncate">
                        {c.description || '-'}
                      </TableCell>
                      <TableCell>
                        {c.active ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {t.commissions.activeOnly}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            {t.commissions.inactiveOnly}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(c.createdAt).toLocaleDateString(locale === 'tr' ? 'tr-TR' : locale === 'de' ? 'de-DE' : 'en-US')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
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
              <div className="p-4 border-t">
                <AdminPagination
                  page={page}
                  limit={limit}
                  total={meta?.total || meta?.totalCount || commissions.length}
                  onPageChange={setPage}
                  onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
                />
              </div>
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
