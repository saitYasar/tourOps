'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useLanguage } from '@/contexts/LanguageContext';
import { adminApi, type AdminQuickCreateOrganizationDto, type AdminQuickCreateOrganizationResponseDto, type CategoryDto, type PaginatedResponse } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function QuickCreateOrganizationPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const a = t.admin as Record<string, string>;

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [currency, setCurrency] = useState<'TRY' | 'EUR' | 'USD'>('TRY');

  const { data: categoriesResult } = useQuery({
    queryKey: ['admin-org-categories'],
    queryFn: () => adminApi.getOrganizationCategories(),
  });
  const categories: CategoryDto[] = categoriesResult?.success
    ? (categoriesResult.data as PaginatedResponse<CategoryDto>)?.data || []
    : [];

  const createMutation = useMutation({
    mutationFn: (data: AdminQuickCreateOrganizationDto) =>
      adminApi.quickCreateOrganization(data),
    onSuccess: (result) => {
      if (result.success && result.data) {
        toast.success(a.quickCreateSuccess);
        const raw = result.data as any;
        const orgId: number | undefined = raw?.organization?.id ?? raw?.data?.organization?.id ?? raw?.id;
        router.push(orgId ? `/admin/restaurants/${orgId}` : '/admin/restaurants');
      } else {
        toast.error(result.error || a.quickCreateError);
      }
    },
    onError: (error) => {
      toast.error((error as Error).message || a.quickCreateError);
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error(`${t.tooltips.fillRequired}: ${a.nameLabel}`);
      return;
    }
    createMutation.mutate({ name, categoryId, currency });
  };

  return (
    <div className="p-6 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/restaurants')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {a.backToList}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-orange-100 rounded-xl">
              <Building2 className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{a.quickCreate}</h1>
              <p className="text-slate-500 text-sm">{a.quickCreateDesc}</p>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-600 mb-1.5 block font-medium">{a.nameLabel} *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={a.nameLabel}
              onKeyDown={(e) => e.key === 'Enter' && !createMutation.isPending && handleSubmit()}
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm text-slate-600 mb-1.5 block font-medium">{a.categoryLabel}</label>
            <Select value={String(categoryId)} onValueChange={(v) => setCategoryId(Number(v))}>
              <SelectTrigger>
                <SelectValue />
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

          <div>
            <label className="text-sm text-slate-600 mb-1.5 block font-medium">{a.currencyLabel}</label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as 'TRY' | 'EUR' | 'USD')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRY">TRY</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full bg-orange-600 hover:bg-orange-700"
            onClick={handleSubmit}
            disabled={createMutation.isPending || !name.trim()}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4 mr-2" />
            )}
            {createMutation.isPending ? a.creating : a.quickCreate}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
