"use client";

import React, { useState, useMemo } from "react";
import { CoordinatePoint } from "../types";
import { 
  Compass, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Ruler,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ParcelMapViewerProps {
  vertices: CoordinatePoint[];
  parcelDesignation?: string;
  areaSqm?: number;
  areaTareas?: number;
  className?: string;
  interactive?: boolean;
}

export function ParcelMapViewer({
  vertices = [],
  parcelDesignation,
  areaSqm,
  areaTareas,
  className = "",
  interactive = true,
}: ParcelMapViewerProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showDistances, setShowDistances] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<CoordinatePoint | null>(null);

  const svgWidth = 650;
  const svgHeight = 440;
  const padding = 55;

  // Transformación geométrica de UTM 19N a SVG
  const {
    transformedPoints,
    polygonPath,
    segments,
    scaleBarMeters,
    scaleBarPixels,
    bounds,
  } = useMemo(() => {
    if (!vertices || vertices.length < 3) {
      return {
        transformedPoints: [],
        polygonPath: "",
        segments: [],
        scaleBarMeters: 50,
        scaleBarPixels: 80,
        bounds: { minE: 0, maxE: 0, minN: 0, maxN: 0, deltaE: 0, deltaN: 0 },
      };
    }

    const eastings = vertices.map((p) => p.easting);
    const northings = vertices.map((p) => p.northing);

    const minE = Math.min(...eastings);
    const maxE = Math.max(...eastings);
    const minN = Math.min(...northings);
    const maxN = Math.max(...northings);

    const deltaE = Math.max(maxE - minE, 1);
    const deltaN = Math.max(maxN - minN, 1);

    const availWidth = svgWidth - padding * 2;
    const availHeight = svgHeight - padding * 2;

    // Escala uniforme para no deformar el polígono
    const scale = Math.min(availWidth / deltaE, availHeight / deltaN);

    // Centrar dentro del SVG
    const drawnWidth = deltaE * scale;
    const drawnHeight = deltaN * scale;
    const offsetX = padding + (availWidth - drawnWidth) / 2;
    const offsetY = padding + (availHeight - drawnHeight) / 2;

    const tPoints = vertices.map((pt) => {
      const x = offsetX + (pt.easting - minE) * scale;
      // En UTM Norte crece hacia arriba; en SVG Y crece hacia abajo
      const y = offsetY + (maxN - pt.northing) * scale;
      return {
        ...pt,
        x,
        y,
      };
    });

    const path =
      tPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(" ") +
      " Z";

    // Calcular segmentos y distancias perimetrales
    const segs = tPoints.map((pt, i) => {
      const nextPt = tPoints[(i + 1) % tPoints.length];
      const origPt = vertices[i];
      const origNext = vertices[(i + 1) % vertices.length];

      const dist = Math.hypot(origNext.easting - origPt.easting, origNext.northing - origPt.northing);
      const midX = (pt.x + nextPt.x) / 2;
      const midY = (pt.y + nextPt.y) / 2;

      // Calcular ángulo de orientación
      const angle = (Math.atan2(nextPt.y - pt.y, nextPt.x - pt.x) * 180) / Math.PI;
      const adjustedAngle = angle > 90 || angle < -90 ? angle + 180 : angle;

      return {
        from: pt.pointNumber,
        to: nextPt.pointNumber,
        dist,
        midX,
        midY,
        angle: adjustedAngle,
      };
    });

    // Calcular escala gráfica adecuada
    const niceIncrements = [5, 10, 20, 25, 50, 100, 200, 500];
    let bestMeters = 50;
    for (const inc of niceIncrements) {
      if (inc * scale >= 60 && inc * scale <= 150) {
        bestMeters = inc;
        break;
      }
    }
    const barPx = bestMeters * scale;

    return {
      transformedPoints: tPoints,
      polygonPath: path,
      segments: segs,
      scaleBarMeters: bestMeters,
      scaleBarPixels: barPx,
      bounds: { minE, maxE, minN, maxN, deltaE, deltaN },
    };
  }, [vertices, svgWidth, svgHeight, padding]);

  const handleResetZoom = () => setZoomLevel(1);
  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.75));

  if (!vertices || vertices.length < 3) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-500 text-center ${className}`}>
        <Ruler className="h-10 w-10 text-slate-400 mb-2 stroke-1" />
        <p className="text-sm font-medium text-slate-700">Sin polígono definido</p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Se requieren al menos 3 vértices topográficos con coordenadas UTM para proyectar el plano perimétrico.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs ${className}`}>
      {/* Barra superior de controles del visor cartográfico */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 text-white border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-slate-300" />
          <span className="text-xs font-semibold tracking-wide uppercase text-slate-200">
            Plano Topográfico UTM 19N WGS84
          </span>
          {parcelDesignation && (
            <span className="text-[11px] text-slate-400 font-normal border-l border-slate-700 pl-2">
              {parcelDesignation}
            </span>
          )}
        </div>

        {interactive && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDistances(!showDistances)}
              title={showDistances ? "Ocultar cotas perimetrales" : "Mostrar cotas perimetrales"}
              className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {showDistances ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowGrid(!showGrid)}
              title={showGrid ? "Ocultar retícula" : "Mostrar retícula"}
              className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <span className="text-[10px] font-mono">#</span>
            </Button>
            <div className="h-4 w-px bg-slate-700 mx-1" />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.75}
              title="Alejar"
              className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[10px] font-mono text-slate-400 px-1">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2.5}
              title="Acercar"
              className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetZoom}
              title="Restablecer vista"
              className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Área del Plano SVG */}
      <div className="relative overflow-hidden bg-slate-50 flex items-center justify-center p-2 min-h-[360px]">
        {/* Rosa de los vientos / Norte Geográfico */}
        <div className="absolute top-4 right-4 z-10 flex flex-col items-center bg-white/90 backdrop-blur-xs p-2 rounded border border-slate-200 shadow-2xs pointer-events-none">
          <div className="relative w-7 h-7 flex items-center justify-center">
            {/* Flecha cartográfica de Norte */}
            <svg viewBox="0 0 32 32" className="w-6 h-6 text-slate-900">
              <polygon points="16,2 21,16 16,13 11,16" fill="#0f172a" />
              <polygon points="16,30 21,16 16,13 11,16" fill="#94a3b8" />
              <circle cx="16" cy="16" r="1.5" fill="#ffffff" />
            </svg>
          </div>
          <span className="text-[9px] font-bold text-slate-900 tracking-wider">NORTE</span>
          <span className="text-[8px] font-mono text-slate-500">UTM 19N</span>
        </div>

        {/* Escala Gráfica y Datos de Referencia */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded border border-slate-200 shadow-2xs pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold text-slate-800">Escala Gráfica</span>
            <span className="text-[9px] font-mono text-slate-500">1 : {(1 / (scaleBarPixels / scaleBarMeters)).toFixed(0)}</span>
          </div>
          <div className="flex items-center">
            <div
              style={{ width: `${scaleBarPixels * zoomLevel}px` }}
              className="h-1.5 bg-slate-900 border-x-2 border-slate-900 relative"
            >
              <div className="absolute top-full left-0 text-[8px] font-mono text-slate-600 mt-0.5">0</div>
              <div className="absolute top-full right-0 text-[8px] font-mono text-slate-600 mt-0.5">
                {scaleBarMeters}m
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de Área / Superficie */}
        {areaSqm !== undefined && (
          <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-medium text-slate-500">Superficie Perimétrica</div>
            <div className="text-xs font-bold text-slate-900">
              {areaSqm.toLocaleString('es-DO')} m²
            </div>
            {areaTareas !== undefined && (
              <div className="text-[10px] font-medium text-slate-600">
                {areaTareas.toLocaleString('es-DO', { minimumFractionDigits: 2 })} tareas
              </div>
            )}
          </div>
        )}

        {/* Lienzo SVG */}
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto max-h-[460px] select-none transition-transform duration-200"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <defs>
            {/* Patrón de cuadrícula milimétrica */}
            <pattern id="survey-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.75" />
            </pattern>
            {/* Patrón de achurado perimetral */}
            <pattern id="survey-hatch" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="12" stroke="#cbd5e1" strokeWidth="1" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Cuadrícula técnica de fondo */}
          {showGrid && <rect width="100%" height="100%" fill="url(#survey-grid)" />}

          {/* Relleno achurado del polígono */}
          <path d={polygonPath} fill="url(#survey-hatch)" />

          {/* Relleno semi-transparente y borde perimetral del polígono */}
          <path
            d={polygonPath}
            fill="#0f172a"
            fillOpacity="0.04"
            stroke="#0f172a"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Etiquetas de distancia en cada segmento perimetral */}
          {showDistances &&
            segments.map((seg, idx) => (
              <g key={`seg-${idx}`} transform={`translate(${seg.midX}, ${seg.midY})`}>
                <rect
                  x="-28"
                  y="-8"
                  width="56"
                  height="16"
                  rx="3"
                  fill="#ffffff"
                  stroke="#94a3b8"
                  strokeWidth="0.75"
                  className="shadow-xs"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  className="text-[9px] font-mono font-medium fill-slate-800 pointer-events-none"
                >
                  {seg.dist.toFixed(2)}m
                </text>
              </g>
            ))}

          {/* Vértices Topográficos (P1, P2, P3...) */}
          {transformedPoints.map((pt) => {
            const isHovered = hoveredPoint?.id === pt.id;
            return (
              <g
                key={pt.id}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Halo de hover */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 12 : 8}
                  fill={isHovered ? "#0f172a" : "#0f172a"}
                  fillOpacity={isHovered ? 0.2 : 0.08}
                  className="transition-all"
                />
                {/* Círculo exterior */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 4}
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth={isHovered ? "2.5" : "1.75"}
                  className="transition-all"
                />
                {/* Punto centro */}
                <circle cx={pt.x} cy={pt.y} r="1.5" fill="#0f172a" />

                {/* Etiqueta de Vértice */}
                {showLabels && (
                  <g transform={`translate(${pt.x + 8}, ${pt.y - 8})`}>
                    <rect
                      x="-2"
                      y="-10"
                      width={pt.pointNumber.length * 7 + 10}
                      height="14"
                      rx="2"
                      fill="#0f172a"
                      className="opacity-90"
                    />
                    <text
                      x={pt.pointNumber.length * 3.5 + 3}
                      y="0"
                      textAnchor="middle"
                      className="text-[9px] font-mono font-bold fill-white"
                    >
                      {pt.pointNumber}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip flotante al pasar el mouse por un vértice */}
        {hoveredPoint && (
          <div className="absolute bottom-4 right-4 z-20 bg-slate-900 text-white px-3 py-2 rounded-md shadow-lg border border-slate-700 pointer-events-none text-left min-w-[200px]">
            <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5">
              <span className="text-xs font-bold text-white font-mono">
                Vértice {hoveredPoint.pointNumber}
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                {hoveredPoint.code}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-mono">
              <span className="text-slate-400">Norte (Y):</span>
              <span className="text-slate-200 text-right">{hoveredPoint.northing.toFixed(3)} m</span>
              <span className="text-slate-400">Este (X):</span>
              <span className="text-slate-200 text-right">{hoveredPoint.easting.toFixed(3)} m</span>
              <span className="text-slate-400">Elevación Z:</span>
              <span className="text-slate-200 text-right">{hoveredPoint.elevation.toFixed(2)} m</span>
            </div>
            {hoveredPoint.description && (
              <p className="text-[10px] text-slate-300 mt-1 italic border-t border-slate-800 pt-1">
                {hoveredPoint.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pie de plano técnico */}
      <div className="px-3.5 py-2 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span>Proyección: <strong className="text-slate-700">UTM Zona 19 Norte</strong></span>
          <span>Elipsoide: <strong className="text-slate-700">WGS84</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span>Vértices: <strong className="text-slate-700">{vertices.length}</strong></span>
          <span>Perímetro aprox: <strong className="text-slate-700">
            {segments.reduce((acc, s) => acc + s.dist, 0).toFixed(2)} m
          </strong></span>
        </div>
      </div>
    </div>
  );
}
