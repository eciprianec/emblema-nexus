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

const INITIAL_PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    code: 'PROP-SD-001',
    title: 'Penthouse de Lujo en Torre Residencial Piantini',
    description: 'Impresionante penthouse dúplex en el corazón de Piantini. Vistas panorámicas ininterrumpidas a la ciudad, acabados en mármol italiano, cocina modular europea con isla, terraza privada con jacuzzi y preinstalación para paneles solares. Edificio exclusivo con solo dos apartamentos por piso.',
    propertyType: 'PENTHOUSE',
    operationType: 'VENTA',
    status: 'DISPONIBLE',
    currency: 'USD',
    priceSale: 780000,
    maintenanceFee: 28000,
    maintenanceCurrency: 'DOP',
    bedrooms: 4,
    bathrooms: 4,
    halfBathrooms: 1,
    parkingSpaces: 4,
    levels: 2,
    floorNumber: 14,
    builtAreaSqm: 480,
    landAreaSqm: 0,
    landAreaTareas: 0,
    yearBuilt: 2023,
    province: 'Distrito Nacional',
    municipality: 'Santo Domingo',
    sector: 'Piantini',
    address: 'Calle Federico Geraldino esq. David Ben Gurión, Torre Horizon Piantini',
    cadastralReference: {
      parcelDesignation: 'Parcela 15-Ref (Porción B)',
      cadastralDistrict: '01',
      titleNumber: '0100234589',
      surveyParcelId: 'parc-1',
    },
    caseId: 'LEG-2024-0001',
    amenities: [
      'Piscina Infinity',
      'Gimnasio Equipado',
      '2 Ascensores Privados',
      'Planta Eléctrica Full',
      'Seguridad 24/7',
      'Lobby Climatizado',
      'Gas Común',
      'Balcón Terraza',
      'Locker',
      'Cuarto de Servicio con Baño',
      'Portón Eléctrico',
      'Jacuzzi Privado'
    ],
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
    ],
    isExclusive: true,
    commissionPercent: 5.0,
    owner: {
      name: 'Dr. Alejandro Vicini Morales',
      phone: '+1 (809) 555-0142',
      email: 'alejandro.vicini@inversionesvicini.com',
      identificationType: 'CEDULA',
      identificationNumber: '001-0987654-3',
    },
    listingAgent: {
      id: 'agent-1',
      name: 'Lic. Claudia Reynoso',
      email: 'creynoso@emblemanexus.com',
      phone: '+1 (809) 555-8821',
    },
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-03-10T14:30:00Z',
  },
  {
    id: 'prop-2',
    code: 'PROP-SD-002',
    title: 'Apartamento Familiar con Vista al Parque Mirador Sur',
    description: 'Espacioso apartamento con espectacular iluminación natural y ventilación cruzada frente a la avenida Anacaona. Pisos de mármol, amplio balcón con vista al parque Mirador Sur, cocina integrada de diseño y amenidades tipo club social.',
    propertyType: 'APARTAMENTO',
    operationType: 'ALQUILER',
    status: 'ALQUILADA',
    currency: 'USD',
    priceRent: 2500,
    priceSale: 340000,
    maintenanceFee: 14500,
    maintenanceCurrency: 'DOP',
    bedrooms: 3,
    bathrooms: 3,
    halfBathrooms: 1,
    parkingSpaces: 2,
    levels: 1,
    floorNumber: 8,
    builtAreaSqm: 215,
    landAreaSqm: 0,
    landAreaTareas: 0,
    yearBuilt: 2022,
    province: 'Distrito Nacional',
    municipality: 'Santo Domingo',
    sector: 'Bella Vista Sur',
    address: 'Av. Sarasota No. 84, Torre Mirador Heights',
    cadastralReference: {
      parcelDesignation: 'Parcela 48-B',
      cadastralDistrict: '01',
      titleNumber: '0100876412',
    },
    amenities: [
      'Piscina',
      'Gimnasio',
      'Ascensor',
      'Planta Eléctrica Full',
      'Seguridad 24/7',
      'Lobby Climatizado',
      'Gas Común',
      'Balcón',
      'Cuarto de Servicio con Baño',
      'Área Infantil'
    ],
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80'
    ],
    isExclusive: false,
    commissionPercent: 8.33, // 1 mes de renta en alquiler
    owner: {
      name: 'Licda. Mercedes Castillo',
      phone: '+1 (809) 555-0391',
      email: 'mcastillo@grupocastillo.do',
      identificationType: 'CEDULA',
      identificationNumber: '001-1234567-8',
    },
    listingAgent: {
      id: 'agent-2',
      name: 'Lic. Marcos Santana',
      email: 'msantana@emblemanexus.com',
      phone: '+1 (829) 555-4412',
    },
    createdAt: '2026-01-20T11:00:00Z',
    updatedAt: '2026-03-01T09:00:00Z',
  },
  {
    id: 'prop-3',
    code: 'PROP-SD-003',
    title: 'Oficina Corporativa en Torre Empresarial Naco',
    description: 'Piso corporativo completamente acondicionado con divisiones en cristal templado, recepción de lujo, sala de juntas ejecutiva para 14 personas, cableado estructurado categoría 6A, climatización central VRF independiente y 4 parqueos soterrados.',
    propertyType: 'OFICINA',
    operationType: 'ALQUILER',
    status: 'BAJO_CONTRATO',
    currency: 'USD',
    priceRent: 3800,
    maintenanceFee: 22000,
    maintenanceCurrency: 'DOP',
    bedrooms: 0,
    bathrooms: 2,
    halfBathrooms: 0,
    parkingSpaces: 4,
    levels: 1,
    floorNumber: 6,
    builtAreaSqm: 180,
    landAreaSqm: 0,
    landAreaTareas: 0,
    yearBuilt: 2021,
    province: 'Distrito Nacional',
    municipality: 'Santo Domingo',
    sector: 'Naco',
    address: 'Calle Fantino Falco No. 42, Torre Empresarial Naco Prime',
    cadastralReference: {
      parcelDesignation: 'Parcela 120-DC1',
      cadastralDistrict: '01',
      titleNumber: '0100452399',
    },
    amenities: [
      '3 Ascensores de Alta Velocidad',
      'Planta Eléctrica Full',
      'Seguridad 24/7',
      'Lobby de Recepción con Control de Acceso',
      'Salón de Conferencias Común',
      'Fibra Óptica Dedicada',
      'Cafetería Corporativa',
      'Parqueos de Visitas'
    ],
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80'
    ],
    isExclusive: true,
    commissionPercent: 10.0,
    owner: {
      name: 'Inversiones Inmobiliarias Cibao SAS',
      phone: '+1 (809) 555-7700',
      email: 'operaciones@cibaoinversiones.com.do',
      identificationType: 'RNC',
      identificationNumber: '1-31-89745-2',
    },
    listingAgent: {
      id: 'agent-1',
      name: 'Lic. Claudia Reynoso',
      email: 'creynoso@emblemanexus.com',
      phone: '+1 (809) 555-8821',
    },
    createdAt: '2026-02-01T15:00:00Z',
    updatedAt: '2026-03-12T16:00:00Z',
  },
  {
    id: 'prop-4',
    code: 'PROP-PC-004',
    title: 'Villa Tropical de Lujo frente al Campo de Golf Corales',
    description: 'Majestuosa villa de arquitectura caribeña contemporánea ubicada en la comunidad más codiciada de Punta Cana Resort & Club. Vista directa a los fairways del campo de golf PGA Corales, piscina desbordante con bar húmedo, gazebo con cocina exterior, techos a doble altura de cana sintética ignífuga y acceso privado al club de playa.',
    propertyType: 'VILLA',
    operationType: 'VENTA',
    status: 'RESERVADA',
    currency: 'USD',
    priceSale: 2450000,
    maintenanceFee: 1200,
    maintenanceCurrency: 'USD',
    bedrooms: 5,
    bathrooms: 6,
    halfBathrooms: 1,
    parkingSpaces: 6,
    levels: 2,
    floorNumber: 1,
    builtAreaSqm: 720,
    landAreaSqm: 2200,
    landAreaTareas: sqmToTareas(2200), // 3.50 Tareas dominicanas
    yearBuilt: 2024,
    province: 'La Altagracia',
    municipality: 'Higüey / Verón',
    sector: 'Punta Cana Resort',
    address: 'Corales Golf Residences Calle 3, Villa No. 18',
    cadastralReference: {
      parcelDesignation: 'Parcela 82-A (Solar 18 Manzana C)',
      cadastralDistrict: '03',
      titleNumber: '0300998124',
      surveyParcelId: 'parc-2',
    },
    caseId: 'LEG-2024-0001',
    amenities: [
      'Piscina Privada Desbordante',
      'Jacuzzi Climatizado',
      'Vista al Campo de Golf Corales',
      'Gazebo y Terraza Techada',
      'Seguridad Privada 24/7',
      'Cuarto de Servicio Doble',
      'Cocina Fría y Cocina Caliente',
      'Acceso a Playa Privada',
      'Cancha de Tenis en Comunidad',
      'Helipuerto Cercano'
    ],
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
    ],
    isExclusive: true,
    commissionPercent: 5.0,
    owner: {
      name: 'Punta Cana Development Group Corp',
      phone: '+1 (809) 555-9000',
      email: 'legal@pcdgroup.com',
      identificationType: 'RNC',
      identificationNumber: '1-01-99234-1',
    },
    listingAgent: {
      id: 'agent-1',
      name: 'Lic. Claudia Reynoso',
      email: 'creynoso@emblemanexus.com',
      phone: '+1 (809) 555-8821',
    },
    createdAt: '2026-02-10T09:30:00Z',
    updatedAt: '2026-03-15T11:45:00Z',
  },
  {
    id: 'prop-5',
    code: 'PROP-LR-005',
    title: 'Exclusiva Residencia con Muelle Privado en Marina Casa de Campo',
    description: 'Propiedad insignia en Casa de Campo con atraque privado para embarcaciones de hasta 70 pies. Arquitectura de vanguardia diseñada por renombrado arquitecto internacional, amplios ventanales corredizos que integran el interior con la terraza y la marina.',
    propertyType: 'CASA',
    operationType: 'VENTA',
    status: 'DISPONIBLE',
    currency: 'USD',
    priceSale: 3800000,
    maintenanceFee: 1800,
    maintenanceCurrency: 'USD',
    bedrooms: 6,
    bathrooms: 7,
    halfBathrooms: 2,
    parkingSpaces: 6,
    levels: 2,
    floorNumber: 1,
    builtAreaSqm: 950,
    landAreaSqm: 2800,
    landAreaTareas: sqmToTareas(2800), // 4.45 Tareas
    yearBuilt: 2023,
    province: 'La Romana',
    municipality: 'La Romana',
    sector: 'Casa de Campo',
    address: 'Marina de Chavón Calle Ribera del Río No. 12',
    cadastralReference: {
      parcelDesignation: 'Parcela 104-Ref-Marina',
      cadastralDistrict: '06',
      titleNumber: '0600128945',
    },
    amenities: [
      'Muelle Privado para Yate',
      'Piscina Infinita',
      'Jacuzzi',
      'Cancha de Tenis',
      'Planta Eléctrica Propia 100kVA',
      'Seguridad Privada Costasur',
      'Cava de Vinos Climatizada',
      'Cuarto de Conductores y Servicio',
      'Acceso a Club Náutico'
    ],
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80'
    ],
    isExclusive: true,
    commissionPercent: 5.0,
    owner: {
      name: 'Don Bernardo De Moya',
      phone: '+1 (809) 555-1122',
      email: 'bmoya@demoyaholdings.com',
      identificationType: 'CEDULA',
      identificationNumber: '001-0556677-9',
    },
    listingAgent: {
      id: 'agent-2',
      name: 'Lic. Marcos Santana',
      email: 'msantana@emblemanexus.com',
      phone: '+1 (829) 555-4412',
    },
    createdAt: '2026-02-15T14:00:00Z',
    updatedAt: '2026-03-05T10:00:00Z',
  },
  {
    id: 'prop-6',
    code: 'PROP-SD-006',
    title: 'Residencia Clásica con Gran Jardín y Piscina en Arroyo Hondo Viejo',
    description: 'Elegante residencia unifamiliar con amplio solar arbolado en calle cerrada y tranquila de Arroyo Hondo Viejo. Construcción robusta en hormigón armado, maderas nobles de caoba centenaria, piscina privada, terraza techada y pozo tubular de agua con sistema de purificación.',
    propertyType: 'CASA',
    operationType: 'VENTA',
    status: 'DISPONIBLE',
    currency: 'DOP',
    priceSale: 48000000, // ~USD 800,000
    maintenanceFee: 6500,
    maintenanceCurrency: 'DOP',
    bedrooms: 4,
    bathrooms: 4,
    halfBathrooms: 1,
    parkingSpaces: 5,
    levels: 2,
    floorNumber: 1,
    builtAreaSqm: 550,
    landAreaSqm: 1257.72,
    landAreaTareas: sqmToTareas(1257.72), // Exactamente 2.00 Tareas dominicanas
    yearBuilt: 2018,
    province: 'Distrito Nacional',
    municipality: 'Santo Domingo',
    sector: 'Arroyo Hondo',
    address: 'Calle Camino Chiquito No. 25, Arroyo Hondo Viejo',
    cadastralReference: {
      parcelDesignation: 'Parcela 19-Ref',
      cadastralDistrict: '01',
      titleNumber: '0100776512',
    },
    amenities: [
      'Piscina',
      'Jardín Extenso con Árboles Frutales',
      'Terraza Techada',
      'Planta Eléctrica Full',
      'Portón Eléctrico',
      'Pozo de Agua Tubular con Filtro',
      'Alarma Perimetral',
      'Estar Familiar Independiente',
      'Cuarto de Servicio Doble'
    ],
    images: [
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80'
    ],
    isExclusive: false,
    commissionPercent: 5.0,
    owner: {
      name: 'Familia Morales Henríquez',
      phone: '+1 (809) 555-3344',
      email: 'morales.henriquez@claro.net.do',
      identificationType: 'CEDULA',
      identificationNumber: '001-0112233-4',
    },
    listingAgent: {
      id: 'agent-1',
      name: 'Lic. Claudia Reynoso',
      email: 'creynoso@emblemanexus.com',
      phone: '+1 (809) 555-8821',
    },
    createdAt: '2026-02-20T16:00:00Z',
    updatedAt: '2026-03-14T12:00:00Z',
  },
  {
    id: 'prop-7',
    code: 'PROP-SAM-007',
    title: 'Solar con Vocación Turística y Vista al Mar en Las Terrenas',
    description: 'Terreno privilegiado sobre colina con inclinación moderada y vista panorámica 180° a Playa Cosón y Playa Bonita. Ideal para desarrollo de complejo de villas turísticas eco-boutique o residencia campestre de lujo. Acceso asfaltado hasta el límite de propiedad y punto de conexión eléctrica.',
    propertyType: 'SOLAR',
    operationType: 'VENTA',
    status: 'DISPONIBLE',
    currency: 'USD',
    priceSale: 650000,
    bedrooms: 0,
    bathrooms: 0,
    parkingSpaces: 0,
    builtAreaSqm: 0,
    landAreaSqm: 6288.60,
    landAreaTareas: sqmToTareas(6288.60), // Exactamente 10.00 Tareas dominicanas
    province: 'Samaná',
    municipality: 'Las Terrenas',
    sector: 'Cosón',
    address: 'Loma Esperanza, Carretera Nueva Samaná - Las Terrenas Km 8',
    cadastralReference: {
      parcelDesignation: 'Parcela 45-B-1',
      cadastralDistrict: '07',
      titleNumber: '0700334455',
    },
    amenities: [
      'Vista Panorámica al Océano',
      'Deslinde Aprobado por DNMC',
      'Certificado de Título al Día',
      'Acceso Pavimentado',
      'Punto de Conexión de Energía Eléctrica',
      'Factibilidad de Agua Potable',
      'Apto para Proyecto Turístico'
    ],
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80'
    ],
    isExclusive: true,
    commissionPercent: 6.0,
    owner: {
      name: 'Desarrollos Turísticos del Nordeste SRL',
      phone: '+1 (809) 555-8899',
      email: 'info@nordestedesarrollos.com',
      identificationType: 'RNC',
      identificationNumber: '1-32-11452-9',
    },
    listingAgent: {
      id: 'agent-2',
      name: 'Lic. Marcos Santana',
      email: 'msantana@emblemanexus.com',
      phone: '+1 (829) 555-4412',
    },
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-18T10:00:00Z',
  },
  {
    id: 'prop-8',
    code: 'PROP-SD-008',
    title: 'Local Comercial a Nivel de Calle en Avenida Principal Piantini',
    description: 'Extraordinario local comercial con vitrina acristalada de 14 metros lineales sobre vía de alto tránsito vehicular y peatonal en Piantini. Doble altura, área de mezanine con oficinas administrativas, acometida de gas comercial y 6 parqueos frontales exclusivos.',
    propertyType: 'COMERCIAL',
    operationType: 'ALQUILER',
    status: 'DISPONIBLE',
    currency: 'USD',
    priceRent: 5500,
    maintenanceFee: 35000,
    maintenanceCurrency: 'DOP',
    bedrooms: 0,
    bathrooms: 3,
    halfBathrooms: 0,
    parkingSpaces: 6,
    levels: 2,
    floorNumber: 1,
    builtAreaSqm: 260,
    landAreaSqm: 0,
    landAreaTareas: 0,
    yearBuilt: 2020,
    province: 'Distrito Nacional',
    municipality: 'Santo Domingo',
    sector: 'Piantini',
    address: 'Av. Abraham Lincoln esq. Max Henríquez Ureña',
    cadastralReference: {
      parcelDesignation: 'Parcela 10-A (Local 101)',
      cadastralDistrict: '01',
      titleNumber: '0100552190',
    },
    amenities: [
      'Vitrina Comercial Acristalada',
      '6 Parqueos Exclusivos para Clientes',
      'Planta Eléctrica Full',
      'Seguridad 24/7',
      'Cisterna de Alta Capacidad',
      'Acometida para Climatización Central',
      'Mezanine Acondicionado',
      'Detector de Incendios y Rociadores'
    ],
    images: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
    ],
    isExclusive: true,
    commissionPercent: 8.33,
    owner: {
      name: 'Grupo Corporativo Lincoln SRL',
      phone: '+1 (809) 555-6677',
      email: 'arrendamientos@grupolincoln.com.do',
      identificationType: 'RNC',
      identificationNumber: '1-01-44781-3',
    },
    listingAgent: {
      id: 'agent-1',
      name: 'Lic. Claudia Reynoso',
      email: 'creynoso@emblemanexus.com',
      phone: '+1 (809) 555-8821',
    },
    createdAt: '2026-03-02T10:00:00Z',
    updatedAt: '2026-03-16T15:00:00Z',
  }
];

