import { create } from 'zustand';
import { Task, TaskPriority, TaskStatus } from '../types';

interface TaskState {
  tasks: Task[];
  selectedTask: Task | null;
  isModalOpen: boolean;
  searchQuery: string;
  filterPriority: TaskPriority | 'todas';
  
  addTask: (taskData: Omit<Task, 'id' | 'createdAt'>) => Task;
  updateTask: (id: string, partial: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTaskStatus: (id: string, newStatus: TaskStatus) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  
  openCreateModal: (defaultStatus?: TaskStatus) => void;
  openEditModal: (task: Task) => void;
  closeModal: () => void;
  setSearchQuery: (query: string) => void;
  setFilterPriority: (priority: TaskPriority | 'todas') => void;
}

const getInitialTasks = (): Task[] => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const dayOffset = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return formatYmd(d);
  };

  return [
    {
      id: 'task-1',
      title: 'Redactar acto de intimación de pago',
      description: 'Intimación formal de pago por concepto de cuotas de mantenimiento atrasadas previo a demanda ejecutiva.',
      priority: 'urgente',
      status: 'pendiente',
      dueDate: dayOffset(-1), // Vencida
      caseId: 'case_1',
      caseNumber: 'LEG-2024-0001',
      caseTitle: 'Divorcio y Partición de Bienes',
      assignedTo: 'Lic. Rodríguez',
      checklist: [
        { id: 'chk-1-1', text: 'Obtener estados de cuenta certificados', completed: true },
        { id: 'chk-1-2', text: 'Redactar cuerpo del acto ministerial', completed: false },
        { id: 'chk-1-3', text: 'Asignar a Alguacil de Estrados', completed: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-2',
      title: 'Solicitar certificación de estatus jurídico al Registro de Títulos',
      description: 'Tramitación digital vía plataforma virtual de la Jurisdicción Inmobiliaria (JI).',
      priority: 'normal',
      status: 'pendiente',
      dueDate: dayOffset(3),
      caseId: 'case_3',
      caseNumber: 'INM-2024-0018',
      caseTitle: 'Regularización Título Turístico',
      assignedTo: 'Lic. Peña',
      checklist: [
        { id: 'chk-2-1', text: 'Pagar sellos de Ley No. 33-91', completed: false },
        { id: 'chk-2-2', text: 'Subir formulario de solicitud firmado', completed: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-3',
      title: 'Elaborar plano general de mensura catastral',
      description: 'Integrar levantamiento GPS con base topográfica conforme a normas técnicas de la Dirección Regional de Mensuras Catastrales.',
      priority: 'alta',
      status: 'en_proceso',
      dueDate: dayOffset(2),
      caseId: 'case_2',
      caseNumber: 'AGR-2024-0042',
      caseTitle: 'Deslinde y Subdivisión Parcela 15',
      assignedTo: 'Ing. Vargas',
      checklist: [
        { id: 'chk-3-1', text: 'Verificación de coordenadas UTM / WGS84', completed: true },
        { id: 'chk-3-2', text: 'Superposición con capa de catastro parcelario', completed: true },
        { id: 'chk-3-3', text: 'Colocación de sellos y firmas digitales agrimensor', completed: false },
        { id: 'chk-3-4', text: 'Generación de informe técnico descriptivo', completed: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-4',
      title: 'Notificar acto de emplazamiento vía ministerial',
      description: 'Traslado al domicilio social de la contraparte con ministerial habilitado.',
      priority: 'urgente',
      status: 'en_proceso',
      dueDate: dayOffset(0), // Hoy
      caseId: 'case_4',
      caseNumber: 'LEG-2024-0105',
      caseTitle: 'Reclamación de Daños y Perjuicios',
      assignedTo: 'Alguacil Martínez',
      checklist: [
        { id: 'chk-4-1', text: 'Entrega de copias certificadas al alguacil', completed: true },
        { id: 'chk-4-2', text: 'Retiro de acto notificado y copia de traslado', completed: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-5',
      title: 'Revisar proyecto de contrato de compraventa con fiduciaria',
      description: 'Validar cláusulas de resolución automática y garantías de entrega con el departamento fiduciario.',
      priority: 'normal',
      status: 'en_revision',
      dueDate: dayOffset(4),
      caseId: 'case_3',
      caseNumber: 'INM-2024-0018',
      caseTitle: 'Regularización Título Turístico',
      assignedTo: 'Dra. Méndez',
      checklist: [
        { id: 'chk-5-1', text: 'Revisar causales de incumplimiento', completed: true },
        { id: 'chk-5-2', text: 'Validar régimen de penalidades', completed: true },
        { id: 'chk-5-3', text: 'Aprobación final por socio director', completed: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-6',
      title: 'Verificar RNC en Dirección General de Impuestos Internos (DGII)',
      description: 'Confirmación de estatus tributario activo y comprobantes fiscales válidos del cliente.',
      priority: 'baja',
      status: 'completada',
      dueDate: dayOffset(-3),
      caseId: 'case_1',
      caseNumber: 'LEG-2024-0001',
      caseTitle: 'Divorcio y Partición de Bienes',
      assignedTo: 'Lic. Peña',
      checklist: [
        { id: 'chk-6-1', text: 'Consulta en portal DGII RNC', completed: true },
        { id: 'chk-6-2', text: 'Descargar certificación de cumplimiento fiscal', completed: true },
      ],
      createdAt: new Date().toISOString(),
    },
  ];
};

export const useTaskStore = create<TaskState>((set) => ({
  tasks: getInitialTasks(),
  selectedTask: null,
  isModalOpen: false,
  searchQuery: '',
  filterPriority: 'todas',

  addTask: (taskData) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      tasks: [newTask, ...state.tasks],
      isModalOpen: false,
      selectedTask: null,
    }));
    return newTask;
  },

  updateTask: (id, partial) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...partial } : t)),
      isModalOpen: false,
      selectedTask: null,
    }));
  },

  deleteTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      isModalOpen: false,
      selectedTask: null,
    }));
  },

  moveTaskStatus: (id, newStatus) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status: newStatus } : t
      ),
    }));
  },

  toggleChecklistItem: (taskId, itemId) => {
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const updatedChecklist = t.checklist.map((item) =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        return { ...t, checklist: updatedChecklist };
      }),
      selectedTask:
        state.selectedTask?.id === taskId
          ? {
              ...state.selectedTask,
              checklist: state.selectedTask.checklist.map((item) =>
                item.id === itemId ? { ...item, completed: !item.completed } : item
              ),
            }
          : state.selectedTask,
    }));
  },

  openCreateModal: (defaultStatus = 'pendiente') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    set({
      selectedTask: {
        id: '',
        title: '',
        description: '',
        priority: 'normal',
        status: defaultStatus,
        dueDate: today,
        caseId: '',
        caseNumber: '',
        caseTitle: '',
        assignedTo: 'Usuario Actual',
        checklist: [],
      },
      isModalOpen: true,
    });
  },

  openEditModal: (task) => {
    set({
      selectedTask: { ...task, checklist: [...task.checklist] },
      isModalOpen: true,
    });
  },

  closeModal: () => {
    set({
      isModalOpen: false,
      selectedTask: null,
    });
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
  },

  setFilterPriority: (filterPriority) => {
    set({ filterPriority });
  },
}));
