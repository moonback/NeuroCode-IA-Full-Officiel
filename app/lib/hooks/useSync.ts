import { useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { syncSidebarStore } from '~/lib/stores/sync-sidebar';
import { toast } from 'react-toastify';

export const useSync = () => {
  const syncFolder = useStore(workbenchStore.syncFolder);
  const syncSettings = useStore(workbenchStore.syncSettings);

  // Initialize sync session when the hook is first mounted

  const handleSyncRequest = useCallback(async () => {
    // If no sync folder is set, show the sidebar to configure it
    if (!syncFolder) {
      syncSidebarStore.open();
      return;
    }

    // If sync is disabled for this project, show the sidebar
    if (!syncSettings.defaultSyncEnabled) {
      syncSidebarStore.open();
      return;
    }

    // Otherwise, try to sync
    try {
      await workbenchStore.syncFiles();
      toast.success('Sync completed successfully');
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync failed');

      // Show the sidebar on error for configuration
      syncSidebarStore.open();
    }
  }, [syncFolder, syncSettings]);

  const openSyncSettings = useCallback(() => {
    syncSidebarStore.open();
  }, []);

  return {
    handleSyncRequest,
    openSyncSettings,
    syncFolder,
    syncSettings,
  };
};