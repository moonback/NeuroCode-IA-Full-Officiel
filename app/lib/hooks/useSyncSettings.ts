import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';

export const useSyncSettings = () => {
  const syncSettings = useStore(workbenchStore.syncSettings) || {
    autoSync: false,
    syncOnSave: false,
    defaultSyncEnabled: false,
    autoSyncInterval: 5
  };

  return syncSettings;
}; 