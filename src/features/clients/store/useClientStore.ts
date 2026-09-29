import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Client, CreateClientInput, UpdateClientInput } from '../types';

interface ClientState {
  clients: Client[];
  selectedClient: Client | null;
  searchQuery: string;
  typeFilter: 'TODOS' | 'FISICA' | 'JURIDICA';

  // Actions
  addClient: (input: CreateClientInput) => Client;
  updateClient: (id: string, input: UpdateClientInput) => void;
  deleteClient: (id: string) => void;
  getClientById: (id: string) => Client | undefined;
  setSearchQuery: (query: string) => void;
  setTypeFilter: (filter: 'TODOS' | 'FISICA' | 'JURIDICA') => void;
}

export const useClientStore = create<ClientState>()(
  persist(
    (set, get) => ({
      clients: [],
      selectedClient: null,
      searchQuery: '',
      typeFilter: 'TODOS',

      addClient: (input) => {
        const now = new Date().toISOString();
        const newClient: Client = {
          id: `cl-${Date.now()}`,
          ...input,
          status: input.status || 'ACTIVO',
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          clients: [newClient, ...state.clients],
        }));

        return newClient;
      },

      updateClient: (id, input) => {
        const now = new Date().toISOString();
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, ...input, updatedAt: now } : c
          ),
          selectedClient: state.selectedClient?.id === id
            ? { ...state.selectedClient, ...input, updatedAt: now }
            : state.selectedClient,
        }));
      },

      deleteClient: (id) => {
        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id),
          selectedClient: state.selectedClient?.id === id ? null : state.selectedClient,
        }));
      },

      getClientById: (id) => {
        return get().clients.find((c) => c.id === id);
      },

      setSearchQuery: (query) => set({ searchQuery: query }),
      setTypeFilter: (filter) => set({ typeFilter: filter }),
    }),
    {
      name: 'nexus_clients_store',
    }
  )
);
