import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../../../../next.config";

const read = (file: string) => readFileSync(path.resolve(__dirname, "../../../..", file), "utf8");

/** Sin navegador en estas pruebas: se comprueba lo que hace posible cada problema, ya medido en Chrome. */
describe("impresión", () => {
  it("el menú, la cabecera y las pestañas salen del flujo: solo invisibles, encogen la página y el QR", () => {
    expect(read("src/components/layout/Sidebar.tsx")).toContain("print:hidden");
    expect(read("src/components/layout/Header.tsx")).toContain("print:hidden");
    expect(read("src/features/finance/components/FinanceNav.tsx")).toContain("print:hidden");
    // Las acciones y avisos están fuera del área de impresión: la regla no puede limitarse a ella.
    expect(read("src/app/globals.css")).toMatch(/\n {2}\.billing-no-print \{\s*display: none !important;/);
  });

  it("el QR pide más que los 22 mm de la DGII", () => {
    const size = /h-\[(\d+)mm\] w-\[(\d+)mm\]/.exec(read("src/features/billing/components/EcfPrintBlock.tsx"));
    expect(Number(size?.[1])).toBeGreaterThanOrEqual(22);
    expect(Number(size?.[2])).toBeGreaterThanOrEqual(22);
  });
});

describe("desplazamiento bajo el menú", () => {
  it("main no se puede desplazar por programa", () => {
    const layout = read("src/app/(app)/layout.tsx");
    expect(layout).toMatch(/<main[^>]*overflow-clip/);
    expect(layout).not.toMatch(/<main[^>]*overflow-hidden/);
  });

  it("los grupos de la cabecera pueden encogerse", () => {
    const header = read("src/components/layout/Header.tsx");
    expect(header.match(/flex min-w-0 flex-1 items-center/g)).toHaveLength(2);
    expect(read("src/components/layout/CompanySwitcher.tsx")).toContain("min-w-0 shrink");
  });
});

describe("registro del servidor", () => {
  it("no imprime los argumentos de las Server Functions: entre ellos va la API Key", () => {
    expect(nextConfig.logging && nextConfig.logging.serverFunctions).toBe(false);
  });
});
