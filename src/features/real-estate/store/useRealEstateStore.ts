import { create } from 'zustand';
import {
  Property,
  RealEstateContract,
  RealEstateShowing,
  BrokerageCommission,
  ShowingFeedback,
  sqmToTareas,
  PropertyStatus,
} from '../types';

interface RealEstateState {
  // Entidades
  properties: Property[];
  contracts: RealEstateContract[];
  showings: RealEstateShowing[];
  commissions: BrokerageCommission[];

  // Estados de Modales y Selección
  isPropertyCreateOpen: boolean;
  isPropertyDetailOpen: boolean;
  selectedProperty: Property | null;

  isContractCreateOpen: boolean;
  selectedContract: RealEstateContract | null;

  isShowingCreateOpen: boolean;
  isShowingFeedbackOpen: boolean;
  selectedShowing: RealEstateShowing | null;

  isCommissionCreateOpen: boolean;
  isCommissionPayOpen: boolean;
  selectedCommission: BrokerageCommission | null;

  // Acciones de UI / Modales
  openPropertyCreateModal: () => void;
  closePropertyCreateModal: () => void;
  openPropertyDetailModal: (property: Property) => void;
  closePropertyDetailModal: () => void;

  openContractCreateModal: (defaultPropertyId?: string) => void;
  closeContractCreateModal: () => void;

  openShowingCreateModal: (defaultPropertyId?: string) => void;
  closeShowingCreateModal: () => void;
  openShowingFeedbackModal: (showing: RealEstateShowing) => void;
  closeShowingFeedbackModal: () => void;

  openCommissionCreateModal: (defaultPropertyId?: string) => void;
  closeCommissionCreateModal: () => void;
  openCommissionPayModal: (commission: BrokerageCommission) => void;
  closeCommissionPayModal: () => void;

