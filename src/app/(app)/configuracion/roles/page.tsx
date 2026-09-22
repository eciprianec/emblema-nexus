"use client";

import { useState } from "react";
import { Plus, Shield, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const rolesData = [
  { id: 1, name: "Administrador del Sistema", description: "Acceso total a todas las configuraciones y datos.", users: 2, level: "Alto" },
  { id: 2, name: "Gerente de Área", description: "Acceso a reportes y expedientes de su área operativa.", users: 4, level: "Medio" },
  { id: 3, name: "Profesional (Abogado)", description: "Acceso para editar expedientes asignados.", users: 12, level: "Medio" },
  { id: 4, name: "Asistente", description: "Creación de expedientes y visualización básica.", users: 8, level: "Bajo" },
];

export default function RolesPage() {
  const [search, setSearch] = useState("");

  const filteredRoles = rolesData.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Gestión de Roles</h1>
          <p className="text-sm text-slate-500 mt-2">
            Administre los roles del sistema y asigne permisos operativos base.
          </p>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" />
          Crear Nuevo Rol
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-slate-500" />
                Roles Activos
              </CardTitle>
              <CardDescription>Roles definidos para la empresa actual.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar rol..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Nombre del Rol</TableHead>
                  <TableHead className="font-semibold text-slate-700">Descripción</TableHead>
                  <TableHead className="font-semibold text-slate-700">Nivel de Privilegio</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Usuarios Asignados</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium text-slate-900">{role.name}</TableCell>
                    <TableCell className="text-slate-600">{role.description}</TableCell>
                    <TableCell>
                      <Badge variant={role.level === 'Alto' ? 'destructive' : role.level === 'Medio' ? 'secondary' : 'outline'}>
                        {role.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-slate-600">{role.users}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                        Ver Permisos
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRoles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-slate-500">
                      No se encontraron roles.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
