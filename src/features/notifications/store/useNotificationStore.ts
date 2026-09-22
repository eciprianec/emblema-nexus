import { create } from 'zustand';
import { NotificationItem } from '../types';

interface NotificationState {
  notifications: NotificationItem[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: () => number;
}

const getInitialNotifications = (): NotificationItem[] => {
  const now = new Date();
  
  const minutesAgo = (min: number) => new Date(now.getTime() - min * 60 * 1000).toISOString();
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  return [
    {
      id: 'notif-1',
      title: 'Audiencia de Pruebas Mañana',
      message: 'Expediente LEG-2024-0001: Audiencia fijada en 2da Sala Cámara Civil y Comercial a las 9:00 AM.',
      type: 'audiencia',
      read: false,
      createdAt: minutesAgo(12),
      link: '/agenda?tab=calendario',
    },
    {
      id: 'notif-2',
      title: 'Vencimiento de Plazo Próximo',
      message: 'Plazo de Réplica a Escrito de Defensa vence en 48 horas (Expediente LEG-2024-0105).',
      type: 'plazo',
      read: false,
      createdAt: hoursAgo(2),
      link: '/agenda?tab=plazos',
    },
    {
      id: 'notif-3',
      title: 'Nueva Tarea Asignada',
      message: 'Se le ha asignado: "Revisión técnica de planos de mensura catastral" por Ing. Vargas.',
      type: 'tarea',
      read: false,
      createdAt: hoursAgo(5),
      link: '/agenda?tab=tareas',
    },
    {
      id: 'notif-4',
      title: 'Resolución Notificada',
      message: 'Tribunal de Tierras emitió sentencia preliminar en el expediente AGR-2024-0042.',
      type: 'expediente',
      read: true,
      createdAt: daysAgo(1),
      link: '/expedientes',
    },
    {
      id: 'notif-5',
      title: 'Nuevo Documento Subido',
      message: 'Lic. Rodríguez adjuntó acta de comparecencia legal firmada.',
      type: 'documento',
      read: true,
      createdAt: daysAgo(2),
      link: '/documentos',
    },
  ];
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: getInitialNotifications(),
  markAsRead: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },
  unreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },
}));