const INITIAL_CONTRACTS: RealEstateContract[] = [
  {
    id: 'ctr-1',
    contractNumber: 'CTR-INM-2026-001',
    propertyId: 'prop-2',
    propertyCode: 'PROP-SD-002',
    propertyTitle: 'Apartamento Familiar con Vista al Parque Mirador Sur',
    contractType: 'ALQUILER_RESIDENCIAL',
    status: 'VIGENTE',
    currency: 'USD',
    amount: 2500,
    depositMonths: 2,
    advanceMonths: 1,
    depositAmountTotal: 7500, // 2 depósitos (5000) + 1 adelantado (2500)
    paymentDayOfMonth: 5,
    graceDays: 5,
    lateFeePercent: 5.0,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    clientRole: 'INQUILINO',
    client: {
      name: 'Ing. Carlos Mendoza Pimentel',
      identificationNumber: '001-1892341-2',
      phone: '+1 (809) 555-9988',
      email: 'carlos.mendoza@telecom.do',
    },
    ownerName: 'Licda. Mercedes Castillo',
    agentName: 'Lic. Marcos Santana',
    notaryName: 'Dr. Fausto Pichardo (Matrícula Notarial 4821)',
    notes: 'Depósitos de garantía bajo custodia fiduciaria. Pago mediante transferencia bancaria Banco Popular.',
    createdAt: '2025-12-28T10:00:00Z',
  },
  {
    id: 'ctr-2',
    contractNumber: 'CTR-INM-2026-002',
    propertyId: 'prop-3',
    propertyCode: 'PROP-SD-003',
    propertyTitle: 'Oficina Corporativa en Torre Empresarial Naco',
    contractType: 'ALQUILER_COMERCIAL',
    status: 'VIGENTE',
    currency: 'USD',
    amount: 3800,
    depositMonths: 3,
    advanceMonths: 1,
    depositAmountTotal: 15200,
    paymentDayOfMonth: 1,
    graceDays: 5,
    lateFeePercent: 10.0,
    startDate: '2026-02-01',
    endDate: '2028-01-31',
    clientRole: 'INQUILINO',
    client: {
      name: 'Consorcio Jurídico del Caribe SRL',
      identificationNumber: '1-31-09822-4',
      phone: '+1 (809) 555-4500',
      email: 'administracion@cjuridicocaribe.com',
    },
    ownerName: 'Inversiones Inmobiliarias Cibao SAS',
    agentName: 'Lic. Claudia Reynoso',
    notaryName: 'Licda. Ana Sofía Peña (Matrícula Notarial 3290)',
    notes: 'Contrato comercial a 2 años con cláusula de ajuste anual por inflación IPC Banco Central.',
    createdAt: '2026-01-25T14:30:00Z',
  },
  {
    id: 'ctr-3',
    contractNumber: 'CTR-INM-2026-003',
    propertyId: 'prop-4',
    propertyCode: 'PROP-PC-004',
    propertyTitle: 'Villa Tropical de Lujo frente al Campo de Golf Corales',
    contractType: 'PROMESA_VENTA',
    status: 'VIGENTE',
    currency: 'USD',
    amount: 2450000,
    depositMonths: 0,
    advanceMonths: 0,
    depositAmountTotal: 245000, // 10% arras / separación legal
    paymentDayOfMonth: 15,
    graceDays: 10,
    lateFeePercent: 2.0,
    startDate: '2026-03-01',
    endDate: '2026-05-30', // Plazo para cierre definitivo y saldo ante Registro de Títulos
    clientRole: 'COMPRADOR',
    client: {
      name: 'Jean-Luc Dupont',
      identificationNumber: 'PAS-FR-8899201',
      phone: '+33 6 12 34 56 78',
      email: 'jl.dupont@investments-caribbean.fr',
    },
    ownerName: 'Punta Cana Development Group Corp',
    agentName: 'Lic. Claudia Reynoso',
    notaryName: 'Lic. Rafael Valenzuela (Matrícula Notarial 1512)',
    caseId: 'LEG-2024-0001',
    notes: 'Vinculado al expediente de debida diligencia y traspaso inmobiliario LEG-2024-0001. Pago de 10% en cuenta escrow.',
    createdAt: '2026-03-01T16:00:00Z',
  },
  {
    id: 'ctr-4',
    contractNumber: 'CTR-INM-2025-089',
    propertyId: 'prop-1',
    propertyCode: 'PROP-SD-001',
    propertyTitle: 'Penthouse de Lujo en Torre Residencial Piantini',
    contractType: 'ALQUILER_RESIDENCIAL',
    status: 'POR_VENCER',
    currency: 'USD',
    amount: 4500,
    depositMonths: 2,
    advanceMonths: 1,
    depositAmountTotal: 13500,
    paymentDayOfMonth: 5,
    graceDays: 5,
    lateFeePercent: 5.0,
    startDate: '2025-04-15',
    endDate: '2026-04-15', // Vence en pocos días
    clientRole: 'INQUILINO',
    client: {
      name: 'Lic. Fernando Morales Bisonó',
      identificationNumber: '001-0998811-0',
      phone: '+1 (809) 555-2233',
      email: 'fmorales@holdingfinancial.com',
    },
    ownerName: 'Dr. Alejandro Vicini Morales',
    agentName: 'Lic. Claudia Reynoso',
    notaryName: 'Dr. Fausto Pichardo (Matrícula Notarial 4821)',
    notes: 'Aviso de vencimiento y renovación notificado al inquilino con 30 días de anticipación.',
    createdAt: '2025-04-10T12:00:00Z',
  }
];

