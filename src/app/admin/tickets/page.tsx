'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquareText,
  Send,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Clock,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  ticketApi,
  type TicketDto,
  type TicketMessageDto,
  type TicketCategory,
  type TicketStatus,
} from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState, AdminPagination } from '@/components/shared';
import { toast } from 'sonner';
import { formatShortDateTime } from '@/lib/dateUtils';
import { useTicketSocket } from '@/hooks/useTicketSocket';

// ============================================
// Constants
// ============================================

const STATUS_COLORS: Record<TicketStatus, { bg: string; text: string }> = {
  open: { bg: 'bg-blue-100', text: 'text-blue-700' },
  in_progress: { bg: 'bg-amber-100', text: 'text-amber-700' },
  resolved: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  closed: { bg: 'bg-slate-100', text: 'text-slate-500' },
};

const CATEGORY_COLORS: Record<TicketCategory, { bg: string; text: string }> = {
  complaint: { bg: 'bg-red-100', text: 'text-red-700' },
  request: { bg: 'bg-sky-100', text: 'text-sky-700' },
  suggestion: { bg: 'bg-violet-100', text: 'text-violet-700' },
};

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// ============================================
// Page
// ============================================

export default function AdminTicketsPage() {
  const { t, locale } = useLanguage();
  const apiLang = locale as 'tr' | 'en' | 'de';
  const queryClient = useQueryClient();
  const tt = t.tickets;

  // Filters & pagination
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Detail
  const [detailTicketId, setDetailTicketId] = useState<number | null>(null);

  // List query
  const { data: ticketsRes, isLoading } = useQuery({
    queryKey: ['admin-tickets', statusFilter, categoryFilter, page, apiLang],
    queryFn: () =>
      ticketApi.adminGetList(
        {
          page,
          limit,
          ...(statusFilter !== 'all' && { status: statusFilter }),
          ...(categoryFilter !== 'all' && { category: categoryFilter }),
        },
        apiLang,
      ),
  });

  const tickets: TicketDto[] = ticketsRes?.success
    ? Array.isArray(ticketsRes.data) ? ticketsRes.data : []
    : [];
  const totalCount = ticketsRes?.meta?.totalCount ?? 0;

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <Header title={tt.title} description={t.admin.ticketManagement} />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as TicketStatus | 'all'); setPage(1); }}>
                <SelectTrigger size="sm" className="w-[160px]">
                  <SelectValue placeholder={tt.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.customer.allStatuses}</SelectItem>
                  <SelectItem value="open">{tt.statuses.open}</SelectItem>
                  <SelectItem value="in_progress">{tt.statuses.in_progress}</SelectItem>
                  <SelectItem value="resolved">{tt.statuses.resolved}</SelectItem>
                  <SelectItem value="closed">{tt.statuses.closed}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v as TicketCategory | 'all'); setPage(1); }}>
                <SelectTrigger size="sm" className="w-[160px]">
                  <SelectValue placeholder={tt.category} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tt.category}</SelectItem>
                  <SelectItem value="complaint">{tt.categories.complaint}</SelectItem>
                  <SelectItem value="request">{tt.categories.request}</SelectItem>
                  <SelectItem value="suggestion">{tt.categories.suggestion}</SelectItem>
                </SelectContent>
              </Select>
              {totalCount > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {t.admin.paginationTotal}: {totalCount}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {isLoading ? (
          <LoadingState />
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquareText className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">{tt.noTickets}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>{tt.subject}</TableHead>
                    <TableHead>{tt.tour}</TableHead>
                    <TableHead>{tt.client}</TableHead>
                    <TableHead>{tt.agency}</TableHead>
                    <TableHead>{tt.category}</TableHead>
                    <TableHead>{tt.status}</TableHead>
                    <TableHead>{tt.createdAt}</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => {
                    const sc = STATUS_COLORS[ticket.status];
                    const cc = CATEGORY_COLORS[ticket.category];
                    return (
                      <TableRow
                        key={ticket.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => setDetailTicketId(ticket.id)}
                      >
                        <TableCell className="font-mono text-xs text-slate-500">{ticket.id}</TableCell>
                        <TableCell className="font-medium text-sm max-w-[200px] truncate">{ticket.subject}</TableCell>
                        <TableCell className="text-sm text-slate-600 max-w-[180px] truncate">
                          {ticket.tour?.tourName ?? '-'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {ticket.client ? `${ticket.client.firstName} ${ticket.client.lastName}` : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {ticket.agency?.name ?? '-'}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex text-[11px] px-2 py-0.5 rounded-full font-medium ${cc.bg} ${cc.text}`}>
                            {tt.categories[ticket.category]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex text-[11px] px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                            {tt.statuses[ticket.status]}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{formatShortDateTime(ticket.createdAt)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-4 w-4 text-slate-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalCount > limit && (
          <AdminPagination
            page={page}
            limit={limit}
            total={totalCount}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Detail Dialog */}
      <AdminTicketDetailDialog
        ticketId={detailTicketId}
        onClose={() => setDetailTicketId(null)}
        apiLang={apiLang}
        onStatusChange={() => queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })}
      />
    </div>
  );
}

// ============================================
// Admin Ticket Detail Dialog
// ============================================

function AdminTicketDetailDialog({
  ticketId,
  onClose,
  apiLang,
  onStatusChange,
}: {
  ticketId: number | null;
  onClose: () => void;
  apiLang: 'tr' | 'en' | 'de';
  onStatusChange: () => void;
}) {
  const { t } = useLanguage();
  const tt = t.tickets;
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useTicketSocket({
    ticketId,
    detailKeyPrefix: 'admin-ticket-detail',
    lang: apiLang,
    listKeyPrefix: 'admin-tickets',
  });

  const { data: ticketRes, isLoading } = useQuery({
    queryKey: ['admin-ticket-detail', ticketId, apiLang],
    queryFn: () => ticketApi.adminGetById(ticketId!, 1, 200, apiLang),
    enabled: !!ticketId,
  });

  const ticket = ticketRes?.success ? ticketRes.data : null;
  const messages_list: TicketMessageDto[] = ticket?.messages ?? [];
  const isClosed = ticket?.status === 'resolved' || ticket?.status === 'closed';

  // Send message
  const sendMutation = useMutation({
    mutationFn: () => ticketApi.adminSendMessage(ticketId!, message.trim(), files.length > 0 ? files : undefined, apiLang),
    onSuccess: (res) => {
      if (res.success) {
        setMessage('');
        setFiles([]);
        queryClient.invalidateQueries({ queryKey: ['admin-ticket-detail', ticketId] });
      } else {
        toast.error(res.error || tt.messageSendError);
      }
    },
    onError: () => toast.error(tt.messageSendError),
  });

  // Update status
  const statusMutation = useMutation({
    mutationFn: (status: TicketStatus) => ticketApi.adminUpdateStatus(ticketId!, status, apiLang),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(tt.statusUpdated);
        queryClient.invalidateQueries({ queryKey: ['admin-ticket-detail', ticketId] });
        onStatusChange();
      } else {
        toast.error(res.error || tt.statusUpdateError);
      }
    },
    onError: () => toast.error(tt.statusUpdateError),
  });

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const valid = newFiles.filter((f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE);
    setFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const prevMsgCount = useRef(0);
  if (messages_list.length !== prevMsgCount.current) {
    prevMsgCount.current = messages_list.length;
    setTimeout(scrollToBottom, 100);
  }

  const senderLabel = (type: string) => {
    if (type === 'client') return tt.client;
    if (type === 'agency_user') return tt.agency;
    return tt.you;
  };

  return (
    <Dialog open={!!ticketId} onOpenChange={(v) => { if (!v) { setMessage(''); setFiles([]); onClose(); } }}>
      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-base text-slate-800 truncate">{ticket?.subject}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {ticket && (
                  <>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[ticket.category].bg} ${CATEGORY_COLORS[ticket.category].text}`}>
                      {tt.categories[ticket.category]}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ticket.status].bg} ${STATUS_COLORS[ticket.status].text}`}>
                      {tt.statuses[ticket.status]}
                    </span>
                    {ticket.tour && (
                      <span className="text-xs text-slate-500">
                        {tt.tour}: {ticket.tour.tourName}
                      </span>
                    )}
                    {ticket.client && (
                      <span className="text-xs text-slate-500">
                        {tt.client}: {ticket.client.firstName} {ticket.client.lastName}
                      </span>
                    )}
                    {ticket.agency && (
                      <span className="text-xs text-slate-500">
                        {tt.agency}: {ticket.agency.name}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            {/* Status change */}
            {ticket && !statusMutation.isPending && (
              <Select
                value={ticket.status}
                onValueChange={(v) => statusMutation.mutate(v as TicketStatus)}
              >
                <SelectTrigger size="sm" className="w-[150px] text-xs shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">{tt.statuses.open}</SelectItem>
                  <SelectItem value="in_progress">{tt.statuses.in_progress}</SelectItem>
                  <SelectItem value="resolved">{tt.statuses.resolved}</SelectItem>
                  <SelectItem value="closed">{tt.statuses.closed}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            </div>
          ) : messages_list.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">{tt.noMessages}</p>
          ) : (
            messages_list.map((msg) => {
              const isOwn = msg.senderType === 'system_admin';
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${isOwn ? 'bg-red-600 text-white rounded-br-md' : 'bg-slate-100 text-slate-800 rounded-bl-md'}`}>
                    {!isOwn && (
                      <p className="text-[10px] font-semibold mb-0.5 text-slate-500">
                        {senderLabel(msg.senderType)}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {msg.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1 text-xs underline ${isOwn ? 'text-red-200' : 'text-blue-600'}`}
                          >
                            {att.mimeType.startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                            {att.fileName}
                          </a>
                        ))}
                      </div>
                    )}
                    <p className={`text-[9px] mt-1 ${isOwn ? 'text-red-200' : 'text-slate-400'}`}>
                      {formatShortDateTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {isClosed ? (
          <div className="px-5 py-3 border-t bg-slate-50 flex items-center gap-2 text-xs text-slate-500 shrink-0">
            <AlertCircle className="h-4 w-4 text-slate-400" />
            {tt.closedTicketMessage}
          </div>
        ) : (
          <div className="px-5 py-3 border-t bg-white shrink-0">
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {files.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-slate-100 rounded px-1.5 py-0.5 border">
                    <span className="truncate max-w-[80px]">{f.name}</span>
                    <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={tt.messagePlaceholder}
                  className="min-h-[40px] max-h-[120px] pr-10 text-sm resize-none"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (message.trim() && !sendMutation.isPending) sendMutation.mutate();
                    }
                  }}
                />
                {files.length < MAX_FILES && (
                  <button
                    type="button"
                    className="absolute right-2 bottom-2 text-slate-400 hover:text-slate-600"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                )}
                <input ref={fileInputRef} type="file" className="hidden" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" onChange={handleFileAdd} />
              </div>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white h-10 w-10 p-0 shrink-0"
                disabled={!message.trim() || sendMutation.isPending}
                onClick={() => sendMutation.mutate()}
              >
                {sendMutation.isPending ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
