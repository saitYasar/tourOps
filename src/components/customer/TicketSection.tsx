'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquareText,
  Plus,
  Filter,
  Send,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { ticketApi, type TicketDto, type TicketMessageDto, type TicketCategory, type TicketStatus, type CreateTicketDto } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatShortDateTime } from '@/lib/dateUtils';

// ============================================
// Helpers
// ============================================

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
};

const CATEGORY_COLORS: Record<TicketCategory, string> = {
  complaint: 'bg-red-50 text-red-700 border-red-200',
  request: 'bg-sky-50 text-sky-700 border-sky-200',
  suggestion: 'bg-violet-50 text-violet-700 border-violet-200',
};

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

interface TicketSectionProps {
  tourId: number;
}

export function TicketSection({ tourId }: TicketSectionProps) {
  const { t, locale } = useLanguage();
  const apiLang = locale as 'tr' | 'en' | 'de';
  const queryClient = useQueryClient();
  const tt = t.tickets;

  // State
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTicketId, setDetailTicketId] = useState<number | null>(null);

  // List query
  const { data: ticketsRes, isLoading } = useQuery({
    queryKey: ['client-tickets', tourId, statusFilter, categoryFilter, apiLang],
    queryFn: () =>
      ticketApi.clientGetList(
        {
          tourId,
          page: 1,
          limit: 100,
          ...(statusFilter !== 'all' && { status: statusFilter }),
          ...(categoryFilter !== 'all' && { category: categoryFilter }),
        },
        apiLang,
      ),
  });

  const tickets: TicketDto[] = ticketsRes?.success
    ? Array.isArray(ticketsRes.data) ? ticketsRes.data : []
    : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-bold text-slate-800">{tt.title}</h3>
          {tickets.length > 0 && (
            <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
              {tickets.length}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white text-xs gap-1.5"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          {tt.createNew}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TicketStatus | 'all')}>
          <SelectTrigger size="sm" className="text-xs h-8 w-auto min-w-[120px]">
            <Filter className="h-3 w-3 mr-1 text-slate-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.customer.allStatuses}</SelectItem>
            <SelectItem value="open">{tt.statuses.open}</SelectItem>
            <SelectItem value="in_progress">{tt.statuses.in_progress}</SelectItem>
            <SelectItem value="resolved">{tt.statuses.resolved}</SelectItem>
            <SelectItem value="closed">{tt.statuses.closed}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as TicketCategory | 'all')}>
          <SelectTrigger size="sm" className="text-xs h-8 w-auto min-w-[120px]">
            <Filter className="h-3 w-3 mr-1 text-slate-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tt.category}</SelectItem>
            <SelectItem value="complaint">{tt.categories.complaint}</SelectItem>
            <SelectItem value="request">{tt.categories.request}</SelectItem>
            <SelectItem value="suggestion">{tt.categories.suggestion}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ticket List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquareText className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">{tt.noTickets}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="cursor-pointer hover:shadow-md transition-shadow border-slate-200"
              onClick={() => setDetailTicketId(ticket.id)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-slate-800 truncate">{ticket.subject}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[ticket.category]}`}>
                        {tt.categories[ticket.category]}
                      </span>
                      <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${STATUS_COLORS[ticket.status]}`}>
                        {tt.statuses[ticket.status]}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    {formatShortDateTime(ticket.createdAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Ticket Dialog */}
      <CreateTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        tourId={tourId}
        apiLang={apiLang}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['client-tickets'] });
        }}
      />

      {/* Ticket Detail Dialog */}
      <TicketDetailDialog
        ticketId={detailTicketId}
        onClose={() => setDetailTicketId(null)}
        apiLang={apiLang}
      />
    </div>
  );
}

// ============================================
// Create Ticket Dialog
// ============================================

function CreateTicketDialog({
  open,
  onOpenChange,
  tourId,
  apiLang,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tourId: number;
  apiLang: 'tr' | 'en' | 'de';
  onCreated: () => void;
}) {
  const { t } = useLanguage();
  const tt = t.tickets;
  const [category, setCategory] = useState<TicketCategory | ''>('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setCategory('');
    setSubject('');
    setContent('');
    setFiles([]);
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateTicketDto) => ticketApi.clientCreate(data, apiLang),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(tt.created);
        reset();
        onOpenChange(false);
        onCreated();
      } else {
        toast.error(res.error || tt.createError);
      }
    },
    onError: () => toast.error(tt.createError),
  });

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const valid = newFiles.filter((f) => {
      if (!ALLOWED_TYPES.includes(f.type)) return false;
      if (f.size > MAX_FILE_SIZE) return false;
      return true;
    });
    setFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const canSubmit = !!category && subject.trim().length > 0 && content.trim().length > 0 && !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-orange-500" />
            {tt.createNew}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Category */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">{tt.category}</label>
            <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={tt.selectCategory} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complaint">{tt.categories.complaint}</SelectItem>
                <SelectItem value="request">{tt.categories.request}</SelectItem>
                <SelectItem value="suggestion">{tt.categories.suggestion}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">{tt.subject}</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={tt.subjectPlaceholder}
              maxLength={255}
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">{tt.message}</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={tt.messagePlaceholder}
              rows={4}
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">{tt.attachments}</label>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {files.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-slate-100 rounded-md px-2 py-1 border">
                    {f.type.startsWith('image/') ? <ImageIcon className="h-3 w-3 text-slate-400" /> : <FileText className="h-3 w-3 text-slate-400" />}
                    <span className="truncate max-w-[120px]">{f.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {files.length < MAX_FILES && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-3.5 w-3.5" />
                {tt.addAttachment}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
              onChange={handleFileAdd}
            />
            <p className="text-[10px] text-slate-400 mt-1">{tt.attachmentLimit} &middot; {tt.allowedTypes}</p>
          </div>

          {/* Submit */}
          <Button
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            disabled={!canSubmit}
            onClick={() =>
              createMutation.mutate({
                tourId,
                category: category as TicketCategory,
                subject: subject.trim(),
                content: content.trim(),
                attachments: files.length > 0 ? files : undefined,
              })
            }
          >
            {createMutation.isPending ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              tt.createNew
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Ticket Detail / Chat Dialog
// ============================================

function TicketDetailDialog({
  ticketId,
  onClose,
  apiLang,
}: {
  ticketId: number | null;
  onClose: () => void;
  apiLang: 'tr' | 'en' | 'de';
}) {
  const { t } = useLanguage();
  const tt = t.tickets;
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: ticketRes, isLoading } = useQuery({
    queryKey: ['client-ticket-detail', ticketId, apiLang],
    queryFn: () => ticketApi.clientGetById(ticketId!, 1, 200, apiLang),
    enabled: !!ticketId,
  });

  const ticket = ticketRes?.success ? ticketRes.data : null;
  const messages: TicketMessageDto[] = ticket?.messages ?? [];
  const isClosed = ticket?.status === 'resolved' || ticket?.status === 'closed';

  // Mark messages as read when opening
  const markReadMutation = useMutation({
    mutationFn: () => ticketApi.clientMarkRead(ticketId!, apiLang),
  });

  // Mark read on open
  const markedRef = useRef<number | null>(null);
  if (ticketId && ticket && markedRef.current !== ticketId) {
    markedRef.current = ticketId;
    const hasUnread = messages.some((m) => m.senderType !== 'client' && !m.isRead);
    if (hasUnread) markReadMutation.mutate();
  }

  const sendMutation = useMutation({
    mutationFn: () => ticketApi.clientSendMessage(ticketId!, message.trim(), files.length > 0 ? files : undefined, apiLang),
    onSuccess: (res) => {
      if (res.success) {
        setMessage('');
        setFiles([]);
        queryClient.invalidateQueries({ queryKey: ['client-ticket-detail', ticketId] });
        queryClient.invalidateQueries({ queryKey: ['client-tickets'] });
      } else {
        toast.error(res.error || tt.messageSendError);
      }
    },
    onError: () => toast.error(tt.messageSendError),
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

  // Scroll to bottom when messages change
  const prevMsgCount = useRef(0);
  if (messages.length !== prevMsgCount.current) {
    prevMsgCount.current = messages.length;
    setTimeout(scrollToBottom, 100);
  }

  const senderLabel = (type: string) => {
    if (type === 'client') return tt.you;
    if (type === 'agency_user') return tt.agency;
    return tt.admin;
  };

  return (
    <Dialog open={!!ticketId} onOpenChange={(v) => { if (!v) { setMessage(''); setFiles([]); markedRef.current = null; onClose(); } }}>
      <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b shrink-0">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-slate-800 truncate">{ticket?.subject}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {ticket && (
                <>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[ticket.category]}`}>
                    {tt.categories[ticket.category]}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${STATUS_COLORS[ticket.status]}`}>
                    {tt.statuses[ticket.status]}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">{tt.noMessages}</p>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.senderType === 'client';
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isOwn ? 'bg-orange-500 text-white rounded-br-md' : 'bg-slate-100 text-slate-800 rounded-bl-md'}`}>
                    {!isOwn && (
                      <p className={`text-[10px] font-semibold mb-0.5 ${isOwn ? 'text-orange-100' : 'text-slate-500'}`}>
                        {senderLabel(msg.senderType)}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {msg.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1 text-xs underline ${isOwn ? 'text-orange-100' : 'text-blue-600'}`}
                          >
                            {att.mimeType.startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                            {att.fileName}
                          </a>
                        ))}
                      </div>
                    )}
                    <p className={`text-[9px] mt-1 ${isOwn ? 'text-orange-200' : 'text-slate-400'}`}>
                      {formatShortDateTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        {isClosed ? (
          <div className="px-4 py-3 border-t bg-slate-50 flex items-center gap-2 text-xs text-slate-500 shrink-0">
            <AlertCircle className="h-4 w-4 text-slate-400" />
            {tt.closedTicketMessage}
          </div>
        ) : (
          <div className="px-4 py-3 border-t bg-white shrink-0">
            {/* File chips */}
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
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                  onChange={handleFileAdd}
                />
              </div>
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white h-10 w-10 p-0 shrink-0"
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
