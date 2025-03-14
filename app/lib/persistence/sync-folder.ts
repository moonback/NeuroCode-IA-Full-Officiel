import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import '~/types/file-system';

const DB_NAME = 'bolt_sync';
const STORE_NAME = 'sync_folder';
const HANDLE_KEY = 'folder_handle';

// Open the IndexedDB database
const openSyncDB = () => {
  return openDB(DB_NAME, 1, {
    upgrade(db: IDBPDatabase) {
      db.createObjectStore(STORE_NAME);
    },
  });
};

// Save the folder handle to IndexedDB
export async function saveSyncFolderHandle(handle: FileSystemDirectoryHandle) {
  console.log('Sauvegarde du handle du dossier de synchronisation dans IndexedDB:', handle.name);

  const db = await openSyncDB();
  await db.put(STORE_NAME, handle, HANDLE_KEY);
}

// Load the folder handle from IndexedDB and verify permissions
export async function loadSyncFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    console.log('Chargement du handle du dossier de synchronisation depuis IndexedDB...');

    const db = await openSyncDB();
    const handle = (await db.get(STORE_NAME, HANDLE_KEY)) as FileSystemDirectoryHandle;

    if (!handle) {
      console.log('Aucun handle du dossier de synchronisation trouvé dans IndexedDB');
      return null;
    }

    console.log('Handle du dossier de synchronisation trouvé:', handle.name);

    // Verify we still have permission to access the folder
    console.log('Vérification des permissions du dossier...');

    const permissionStatus = await handle.queryPermission({ mode: 'readwrite' });
    console.log('Statut de permission actuel:', permissionStatus);

    if (permissionStatus === 'granted') {
      console.log('Permission déjà accordée');
      return handle;
    }

    // If permission is 'prompt', request it again
    if (permissionStatus === 'prompt') {
      console.log('Demande de permission à nouveau...');

      const newPermissionStatus = await handle.requestPermission({ mode: 'readwrite' });
      console.log('Nouveau statut de permission:', newPermissionStatus);

      if (newPermissionStatus === 'granted') {
        console.log('Permission accordée');
        return handle;
      }
    }

    // If we don't have permission, remove the handle
    console.log('Permission refusée, suppression du handle de IndexedDB');
    await db.delete(STORE_NAME, HANDLE_KEY);

    return null;
  } catch (error) {
    console.error('Erreur lors du chargement du handle du dossier de synchronisation:', error);
    return null;
  }
}

// Clear the stored handle from IndexedDB
export async function clearSyncFolderHandle() {
  console.log('Suppression du handle du dossier de synchronisation de IndexedDB');

  const db = await openSyncDB();
  await db.delete(STORE_NAME, HANDLE_KEY);
}
