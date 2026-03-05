'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Search, Mail, Phone } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { customerApi } from '@/lib/mockApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { LoadingState, ErrorState } from '@/components/shared';

export default function AdminCustomersPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: customers, isLoading, error } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: customerApi.list,
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={t.common.error} />;

  const filteredCustomers = customers?.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-100 rounded-xl">
            <User className="h-6 w-6 text-pink-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t.admin.customerManagement}</h1>
            <p className="text-slate-500">{t.admin.customers}</p>
          </div>
        </div>
        <Badge className="bg-pink-100 text-pink-700">
          {customers?.length || 0} {t.admin.customers}
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

      {/* Customers Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>{t.admin.customers}</CardTitle>
          <CardDescription>{t.admin.customerManagement}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.auth.name}</TableHead>
                <TableHead>{t.auth.email}</TableHead>
                <TableHead>{t.common.phone}</TableHead>
                <TableHead>{t.regions.createdAt}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-pink-600" />
                      </div>
                      <span className="font-medium">{customer.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail className="h-4 w-4" />
                      {customer.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Phone className="h-4 w-4" />
                      {customer.phone || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
