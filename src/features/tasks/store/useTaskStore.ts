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

const getInitialTasks = (): Task[] => [];

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