const INITIAL_SHOWINGS: RealEstateShowing[] = [
  {
    id: 'show-1',
    propertyId: 'prop-1',
    propertyCode: 'PROP-SD-001',
    propertyTitle: 'Penthouse de Lujo en Torre Residencial Piantini',
    date: '2026-03-18',
    time: '15:30',
    status: 'REALIZADA',
    prospectName: 'Ing. Roberto Tavárez',
    prospectPhone: '+1 (809) 555-7123',
    prospectEmail: 'rtavarez@constructoratavarez.com',
    assignedAgent: 'Lic. Claudia Reynoso',
    feedback: {
      interestLevel: 'ALTO',
      observations: 'El cliente quedó encantado con la vista y la distribución del segundo nivel. Consultó detalles sobre el reglamento de copropiedad respecto a paneles solares.',
      hasOffer: true,
      offeredAmount: 740000,
      offeredCurrency: 'USD',
      feedbackDate: '2026-03-18T17:00:00Z',
    },
    createdAt: '2026-03-14T09:00:00Z',
  },
  {
    id: 'show-2',
    propertyId: 'prop-4',
    propertyCode: 'PROP-PC-004',
    propertyTitle: 'Villa Tropical de Lujo frente al Campo de Golf Corales',
    date: '2026-03-15',
    time: '11:00',
    status: 'REALIZADA',
    prospectName: 'Jean-Luc Dupont',
    prospectPhone: '+33 6 12 34 56 78',
    prospectEmail: 'jl.dupont@investments-caribbean.fr',
    assignedAgent: 'Lic. Claudia Reynoso',
    feedback: {
      interestLevel: 'ALTO',
      observations: 'Inspección técnica satisfactoria. Se procedió a la firma de promesa de venta CTR-INM-2026-003.',
      hasOffer: true,
      offeredAmount: 2450000,
      offeredCurrency: 'USD',
      feedbackDate: '2026-03-15T13:30:00Z',
    },
    createdAt: '2026-03-10T10:00:00Z',
  },
  {
    id: 'show-3',
    propertyId: 'prop-2',
    propertyCode: 'PROP-SD-002',
    propertyTitle: 'Apartamento Familiar con Vista al Parque Mirador Sur',
    date: '2026-03-24',
    time: '10:30',
    status: 'PROGRAMADA',
    prospectName: 'Lic. Marianne Gómez',
    prospectPhone: '+1 (829) 555-3311',
    prospectEmail: 'mgomez@bancolocal.com',
    assignedAgent: 'Lic. Marcos Santana',
    createdAt: '2026-03-21T14:20:00Z',
  },
  {
    id: 'show-4',
    propertyId: 'prop-5',
    propertyCode: 'PROP-LR-005',
    propertyTitle: 'Exclusiva Residencia con Muelle Privado en Marina Casa de Campo',
    date: '2026-03-26',
    time: '14:00',
    status: 'PROGRAMADA',
    prospectName: 'Dra. Elena Rostova',
    prospectPhone: '+1 (305) 555-8822',
    prospectEmail: 'erostova@rostovacapital.com',
    assignedAgent: 'Lic. Marcos Santana',
    createdAt: '2026-03-20T16:45:00Z',
  },
  {
    id: 'show-5',
    propertyId: 'prop-8',
    propertyCode: 'PROP-SD-008',
    propertyTitle: 'Local Comercial a Nivel de Calle en Avenida Principal Piantini',
    date: '2026-03-12',
    time: '16:00',
    status: 'REALIZADA',
    prospectName: 'Lic. Arturo Peña (Banco Múltiple del Este)',
    prospectPhone: '+1 (809) 555-9011',
    prospectEmail: 'apena@bancoeste.com.do',
    assignedAgent: 'Lic. Claudia Reynoso',
    feedback: {
      interestLevel: 'MEDIO',
      observations: 'El local cumple con los requerimientos espaciales pero la gerencia evalúa si los 6 parqueos frontales son suficientes para el flujo bancario en horas pico.',
      hasOffer: false,
      feedbackDate: '2026-03-12T17:30:00Z',
    },
    createdAt: '2026-03-08T11:00:00Z',
  }
];

