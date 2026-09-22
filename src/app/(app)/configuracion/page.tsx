import Link from "next/link";
import { Building2, Shield, Key, Network, FolderKanban, Workflow } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConfigurationPage() {
  const settingsModules = [
    {
      title: "Datos de la Empresa",
      description: "Razón social, RNC, información de contacto y configuración general.",
      href: "/configuracion/empresa",
      icon: Building2,
    },
    {
      title: "Gestión de Roles",
      description: "Definición de roles de usuario y matriz de permisos por rol.",
      href: "/configuracion/roles",
      icon: Shield,
    },
    {
      title: "Permisos Efectivos",
      description: "Vista granular para auditar permisos efectivos por usuario y área.",
      href: "/configuracion/permisos",
      icon: Key,
    },
    {
      title: "Áreas de Servicio",
      description: "Administración de las áreas organizacionales (Legal, Agrimensura).",
      href: "/configuracion/areas",
      icon: Network,
    },
    {
      title: "Tipos de Expediente",
      description: "Gestión de tipos documentales y plantillas de flujo de trabajo.",
      href: "/configuracion/tipos-expediente",
      icon: FolderKanban,
    },
    {
      title: "Integraciones Externas",
      description: "Estado de Nextcloud, Facturación Electrónica DGII y RNC.",
      href: "/configuracion/integraciones",
      icon: Workflow,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Configuración del Sistema</h1>
        <p className="text-sm text-slate-500 mt-2">
          Administre la configuración global, accesos, áreas operativas e integraciones del entorno.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href}>
              <Card className="h-full hover:bg-slate-50 transition-colors cursor-pointer border-slate-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-100 rounded-md">
                      <Icon className="w-6 h-6 text-slate-700" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium text-slate-900">{module.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-600">{module.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
