"use client";

import { Network, Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const areasData = [
  { id: "LEG", name: "Legal", description: "Departamento de servicios jurídicos y contratos.", manager: "María Pérez", count: 3 },
  { id: "AGR", name: "Agrimensura", description: "Servicios de deslinde y levantamiento parcelario.", manager: "Carlos Sánchez", count: 3 },
  { id: "INM", name: "Inmobiliaria", description: "Gestión de ventas y alquileres de inmuebles.", manager: "No asignado", count: 3 },
];

export default function AreasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Áreas de Servicio</h1>
          <p className="text-sm text-slate-500 mt-2">
            Organice su empresa en divisiones operativas.
          </p>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Área
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-slate-500" />
            <CardTitle className="text-lg">Catálogo de Áreas</CardTitle>
          </div>
          <CardDescription>Estructura departamental de Emblema Nexus.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700 w-[100px]">Código</TableHead>
                  <TableHead className="font-semibold text-slate-700">Nombre del Área</TableHead>
                  <TableHead className="font-semibold text-slate-700">Descripción</TableHead>
                  <TableHead className="font-semibold text-slate-700">Gerente Responsable</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Trámites (Tipos)</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areasData.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell className="font-medium text-slate-900">{area.id}</TableCell>
                    <TableCell className="text-slate-900 font-medium">{area.name}</TableCell>
                    <TableCell className="text-slate-600">{area.description}</TableCell>
                    <TableCell className="text-slate-600">{area.manager}</TableCell>
                    <TableCell className="text-right text-slate-600">{area.count}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Editar área</DropdownMenuItem>
                          <DropdownMenuItem>Ver tipos de expediente</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Desactivar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
