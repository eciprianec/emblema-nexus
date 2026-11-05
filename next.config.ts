import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,

  // En desarrollo, Next imprime los argumentos de cada Server Function en la terminal: entre ellos,
  // la API Key del proveedor al guardar las credenciales.
  logging: {
    serverFunctions: false,
  },

  // Paquetes que no deben ser bundleados por Next.js (nativos de Node)
  serverExternalPackages: [
    "dgii-ecf",
    "xml-crypto",
    "node-forge",
    "@xmldom/xmldom",
    "exceljs",
    "docx-templates",
    "pizzip",
  ],

  // Sin optimizador: ninguna pantalla usa next/image y, abierto a cualquier host,
  // cualquiera podría usarlo como proxy sin iniciar sesión.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
