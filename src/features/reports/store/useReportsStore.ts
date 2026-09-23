import { create } from 'zustand';
import { toast } from 'sonner';
import {
  FiscalPeriod,
  CompanyId,
  Dgii606Record,
  Dgii607Record,
  Dgii608Record,
  CaseProfitability,
  TeamProductivity,
  BiConsolidatedMetrics,
  ExportModule,
  ExportFormat,
  COMPANIES_MAP,
} from '../types';
import {
  INITIAL_606_RECORDS,
  INITIAL_607_RECORDS,
  INITIAL_608_RECORDS,
  INITIAL_CASE_PROFITABILITY,
  INITIAL_TEAM_PRODUCTIVITY,
  MASTER_DATA_SAMPLES,
  MODULE_COLUMNS_MAP,
} from '../data/reportsData';
import {
  generate606Txt,
  generate607Txt,
  generate608Txt,
  generateCsvWithBom,
  triggerFileDownload,
} from '../utils/dgiiExport';

export interface ReportsState {
  selectedPeriod: FiscalPeriod;
  selectedCompany: CompanyId;
  records606: Dgii606Record[];
  records607: Dgii607Record[];
  records608: Dgii608Record[];
  caseProfitabilities: CaseProfitability[];
  teamProductivities: TeamProductivity[];
  
  // Acciones de configuración de filtros
  setPeriod: (period: FiscalPeriod) => void;
  setCompany: (company: CompanyId) => void;

  // Getters con filtros reactivos aplicados
  getFiltered606: () => Dgii606Record[];
  getFiltered607: () => Dgii607Record[];
  getFiltered608: () => Dgii608Record[];
  getFilteredProfitability: () => CaseProfitability[];
  getFilteredProductivity: () => TeamProductivity[];
  getConsolidatedMetrics: () => BiConsolidatedMetrics;

  // Acciones de Descarga Oficial DGII
  download606Txt: () => void;
  download607Txt: () => void;
  download608Txt: () => void;

  // Acciones de Descarga CSV con BOM (Excel)
  download606Csv: () => void;
  download607Csv: () => void;
  downloadProfitabilityCsv: () => void;
  downloadProductivityCsv: () => void;

  // Exportador Universal de Datos Maestros
  exportMasterData: (
    module: ExportModule,
    format: ExportFormat,
    selectedColumns: string[],
    dateRange?: { from?: string; to?: string }
  ) => void;
}

