/**
 * Utilidades Geodésicas y Topográficas para Agrimensura y Catastro en la República Dominicana
 * 
 * - Zona UTM: 19 Norte (EPSG: 32619)
 * - Elipsoide / Datum: WGS84
 * - Meridiano Central: 69° Oeste (-69.0°)
 * - Falso Este: 500,000.0 m
 * - Falso Norte: 0.0 m
 * - Factor de escala central (k0): 0.9996
 * - Factor de conversión: 1 Tarea Dominicana = 628.86 m²
 */

// Constantes geodésicas WGS84
const WGS84_A = 6378137.0; // Semieje mayor (m)
const WGS84_F = 1 / 298.257223563; // Aplanamiento
const WGS84_B = WGS84_A * (1 - WGS84_F); // Semieje menor (m)
const WGS84_E2 = 2 * WGS84_F - WGS84_F * WGS84_F; // Primera excentricidad al cuadrado
const WGS84_E_PRIME2 = WGS84_E2 / (1 - WGS84_E2); // Segunda excentricidad al cuadrado
const UTM_K0 = 0.9996; // Factor de escala en el meridiano central
const UTM_CENTRAL_MERIDIAN_DEG = -69.0; // Meridiano central de la Zona 19N
const UTM_CENTRAL_MERIDIAN_RAD = (UTM_CENTRAL_MERIDIAN_DEG * Math.PI) / 180;
const FALSE_EASTING = 500000.0;
const FALSE_NORTHING = 0.0;

/** Equivalencia legal dominicana: 1 Tarea = 628.86 metros cuadrados */
export const TAREA_M2 = 628.86;

/** Límites geográficos válidos para la República Dominicana en UTM 19N */
export const DOMINICAN_REPUBLIC_UTM_BOUNDS = {
  MIN_EASTING: 150000,
  MAX_EASTING: 650000,
  MIN_NORTHING: 1900000,
  MAX_NORTHING: 2250000,
  MIN_LATITUDE: 17.4,
  MAX_LATITUDE: 20.1,
  MIN_LONGITUDE: -72.1,
  MAX_LONGITUDE: -68.2,
} as const;

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface UtmCoordinate {
  utmEast: number;
  utmNorth: number;
}

export interface PolygonMetrics {
  areaM2: number;
  areaTareas: number;
  perimeterM: number;
  centroidUtmNorth: number;
  centroidUtmEast: number;
  centroidLat: number | null;
  centroidLng: number | null;
  isClosed: boolean;
  pointCount: number;
}

/**
 * Convierte coordenadas proyectadas UTM Zona 19N (WGS84) a coordenadas geográficas (Lat/Lng)
 */
export function utm19NToLatLng(utmEast: number, utmNorth: number): LatLng {
  const x = utmEast - FALSE_EASTING;
  const y = utmNorth - FALSE_NORTHING;

  const M = y / UTM_K0;
  const e1 = (1 - Math.sqrt(1 - WGS84_E2)) / (1 + Math.sqrt(1 - WGS84_E2));

  const mu =
    M /
    (WGS84_A *
      (1 -
        WGS84_E2 / 4 -
        (3 * WGS84_E2 * WGS84_E2) / 64 -
        (5 * Math.pow(WGS84_E2, 3)) / 256));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32) * Math.sin(4 * mu) +
    ((151 * Math.pow(e1, 3)) / 96) * Math.sin(6 * mu) +
    ((1097 * Math.pow(e1, 4)) / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);

  const C1 = WGS84_E_PRIME2 * cosPhi1 * cosPhi1;
  const T1 = tanPhi1 * tanPhi1;
  const N1 = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinPhi1 * sinPhi1);
  const R1 =
    (WGS84_A * (1 - WGS84_E2)) /
    Math.pow(1 - WGS84_E2 * sinPhi1 * sinPhi1, 1.5);
  const D = x / (N1 * UTM_K0);

  const latRad =
    phi1 -
    ((N1 * tanPhi1) / R1) *
      ((D * D) / 2 -
        (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * WGS84_E_PRIME2) *
          (Math.pow(D, 4) / 24) +
        (61 +
          90 * T1 +
          298 * C1 +
          45 * T1 * T1 -
          252 * WGS84_E_PRIME2 -
          3 * C1 * C1) *
          (Math.pow(D, 6) / 720));

  const lngRad =
    UTM_CENTRAL_MERIDIAN_RAD +
    (D -
      (1 + 2 * T1 + C1) * (Math.pow(D, 3) / 6) +
      (5 -
        2 * C1 +
        28 * T1 -
        3 * C1 * C1 +
        8 * WGS84_E_PRIME2 +
        24 * T1 * T1) *
        (Math.pow(D, 5) / 120)) /
      cosPhi1;

  return {
    latitude: Number(((latRad * 180) / Math.PI).toFixed(8)),
    longitude: Number(((lngRad * 180) / Math.PI).toFixed(8)),
  };
}

