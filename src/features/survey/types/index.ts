export type VertexCode = 
  | 'HITO_CONCRETO' 
  | 'VARILLA' 
  | 'CLAVO' 
  | 'ESQ_MURO' 
  | 'BORDILLO' 
  | 'POSTE' 
  | 'PUNTO_GPS' 
  | 'ESTACION_BASE' 
  | 'LINDERO';

export interface CoordinatePoint {
  id: string;
  pointNumber: string; // e.g., "P1", "P2"
  northing: number;    // Coordenada Norte UTM 19N (m)
  easting: number;     // Coordenada Este UTM 19N (m)
  elevation: number;   // Cota ortométrica Z (msnm)
  code: VertexCode;    // Tipo de materialización
  description?: string;
}

export interface ParcelBoundaries {
  north: string;
  south: string;
  east: string;
  west: string;
}

export type ParcelStatus = 
  | 'REGISTRADA' 
  | 'EN_MENSURA' 
  | 'OBSERVADA' 
  | 'APROBADA_DNMC' 
  | 'TITULADA' 
  | 'SANEADA';

export interface Parcel {
  id: string;
  designation: string;       // ej. "Parcela 15-Ref"
  cadastralDistrict: string; // ej. "03"
  portion?: string;          // Porción ej. "A"
  block?: string;            // Manzana ej. "405"
  solar?: string;            // Solar ej. "12"
  province: string;          // ej. "La Altagracia"
  municipality: string;      // ej. "Higüey"
  sector?: string;           // ej. "Verón - Punta Cana"
  areaSqm: number;           // Superficie en m²
  areaTareas: number;        // Superficie en Tareas dominicanas (m² / 628.86)
  boundaries: ParcelBoundaries;
  vertices: CoordinatePoint[];
  status: ParcelStatus;
  legalStatus: string;       // ej. "En proceso de Deslinde", "Título Definitivo"
  titleNumber?: string;      // Matrícula / Certificado de Título
  cadastralFileId?: string;  // Expediente DNMC vinculado
  caseId?: string;           // Expediente legal del sistema (ej. LEG-2024-0001)
  clientName: string;
  surveyorName: string;
  surveyorCodia: string;
  createdAt: string;
  updatedAt: string;
}

export type DNMCOperationType = 
  | 'DESLINDE' 
  | 'SUBDIVISION' 
  | 'REFUNDICION' 
  | 'SANEAMIENTO' 
  | 'MENSURA_POR_POSESION' 
  | 'ACTUALIZACION_PARCELARIA';

export type DNMCStage = 
  | 'SOLICITUD' 
  | 'AVISO_PERIODICO' 
  | 'TRABAJOS_CAMPO' 
  | 'SOMETIDO_DNMC' 
  | 'OBSERVACIONES' 
  | 'APROBADO';

export type DNMCRegional = 
  | 'REGIONAL_CENTRAL' 
  | 'REGIONAL_NORTE' 
  | 'REGIONAL_ESTE' 
  | 'REGIONAL_NORESTE';

export interface ObservationNotice {
  officialNoticeNumber: string; // ej. "Oficio Obs. No. 2026-1184"
  issueDate: string;
  deadlineDays: number;         // 30 días reglamentarios
  deadlineDate: string;
  reason: string;
  isResolved: boolean;
  resolutionDate?: string;
}

export interface CadastralFile {
  id: string;
  fileNumber: string;           // ej. "DNMC-2026-004521"
  operationType: DNMCOperationType;
  stage: DNMCStage;
  regional: DNMCRegional;
  surveyorName: string;
  surveyorCodia: string;
  parcelId: string;
  parcelDesignation: string;
  caseId?: string;
  clientName: string;
  startDate: string;
  submissionDate?: string;
  approvalDate?: string;
  newspaperNoticeDate?: string;
  newspaperName?: string;
  objectionPeriodDays: number;   // Plazo de objeciones (30 días)
  objectionDeadline?: string;
  observationNotice?: ObservationNotice;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type EquipmentType = 
  | 'GPS_GNSS' 
  | 'ESTACION_TOTAL' 
  | 'NIVEL_OPTICO' 
  | 'DRON_FOTOGRAMETRIA' 
  | 'COLECTOR_DATOS';

export interface TopographicEquipment {
  id: string;
  name: string;             // ej. "Trimble R12i GNSS", "Leica TS06 Plus"
  type: EquipmentType;
  serialNumber: string;
  calibrationExpiry: string;
  status: 'OPERATIVO' | 'EN_CALIBRACION' | 'MANTENIMIENTO';
}

export type BrigadeRole = 
  | 'AGRIMENSOR_LIDER' 
  | 'TOPOGRAFO' 
  | 'CADENERO' 
  | 'CHOFER_LOGISTICA' 
  | 'AYUDANTE';

export interface FieldBrigadeMember {
  id: string;
  name: string;
  role: BrigadeRole;
  phone?: string;
}

export interface BoundaryWitness {
  id: string;
  name: string;
  idCard: string;          // Cédula de Identidad y Electoral Dominicana
  boundaryRelation: string;// ej. "Colindante Norte - Parcela 14", "Apoderado legal"
  status: 'PRESENTE_CONFORME' | 'AUSENTE' | 'OPOSICION';
  comments?: string;
}

export interface BoundaryAct {
  actNumber: string;
  isSigned: boolean;
  executionDate: string;
  witnesses: BoundaryWitness[];
  observations: string;
}

export interface FieldSession {
  id: string;
  code: string;            // ej. "JC-2026-0042"
  parcelId: string;
  parcelDesignation: string;
  sessionDate: string;
  weather: string;
  brigade: FieldBrigadeMember[];
  equipment: TopographicEquipment[];
  actaLinderos: BoundaryAct;
  status: 'PROGRAMADA' | 'EN_CURSO' | 'COMPLETADA' | 'REPROGRAMADA';
  notes?: string;
  createdAt: string;
}

// 1 Tarea Dominicana = 628.86 m²
export const DOMINICAN_TAREA_SQM = 628.86;

export function sqmToTareas(sqm: number): number {
  return Number((sqm / DOMINICAN_TAREA_SQM).toFixed(2));
}

export function tareasToSqm(tareas: number): number {
  return Number((tareas * DOMINICAN_TAREA_SQM).toFixed(2));
}
