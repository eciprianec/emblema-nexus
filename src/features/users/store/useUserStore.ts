import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, CreateUserInput, UpdateUserInput, UserStatus } from '../types';

interface UserState {
  users: User[];
  selectedUser: User | null;
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  searchQuery: string;
  roleFilter: string;
  statusFilter: string;

  // Actions
  addUser: (input: CreateUserInput) => User;
  updateUser: (id: string, input: UpdateUserInput) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;
  getUserById: (id: string) => User | undefined;

  // UI state actions
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (user: User) => void;
  closeEditModal: () => void;
  setSearchQuery: (query: string) => void;
  setRoleFilter: (role: string) => void;
  setStatusFilter: (status: string) => void;
}

const DEFAULT_USERS: User[] = [
  {
    id: 'usr-admin-01',
    nombres: 'Enmanuel',
    apellidos: 'Ciprian Arias',
    email: 'admin@emblemanexus.com',
    telefono: '809-555-0101',
    rol: 'ADMINISTRADOR',
    area: 'ADMINISTRACION',
    status: 'ACTIVO',
    cedula: '001-1234567-8',
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-01-15T09:00:00.000Z',
  },
  {
    id: 'usr-leg-02',
    nombres: 'María',
    apellidos: 'Pérez Martínez',
    email: 'maria@emblemanexus.com',
    telefono: '809-555-0102',
    rol: 'ABOGADO',
    area: 'LEGAL',
    status: 'ACTIVO',
    cedula: '001-2345678-9',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
  },
  {
    id: 'usr-agr-03',
    nombres: 'Carlos',
    apellidos: 'Sánchez Rosario',
    email: 'carlos@emblemanexus.com',
    telefono: '809-555-0103',
    rol: 'AGRIMENSOR',
    area: 'AGRIMENSURA',
    status: 'ACTIVO',
    cedula: '001-3456789-0',
    createdAt: '2026-02-10T11:00:00.000Z',
    updatedAt: '2026-02-10T11:00:00.000Z',
  },
  {
    id: 'usr-inm-04',
    nombres: 'Laura',
    apellidos: 'Gómez Vidal',
    email: 'laura@emblemanexus.com',
    telefono: '809-555-0104',
    rol: 'AGENTE_INMOBILIARIO',
    area: 'INMOBILIARIA',
    status: 'ACTIVO',
    cedula: '001-4567890-1',
    createdAt: '2026-03-01T12:00:00.000Z',
    updatedAt: '2026-03-01T12:00:00.000Z',
  },
];

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      users: DEFAULT_USERS,
      selectedUser: null,
      isCreateModalOpen: false,
      isEditModalOpen: false,
      searchQuery: '',
      roleFilter: 'TODOS',
      statusFilter: 'TODOS',

      addUser: (input) => {
        const now = new Date().toISOString();
        const newUser: User = {
          id: `usr-${Date.now()}`,
          nombres: input.nombres,
          apellidos: input.apellidos,
          email: input.email.trim().toLowerCase(),
          telefono: input.telefono,
          rol: input.rol,
          area: input.area,
          status: input.status || 'ACTIVO',
          cedula: input.cedula || '',
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          users: [newUser, ...state.users],
          isCreateModalOpen: false,
        }));

        return newUser;
      },

      updateUser: (id, input) => {
        const now = new Date().toISOString();
        set((state) => ({
          users: state.users.map((u) =>
            u.id === id ? { ...u, ...input, updatedAt: now } : u
          ),
          isEditModalOpen: false,
          selectedUser: null,
        }));
      },

      deleteUser: (id) => {
        set((state) => ({
          users: state.users.filter((u) => u.id !== id),
          isEditModalOpen: false,
          selectedUser: null,
        }));
      },

      toggleUserStatus: (id) => {
        const now = new Date().toISOString();
        set((state) => ({
          users: state.users.map((u) => {
            if (u.id !== id) return u;
            const newStatus: UserStatus = u.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
            return { ...u, status: newStatus, updatedAt: now };
          }),
        }));
      },

      getUserById: (id) => {
        return get().users.find((u) => u.id === id);
      },

      openCreateModal: () => set({ isCreateModalOpen: true }),
      closeCreateModal: () => set({ isCreateModalOpen: false }),
      openEditModal: (user) => set({ isEditModalOpen: true, selectedUser: user }),
      closeEditModal: () => set({ isEditModalOpen: false, selectedUser: null }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setRoleFilter: (role) => set({ roleFilter: role }),
      setStatusFilter: (status) => set({ statusFilter: status }),
    }),
    {
      name: 'nexus_users_store',
    }
  )
);
