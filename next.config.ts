import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,

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

  // Configuración de imágenes remotas (Nextcloud, avatares, etc.)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
