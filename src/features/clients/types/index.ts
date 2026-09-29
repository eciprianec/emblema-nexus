export type ClientType = "FISICA" | "JURIDICA";
export type ClientStatus = "ACTIVO" | "INACTIVO" | "PROSPECTO";

export interface Client {
  id: string;
  type: ClientType;
  nombres?: string;
  apellidos?: string;
  cedula?: string;
  pasaporte?: string;
  razonSocial?: string;
  nombreComercial?: string;
  rnc?: string;
  representante?: string;
  telefono: string;
  email: string;
  direccion: string;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}

export type CreateClientInput = Omit<Client, "id" | "createdAt" | "updatedAt" | "status"> & {
  status?: ClientStatus;
};

export type UpdateClientInput = Partial<Omit<Client, "id" | "createdAt" | "updatedAt">>;
