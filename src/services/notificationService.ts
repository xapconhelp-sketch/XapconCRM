import { supabase } from '../lib/supabase';

class NotificationService {
  async getUnread(_userId: string, orgId?: string) {
    const { data, error } = await supabase.rpc('get_xapcon_unread_notifications', { p_organization_id: orgId || null });
    if (error) throw new Error(error.message);
    return data;
  }

  async markAsRead(notificationId: string) {
    const { error } = await supabase.rpc('read_xapcon_notifications', { p_notification_id: notificationId });
    if (error) throw new Error(error.message);
    return true;
  }

  async markAllAsRead(_userId: string, orgId?: string) {
    const { error } = await supabase.rpc('read_xapcon_notifications', { p_organization_id: orgId || null });
    if (error) throw new Error(error.message);
    return true;
  }

}

export const notificationService = new NotificationService();
