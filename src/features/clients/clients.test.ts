import { describe, expect, it } from "vitest";
import { cleanSearchTerm, clientName, clientToRow, isUuid, rowToClient, type ClientRow } from "./mapping";
import { clientEditSchema, clientSchema } from "./schemas/client-schema";

const juridica = {
  type: "JURIDICA" as const,
  razonSocial: "Inversiones Caribe SRL",
  rnc: "101-67291-9",
  telefono: "809-555-0000",
  email: "pagos@caribe.test",
  direccion: "Calle El Sol 10",
};

const fisica = {
  type: "FISICA" as const,
  nombres: "Ana",
  apellidos: "Pérez",
  cedula: "001-0000000-1",
  telefono: "809-555-0001",
  email: "ana@correo.test",
  direccion: "Calle Luna 2",
};

const row: ClientRow = {
  id: "50f4a8cb-3ba6-4ed0-b747-d5e81d77a80b",
  client_type: "persona_juridica",
  first_name: null,
  last_name: null,
  cedula: null,
  passport: null,
  business_name: "Inversiones Caribe SRL",
  trade_name: null,
  rnc: "101672919",
  legal_representative: null,
  email: null,
  phone: null,
  address: null,
  is_active: true,
  archived_at: null,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

describe("clientToRow", () => {
  it("guarda el RNC y la cédula solo con dígitos", () => {
    expect(clientToRow(juridica).rnc).toBe("101672919");
    expect(clientToRow(fisica).cedula).toBe("00100000001");
  });

  it("guarda lo vacío como NULL, no como texto vacío", () => {
    const result = clientToRow({ type: "JURIDICA", razonSocial: "X", rnc: "", telefono: " ", email: "", direccion: "" });
    expect(result).toMatchObject({ rnc: null, phone: null, email: null, address: null, trade_name: null });
  });

  it("no mezcla los campos del otro tipo de cliente", () => {
    const result = clientToRow({ ...juridica, nombres: "Sobra", cedula: "00100000001" });
    expect(result).toMatchObject({ client_type: "persona_juridica", first_name: null, cedula: null });
    expect(clientToRow({ ...fisica, razonSocial: "Sobra", rnc: "101672919" })).toMatchObject({
      client_type: "persona_fisica",
      business_name: null,
      rnc: null,
    });
  });
});

describe("rowToClient", () => {
  it("tolera un cliente sin contacto, como los creados desde la factura", () => {
    const client = rowToClient(row);
    expect(client).toMatchObject({ type: "JURIDICA", telefono: "", email: "", direccion: "", status: "ACTIVO" });
  });

  it("marca como inactivo al archivado", () => {
    expect(rowToClient({ ...row, is_active: false }).status).toBe("INACTIVO");
    expect(rowToClient({ ...row, archived_at: "2026-11-01T00:00:00Z" }).status).toBe("INACTIVO");
  });

  it("conserva los datos al ida y vuelta", () => {
    const stored = clientToRow(juridica);
    const client = rowToClient({ ...row, ...stored });
    expect(clientToRow(client as Parameters<typeof clientToRow>[0])).toEqual(stored);
    expect(clientName(client)).toBe("Inversiones Caribe SRL");
  });
});

describe("validación", () => {
  it("acepta un alta completa", () => {
    expect(clientSchema.safeParse(juridica).success).toBe(true);
    expect(clientSchema.safeParse(fisica).success).toBe(true);
  });

  it("rechaza documentos que la emisión rechazaría", () => {
    expect(clientSchema.safeParse({ ...juridica, rnc: "12345" }).success).toBe(false);
    expect(clientSchema.safeParse({ ...fisica, cedula: "123" }).success).toBe(false);
    expect(clientSchema.safeParse({ ...juridica, direccion: "x".repeat(101) }).success).toBe(false);
    expect(clientSchema.safeParse({ ...juridica, razonSocial: "x".repeat(151) }).success).toBe(false);
  });

  it("el alta exige documento; la edición no, para poder corregir clientes incompletos", () => {
    expect(clientSchema.safeParse({ ...fisica, cedula: "" }).success).toBe(false);
    expect(clientSchema.safeParse({ ...fisica, cedula: "", pasaporte: "AB123" }).success).toBe(true);
    expect(clientEditSchema.safeParse({ type: "FISICA", nombres: "Ana", email: "", telefono: "" }).success).toBe(true);
    expect(clientEditSchema.safeParse({ type: "JURIDICA", razonSocial: "X", rnc: "12345" }).success).toBe(false);
    expect(clientEditSchema.safeParse({ type: "JURIDICA", rnc: "101672919" }).success).toBe(false);
  });
});

describe("utilidades", () => {
  it("limpia lo que PostgREST reserva en los filtros", () => {
    expect(cleanSearchTerm(' a,b(c)%*"\\ ')).toBe("abc");
    expect(cleanSearchTerm(undefined)).toBe("");
  });

  it("distingue los identificadores antiguos del navegador", () => {
    expect(isUuid("cl-1730000000000")).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(row.id)).toBe(true);
  });
});
