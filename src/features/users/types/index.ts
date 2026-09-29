export type UserRole =
  | 'ADMINISTRADOR'
  | 'ABOGADO'
  | 'AGRIMENSOR'
  | 'AGENTE_INMOBILIARIO'
  | 'CONTADOR'
  | 'ASISTENTE';

export type UserStatus = 'ACTIVO' | 'INACTIVO';

export type UserArea =
  | 'ADMINISTRACION'
  | 'LEGAL'
  | 'AGRIMENSURA'
  | 'INMOBILIARIA'
  | 'FINANZAS';

export interface User {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  rol: UserRole;
  area: UserArea;
  status: UserStatus;
  avatarUrl?: string;
  cedula?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'> & {
  password?: string;
};

export type UpdateUserInput = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;
