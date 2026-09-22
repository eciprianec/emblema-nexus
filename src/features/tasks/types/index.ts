export type TaskPriority = 'baja' | 'normal' | 'alta' | 'urgente';

export type TaskStatus = 'pendiente' | 'en_proceso' | 'en_revision' | 'completada';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string; // YYYY-MM-DD
  caseId?: string;
  caseNumber?: string;
  caseTitle?: string;
  checklist: ChecklistItem[];
  assignedTo?: string;
  createdAt?: string;
}
