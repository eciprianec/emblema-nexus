"use client";

import React, { useMemo } from "react";

interface QrCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
}

// Generador de matriz determinista tipo QR basada en hash de la cadena
// para asegurar un patrón geométrico denso, realista con patrones de alineación y esquinas auténticas.
export function QrCodeSvg({ value, size = 120, className = "" }: QrCodeSvgProps) {
  const matrix = useMemo(() => {
    const n = 25; // 25x25 grid (versión 2 de código QR)
    const grid: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));

    // Función para dibujar un buscador 7x7
    const drawFinderPattern = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 ||
            r === 6 ||
            c === 0 ||
            c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            grid[r0 + r][c0 + c] = true;
          } else {
            grid[r0 + r][c0 + c] = false;
          }
        }
      }
    };

    // 3 buscadores en las esquinas
    drawFinderPattern(0, 0); // superior izquierdo
    drawFinderPattern(0, n - 7); // superior derecho
    drawFinderPattern(n - 7, 0); // inferior izquierdo

    // Patrones de sincronización (timing patterns)
    for (let i = 8; i < n - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Patrón de alineación pequeño en (n-9, n-9)
    const ar0 = n - 9;
    const ac0 = n - 9;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (r === 0 || r === 4 || c === 0 || c === 4 || (r === 2 && c === 2)) {
          grid[ar0 + r][ac0 + c] = true;
        }
      }
    }

    // Generar bits pseudo-aleatorios basados en el valor para el cuerpo del QR
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    const pseudoRandom = () => {
      hash = (hash * 9301 + 49297) % 233280;
      return hash / 233280;
    };

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        // Ignorar áreas de buscadores
        const inTL = r < 8 && c < 8;
        const inTR = r < 8 && c >= n - 8;
        const inBL = r >= n - 8 && c < 8;
        const inAlign = r >= ar0 && r < ar0 + 5 && c >= ac0 && c < ac0 + 5;
        const inTiming = (r === 6 && c >= 8 && c < n - 8) || (c === 6 && r >= 8 && r < n - 8);

        if (!inTL && !inTR && !inBL && !inAlign && !inTiming) {
          grid[r][c] = pseudoRandom() > 0.48;
        }
      }
    }

    return grid;
  }, [value]);

  const n = matrix.length;
  const cellSize = size / n;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`bg-white p-1 rounded-sm border border-slate-300 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Código QR de Verificación Fiscal DGII"
    >
      <rect width={size} height={size} fill="#ffffff" />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.1}
              height={cellSize + 0.1}
              fill="#0f172a"
            />
          ) : null
        )
      )}
    </svg>
  );
}
