export type NotificationType = 
  | 'audiencia' 
  | 'plazo' 
  | 'tarea' 
  | 'expediente' 
  | 'documento' 
  | 'sistema';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string; // ISO date string
  link?: string;
}
