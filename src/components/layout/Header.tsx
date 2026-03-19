'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Search, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient, type PanelNotificationDto } from '@/lib/api';

type OrganizationStatus = 'pending' | 'active' | 'suspended';
type PanelRole = 'agency' | 'restaurant' | 'admin';

const statusConfig: Record<OrganizationStatus, { label: Record<string, string>; icon: typeof CheckCircle; className: string }> = {
  active: {
    label: { tr: 'Sistem Aktif', en: 'System Active', de: 'System Aktiv' },
    icon: CheckCircle,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  pending: {
    label: { tr: 'Sistem Beklemede', en: 'System Pending', de: 'System Ausstehend' },
    icon: Clock,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  suspended: {
    label: { tr: 'Sistem Askıda', en: 'System Suspended', de: 'System Gesperrt' },
    icon: AlertTriangle,
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

interface HeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  organizationStatus?: string;
  lang?: string;
  role?: PanelRole;
}

export function Header({ title, description, children, organizationStatus, lang = 'tr', role }: HeaderProps) {
  const status = organizationStatus as OrganizationStatus | undefined;
  const config = status ? statusConfig[status] : null;
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<PanelNotificationDto | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-detect role from pathname if not provided
  const detectedRole: PanelRole | undefined = role ?? (
    pathname.startsWith('/agency') ? 'agency' :
    pathname.startsWith('/restaurant') ? 'restaurant' :
    pathname.startsWith('/admin') ? 'admin' :
    undefined
  );

  // Determine which endpoints to use based on role
  const notifRole = detectedRole === 'restaurant' ? 'organization' : detectedRole;
  const isNotifEnabled = notifRole === 'agency' || notifRole === 'organization';

  // Notification sound
  const prevUnreadRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Resume AudioContext on first user interaction
  useEffect(() => {
    const resume = () => { try { getAudioCtx(); } catch {} };
    document.addEventListener('click', resume, { once: true });
    return () => document.removeEventListener('click', resume);
  }, [getAudioCtx]);

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      const t = ctx.currentTime;

      const createHorn = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t + start);
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0, t + start);
        gain.gain.linearRampToValueAtTime(0.18, t + start + 0.02);
        gain.gain.setValueAtTime(0.18, t + start + dur - 0.03);
        gain.gain.linearRampToValueAtTime(0, t + start + dur);
        osc.start(t + start);
        osc.stop(t + start + dur);
      };

      // Short double honk: "beep beep"
      createHorn(380, 0, 0.25);
      createHorn(510, 0, 0.25);
      createHorn(380, 0.35, 0.2);
      createHorn(510, 0.35, 0.2);
    } catch {
      // Audio not available
    }
  }, [getAudioCtx]);

  // Fetch unread count (every 5 minutes)
  const { data: unreadData } = useQuery({
    queryKey: ['unread-count', notifRole],
    queryFn: () => {
      if (notifRole === 'agency') return apiClient.getAgencyUnreadCount();
      if (notifRole === 'organization') return apiClient.getOrganizationUnreadCount();
      return Promise.resolve({ unreadCount: 0 });
    },
    enabled: isNotifEnabled,
    refetchInterval: 5 * 60 * 1000,
  });

  // Play sound when new notifications arrive
  const unreadCount = (unreadData as { unreadCount?: number })?.unreadCount || 0;
  useEffect(() => {
    if (prevUnreadRef.current !== null && unreadCount > prevUnreadRef.current) {
      playNotificationSound();
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, playNotificationSound]);

  // Fetch recent notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['panel-notifications', notifRole],
    queryFn: () => {
      if (notifRole === 'agency') return apiClient.getAgencyNotifications(1, 10);
      if (notifRole === 'organization') return apiClient.getOrganizationNotifications(1, 10);
      return Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 10 } });
    },
    enabled: isNotifEnabled && dropdownOpen,
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: number) => {
      if (notifRole === 'agency') return apiClient.markAgencyNotificationRead(id);
      return apiClient.markOrganizationNotificationRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-count', notifRole] });
      queryClient.invalidateQueries({ queryKey: ['panel-notifications', notifRole] });
    },
  });

  const notifications: PanelNotificationDto[] =
    (notificationsData as { data?: PanelNotificationDto[] })?.data || [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleNotifClick = (n: PanelNotificationDto) => {
    if (!n.isRead) {
      markReadMutation.mutate(n.id);
    }
    setSelectedNotif(n);
    setDropdownOpen(false);
  };

  return (
    <>
      <header className="h-16 border-b bg-white px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            {description && (
              <p className="text-sm text-slate-500">{description}</p>
            )}
          </div>
          {config && (() => {
            const Icon = config.icon;
            return (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${config.className}`}>
                <Icon className="h-3 w-3" />
                {config.label[lang] || config.label.en}
              </span>
            );
          })()}
        </div>

        <div className="flex items-center gap-4">
          {children}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Yakında..."
              className="w-64 pl-9"
              disabled
            />
          </div>

          <div className="relative" ref={dropdownRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => isNotifEnabled && setDropdownOpen(!dropdownOpen)}
            >
              <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'animate-bell-ring' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>

            {dropdownOpen && isNotifEnabled && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b font-medium text-sm text-slate-700">
                  {unreadCount > 0
                    ? `${unreadCount} ${lang === 'tr' ? 'okunmamış bildirim' : lang === 'de' ? 'ungelesene Benachrichtigungen' : 'unread notifications'}`
                    : lang === 'tr'
                    ? 'Bildirim yok'
                    : lang === 'de'
                    ? 'Keine Benachrichtigungen'
                    : 'No notifications'}
                </div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400">
                    {lang === 'tr' ? 'Bildirim bulunamadı' : lang === 'de' ? 'Keine Benachrichtigungen gefunden' : 'No notifications found'}
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      className={`w-full text-left p-3 border-b last:border-b-0 hover:bg-slate-50 transition-colors ${
                        !n.isRead ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <div className="flex gap-3">
                        {n.imageUrl && (
                          <img
                            src={n.imageUrl}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${!n.isRead ? 'font-semibold' : 'font-medium'} text-slate-900 truncate`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{n.body}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(n.createdAt).toLocaleDateString(lang)}
                          </p>
                        </div>
                        {!n.isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notification Detail Popup */}
      {selectedNotif && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedNotif(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-slate-900">
                {lang === 'tr' ? 'Bildirim Detayı' : lang === 'de' ? 'Benachrichtigungsdetail' : 'Notification Detail'}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedNotif(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Image */}
            {selectedNotif.imageUrl && (
              <div className="w-full">
                <img
                  src={selectedNotif.imageUrl}
                  alt=""
                  className="w-full max-h-64 object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="p-4 space-y-3">
              <h4 className="text-lg font-bold text-slate-900">{selectedNotif.title}</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedNotif.body}</p>
              <p className="text-xs text-slate-400">
                {new Date(selectedNotif.createdAt).toLocaleString(lang)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