const INITIAL_COMMISSIONS: BrokerageCommission[] = [
  {
    id: 'com-1',
    commissionNumber: 'COM-2026-001',
    propertyId: 'prop-3',
    propertyCode: 'PROP-SD-003',
    propertyTitle: 'Oficina Corporativa en Torre Empresarial Naco',
    contractId: 'ctr-2',
    contractNumber: 'CTR-INM-2026-002',
    operationType: 'ALQUILER',
    currency: 'USD',
    transactionAmount: 45600, // Canon anual (3,800 x 12)
    commissionPercent: 8.33,  // 1 mes de renta pactado = USD 3,800
    grossCommission: 3800,
    isrWithholdingRate: 0.10, // 10% Retención ISR DGII
    isrWithholdingAmount: 380,
    netCommission: 3420,
    agentName: 'Lic. Claudia Reynoso',
    agentRncOrCedula: '001-1928374-5',
    status: 'PAGADA',
    paymentDate: '2026-02-05',
    paymentMethod: 'TRANSFERENCIA',
    paymentReference: 'BPD-TRF-9823412',
    notes: 'Liquidación con retención del 10% de ISR reportada en comprobante de retención B16.',
    createdAt: '2026-02-01T15:00:00Z',
  },
  {
    id: 'com-2',
    commissionNumber: 'COM-2026-002',
    propertyId: 'prop-2',
    propertyCode: 'PROP-SD-002',
    propertyTitle: 'Apartamento Familiar con Vista al Parque Mirador Sur',
    contractId: 'ctr-1',
    contractNumber: 'CTR-INM-2026-001',
    operationType: 'ALQUILER',
    currency: 'USD',
    transactionAmount: 30000, // Anual (2,500 x 12)
    commissionPercent: 8.33,  // 1 mes = USD 2,500
    grossCommission: 2500,
    isrWithholdingRate: 0.10,
    isrWithholdingAmount: 250,
    netCommission: 2250,
    agentName: 'Lic. Marcos Santana',
    agentRncOrCedula: '001-0876543-2',
    status: 'PAGADA',
    paymentDate: '2026-01-10',
    paymentMethod: 'TRANSFERENCIA',
    paymentReference: 'BHD-TRF-1102948',
    notes: 'Comisión pagada tras firma y recepción de los 3 meses acordados.',
    createdAt: '2026-01-02T11:00:00Z',
  },
  {
    id: 'com-3',
    commissionNumber: 'COM-2026-003',
    propertyId: 'prop-4',
    propertyCode: 'PROP-PC-004',
    propertyTitle: 'Villa Tropical de Lujo frente al Campo de Golf Corales',
    contractId: 'ctr-3',
    contractNumber: 'CTR-INM-2026-003',
    operationType: 'VENTA',
    currency: 'USD',
    transactionAmount: 2450000,
    commissionPercent: 5.0,
    grossCommission: 122500, // 5% de 2,450,000
    isrWithholdingRate: 0.10,
    isrWithholdingAmount: 12250,
    netCommission: 110250,
    agentName: 'Lic. Claudia Reynoso',
    agentRncOrCedula: '001-1928374-5',
    status: 'PENDIENTE',
    notes: 'Comisión devengada por Promesa de Venta. Se liquidará al firmar contrato definitivo y entrega en Registro de Títulos.',
    createdAt: '2026-03-02T10:00:00Z',
  },
  {
    id: 'com-4',
    commissionNumber: 'COM-2026-004',
    propertyId: 'prop-8',
    propertyCode: 'PROP-SD-008',
    propertyTitle: 'Local Comercial a Nivel de Calle en Avenida Principal Piantini',
    operationType: 'ALQUILER',
    currency: 'USD',
    transactionAmount: 66000, // Anual (5,500 x 12)
    commissionPercent: 8.33,
    grossCommission: 5500,
    isrWithholdingRate: 0.10,
    isrWithholdingAmount: 550,
    netCommission: 4950,
    agentName: 'Lic. Marcos Santana',
    agentRncOrCedula: '001-0876543-2',
    status: 'PENDIENTE',
    notes: 'En proceso de cierre con prospecto interesado.',
    createdAt: '2026-03-15T14:00:00Z',
  }
];

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
