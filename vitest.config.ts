import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // tsconfig usa "preserve" para Next; las pruebas de componentes necesitan JSX compilado.
  esbuild: { jsx: "automatic" },
  test: {
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Fuera de Next este paquete lanza un error al importarlo.
      "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
    },
  },
});
