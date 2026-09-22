"use client";

import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const dossierTypes = [
  { id: 1, name: "Contrato de Trabajo", area: "Legal", active: true },
  { id: 2, name: "Constitución de Empresa", area: "Legal", active: true },
  { id: 3, name: "Legalización de Título", area: "Agrimensura", active: true },
  { id: 4, name: "Deslinde", area: "Agrimensura", active: true },
  { id: 5, name: "Venta de Inmueble", area: "Inmobiliaria", active: true },
  { id: 6, name: "Alquiler", area: "Inmobiliaria", active: true },
];

export default function TiposExpedientePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Tipos de Expediente</h1>
          <p className="text-sm text-slate-500 mt-2">
            Configure las plantillas, requisitos y workflows para cada trámite.
          </p>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Tipo
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-slate-500" />
            <CardTitle className="text-lg">Catálogo de Trámites</CardTitle>
          </div>
          <CardDescription>Tipos de expedientes registrados en el sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Nombre del Trámite</TableHead>
                  <TableHead className="font-semibold text-slate-700">Área de Servicio</TableHead>
                  <TableHead className="font-semibold text-slate-700">Estado</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dossierTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium text-slate-900">{type.name}</TableCell>
                    <TableCell className="text-slate-600">{type.area}</TableCell>
                    <TableCell>
                      {type.active ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Activo</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-50 text-slate-600">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                        Configurar Workflow
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
