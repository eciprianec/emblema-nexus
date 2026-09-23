import {
  Dgii606Record,
  Dgii607Record,
  Dgii608Record,
  CaseProfitability,
  TeamProductivity,
  ModuleColumnDefinition,
  ExportModule,
} from '../types';

export const INITIAL_606_RECORDS: Dgii606Record[] = [];
export const INITIAL_607_RECORDS: Dgii607Record[] = [];
export const INITIAL_608_RECORDS: Dgii608Record[] = [];
export const INITIAL_CASE_PROFITABILITY: CaseProfitability[] = [];
export const INITIAL_TEAM_PRODUCTIVITY: TeamProductivity[] = [];

export const MODULE_COLUMNS_MAP: Record<ExportModule, ModuleColumnDefinition[]> = {
  clientes: [
    { key: 'id', label: 'ID Cliente', defaultSelected: true },
    { key: 'nombre', label: 'Nombre / Razón Social', defaultSelected: true },
    { key: 'tipo', label: 'Tipo (Física / Jurídica)', defaultSelected: true },
    { key: 'documento', label: 'RNC o Cédula', defaultSelected: true },
    { key: 'telefono', label: 'Teléfono', defaultSelected: true },
    { key: 'email', label: 'Correo Electrónico', defaultSelected: true },
    { key: 'ciudad', label: 'Ciudad / Provincia', defaultSelected: false },
    { key: 'estado', label: 'Estado', defaultSelected: true },
    { key: 'fechaRegistro', label: 'Fecha Registro', defaultSelected: false },
  ],
  facturas: [
    { key: 'id', label: 'ID Factura', defaultSelected: true },
    { key: 'ncf', label: 'NCF / e-NCF', defaultSelected: true },
    { key: 'tipoEcf', label: 'Tipo Comprobante (E31, B01, etc.)', defaultSelected: true },
    { key: 'cliente', label: 'Cliente', defaultSelected: true },
    { key: 'rncCliente', label: 'RNC/Cédula Cliente', defaultSelected: true },
    { key: 'fechaEmision', label: 'Fecha Emisión', defaultSelected: true },
    { key: 'subtotal', label: 'Subtotal (DOP)', defaultSelected: true },
    { key: 'itbis', label: 'ITBIS (DOP)', defaultSelected: true },
    { key: 'total', label: 'Total Facturado (DOP)', defaultSelected: true },
    { key: 'estado', label: 'Estado DGII / Cobro', defaultSelected: true },
  ],
  expedientes: [
    { key: 'codigo', label: 'Código Expediente', defaultSelected: true },
    { key: 'titulo', label: 'Carátula / Objeto', defaultSelected: true },
    { key: 'tipo', label: 'Tipo (Deslinde, Litigio, etc.)', defaultSelected: true },
    { key: 'cliente', label: 'Cliente', defaultSelected: true },
    { key: 'abogado', label: 'Abogado Responsable', defaultSelected: true },
    { key: 'agrimensor', label: 'Agrimensor Asignado', defaultSelected: true },
    { key: 'tribunal', label: 'Tribunal / Jurisdicción', defaultSelected: false },
    { key: 'estado', label: 'Fase / Estado Procesal', defaultSelected: true },
    { key: 'fechaApertura', label: 'Fecha Apertura', defaultSelected: false },
  ],
  parcelas: [
    { key: 'designacion', label: 'Designación Catastral', defaultSelected: true },
    { key: 'distritoCatastral', label: 'Distrito Catastral', defaultSelected: true },
    { key: 'municipio', label: 'Municipio / Provincia', defaultSelected: true },
    { key: 'superficieM2', label: 'Superficie (m²)', defaultSelected: true },
    { key: 'superficieTareas', label: 'Superficie (Tareas)', defaultSelected: false },
    { key: 'matricula', label: 'Matrícula de Título', defaultSelected: true },
    { key: 'estadoDeslinde', label: 'Estado de Deslinde', defaultSelected: true },
    { key: 'coordenadasUtm', label: 'Vértices UTM WGS-84', defaultSelected: false },
  ],
  inmuebles: [
    { key: 'codigo', label: 'Código Propiedad', defaultSelected: true },
    { key: 'titulo', label: 'Nombre Inmueble', defaultSelected: true },
    { key: 'tipo', label: 'Tipo (Villa, Terreno, Apartamento)', defaultSelected: true },
    { key: 'ubicacion', label: 'Ubicación / Sector', defaultSelected: true },
    { key: 'precioVentaDOP', label: 'Precio DOP', defaultSelected: true },
    { key: 'precioVentaUSD', label: 'Precio USD', defaultSelected: true },
    { key: 'habitaciones', label: 'Habitaciones', defaultSelected: false },
    { key: 'estadoComercial', label: 'Estado Comercial', defaultSelected: true },
  ],
  contratos: [
    { key: 'numero', label: 'Número de Contrato', defaultSelected: true },
    { key: 'tipo', label: 'Tipo de Contrato', defaultSelected: true },
    { key: 'partes', label: 'Partes Involucradas', defaultSelected: true },
    { key: 'montoPactado', label: 'Monto Pactado (DOP)', defaultSelected: true },
    { key: 'fechaFirma', label: 'Fecha Firma', defaultSelected: true },
    { key: 'notario', label: 'Notario Legalizante', defaultSelected: true },
    { key: 'vigencia', label: 'Fecha Vigencia / Término', defaultSelected: false },
    { key: 'estado', label: 'Estado de Cumplimiento', defaultSelected: true },
  ],
};

export const MASTER_DATA_SAMPLES: Record<ExportModule, Record<string, any>[]> = {
  clientes: [],
  facturas: [],
  expedientes: [],
  parcelas: [],
  inmuebles: [],
  contratos: [],
};