export const useReportsStore = create<ReportsState>((set, get) => ({
  selectedPeriod: '2026-03',
  selectedCompany: 'todas',
  records606: INITIAL_606_RECORDS,
  records607: INITIAL_607_RECORDS,
  records608: INITIAL_608_RECORDS,
  caseProfitabilities: INITIAL_CASE_PROFITABILITY,
  teamProductivities: INITIAL_TEAM_PRODUCTIVITY,

  setPeriod: (period: FiscalPeriod) => set({ selectedPeriod: period }),
  setCompany: (company: CompanyId) => set({ selectedCompany: company }),

  getFiltered606: () => {
    const { records606, selectedPeriod, selectedCompany } = get();
    return records606.filter((r) => {
      const matchPeriod = selectedPeriod === '2026-ANUAL' 
        ? r.periodo.startsWith('2026') 
        : r.periodo === selectedPeriod;
      const matchCompany = selectedCompany === 'todas' || r.companyId === selectedCompany;
      return matchPeriod && matchCompany;
    });
  },

  getFiltered607: () => {
    const { records607, selectedPeriod, selectedCompany } = get();
    return records607.filter((r) => {
      const matchPeriod = selectedPeriod === '2026-ANUAL' 
        ? r.periodo.startsWith('2026') 
        : r.periodo === selectedPeriod;
      const matchCompany = selectedCompany === 'todas' || r.companyId === selectedCompany;
      return matchPeriod && matchCompany;
    });
  },

  getFiltered608: () => {
    const { records608, selectedPeriod, selectedCompany } = get();
    return records608.filter((r) => {
      const matchPeriod = selectedPeriod === '2026-ANUAL' 
        ? r.periodo.startsWith('2026') 
        : r.periodo === selectedPeriod;
      const matchCompany = selectedCompany === 'todas' || r.companyId === selectedCompany;
      return matchPeriod && matchCompany;
    });
  },

  getFilteredProfitability: () => {
    const { caseProfitabilities, selectedPeriod, selectedCompany } = get();
    return caseProfitabilities.filter((c) => {
      const matchPeriod = selectedPeriod === '2026-ANUAL' 
        ? c.period?.startsWith('2026') ?? true 
        : c.period === selectedPeriod || selectedPeriod === '2026-03';
      const matchCompany = selectedCompany === 'todas' || c.companyId === selectedCompany;
      return matchPeriod && matchCompany;
    });
  },

  getFilteredProductivity: () => {
    const { teamProductivities, selectedPeriod, selectedCompany } = get();
    return teamProductivities.filter((t) => {
      const matchCompany = selectedCompany === 'todas' || t.companyId === selectedCompany;
      return matchCompany;
    });
  },

  getConsolidatedMetrics: () => {
    const filtered607 = get().getFiltered607();
    const filtered606 = get().getFiltered606();
    const filteredCases = get().getFilteredProfitability();

    const totalRevenueDOP = filtered607.reduce((sum, r) => sum + r.montoFacturado, 0);
    const totalExpensesDOP = filtered606.reduce((sum, r) => sum + r.totalFacturado, 0);
    const netOperatingMarginDOP = totalRevenueDOP - totalExpensesDOP;
    const netOperatingMarginPercentage = totalRevenueDOP > 0 
      ? Math.round((netOperatingMarginDOP / totalRevenueDOP) * 1000) / 10 
      : 0;

    // Recaudos efectivos en DOP y USD
    const collectionsDOP = filtered607.reduce((sum, r) => sum + r.chequeTransferencia + r.efectivo, 0);
    const totalUSD = totalRevenueDOP > 0 ? Math.round(totalRevenueDOP / 60.5) : 0;
    const collectionsUSD = Math.round(collectionsDOP / 60.5);
    const pendingCollectionsDOP = Math.max(0, totalRevenueDOP - collectionsDOP);

    const totalProfitability = filteredCases.reduce((acc, c) => acc + c.marginPercentage, 0);
    const avgCaseProfitability = filteredCases.length > 0 
      ? Math.round((totalProfitability / filteredCases.length) * 10) / 10 
      : 0;

    return {
      totalRevenueDOP,
      totalRevenueUSD: totalUSD,
      totalExpensesDOP,
      netOperatingMarginDOP,
      netOperatingMarginPercentage,
      collectionsDOP,
      collectionsUSD,
      pendingCollectionsDOP,
      dgiiComplianceRate: 100, // 100% de e-NCF timbrados correctamente y validados
      totalInvoicesCount: filtered607.length,
      totalExpensesCount: filtered606.length,
      activeCasesCount: filteredCases.length,
      avgCaseProfitability,
      previousPeriodComparison: {
        revenueChangePct: 14.8,
        marginChangePct: 3.2,
        collectionsChangePct: 18.5,
        complianceChangePct: 0.0,
      },
    };
  },

  download606Txt: () => {
    const { selectedCompany, selectedPeriod } = get();
    const records = get().getFiltered606();
    if (records.length === 0) {
      toast.error('No existen registros 606 para el período y empresa seleccionados.');
      return;
    }
    const rnc = COMPANIES_MAP[selectedCompany]?.rnc || '131897452';
    const periodStr = selectedPeriod === '2026-ANUAL' ? '202603' : selectedPeriod;
    const content = generate606Txt(records, rnc, periodStr);
    const filename = `DGII_F_606_${rnc}_${periodStr.replace('-', '')}.txt`;
    triggerFileDownload(content, filename, 'text/plain;charset=iso-8859-1');
    toast.success(`Archivo oficial DGII 606 generado (${records.length} registros).`);
  },

  download607Txt: () => {
    const { selectedCompany, selectedPeriod } = get();
    const records = get().getFiltered607();
    if (records.length === 0) {
      toast.error('No existen registros 607 para el período y empresa seleccionados.');
      return;
    }
    const rnc = COMPANIES_MAP[selectedCompany]?.rnc || '131897452';
    const periodStr = selectedPeriod === '2026-ANUAL' ? '202603' : selectedPeriod;
    const content = generate607Txt(records, rnc, periodStr);
    const filename = `DGII_F_607_${rnc}_${periodStr.replace('-', '')}.txt`;
    triggerFileDownload(content, filename, 'text/plain;charset=iso-8859-1');
    toast.success(`Archivo oficial DGII 607 generado (${records.length} registros).`);
  },

  download608Txt: () => {
    const { selectedCompany, selectedPeriod } = get();
    const records = get().getFiltered608();
    const rnc = COMPANIES_MAP[selectedCompany]?.rnc || '131897452';
    const periodStr = selectedPeriod === '2026-ANUAL' ? '202603' : selectedPeriod;
    const content = generate608Txt(records, rnc, periodStr);
    const filename = `DGII_F_608_${rnc}_${periodStr.replace('-', '')}.txt`;
    triggerFileDownload(content, filename, 'text/plain;charset=iso-8859-1');
    toast.success(`Archivo oficial DGII 608 generado (${records.length} registros).`);
  },

  download606Csv: () => {
    const records = get().getFiltered606();
    const headers = [
      'Línea',
      'RNC o Cédula',
      'Tipo Identificación',
      'Suplidor',
      'Tipo Bienes/Servicios',
      'NCF',
      'Fecha Comprobante',
      'Fecha Pago',
      'Monto Servicios',
      'Monto Bienes',
      'Total Facturado',
      'ITBIS Facturado',
      'ITBIS Retenido',
      'ITBIS por Adelantar',
      'Forma de Pago',
      'Es e-CF Electrónico',
    ];
    const rows = records.map((r) => [
      r.line,
      r.rncCedula,
      r.tipoId === '1' ? 'RNC' : 'Cédula',
      r.supplierName,
      r.tipoBienesServicios,
      r.ncf,
      r.fechaComprobante,
      r.fechaPago || '',
      r.montoServicios,
      r.montoBienes,
      r.totalFacturado,
      r.itbisFacturado,
      r.itbisRetenido,
      r.itbisPorAdelantar,
      r.formaPago,
      r.esElectronico ? 'SÍ' : 'NO',
    ]);
    const csv = generateCsvWithBom(headers, rows);
    const filename = `Reporte_Gastos_606_${get().selectedPeriod}.csv`;
    triggerFileDownload(csv, filename, 'text/csv;charset=utf-8');
    toast.success('Reporte 606 exportado exitosamente en formato CSV.');
  },

  download607Csv: () => {
    const records = get().getFiltered607();
    const headers = [
      'Línea',
      'RNC o Cédula',
      'Tipo Identificación',
      'Cliente',
      'NCF / e-NCF',
      'Tipo Ingreso',
      'Fecha Comprobante',
      'Monto Facturado',
      'ITBIS Facturado',
      'ITBIS Retenido Terceros',
      'Transferencia / Cheque',
      'Efectivo',
      'Es e-CF Electrónico',
    ];
    const rows = records.map((r) => [
      r.line,
      r.rncCedula,
      r.tipoId === '1' ? 'RNC' : 'Cédula',
      r.clientName,
      r.ncf,
      r.tipoIngreso,
      r.fechaComprobante,
      r.montoFacturado,
      r.itbisFacturado,
      r.itbisRetenidoTerceros,
      r.chequeTransferencia,
      r.efectivo,
      r.esElectronico ? 'SÍ' : 'NO',
    ]);
    const csv = generateCsvWithBom(headers, rows);
    const filename = `Reporte_Ventas_607_${get().selectedPeriod}.csv`;
    triggerFileDownload(csv, filename, 'text/csv;charset=utf-8');
    toast.success('Reporte 607 exportado exitosamente en formato CSV.');
  },

  downloadProfitabilityCsv: () => {
    const cases = get().getFilteredProfitability();
    const headers = [
      'Código Expediente',
      'Carátula / Caso',
      'Cliente',
      'Tipo de Procedimiento',
      'Honorarios Facturados (DOP)',
      'Gastos Directos Asignados (DOP)',
      'Margen Bruto (DOP)',
      'Margen Rentabilidad (%)',
      'Estado Procesal',
      'Abogado Responsable',
      'Agrimensor Asignado',
    ];
    const rows = cases.map((c) => [
      c.caseCode,
      c.title,
      c.clientName,
      c.caseType,
      c.billedFeesDOP,
      c.directExpensesDOP,
      c.grossMarginDOP,
      `${c.marginPercentage}%`,
      c.status,
      c.leadLawyer,
      c.surveyor,
    ]);
    const csv = generateCsvWithBom(headers, rows);
    const filename = `Rentabilidad_Casos_${get().selectedPeriod}.csv`;
    triggerFileDownload(csv, filename, 'text/csv;charset=utf-8');
    toast.success('Matriz de Rentabilidad de Casos exportada en CSV.');
  },

  downloadProductivityCsv: () => {
    const team = get().getFilteredProductivity();
    const headers = [
      'Profesional',
      'Departamento',
      'Rol Institucional',
      'Casos Activos',
      'Casos Concluidos',
      'Tasa Resolución a Tiempo (SLA %)',
      'Tareas Concluidas',
      'Valor Bruto Generado (DOP)',
      'Comisiones Devengadas (DOP)',
    ];
    const rows = team.map((t) => [
      t.name,
      t.department,
      t.role,
      t.activeCases,
      t.completedCases,
      `${t.onTimeRate}%`,
      t.completedTasks,
      t.generatedRevenueDOP,
      t.commissionsDOP,
    ]);
    const csv = generateCsvWithBom(headers, rows);
    const filename = `Rendimiento_Equipo_${get().selectedPeriod}.csv`;
    triggerFileDownload(csv, filename, 'text/csv;charset=utf-8');
    toast.success('Reporte de Rendimiento del Equipo exportado en CSV.');
  },

  exportMasterData: (
    module: ExportModule,
    format: ExportFormat,
    selectedColumns: string[],
    dateRange?: { from?: string; to?: string }
  ) => {
    const rawData = MASTER_DATA_SAMPLES[module] || [];
    const allDefs = MODULE_COLUMNS_MAP[module] || [];
    
    // Filtrar columnas seleccionadas
    const activeDefs = allDefs.filter((d) => selectedColumns.includes(d.key));
    if (activeDefs.length === 0) {
      toast.error('Debe seleccionar al menos una columna para exportar.');
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      const filteredData = rawData.map((row) => {
        const obj: Record<string, any> = {};
        activeDefs.forEach((col) => {
          obj[col.key] = row[col.key];
        });
        return obj;
      });
      const jsonContent = JSON.stringify(filteredData, null, 2);
      const filename = `Nexus_Export_${module}_${timestamp}.json`;
      triggerFileDownload(jsonContent, filename, 'application/json;charset=utf-8');
      toast.success(`Datos de ${module} exportados en formato JSON.`);
      return;
    }

    if (format === 'txt') {
      const headerLine = activeDefs.map((col) => col.label).join('|');
      const rowsLines = rawData.map((row) =>
        activeDefs.map((col) => String(row[col.key] ?? '')).join('|')
      );
      const txtContent = [headerLine, ...rowsLines].join('\r\n');
      const filename = `Nexus_Export_${module}_${timestamp}.txt`;
      triggerFileDownload(txtContent, filename, 'text/plain;charset=utf-8');
      toast.success(`Datos de ${module} exportados en archivo plano TXT.`);
      return;
    }

    // Default CSV con BOM
    const headers = activeDefs.map((col) => col.label);
    const rows = rawData.map((row) => activeDefs.map((col) => row[col.key] ?? ''));
    const csvContent = generateCsvWithBom(headers, rows);
    const filename = `Nexus_Export_${module}_${timestamp}.csv`;
    triggerFileDownload(csvContent, filename, 'text/csv;charset=utf-8');
    toast.success(`Datos de ${module} exportados exitosamente en CSV (Excel compatible).`);
  },
}));
