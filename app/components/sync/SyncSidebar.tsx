import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import { Switch } from '~/components/ui/Switch';
import { formatFileSize } from '~/utils/fileUtils';

const sidebarVariants: Variants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  closed: {
    x: '100%',
    opacity: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
};

interface SyncSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function SyncSidebar({ isOpen: propIsOpen, onClose }: SyncSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const syncStatus = useStore(workbenchStore.syncStatus) || { 
    folderName: null,
    lastSync: null,
    totalFiles: 0,
    totalSize: '0B',
    isReady: false,
    hasUnsavedChanges: false
  };
  const syncSettings = useStore(workbenchStore.syncSettings) || {
    autoSync: false,
    syncOnSave: false,
    defaultSyncEnabled: false,
    autoSyncInterval: 5
  };
  const isSyncEnabled = useStore(workbenchStore.isSyncEnabled) || false;
  const currentSession = useStore(workbenchStore.currentSession) || null;
  const shouldShowSync = (useStore(workbenchStore.showWorkbench) && currentSession) || false;
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const statusColor = syncStatus.isReady ? 'bg-green-500' : 'bg-red-500';
  const initialStyle = {
    backgroundColor: syncStatus.isReady ? '#22c55e' : '#ef4444',
    transform: 'none'
  };

  useEffect(() => {
    setIsClient(true);
    if (propIsOpen !== undefined) {
      setIsOpen(propIsOpen);
    }
  }, [propIsOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }

    return undefined;
  }, [isOpen, onClose]);

  const handleFolderSelect = async () => {
    try {
      setIsLoading(true);
      const handle = await window.showDirectoryPicker();
      await workbenchStore.setSyncFolder(handle);
      setIsOpen(true);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Échec de la sélection du dossier de synchronisation:', error);
      toast.error('Échec de la sélection du dossier de synchronisation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderEject = async () => {
    try {
      await workbenchStore.setSyncFolder(null);
      await workbenchStore.toggleProjectSync(false);
      toast.success('Dossier éjecté et synchronisation désactivée');
    } catch (error) {
      console.error('Échec de l\'éjection du dossier:', error);
      toast.error('Échec de l\'éjection du dossier');
    }
  };

  const handleManualSync = async () => {
    if (!syncStatus.folderName) {
      toast.error('Veuillez d\'abord sélectionner un dossier de synchronisation');
      return;
    }

    if (!isSyncEnabled) {
      const shouldEnable = confirm('La synchronisation est actuellement désactivée. Voulez-vous l\'activer avant de synchroniser ?');
      if (shouldEnable) {
        await workbenchStore.toggleProjectSync(true);
      } else {
        return;
      }
    }

    try {
      setIsManualSyncing(true);
      await workbenchStore.syncFiles();
    } catch (error) {
      console.error('Échec de la synchronisation des fichiers:', error);
      toast.error('Échec de la synchronisation manuelle');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleSaveSettings = (settings: Partial<typeof syncSettings>) => {
    workbenchStore.saveSyncSettings({
      ...syncSettings,
      ...settings,
    });
  };

  const handleSyncToggle = () => {
    if (!syncStatus.folderName) {
      toast.error('Veuillez d\'abord sélectionner un dossier de synchronisation');
      return;
    }
    workbenchStore.toggleProjectSync(!isSyncEnabled);
  };

  const UnsavedChangesIndicator = () => (
    <motion.div
      className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-yellow-500/50"
      initial={{ scale: 0 }}
      animate={{ scale: syncStatus.hasUnsavedChanges ? 1 : 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    />
  );

  return (
    <motion.div
      ref={sidebarRef}
      className={classNames(
        'fixed right-0 top-0 h-full w-[460px] z-50',
        'bg-bolt-elements-background-depth-1 backdrop-blur-lg',
        'border-l border-bolt-elements-borderColor/20',
        'transition-all duration-200 ease-in-out',
        'shadow-2xl shadow-black/30'
      )}
      animate={isClient ? (isOpen ? 'open' : 'closed') : 'closed'}
      variants={sidebarVariants}
      initial="closed"
    >
      <div className="h-full flex flex-col">
        {/* En-tête */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-bolt-elements-borderColor/20 bg-gradient-to-r from-bolt-elements-messages-background/50 to-transparent backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="i-ph:gear-six-duotone h-5 w-5 text-green-500" />
            <span className="text-sm font-semibold text-transparent bg-gradient-to-r from-green-400 to-green-600 bg-clip-text">
              Synchronisation
            </span>
          </div>
          <div className="flex items-center gap-2">
            {syncStatus.hasUnsavedChanges && (
              <div className="flex items-center gap-1">
                <motion.div
                  className="w-2 h-2 rounded-full bg-yellow-500 shadow-sm"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                />
                <span className="text-xs text-yellow-500 border-green-500/20">Sync en attente</span>
              </div>
            )}
            <motion.button
              onClick={handleManualSync}
              disabled={isManualSyncing || !syncStatus.folderName}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={classNames(
                'p-2 rounded-lg transition-all relative',
                'bg-bolt-elements-background-depth-2 border',
                'border-green-500/50 hover:bg-green-500/20',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-label={isManualSyncing ? 'Synchronisation en cours' : 'Forcer la synchronisation'}
            >
              <div className={classNames(
                'i-ph:arrows-clockwise text-lg text-green-500',
                { 'animate-spin': isManualSyncing }
              )} />
            </motion.button>
            <motion.button
              onClick={handleSyncToggle}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={classNames(
                'p-1.5 rounded-lg transition-all relative',
                'bg-bolt-elements-background-depth-2 border',
                'border-bolt-elements-borderColor/20 hover:bg-bolt-elements-background-depth-3',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-label={isClient ? (isSyncEnabled ? 'Désactiver la synchronisation' : 'Activer la synchronisation') : 'Activer la synchronisation'}
            >
              <div className="relative w-8 h-5 rounded-full bg-bolt-elements-background-depth-3 p-1">
                <motion.div
                  className={classNames(
                    'absolute w-3 h-3 rounded-full shadow-sm',
                    statusColor
                  )}
                  initial={initialStyle}
                  animate={{
                    backgroundColor: isSyncEnabled ? '#22c55e' : '#ef4444',
                    transform: isSyncEnabled ? 'translateX(100%)' : 'none'
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.button>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Section Dossier de synchronisation */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-medium text-green-400/80 uppercase tracking-wider">
              Dossier de synchronisation
            </h3>
            {syncStatus.folderName ? (
              <div className="group relative">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-bolt-elements-messages-background/30 border border-green-500/50 hover:border-green-400/60 transition-colors">
                  <div className="i-ph:folder-duotone text-xl text-green-400/80" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-bolt-elements-textPrimary truncate">
                      {syncStatus.folderName}
                    </span>
                    {syncStatus.lastSync && (
                      <span className="text-[11px] text-bolt-elements-textSecondary/80">
                        Dernière synchronisation: {syncStatus.lastSync}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleFolderEject}
                  className="absolute -right-1 -top-1 p-1 bg-gradient-to-br from-red-500 to-red-600 rounded-full shadow-lg hover:scale-105 transition-transform"
                >
                  <div className="i-ph:eject-duotone w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-bolt-elements-background-depth-2 border border-dashed border-red-500/50 backdrop-blur-lg relative hover:border-red-400/60 transition-colors">
                <UnsavedChangesIndicator />
                <div className="i-ph:folder-simple-duotone text-3xl text-red-400/80" />
                <button
                  onClick={handleFolderSelect}
                  disabled={isLoading}
                  className={classNames(
                    'px-4 py-2 rounded-lg text-xs font-medium',
                    'bg-bolt-elements-background-depth-1 border hover:bg-green-500/20',
                    'border-green-500/50 hover:border-green-400/60',
                    'text-white hover:text-white transition-all',
                    'flex items-center gap-1.5',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  aria-label="Sélectionner un dossier de synchronisation"
                >
                  {isLoading ? (
                    <div className="i-ph:spinner-duotone animate-spin text-base" />
                  ) : (
                    <>
                      <div className="text-white i-ph:folder-simple-plus text-base" />
                      Sélectionner un dossier
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Sync Settings */}
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 px-1">
              <div className="i-ph:gear-six-duotone text-base text-green-400/80" />
              <h3 className="text-[11px] font-medium text-green-400/80 uppercase tracking-wider">
                Paramètres synchronisation
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-1.5 p-1 bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor/10">
              {[
                {
                  icon: 'i-ph:arrows-clockwise-duotone',
                  label: 'Synchronisation automatique',
                  description: 'Synchronisation automatique toutes les 5 minutes',
                  checked: syncSettings.autoSync,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleSaveSettings({ autoSync: e.target.checked })
                },
                {
                  icon: 'i-ph:floppy-disk-duotone',
                  label: 'Synchronisation à la sauvegarde',
                  description: 'Synchroniser automatiquement lors de la sauvegarde des fichiers',
                  checked: syncSettings.syncOnSave,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleSaveSettings({ syncOnSave: e.target.checked })
                },
                {
                  icon: 'i-ph:check-circle-duotone',
                  label: 'Synchronisation globale',
                  description: 'Appliquer les paramètres de synchronisation à tous les projets',
                  checked: syncSettings.defaultSyncEnabled,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleSaveSettings({ defaultSyncEnabled: e.target.checked })
                }
              ].map((setting, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-lg group cursor-pointer bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4 transition-colors border border-bolt-elements-borderColor/10"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  onClick={() => setting.onChange({ target: { checked: !setting.checked } } as React.ChangeEvent<HTMLInputElement>)}
                >
                  <div className={classNames(
                    'p-1.5 rounded-lg text-lg transition-colors',
                    setting.checked ? 'text-green-500 bg-green-500/10' : 'text-bolt-elements-textSecondary bg-bolt-elements-background-depth-2'
                  )}>
                    <div className={setting.icon} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-bolt-elements-textPrimary">{setting.label}</div>
                    <div className="text-[11px] text-bolt-elements-textSecondary/80">{setting.description}</div>
                  </div>
                  <div className={classNames(
                    'w-1.5 h-1.5 rounded-full transition-colors',
                    setting.checked ? 'bg-green-500' : 'bg-red-500'
                  )} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Status Section */}
          {syncStatus.folderName && (
            <div className="space-y-4 pt-6 border-t border-bolt-elements-borderColor/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="i-ph:activity-duotone text-xl text-green-400/80" />
                  <h3 className="text-sm font-medium text-green-400/80 uppercase tracking-wider">
                    Statistiques du projet 
                  </h3>
                </div>
              </div>

              {/* Compact Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { 
                    icon: 'i-ph:files-duotone',
                    label: 'Fichiers',
                    value: currentSession?.files?.size || 0,
                    trend: 'up'
                  },
                  { 
                    icon: 'i-ph:database-duotone',
                    label: 'Taille',
                    value: formatFileSize(Array.from(currentSession?.files || []).reduce((acc, file) => acc + file.length, 0)),
                    trend: 'up'
                  },
                  { 
                    icon: 'i-ph:clock-duotone',
                    label: 'Dernière sync',
                    value: syncStatus.lastSync || 'Jamais',
                    trend: 'neutral'
                  },
                  { 
                    icon: 'i-ph:arrows-clockwise-duotone',
                    label: 'Statut',
                    value: syncStatus.isReady ? 'OK' : 'En attentes...',
                    trend: syncStatus.isReady ? 'up' : 'down'
                  }
                ].map((stat, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-md bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor/10"
                  >
                    <div className={`${stat.icon} text-lg text-green-400/80`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-bolt-elements-textSecondary truncate">{stat.label}</div>
                      <div className="text-base font-medium text-bolt-elements-textPrimary truncate">
                        {stat.value}
                      </div>
                    </div>
                    <div className={classNames(
                      'w-4 h-4',
                      stat.trend === 'up' ? 'i-ph:trend-up text-green-500' :
                      stat.trend === 'down' ? 'i-ph:trend-down text-red-500' : 'i-ph:minus text-gray-500'
                    )} />
                  </div>
                ))}
              </div>

              {/* File Details Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-bolt-elements-textSecondary">Fichiers</h4>
                  <div className="text-xs text-bolt-elements-textSecondary">
                    {currentSession?.files?.size || 0} fichiers
                  </div>
                </div>
                <div className="max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-bolt-elements-borderColor scrollbar-track-transparent">
                  {Array.from(currentSession?.files || []).map((file, index) => (
                    <div
                      key={index}
                      className={classNames(
                        'flex items-center justify-between p-1.5 text-xs',
                        'bg-bolt-elements-background-depth-2 rounded',
                        'text-bolt-elements-textSecondary'
                      )}
                    >
                      <span className="truncate">{file}</span>
                      <span className="ml-2 whitespace-nowrap">{formatFileSize(file.length)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de page */}
        {/* {syncStatus.folderName && (
          <div className="p-4 border-t border-bolt-elements-borderColor/20 backdrop-blur-lg">
            <button
              onClick={handleManualSync}
              disabled={isManualSyncing || !syncStatus.folderName}
              className={classNames(
                'w-full py-2.5 rounded-lg font-medium text-sm bg-bolt-elements-background-depth-1 hover:bg-green-500',
                'border border-green-500/30 hover:border-green-400/40',
                'text-white hover:text-white transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'relative'
              )}
              aria-label={isManualSyncing ? 'Synchronisation en cours' : 'Forcer la synchronisation'}
            >
              <UnsavedChangesIndicator />
              <div className="flex items-center justify-center gap-2">
                <div className={classNames(
                  'i-ph:arrows-clockwise text-lg',
                  { 'animate-spin': isManualSyncing }
                )} />
                {isManualSyncing ? 'Synchronisation en cours...' : 'Forcer la synchronisation'}
              </div>
            </button>
          </div>
        )} */}
      </div>
    </motion.div>
  );
}