  // Acciones de Propiedades
  addProperty: (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'landAreaTareas'> & { landAreaTareas?: number }) => Property;
  updateProperty: (id: string, updates: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  setPropertyStatus: (id: string, status: PropertyStatus) => void;

  // Acciones de Contratos
  addContract: (contract: Omit<RealEstateContract, 'id' | 'createdAt'>) => RealEstateContract;
  updateContract: (id: string, updates: Partial<RealEstateContract>) => void;

  // Acciones de Visitas
  addShowing: (showing: Omit<RealEstateShowing, 'id' | 'createdAt'>) => RealEstateShowing;
  updateShowing: (id: string, updates: Partial<RealEstateShowing>) => void;
  recordShowingFeedback: (showingId: string, feedback: ShowingFeedback) => void;

  // Acciones de Comisiones
  addCommission: (commission: Omit<BrokerageCommission, 'id' | 'createdAt' | 'grossCommission' | 'isrWithholdingAmount' | 'netCommission'> & { grossCommission?: number; isrWithholdingAmount?: number; netCommission?: number }) => BrokerageCommission;
  settleCommission: (id: string, paymentData: { paymentDate: string; paymentMethod: 'TRANSFERENCIA' | 'CHEQUE' | 'EFECTIVO'; paymentReference?: string; notes?: string }) => void;
}

const INITIAL_PROPERTIES: Property[] = [];
const INITIAL_CONTRACTS: RealEstateContract[] = [];
const INITIAL_SHOWINGS: RealEstateShowing[] = [];
const INITIAL_COMMISSIONS: BrokerageCommission[] = [];

export const useRealEstateStore = create<RealEstateState>((set, get) => ({
  properties: INITIAL_PROPERTIES,
  contracts: INITIAL_CONTRACTS,
  showings: INITIAL_SHOWINGS,
  commissions: INITIAL_COMMISSIONS,

  // Estados de Modales
  isPropertyCreateOpen: false,
  isPropertyDetailOpen: false,
  selectedProperty: null,

  isContractCreateOpen: false,
  selectedContract: null,

  isShowingCreateOpen: false,
  isShowingFeedbackOpen: false,
  selectedShowing: null,

  isCommissionCreateOpen: false,
  isCommissionPayOpen: false,
  selectedCommission: null,

  // Control de Modales
  openPropertyCreateModal: () => set({ isPropertyCreateOpen: true }),
  closePropertyCreateModal: () => set({ isPropertyCreateOpen: false }),

  openPropertyDetailModal: (property: Property) => 
    set({ isPropertyDetailOpen: true, selectedProperty: property }),
  closePropertyDetailModal: () => 
    set({ isPropertyDetailOpen: false, selectedProperty: null }),

  openContractCreateModal: (defaultPropertyId?: string) => {
    let prop: Property | null = null;
    if (defaultPropertyId) {
      prop = get().properties.find(p => p.id === defaultPropertyId) || null;
    }
    set({ 
      isContractCreateOpen: true,
      selectedProperty: prop || get().selectedProperty
    });
  },
  closeContractCreateModal: () => set({ isContractCreateOpen: false }),

  openShowingCreateModal: (defaultPropertyId?: string) => {
    let prop: Property | null = null;
    if (defaultPropertyId) {
      prop = get().properties.find(p => p.id === defaultPropertyId) || null;
    }
    set({ 
      isShowingCreateOpen: true, 
      selectedProperty: prop || get().selectedProperty 
    });
  },
  closeShowingCreateModal: () => set({ isShowingCreateOpen: false }),

  openShowingFeedbackModal: (showing: RealEstateShowing) => 
    set({ isShowingFeedbackOpen: true, selectedShowing: showing }),
  closeShowingFeedbackModal: () => 
    set({ isShowingFeedbackOpen: false, selectedShowing: null }),

  openCommissionCreateModal: (defaultPropertyId?: string) => {
    let prop: Property | null = null;
    if (defaultPropertyId) {
      prop = get().properties.find(p => p.id === defaultPropertyId) || null;
    }
    set({ 
      isCommissionCreateOpen: true, 
      selectedProperty: prop || get().selectedProperty 
    });
  },
  closeCommissionCreateModal: () => set({ isCommissionCreateOpen: false }),

  openCommissionPayModal: (commission: BrokerageCommission) => 
    set({ isCommissionPayOpen: true, selectedCommission: commission }),
  closeCommissionPayModal: () => 
    set({ isCommissionPayOpen: false, selectedCommission: null }),

  // Acciones de Propiedades
  addProperty: (propertyData) => {
    const newProperty: Property = {
      ...propertyData,
      id: `prop-${Date.now()}`,
      landAreaTareas: propertyData.landAreaTareas ?? sqmToTareas(propertyData.landAreaSqm),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      properties: [newProperty, ...state.properties],
      isPropertyCreateOpen: false,
    }));

    return newProperty;
  },

  updateProperty: (id, updates) => {
    set((state) => ({
      properties: state.properties.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates, updatedAt: new Date().toISOString() };
          if (updates.landAreaSqm !== undefined && updates.landAreaTareas === undefined) {
            updated.landAreaTareas = sqmToTareas(updates.landAreaSqm);
          }
          return updated;
        }
        return p;
      }),
      selectedProperty:
        state.selectedProperty?.id === id
          ? { ...state.selectedProperty, ...updates, updatedAt: new Date().toISOString() }
          : state.selectedProperty,
    }));
  },

  deleteProperty: (id) => {
    set((state) => ({
      properties: state.properties.filter((p) => p.id !== id),
      selectedProperty: state.selectedProperty?.id === id ? null : state.selectedProperty,
      isPropertyDetailOpen: state.selectedProperty?.id === id ? false : state.isPropertyDetailOpen,
    }));
  },

  setPropertyStatus: (id, status) => {
    set((state) => ({
      properties: state.properties.map((p) =>
        p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p
      ),
      selectedProperty:
        state.selectedProperty?.id === id
          ? { ...state.selectedProperty, status, updatedAt: new Date().toISOString() }
          : state.selectedProperty,
    }));
  },

  // Acciones de Contratos
  addContract: (contractData) => {
    const newContract: RealEstateContract = {
      ...contractData,
      id: `ctr-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    // Actualizar estado del inmueble automáticamente según el contrato
    let newStatus: PropertyStatus = 'BAJO_CONTRATO';
    if (contractData.contractType === 'ALQUILER_RESIDENCIAL' || contractData.contractType === 'ALQUILER_COMERCIAL') {
      newStatus = 'ALQUILADA';
    } else if (contractData.contractType === 'VENTA_DEFINITIVA') {
      newStatus = 'VENDIDA';
    } else if (contractData.contractType === 'PROMESA_VENTA') {
      newStatus = 'BAJO_CONTRATO';
    }

    set((state) => ({
      contracts: [newContract, ...state.contracts],
      properties: state.properties.map((p) =>
        p.id === contractData.propertyId ? { ...p, status: newStatus, updatedAt: new Date().toISOString() } : p
      ),
      isContractCreateOpen: false,
    }));

    return newContract;
  },

  updateContract: (id, updates) => {
    set((state) => ({
      contracts: state.contracts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      selectedContract:
        state.selectedContract?.id === id ? { ...state.selectedContract, ...updates } : state.selectedContract,
    }));
  },

  // Acciones de Visitas
  addShowing: (showingData) => {
    const newShowing: RealEstateShowing = {
      ...showingData,
      id: `show-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      showings: [newShowing, ...state.showings],
      isShowingCreateOpen: false,
    }));

    return newShowing;
  },

  updateShowing: (id, updates) => {
    set((state) => ({
      showings: state.showings.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      selectedShowing:
        state.selectedShowing?.id === id ? { ...state.selectedShowing, ...updates } : state.selectedShowing,
    }));
  },

  recordShowingFeedback: (showingId, feedback) => {
    set((state) => ({
      showings: state.showings.map((s) =>
        s.id === showingId
          ? {
              ...s,
              status: 'REALIZADA',
              feedback,
            }
          : s
      ),
      isShowingFeedbackOpen: false,
      selectedShowing: null,
    }));
  },

  // Acciones de Comisiones
  addCommission: (commissionData) => {
    const gross = commissionData.grossCommission ?? 
      (commissionData.transactionAmount * (commissionData.commissionPercent / 100));
    const isr = commissionData.isrWithholdingAmount ?? (gross * 0.10);
    const net = commissionData.netCommission ?? (gross - isr);

    const newCommission: BrokerageCommission = {
      ...commissionData,
      id: `com-${Date.now()}`,
      grossCommission: Number(gross.toFixed(2)),
      isrWithholdingRate: 0.10,
      isrWithholdingAmount: Number(isr.toFixed(2)),
      netCommission: Number(net.toFixed(2)),
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      commissions: [newCommission, ...state.commissions],
      isCommissionCreateOpen: false,
    }));

    return newCommission;
  },

  settleCommission: (id, paymentData) => {
    set((state) => ({
      commissions: state.commissions.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'PAGADA',
              paymentDate: paymentData.paymentDate,
              paymentMethod: paymentData.paymentMethod,
              paymentReference: paymentData.paymentReference,
              notes: paymentData.notes ? `${c.notes ? c.notes + ' | ' : ''}${paymentData.notes}` : c.notes,
            }
          : c
      ),
      isCommissionPayOpen: false,
      selectedCommission: null,
    }));
  },
}));
