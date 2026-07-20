export type NotificationType = "mention" | "status_changed" | "lead_created" | "task_assigned" | "document_uploaded";

export interface Notification {
  id: string;
  user_id: string;
  organization_id?: string;
  type: NotificationType;
  title: string;
  content: string;
  reference_id?: string;
  reference_type?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPayload {
  author_name: string;
  content?: string;
  recipient_name?: string;
  job_name?: string;
  status_name?: string;
}

export interface NotificationTemplate {
  name: string;
  template: string;
}

export interface EventConfig {
  name: string;
  template: string;
}
