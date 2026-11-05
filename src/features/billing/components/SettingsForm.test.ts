import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { BillingSettingsRow } from "@/services/billing/types";
import { SequencesPanel, SettingsForm } from "./SettingsForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../actions/billing-actions", () => ({
  saveSettingsAction: vi.fn(),
  addSequenceAction: vi.fn(),
  setSequenceActiveAction: vi.fn(),
}));

const defaults = { rnc: "131880738", legalName: "Empresa", address: "Santo Domingo", phone: "809-555-1234", email: "info@empresa.do" };
const saved = {
  emission_mode: "ecf_proveedor",
  dgii_environment: "test",
  rnc: "131880738",
  legal_name: "Empresa",
  trade_name: null,
  address: "Santo Domingo",
  phone: null,
  email: null,
  default_due_days: 30,
} as unknown as BillingSettingsRow;

const render = (settings: BillingSettingsRow | null) =>
  renderToStaticMarkup(createElement(SettingsForm, { settings, defaults, canConfigure: true }));

describe("formulario de configuración", () => {
  it("no usa la prop action, que vacía los campos al terminar aunque el guardado se rechace", () => {
    // React marca así una acción de función en el HTML del servidor.
    expect(render(saved)).not.toMatch(/<form[^>]*\saction=/);
    const panel = renderToStaticMarkup(createElement(SequencesPanel, { sequences: [], canConfigure: true, mode: "ecf_proveedor", environment: "test" }));
    expect(panel).not.toMatch(/<form[^>]*\saction=/);
  });

  it("muestra el ambiente guardado, no 'Elige el ambiente'", () => {
    expect(render(saved)).toMatch(/<option value="test" selected/);
  });

  it("en el primer guardado precarga el teléfono y el correo de la empresa", () => {
    const html = render(null);
    expect(html).toContain('value="809-555-1234"');
    expect(html).toContain('value="info@empresa.do"');
  });
});

describe("rangos", () => {
  it("separa la columna Siguiente de la columna Vence", () => {
    const html = renderToStaticMarkup(
      createElement(SequencesPanel, {
        sequences: [
          { id: "s", prefix: "E31", environment: "test", start_number: 1, end_number: 20000, next_number: 1, expires_on: "2028-12-31", is_active: true },
        ] as never,
        canConfigure: false,
        mode: "ecf_proveedor",
        environment: "test",
      })
    );
    expect(html).toMatch(/<th class="[^"]*pl-6[^"]*">Vence/);
    expect(html).toMatch(/<td class="[^"]*pl-6[^"]*">31\/12\/2028/);
  });

  it("lista los números que la DGII dio por usados en un rechazo", () => {
    const html = renderToStaticMarkup(
      createElement(SequencesPanel, {
        sequences: [],
        canConfigure: false,
        mode: "ecf_proveedor",
        environment: "test",
        usedNumbers: [{ encf: "E310000000008", environment: "DEV" }],
      })
    );
    expect(html).toContain("E310000000008");
    expect(html).toContain("aunque el borrador se haya eliminado");
  });
});
