import { supabase } from '../lib/supabase';
import { NotificationPayload, NotificationType } from '../types/notifications';

class NotificationService {
  /**
   * Dispara una nueva notificación (Evento Interno)
   * @param type Tipo de notificación (mention, status_changed, etc)
   * @param referenceId ID del registro relacionado (ej. leadId)
   * @param referenceType Tipo de registro (ej. 'lead')
   * @param payload Datos dinámicos para construir el mensaje
   * @param targetUserId ID del usuario que debe recibir la notificación (opcional si es para una organización)
   * @param targetOrgId ID de la organización que debe recibir la notificación (opcional)
   */
  async trigger(
    type: NotificationType,
    referenceId: string,
    referenceType: string,
    payload: NotificationPayload,
    targetUserId?: string,
    targetOrgId?: string
  ) {
    try {
      // 1. Compilar la plantilla del título
      let title = "";
      switch (type) {
        case 'mention':
          title = `${payload.author_name} te ha mencionado en un caso`;
          break;
        case 'status_changed':
          title = `El estado del caso ${payload.job_name} ha cambiado a ${payload.status_name}`;
          break;
        case 'lead_created':
          title = `Nuevo lead asignado a tu empresa`;
          break;
        case 'task_assigned':
          title = `Se te ha asignado una nueva tarea en ${payload.job_name}`;
          break;
        default:
          title = "Nueva Notificación";
      }

      // 2. Insertar la notificación en la tabla de Supabase (Internal Provider)
      if (!targetUserId && !targetOrgId) {
        console.warn("Notification engine: No targetUserId or targetOrgId provided, skipping.");
        return;
      }

      const { error } = await supabase.from('notifications').insert({
        type,
        title,
        content: payload.content || '',
        reference_id: referenceId,
        reference_type: referenceType,
        user_id: targetUserId || null,
        organization_id: targetOrgId || null,
        is_read: false
      });

      if (error) {
        console.error("Error inserting notification:", error);
      }
    } catch (err) {
      console.error("Error in notification service trigger:", err);
    }
  }

  /**
   * Obtiene las notificaciones no leídas de un usuario (y de su organización)
   * @param userId ID del usuario
   * @param orgId ID de la organización del usuario
   */
  async getUnread(userId: string, orgId?: string) {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false });
        
      if (orgId) {
        query = query.or(`user_id.eq.${userId},organization_id.eq.${orgId}`);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Error fetching unread notifications:", err);
      return [];
    }
  }

  /**
   * Marca una notificación como leída
   * @param notificationId ID de la notificación
   */
  async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
        
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error marking notification as read:", err);
      return false;
    }
  }
  
  /**
   * Marca todas las notificaciones de un usuario como leídas
   */
  async markAllAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
        
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      return false;
    }
  }
}

export const notificationService = new NotificationService();