/**
 * Convierte coordenadas geográficas (Lat/Lng) a UTM Zona 19N (WGS84)
 */
export function latLngToUtm19N(latitude: number, longitude: number): UtmCoordinate {
  const phi = (latitude * Math.PI) / 180;
  const lambda = (longitude * Math.PI) / 180;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = Math.tan(phi);

  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinPhi * sinPhi);
  const T = tanPhi * tanPhi;
  const C = WGS84_E_PRIME2 * cosPhi * cosPhi;
  const A = cosPhi * (lambda - UTM_CENTRAL_MERIDIAN_RAD);

  const M =
    WGS84_A *
    ((1 -
      WGS84_E2 / 4 -
      (3 * WGS84_E2 * WGS84_E2) / 64 -
      (5 * Math.pow(WGS84_E2, 3)) / 256) *
      phi -
      ((3 * WGS84_E2) / 8 +
        (3 * WGS84_E2 * WGS84_E2) / 32 +
        (45 * Math.pow(WGS84_E2, 3)) / 1024) *
        Math.sin(2 * phi) +
      ((15 * WGS84_E2 * WGS84_E2) / 256 +
        (45 * Math.pow(WGS84_E2, 3)) / 1024) *
        Math.sin(4 * phi) -
      ((35 * Math.pow(WGS84_E2, 3)) / 3072) * Math.sin(6 * phi));

  const easting =
    UTM_K0 *
      N *
      (A +
        (1 - T + C) * (Math.pow(A, 3) / 6) +
        (5 - 18 * T + T * T + 72 * C - 58 * WGS84_E_PRIME2) *
          (Math.pow(A, 5) / 120)) +
    FALSE_EASTING;

  const northing =
    UTM_K0 *
    (M +
      N *
        tanPhi *
        ((A * A) / 2 +
          (5 - T + 9 * C + 4 * C * C) * (Math.pow(A, 4) / 24) +
          (61 - 58 * T + T * T + 600 * C - 330 * WGS84_E_PRIME2) *
            (Math.pow(A, 6) / 720)));

  return {
    utmEast: Number(easting.toFixed(3)),
    utmNorth: Number(northing.toFixed(3)),
  };
}

/**
 * Valida si un par de coordenadas UTM 19N se encuentra dentro del territorio dominicano
 */
export function validateUtm19NBounds(
  utmEast: number,
  utmNorth: number
): { valid: boolean; reason?: string } {
  if (
    utmEast < DOMINICAN_REPUBLIC_UTM_BOUNDS.MIN_EASTING ||
    utmEast > DOMINICAN_REPUBLIC_UTM_BOUNDS.MAX_EASTING
  ) {
    return {
      valid: false,
      reason: `Coordenada Este (${utmEast} m) fuera del rango territorial para la República Dominicana en Zona 19N [${DOMINICAN_REPUBLIC_UTM_BOUNDS.MIN_EASTING} - ${DOMINICAN_REPUBLIC_UTM_BOUNDS.MAX_EASTING}]`,
    };
  }

  if (
    utmNorth < DOMINICAN_REPUBLIC_UTM_BOUNDS.MIN_NORTHING ||
    utmNorth > DOMINICAN_REPUBLIC_UTM_BOUNDS.MAX_NORTHING
  ) {
    return {
      valid: false,
      reason: `Coordenada Norte (${utmNorth} m) fuera del rango territorial para la República Dominicana en Zona 19N [${DOMINICAN_REPUBLIC_UTM_BOUNDS.MIN_NORTHING} - ${DOMINICAN_REPUBLIC_UTM_BOUNDS.MAX_NORTHING}]`,
    };
  }

  return { valid: true };
}

