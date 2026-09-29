import { create } from 'zustand';

export interface NextcloudConfig {
  isConfigured: boolean;
  serverUrl: string;
  username: string;
  password?: string;
  remotePath: string;
  status: 'disconnected' | 'connected' | 'error';
  lastChecked: string | null;
}

interface IntegrationState {
  nextcloud: NextcloudConfig;
  saveNextcloudConfig: (config: Omit<NextcloudConfig, 'isConfigured' | 'status' | 'lastChecked'>) => void;
  disconnectNextcloud: () => void;
  setNextcloudStatus: (status: 'disconnected' | 'connected' | 'error') => void;
}

const STORAGE_KEY = 'nexus_integration_nextcloud';

const DEFAULT_PRECONFIG: NextcloudConfig = {
  isConfigured: true,
  serverUrl: 'https://nextcloud.ciberemblema.com',
  username: 'admin',
  password: 'K1mK9nZmYeb9j9oMbZmv',
  remotePath: '/remote.php/dav/files/admin/nexus_storage',
  status: 'connected',
  lastChecked: '2026-09-29T19:26:24.000Z',
};

const loadSavedConfig = (): NextcloudConfig => {
  if (typeof window === 'undefined') {
    return DEFAULT_PRECONFIG;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        isConfigured: Boolean(parsed.isConfigured !== false && parsed.serverUrl && parsed.username),
        status: parsed.status || (parsed.serverUrl && parsed.username ? 'connected' : 'disconnected'),
      };
    }
  } catch {}
  return DEFAULT_PRECONFIG;
};

export const useIntegrationStore = create<IntegrationState>((set) => ({
  nextcloud: loadSavedConfig(),

  saveNextcloudConfig: (config) => {
    const newConfig: NextcloudConfig = {
      isConfigured: true,
      serverUrl: config.serverUrl,
      username: config.username,
      password: config.password,
      remotePath: config.remotePath || '/remote.php/dav/files/' + config.username + '/nexus_storage',
      status: 'connected',
      lastChecked: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    }
    set({ nextcloud: newConfig });
  },

  disconnectNextcloud: () => {
    const resetConfig: NextcloudConfig = {
      isConfigured: false,
      serverUrl: '',
      username: '',
      password: '',
      remotePath: '',
      status: 'disconnected',
      lastChecked: null,
    };
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ nextcloud: resetConfig });
  },

  setNextcloudStatus: (status) => {
    set((state) => {
      const updated: NextcloudConfig = {
        ...state.nextcloud,
        status,
        lastChecked: new Date().toISOString(),
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return { nextcloud: updated };
    });
  },
}));
