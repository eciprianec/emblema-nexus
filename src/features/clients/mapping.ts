import { onlyDigits, type ClientEditValues } from "./schemas/client-schema";
import type { Client } from "./types";

export interface ClientRow {
  id: string;
  client_type: string | null;
  first_name: string | null;
  last_name: string | null;
  cedula: string | null;
  passport: string | null;
  business_name: string | null;
  trade_name: string | null;
  rnc: string | null;
  legal_representative: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export const CLIENT_ROW_COLUMNS =
  "id, client_type, first_name, last_name, cedula, passport, business_name, trade_name, rnc, legal_representative, email, phone, address, is_active, archived_at, created_at, updated_at";

export function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    type: row.client_type === "persona_fisica" ? "FISICA" : "JURIDICA",
    nombres: row.first_name ?? undefined,
    apellidos: row.last_name ?? undefined,
    cedula: row.cedula ?? undefined,
    pasaporte: row.passport ?? undefined,
    razonSocial: row.business_name ?? undefined,
    nombreComercial: row.trade_name ?? undefined,
    rnc: row.rnc ?? undefined,
    representante: row.legal_representative ?? undefined,
    // Un cliente creado desde la factura puede no tener teléfono ni correo.
    telefono: row.phone ?? "",
    email: row.email ?? "",
    direccion: row.address ?? "",
    status: row.is_active === false || row.archived_at ? "INACTIVO" : "ACTIVO",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const text = (value: string | undefined) => value?.trim() || null;

/**
 * Lo vacío se guarda como NULL, no como texto vacío: la emisión decide si el comprador
 * es extranjero con COALESCE(rnc, cedula), y un RNC vacío la haría equivocarse.
 */
export function clientToRow(values: ClientEditValues) {
  const isFisica = values.type === "FISICA";
  return {
    client_type: isFisica ? "persona_fisica" : "persona_juridica",
    first_name: isFisica ? text(values.nombres) : null,
    last_name: isFisica ? text(values.apellidos) : null,
    cedula: isFisica ? onlyDigits(values.cedula) || null : null,
    passport: isFisica ? text(values.pasaporte) : null,
    business_name: isFisica ? null : text(values.razonSocial),
    trade_name: isFisica ? null : text(values.nombreComercial),
    rnc: isFisica ? null : onlyDigits(values.rnc) || null,
    legal_representative: isFisica ? null : text(values.representante),
    phone: text(values.telefono),
    email: text(values.email),
    address: text(values.direccion),
  };
}

export function clientName(client: Pick<Client, "type" | "nombres" | "apellidos" | "razonSocial">): string {
  return client.type === "FISICA"
    ? `${client.nombres ?? ""} ${client.apellidos ?? ""}`.trim()
    : client.razonSocial || "Empresa";
}

/** Un término de búsqueda sin los caracteres que PostgREST reserva en sus filtros `or`. */
export function cleanSearchTerm(term: string | undefined): string {
  return (term ?? "").trim().replace(/[%,()*"\\]/g, "");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Los expedientes guardados en el navegador aún pueden apuntar a identificadores antiguos. */
export function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID.test(value));
}