/**
 * Calcula las métricas del polígono catastral:
 * - Área mediante fórmula de Gauss / Shoelace en m² y tareas dominicanas
 * - Perímetro euclidiano en metros
 * - Centroide geométrico en UTM 19N y Lat/Lng
 */
export function calculatePolygonMetricsFromCoords(
  points: Array<{ utmNorth: number; utmEast: number }>
): PolygonMetrics {
  const n = points.length;

  if (n < 3) {
    const singlePoint = points[0];
    const centroidNorth = singlePoint ? singlePoint.utmNorth : 0;
    const centroidEast = singlePoint ? singlePoint.utmEast : 0;
    const latLng =
      singlePoint && centroidNorth > 0 && centroidEast > 0
        ? utm19NToLatLng(centroidEast, centroidNorth)
        : { latitude: null, longitude: null };

    return {
      areaM2: 0,
      areaTareas: 0,
      perimeterM: 0,
      centroidUtmNorth: centroidNorth,
      centroidUtmEast: centroidEast,
      centroidLat: latLng.latitude,
      centroidLng: latLng.longitude,
      isClosed: false,
      pointCount: n,
    };
  }

  // Verificar si el último punto es duplicado del primero para cierre topográfico
  const first = points[0];
  const last = points[n - 1];
  const isExplicitlyClosed =
    Math.abs(first.utmEast - last.utmEast) < 0.001 &&
    Math.abs(first.utmNorth - last.utmNorth) < 0.001;

  const ring = isExplicitlyClosed ? points.slice(0, n - 1) : points;
  const numVertices = ring.length;

  // 1. Perímetro: suma de distancias euclidianas entre vértices consecutivos
  let perimeterM = 0;
  for (let i = 0; i < numVertices; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % numVertices];
    const dx = p2.utmEast - p1.utmEast;
    const dy = p2.utmNorth - p1.utmNorth;
    perimeterM += Math.sqrt(dx * dx + dy * dy);
  }

  // 2. Área por Gauss / Shoelace y Centroide Geométrico
  let signedAreaTimesTwo = 0;
  let cxSum = 0;
  let cySum = 0;

  for (let i = 0; i < numVertices; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % numVertices];
    const cross = p1.utmEast * p2.utmNorth - p2.utmEast * p1.utmNorth;

    signedAreaTimesTwo += cross;
    cxSum += (p1.utmEast + p2.utmEast) * cross;
    cySum += (p1.utmNorth + p2.utmNorth) * cross;
  }

  const areaM2 = Math.abs(signedAreaTimesTwo) / 2;
  const areaTareas = Number((areaM2 / TAREA_M2).toFixed(4));

  let centroidUtmEast: number;
  let centroidUtmNorth: number;

  if (Math.abs(signedAreaTimesTwo) > 1e-6) {
    centroidUtmEast = cxSum / (3 * signedAreaTimesTwo);
    centroidUtmNorth = cySum / (3 * signedAreaTimesTwo);
  } else {
    // Si el polígono es degenerate, promediar aritméticamente
    centroidUtmEast =
      ring.reduce((acc, p) => acc + p.utmEast, 0) / numVertices;
    centroidUtmNorth =
      ring.reduce((acc, p) => acc + p.utmNorth, 0) / numVertices;
  }

  const roundedCentroidEast = Number(centroidUtmEast.toFixed(3));
  const roundedCentroidNorth = Number(centroidUtmNorth.toFixed(3));
  const roundedPerimeter = Number(perimeterM.toFixed(2));
  const roundedAreaM2 = Number(areaM2.toFixed(2));

  let centroidLat: number | null = null;
  let centroidLng: number | null = null;

  try {
    const latLng = utm19NToLatLng(roundedCentroidEast, roundedCentroidNorth);
    centroidLat = latLng.latitude;
    centroidLng = latLng.longitude;
  } catch {
    // Si las coordenadas no son válidas para proyección, lat/lng permanece null
  }

  return {
    areaM2: roundedAreaM2,
    areaTareas,
    perimeterM: roundedPerimeter,
    centroidUtmNorth: roundedCentroidNorth,
    centroidUtmEast: roundedCentroidEast,
    centroidLat,
    centroidLng,
    isClosed: true,
    pointCount: n,
  };
}
