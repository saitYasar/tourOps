'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Activity, Clock, Database, Tag } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { auditLogApi } from '@/lib/mockApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState, ErrorState } from '@/components/shared';

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-violet-100 text-violet-700',
  REGISTER: 'bg-pink-100 text-pink-700',
  UPDATE_STATUS: 'bg-amber-100 text-amber-700',
  SEED_DATA_CREATED: 'bg-slate-100 text-slate-700',
};

export default function AdminAuditLogsPage() {
  const { t } = useLanguage();

  const { data: auditLogs, isLoading, error } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => auditLogApi.list(50),
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={t.common.error} />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-xl">
            <FileText className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t.admin.auditLogManagement}</h1>
            <p className="text-slate-500">{t.admin.auditLogs}</p>
          </div>
        </div>
        <Badge className="bg-slate-100 text-slate-700">
          {auditLogs?.length || 0} {t.admin.auditLogs}
        </Badge>
      </div>

      {/* Audit Logs */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t.admin.recentActivity}
          </CardTitle>
          <CardDescription>{t.admin.auditLogManagement}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {auditLogs?.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Activity className="h-5 w-5 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={actionColors[log.action] || 'bg-slate-100 text-slate-700'}>
                      {log.action}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {log.entityType}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">
                    {log.details || `${log.action} on ${log.entityType}`}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      {log.entityId.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {(!auditLogs || auditLogs.length === 0) && (
              <div className="text-center py-8 text-slate-500">
                {t.common.noData}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
