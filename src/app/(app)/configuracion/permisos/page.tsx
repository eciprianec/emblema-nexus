"use client";

import { useState } from "react";
import { Key, Filter, Check, X, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const effectivePermissions = [
  { module: "Expedientes", permission: "dossiers:read_all", granted: false, origin: "Restringido (Solo Propios)" },
  { module: "Expedientes", permission: "dossiers:read_own", granted: true, origin: "Rol Base (Profesional)" },
  { module: "Expedientes", permission: "dossiers:create", granted: true, origin: "Rol Base (Profesional)" },
  { module: "Finanzas", permission: "billing:generate_invoice", granted: false, origin: "No concedido" },
  { module: "Sistema", permission: "users:create", granted: false, origin: "No concedido" },
  { module: "Sistema", permission: "users:read", granted: true, origin: "Excepción de Usuario (Override)" },
];

export default function PermisosPage() {
  const [selectedUser, setSelectedUser] = useState("maria");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Auditoría de Permisos Efectivos</h1>
        <p className="text-sm text-slate-500 mt-2">
          Inspeccione la resolución final de permisos cruzando roles base, excepciones de usuario y áreas.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm bg-slate-50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 text-slate-700 font-medium whitespace-nowrap">
              <Filter className="w-4 h-4" />
              Evaluar para el usuario:
            </div>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-full md:w-[300px] bg-white">
                <SelectValue placeholder="Seleccione un usuario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Enmanuel Ciprian Arias (Admin)</SelectItem>
                <SelectItem value="maria">María Pérez (Abogada)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-slate-500" />
            <CardTitle className="text-lg">Matriz de Acceso Resuelta</CardTitle>
          </div>
          <CardDescription>
            Mostrando permisos para el usuario seleccionado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700 w-[150px]">Módulo</TableHead>
                  <TableHead className="font-semibold text-slate-700">Llave de Permiso</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-center w-[120px]">Acceso</TableHead>
                  <TableHead className="font-semibold text-slate-700">Origen de Resolución</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {effectivePermissions.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-slate-900">{item.module}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-600 bg-slate-100/50 px-2 rounded-sm inline-block mt-2">
                      {item.permission}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.granted ? (
                        <div className="flex justify-center"><Check className="w-5 h-5 text-green-600" /></div>
                      ) : (
                        <div className="flex justify-center"><X className="w-5 h-5 text-red-500" /></div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Info className="w-4 h-4 text-slate-400" />
                        {item.origin}
                      </div>
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
