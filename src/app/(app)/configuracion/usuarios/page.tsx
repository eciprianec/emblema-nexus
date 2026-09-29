"use client";

import * as React from "react";
import {
  Users,
  UserPlus,
  Shield,
  Search,
  MoreHorizontal,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Building2,
  Briefcase,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserStore } from "@/features/users/store/useUserStore";
import { User, UserRole, UserArea, UserStatus } from "@/features/users/types";

const ROLE_LABELS: Record<UserRole, { label: string; color: string }> = {
  ADMINISTRADOR: { label: "Administrador", color: "bg-purple-100 text-purple-800 border-purple-200" },
  ABOGADO: { label: "Abogado", color: "bg-blue-100 text-blue-800 border-blue-200" },
  AGRIMENSOR: { label: "Agrimensor", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  AGENTE_INMOBILIARIO: { label: "Agente Inmobiliario", color: "bg-amber-100 text-amber-800 border-amber-200" },
  CONTADOR: { label: "Contador", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  ASISTENTE: { label: "Asistente", color: "bg-slate-100 text-slate-800 border-slate-200" },
};

export default function UsuariosConfigPage() {
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    isCreateModalOpen,
    isEditModalOpen,
    selectedUser,
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
  } = useUserStore();

  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("TODOS");
  const [statusFilter, setStatusFilter] = React.useState("TODOS");
  const [userToDelete, setUserToDelete] = React.useState<User | null>(null);

  // Form states for creating/editing
  const [formData, setFormData] = React.useState({
    nombres: "",
    apellidos: "",
    cedula: "",
    email: "",
    telefono: "",
    rol: "ABOGADO" as UserRole,
    area: "LEGAL" as UserArea,
    status: "ACTIVO" as UserStatus,
  });

  // Populate form on edit
  React.useEffect(() => {
    if (selectedUser) {
      setFormData({
        nombres: selectedUser.nombres,
        apellidos: selectedUser.apellidos,
        cedula: selectedUser.cedula || "",
        email: selectedUser.email,
        telefono: selectedUser.telefono,
        rol: selectedUser.rol,
        area: selectedUser.area,
        status: selectedUser.status,
      });
    } else {
      setFormData({
        nombres: "",
        apellidos: "",
        cedula: "",
        email: "",
        telefono: "",
        rol: "ABOGADO",
        area: "LEGAL",
        status: "ACTIVO",
      });
    }
  }, [selectedUser]);

  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        search === "" ||
        `${u.nombres} ${u.apellidos}`.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.cedula && u.cedula.includes(search));

      const matchRole = roleFilter === "TODOS" || u.rol === roleFilter;
      const matchStatus = statusFilter === "TODOS" || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const activeCount = users.filter((u) => u.status === "ACTIVO").length;
  const adminCount = users.filter((u) => u.rol === "ADMINISTRADOR").length;
  const specialistCount = users.filter(
    (u) => u.rol === "ABOGADO" || u.rol === "AGRIMENSOR" || u.rol === "AGENTE_INMOBILIARIO"
  ).length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombres.trim() || !formData.apellidos.trim() || !formData.email.trim()) {
      toast.error("Por favor complete los nombres, apellidos y correo electrónico.");
      return;
    }

    // Check email uniqueness
    const exists = users.some((u) => u.email.toLowerCase() === formData.email.trim().toLowerCase());
    if (exists) {
      toast.error("Ya existe un usuario registrado con este correo electrónico.");
      return;
    }

    const created = addUser(formData);
    toast.success(`Usuario ${created.nombres} ${created.apellidos} registrado exitosamente.`);
    closeCreateModal();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!formData.nombres.trim() || !formData.apellidos.trim() || !formData.email.trim()) {
      toast.error("Por favor complete los nombres, apellidos y correo electrónico.");
      return;
    }

    updateUser(selectedUser.id, formData);
    toast.success("Usuario actualizado correctamente.");
    closeEditModal();
  };

  const handleDeleteConfirm = () => {
    if (!userToDelete) return;
    deleteUser(userToDelete.id);
    toast.success(`Usuario ${userToDelete.nombres} ${userToDelete.apellidos} eliminado.`);
    setUserToDelete(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Gestión de Usuarios y Personal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Administre las cuentas de acceso, roles corporativos y asignación de colaboradores a expedientes.
          </p>
        </div>

        <Button
          onClick={() => {
            setFormData({
              nombres: "",
              apellidos: "",
              cedula: "",
              email: "",
              telefono: "",
              rol: "ABOGADO",
              area: "LEGAL",
              status: "ACTIVO",
            });
            openCreateModal();
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
        >
          <UserPlus className="w-3.5 h-3.5 mr-1.5" />
          + Nuevo Usuario
        </Button>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-600">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{users.length}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">En la plataforma</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-600">Usuarios Activos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{activeCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Con acceso habilitado</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-600">Especialistas</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{specialistCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Abogados / Agrimensores / Agentes</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-600">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{adminCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Control total del sistema</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Tabla */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, email o cédula..."
                className="pl-8 text-xs h-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs h-8 rounded-md border border-slate-200 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="TODOS">Todos los roles</option>
                <option value="ADMINISTRADOR">Administrador</option>
                <option value="ABOGADO">Abogado</option>
                <option value="AGRIMENSOR">Agrimensor</option>
                <option value="AGENTE_INMOBILIARIO">Agente Inmobiliario</option>
                <option value="CONTADOR">Contador</option>
                <option value="ASISTENTE">Asistente</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs h-8 rounded-md border border-slate-200 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="ACTIVO">Activos</option>
                <option value="INACTIVO">Inactivos</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700 text-xs">Colaborador / Usuario</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs">Rol</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs">Área</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs">Contacto</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs text-center">Estado</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-500 text-xs">
                      No se encontraron usuarios con los filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => {
                    const roleInfo = ROLE_LABELS[u.rol] || { label: u.rol, color: "bg-slate-100 text-slate-700" };
                    return (
                      <TableRow key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                              {u.nombres[0]}
                              {u.apellidos[0]}
                            </div>
                            <div>
                              <div className="font-medium text-xs text-slate-900">
                                {u.nombres} {u.apellidos}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {u.cedula ? `Céd: ${u.cedula}` : u.id}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleInfo.color}`}
                          >
                            {roleInfo.label}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs text-slate-600">
                          <span className="font-medium">{u.area}</span>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs text-slate-700 flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px]">
                              <Mail className="h-3 w-3 text-slate-400" />
                              {u.email}
                            </span>
                            {u.telefono && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {u.telefono}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => {
                              toggleUserStatus(u.id);
                              toast.info(
                                `Usuario ${u.nombres} marcado como ${u.status === "ACTIVO" ? "Inactivo" : "Activo"}.`
                              );
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                              u.status === "ACTIVO"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                            }`}
                            title="Haga clic para alternar estado"
                          >
                            {u.status === "ACTIVO" ? (
                              <>
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Activo
                              </>
                            ) : (
                              <>
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                Inactivo
                              </>
                            )}
                          </button>
                        </TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuItem onClick={() => openEditModal(u)}>
                                <Edit2 className="h-3.5 w-3.5 mr-2" />
                                Editar usuario
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleUserStatus(u.id)}>
                                {u.status === "ACTIVO" ? (
                                  <>
                                    <XCircle className="h-3.5 w-3.5 mr-2 text-rose-500" />
                                    Desactivar acceso
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                                    Activar acceso
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setUserToDelete(u)}
                                className="text-rose-600 focus:text-rose-600"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Eliminar usuario
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Crear Usuario */}
      <Dialog open={isCreateModalOpen} onOpenChange={closeCreateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Registrar Nuevo Colaborador / Usuario
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Complete los datos del usuario para concederle acceso y permitir su asignación a expedientes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nombres *</label>
                <Input
                  required
                  placeholder="ej. Manuel"
                  value={formData.nombres}
                  onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Apellidos *</label>
                <Input
                  required
                  placeholder="ej. Ciprian"
                  value={formData.apellidos}
                  onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cédula de Identidad</label>
                <Input
                  placeholder="ej. 001-0000000-0"
                  value={formData.cedula}
                  onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Teléfono</label>
                <Input
                  placeholder="ej. 809-555-0199"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Correo Electrónico (Acceso) *</label>
              <Input
                type="email"
                required
                placeholder="usuario@emblemanexus.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="text-xs h-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rol Operativo *</label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value as UserRole })}
                  className="w-full text-xs h-8 rounded-md border border-slate-200 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ADMINISTRADOR">Administrador</option>
                  <option value="ABOGADO">Abogado</option>
                  <option value="AGRIMENSOR">Agrimensor</option>
                  <option value="AGENTE_INMOBILIARIO">Agente Inmobiliario</option>
                  <option value="CONTADOR">Contador</option>
                  <option value="ASISTENTE">Asistente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Área Departamental *</label>
                <select
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value as UserArea })}
                  className="w-full text-xs h-8 rounded-md border border-slate-200 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ADMINISTRACION">Administración</option>
                  <option value="LEGAL">Legal</option>
                  <option value="AGRIMENSURA">Agrimensura</option>
                  <option value="INMOBILIARIA">Inmobiliaria</option>
                  <option value="FINANZAS">Finanzas</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={closeCreateModal} className="text-xs h-8">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8">
                Registrar Usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Usuario */}
      <Dialog open={isEditModalOpen} onOpenChange={closeEditModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Editar Usuario</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Modifique los datos y privilegios asignados al colaborador.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nombres *</label>
                <Input
                  required
                  value={formData.nombres}
                  onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Apellidos *</label>
                <Input
                  required
                  value={formData.apellidos}
                  onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cédula</label>
                <Input
                  value={formData.cedula}
                  onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Teléfono</label>
                <Input
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Correo Electrónico *</label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="text-xs h-8"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rol *</label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value as UserRole })}
                  className="w-full text-xs h-8 rounded-md border border-slate-200 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ADMINISTRADOR">Administrador</option>
                  <option value="ABOGADO">Abogado</option>
                  <option value="AGRIMENSOR">Agrimensor</option>
                  <option value="AGENTE_INMOBILIARIO">Agente Inmobiliario</option>
                  <option value="CONTADOR">Contador</option>
                  <option value="ASISTENTE">Asistente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Área *</label>
                <select
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value as UserArea })}
                  className="w-full text-xs h-8 rounded-md border border-slate-200 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ADMINISTRACION">Administración</option>
                  <option value="LEGAL">Legal</option>
                  <option value="AGRIMENSURA">Agrimensura</option>
                  <option value="INMOBILIARIA">Inmobiliaria</option>
                  <option value="FINANZAS">Finanzas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                  className="w-full text-xs h-8 rounded-md border border-slate-200 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={closeEditModal} className="text-xs h-8">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8">
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación de Eliminación */}
      <Dialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-bold">Eliminar Usuario</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-600 pt-2">
              ¿Está seguro que desea eliminar al usuario{" "}
              <strong className="text-slate-900">
                {userToDelete?.nombres} {userToDelete?.apellidos}
              </strong>{" "}
              ({userToDelete?.email})? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUserToDelete(null)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDeleteConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8"
            >
              Eliminar Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
