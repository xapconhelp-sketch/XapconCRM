import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { Notification } from '../types/notifications';

interface NotificationBellProps {
  userId: string;
  organizationId?: string;
  onNotificationClick?: (notification: Notification) => void;
}

export function NotificationBell({ userId, organizationId, onNotificationClick }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!userId) return;
    const data = await notificationService.getUnread(userId, organizationId);
    setNotifications(data || []);
    setUnreadCount(data?.length || 0);
  };

  useEffect(() => {
    fetchNotifications();
    // In a real app, you would set up a Supabase Realtime subscription here
    const intervalId = setInterval(fetchNotifications, 30000); // Poll every 30s as fallback
    return () => clearInterval(intervalId);
  }, [userId, organizationId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await notificationService.markAsRead(id);
    if (success) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    const success = await notificationService.markAllAsRead(userId);
    if (success) {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-800 text-sm">Notificaciones</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Marcar todo leído
              </button>
            )}
          </div>
          
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
                      handleMarkAsRead(notification.id, {} as any);
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
        </div>
      )}
    </div>
  );
}
