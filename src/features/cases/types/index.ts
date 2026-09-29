export type CaseArea = 'LEGAL' | 'AGRIMENSURA' | 'INMOBILIARIA';

export type CaseStatus = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO';

export type CasePriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export interface CaseParticipant {
  id: string;
  name: string;
  role: string;
  contact: string;
}

export interface CaseTimelineEvent {
  id: string;
  type: 'CREATION' | 'STAGE_CHANGE' | 'NOTE' | 'TASK' | 'DOCUMENT';
  title: string;
  desc: string;
  date: string;
}

export interface Case {
  id: string;
  numero: string;
  titulo: string;
  area: CaseArea;
  tipo: string;
  clienteId: string;
  clientName: string;
  responsableId: string;
  responsable: string;
  supervisorId?: string;
  prioridad: CasePriority;
  estado: CaseStatus;
  descripcion?: string;
  stage: number;
  participants: CaseParticipant[];
  timeline: CaseTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export type CreateCaseInput = Omit<
  Case,
  'id' | 'numero' | 'createdAt' | 'updatedAt' | 'stage' | 'participants' | 'timeline' | 'estado'
> & {
  estado?: CaseStatus;
  participants?: CaseParticipant[];
};

export type UpdateCaseInput = Partial<Omit<Case, 'id' | 'numero' | 'createdAt' | 'updatedAt'>>;
