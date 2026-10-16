import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AlertTriangle, Bell, Check, Clock3, House, Phone, PhoneCall } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { supabase } from '../lib/supabase';
import { Notification } from '../types/notifications';
import { Lead } from '../types';

interface NotificationBellProps {
  userId: string;
  organizationId?: string;
  onNotificationClick?: (notification: Notification) => void;
  callReminderLeads?: Lead[];
  onCallReminderClick?: (leadId: string, organizationId?: string) => void;
  callAlertsEnabled?: boolean;
  homeownerReminderLeads?: Lead[];
  onHomeownerReminderClick?: (leadId: string, organizationId?: string) => void;
  homeownerAlertsEnabled?: boolean;
}

const excludedReminderStatuses = new Set(["cancelado", "cancelados", "finalizado"]);
const homeownerContactChannels = new Set(["call", "email", "sms"]);

function isReminderEligibleLead(lead: Lead) {
  return lead.is_insurance_claim && !excludedReminderStatuses.has(lead.status.trim().toLocaleLowerCase("es"));
}

export function NotificationBell({
  userId,
  organizationId,
  onNotificationClick,
  callReminderLeads = [],
  onCallReminderClick,
  callAlertsEnabled = false,
  homeownerReminderLeads = [],
  onHomeownerReminderClick,
  homeownerAlertsEnabled = false,
}: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"notifications" | "calls" | "homeowners">("notifications");
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [errorMessage, setErrorMessage] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const callReminders = useMemo(() => {
    const today = new Date(currentTime);
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    return callReminderLeads.flatMap(lead => {
      const sentAt = lead.adminActivity?.lastDocumentsSentAt;
      if (!isReminderEligibleLead(lead) || !sentAt) return [];
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(sentAt);
      if (!match) return [];
      const sentDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      const sentTime = sentDate.getTime();
      if (!Number.isFinite(sentTime)) return [];
      const daysSinceSent = Math.floor((todayTime - sentTime) / 86_400_000);
      if (daysSinceSent < 7) return [];
      return [{
        id: lead.id,
        name: lead.name,
        insurer: lead.insuranceProvider || "Aseguradora no registrada",
        phone: lead.insurancePhone1 || lead.insurancePhone2 || "Teléfono no registrado",
        organizationId: lead.organizationId,
        daysSinceSent,
      }];
    }).sort((a, b) => b.daysSinceSent - a.daysSinceSent);
  }, [callReminderLeads, currentTime]);
  const homeownerReminders = useMemo(() => {
    const today = new Date(currentTime);
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const toLocalDay = (value?: string) => {
      if (!value) return 0;
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
      if (!match) return 0;
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
    };

    return homeownerReminderLeads.flatMap(lead => {
      if (!isReminderEligibleLead(lead)) return [];
      const contacts = (lead.adminHomeownerContacts || []).filter(contact =>
        contact.channels.some(channel => homeownerContactChannels.has(channel))
      );
      const latestContact = contacts.reduce<(typeof contacts)[number] | undefined>((latest, contact) => {
        if (!latest || toLocalDay(contact.contactedAt) > toLocalDay(latest.contactedAt)) return contact;
        return latest;
      }, undefined);
      const lastContactAt = latestContact?.contactedAt || "";
      const lastActivityTime = toLocalDay(lastContactAt) || toLocalDay(lead.created_at);
      if (!lastActivityTime) return [];
      const daysSinceContact = Math.floor((todayTime - lastActivityTime) / 86_400_000);
      if (daysSinceContact < 7) return [];
      return [{
        id: lead.id,
        name: lead.name,
        phone: lead.phone || lead.phone2 || "Teléfono no registrado",
        email: lead.email || lead.email2 || "Correo no registrado",
        organizationId: lead.organizationId,
        lastContactAt,
        daysSinceContact,
        neverContacted: !latestContact,
      }];
    }).sort((a, b) => b.daysSinceContact - a.daysSinceContact);
  }, [homeownerReminderLeads, currentTime]);

  const togglePanel = (panel: "notifications" | "calls" | "homeowners") => {
    if (isOpen && activePanel === panel) {
      setIsOpen(false);
    } else {
      setActivePanel(panel);
      setIsOpen(true);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchNotifications = async () => {
      if (!userId) return;
      try {
        const data = await notificationService.getUnread(userId, organizationId);
        if (!cancelled) { setNotifications(data || []); setUnreadCount(data?.length || 0); setErrorMessage(''); }
      } catch {
        if (!cancelled) setErrorMessage('No se pudieron cargar las notificaciones. Se intentará nuevamente.');
      }
    };
    setNotifications([]); setUnreadCount(0);
    void fetchNotifications();
    const interval = setInterval(fetchNotifications, isOpen ? 5000 : 30000);
    window.addEventListener('focus', fetchNotifications);
    window.addEventListener('xapcon-notifications-changed', fetchNotifications);
    const channel = supabase.channel(`notifications-${userId}-${organizationId || 'personal'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, fetchNotifications)
      .subscribe();
    return () => {
      cancelled = true; clearInterval(interval);
      window.removeEventListener('focus', fetchNotifications);
      window.removeEventListener('xapcon-notifications-changed', fetchNotifications);
      void supabase.removeChannel(channel);
    };
  }, [userId, organizationId, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      setErrorMessage('');
    } catch { setErrorMessage('No se pudo marcar la notificación como leída.'); }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(userId, organizationId);
      setNotifications([]); setUnreadCount(0); setErrorMessage('');
    } catch { setErrorMessage('No se pudieron marcar las notificaciones como leídas.'); }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Notificaciones"
          title="Notificaciones"
          onClick={() => togglePanel("notifications")}
          className="superadmin-notification-trigger relative rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="superadmin-alert-count absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
        {callAlertsEnabled && (
          <button
            type="button"
            aria-label="Alertas de llamadas"
            title="Alertas de llamadas"
            onClick={() => togglePanel("calls")}
            className={`superadmin-notification-trigger relative rounded-xl border p-2 transition-colors ${callReminders.length > 0 ? "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200" : "border-amber-200 bg-amber-50 text-[#8C6A22] hover:bg-[#F4EEDB]"}`}
          >
            <PhoneCall className="h-5 w-5" />
            {callReminders.length > 0 && (
              <span className="superadmin-alert-count absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white animate-pulse">
                {callReminders.length > 99 ? "99+" : callReminders.length}
              </span>
            )}
          </button>
        )}
        {homeownerAlertsEnabled && (
          <button
            type="button"
            aria-label="Seguimiento de homeowner"
            title="Seguimiento de homeowner"
            onClick={() => togglePanel("homeowners")}
            className={`superadmin-notification-trigger relative rounded-xl border p-2 transition-colors ${homeownerReminders.length > 0 ? "border-sky-300 bg-sky-100 text-sky-900 hover:bg-sky-200" : "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"}`}
          >
            <House className="h-5 w-5" />
            {homeownerReminders.length > 0 && (
              <span className="superadmin-alert-count absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white animate-pulse">
                {homeownerReminders.length > 99 ? "99+" : homeownerReminders.length}
              </span>
            )}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="notification-popover absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-800 text-sm">{activePanel === "calls" ? "Alertas de llamadas" : activePanel === "homeowners" ? "Seguimiento de homeowner" : "Notificaciones"}</h3>
            {activePanel === "notifications" && unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Marcar notificaciones leídas
              </button>
            )}
          </div>
          
          {activePanel === "calls" ? (
            <div className="max-h-[350px] overflow-y-auto">
              {callReminders.length > 0 ? (
                <section aria-label="Llamadas pendientes">
                <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2.5">
                  <Phone className="h-3.5 w-3.5 text-amber-700" />
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-amber-900">Llamadas pendientes</h4>
                  <span className="ml-auto rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">{callReminders.length}</span>
                </div>
                <ul className="divide-y divide-amber-50">
                  {callReminders.map(reminder => (
                    <li key={reminder.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onCallReminderClick?.(reminder.id, reminder.organizationId);
                          setIsOpen(false);
                        }}
                        className="w-full p-3.5 text-left transition-colors hover:bg-amber-50/70"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-bold text-gray-800">{reminder.name}</span>
                            <span className="mt-0.5 block truncate text-[11px] text-gray-600">{reminder.insurer}</span>
                            <span className="mt-1 flex items-center gap-1 text-[11px] text-gray-700">
                              <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                              <span className="truncate">{reminder.phone}</span>
                            </span>
                            <span className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-amber-800">
                              <Clock3 className="h-3 w-3" /> {reminder.daysSinceSent} días desde el último envío · Llamar
                            </span>
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                </section>
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  <PhoneCall className="mx-auto mb-2 h-8 w-8 text-amber-600/35" />
                  <p className="text-sm font-medium">No hay llamadas pendientes</p>
                  <p className="mt-1 text-xs leading-relaxed">Los casos aparecerán aquí al cumplir 7 días desde el último envío de documentos.</p>
                </div>
              )}
            </div>
          ) : activePanel === "homeowners" ? (
            <div className="max-h-[350px] overflow-y-auto">
              {homeownerReminders.length > 0 ? (
                <section aria-label="Actualizaciones pendientes para homeowner">
                  <div className="flex items-center gap-2 border-b border-sky-100 bg-sky-50 px-4 py-2.5">
                    <House className="h-3.5 w-3.5 text-sky-700" />
                    <h4 className="text-[11px] font-bold uppercase tracking-wide text-sky-900">Actualizar al homeowner</h4>
                    <span className="ml-auto rounded-full bg-sky-200 px-1.5 py-0.5 text-[9px] font-bold text-sky-900">{homeownerReminders.length}</span>
                  </div>
                  <ul className="divide-y divide-sky-50">
                    {homeownerReminders.map(reminder => (
                      <li key={reminder.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onHomeownerReminderClick?.(reminder.id, reminder.organizationId);
                            setIsOpen(false);
                          }}
                          className="w-full p-3.5 text-left transition-colors hover:bg-sky-50/70"
                        >
                          <span className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800"><House className="h-3.5 w-3.5" /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-bold text-gray-800">{reminder.name}</span>
                              <span className="mt-1 flex items-center gap-1 text-[11px] text-gray-700"><Phone className="h-3 w-3 shrink-0 text-gray-400" /><span className="truncate">{reminder.phone}</span></span>
                              <span className="mt-0.5 block truncate text-[11px] text-gray-600">{reminder.email}</span>
                              <span className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-sky-800">
                                <Clock3 className="h-3 w-3" />
                                {reminder.neverContacted ? `Sin contacto registrado · Caso creado hace ${reminder.daysSinceContact} días` : `${reminder.daysSinceContact} días desde el último contacto`}
                              </span>
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  <House className="mx-auto mb-2 h-8 w-8 text-sky-600/35" />
                  <p className="text-sm font-medium">No hay actualizaciones pendientes</p>
                  <p className="mt-1 text-xs leading-relaxed">Los casos aparecerán aquí 7 días después de la última llamada, correo o mensaje de texto registrado con el homeowner.</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {errorMessage && <p role="alert" className="px-4 py-2 text-xs text-red-600">{errorMessage}</p>}
              <div className="max-h-[350px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">No hay notificaciones nuevas</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {notifications.map((notification) => (
                  <li 
                    key={notification.id} 
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => {
                      if (onNotificationClick) onNotificationClick(notification);
                      void handleMarkAsRead(notification.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 mb-0.5">{notification.title}</p>
                        {notification.content && (
                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {notification.content}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-2 font-medium">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        title="Marcar como leída"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
