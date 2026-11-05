import { create } from 'zustand';

export interface NextcloudConfig {
  isConfigured: boolean;
  serverUrl: string;
  username: string;
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

const NOT_CONFIGURED: NextcloudConfig = {
  isConfigured: false,
  serverUrl: '',
  username: '',
  remotePath: '',
  status: 'disconnected',
  lastChecked: null,
};

const loadSavedConfig = (): NextcloudConfig => {
  if (typeof window === 'undefined') {
    return NOT_CONFIGURED;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // Las credenciales viven solo en el servidor: borra la contraseña que versiones anteriores guardaban aquí.
      const { password: _legacyPassword, ...parsed } = JSON.parse(raw);
      if (_legacyPassword !== undefined) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
      return {
        ...parsed,
        isConfigured: Boolean(parsed.isConfigured !== false && parsed.serverUrl && parsed.username),
        status: parsed.status || (parsed.serverUrl && parsed.username ? 'connected' : 'disconnected'),
      };
    }
  } catch {}
  return NOT_CONFIGURED;
};

export const useIntegrationStore = create<IntegrationState>((set) => ({
  nextcloud: loadSavedConfig(),

  saveNextcloudConfig: (config) => {
    const newConfig: NextcloudConfig = {
      isConfigured: true,
      serverUrl: config.serverUrl,
      username: config.username,
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
