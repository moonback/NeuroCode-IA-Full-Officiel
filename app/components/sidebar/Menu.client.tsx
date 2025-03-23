import { motion, type Variants } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
import { ControlPanel } from '~/components/@settings/core/ControlPanel';
import { SettingsButton } from '~/components/ui/SettingsButton';
import { db, deleteById, getAll, chatId, type ChatHistoryItem, useChatHistory, toggleFavorite } from '~/lib/persistence';
import { cubicEasingFn } from '~/utils/easings';
import { logger } from '~/utils/logger';
import { HistoryItem } from './HistoryItem';
import { binDates } from './date-binning';
import { useSearchFilter } from '~/lib/hooks/useSearchFilter';
import { classNames } from '~/utils/classNames';
import { useStore } from '@nanostores/react';
import { profileStore } from '~/lib/stores/profile';
import { workbenchStore } from '~/lib/stores/workbench';
import { useSettings } from '~/lib/hooks/useSettings';
import ProfileTab from '~/components/@settings/tabs/profile/ProfileTab';
import { promptStore } from '~/lib/stores/promptStore';
import { PromptLibrary } from '~/lib/common/prompt-library';
import { throttle } from 'lodash';
import { CustomPromptSettings } from '~/components/@settings/core/CustomPromptSettings';
import { HelpPanel } from './HelpPanel';

const menuVariants = {
  closed: {
    opacity: 0,
    visibility: 'hidden',
    // left: '-380px',
    transition: {
      duration: 0.3,
      ease: [0.4, 0.0, 0.2, 1],
    },
  },
  open: {
    opacity: 1,
    visibility: 'initial',
    left: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0.0, 0.2, 1],
    },
  },
} satisfies Variants;

type DialogContent = { type: 'delete'; item: ChatHistoryItem } | null;

const MOUSE_ENTER_THRESHOLD = 40;
const MOUSE_EXIT_THRESHOLD = 40;

export const Menu = () => {
  const { duplicateCurrentChat, exportChat } = useChatHistory();
  const menuRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<ChatHistoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<DialogContent>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [isCustomPromptOpen, setIsCustomPromptOpen] = useState(false);
  const profile = useStore(profileStore);
  const isSyncEnabled = useStore(workbenchStore.isSyncEnabled);
  const syncFolder = useStore(workbenchStore.syncFolder);
  const currentPrompt = useStore(promptStore);
  const { 
    contextOptimizationEnabled, 
    enableContextOptimization,
    autoSelectTemplate,
    setAutoSelectTemplate,
  } = useSettings();
  const [showPromptSelect, setShowPromptSelect] = useState(false);
  const { promptId, setPromptId } = useSettings();
  const currentPromptLibrary = PromptLibrary.getList().find(p => p.id === promptId);
  const [openSearch, setOpenSearch] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showSyncConfig, setShowSyncConfig] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const { filteredItems: filteredList, handleSearchChange } = useSearchFilter({
    items: list,
    searchFields: ['description'],
  });

  const favoriteCount = filteredList.filter(item => item.favorite).length;

  const loadEntries = useCallback(() => {
    if (db) {
      getAll(db)
        .then((list) => list.filter((item) => item.urlId && item.description))
        .then(setList)
        .catch((error) => toast(error.message));
    }
  }, []);

  const deleteItem = useCallback((event: React.UIEvent, item: ChatHistoryItem) => {
    event.preventDefault();

    if (db) {
      deleteById(db, item.id)
        .then(() => {
          loadEntries();

          if (chatId.get() === item.id) {
            // hard page navigation to clear the stores
            window.location.pathname = '/';
          }
        })
        .catch((error) => {
          toast('Impossible de supprimer la conversation');
          logger.error(error);
        });
    }
  }, []);

  const closeDialog = () => {
    setDialogContent(null);
  };

  useEffect(() => {
    if (open) {
      loadEntries();
    }
  }, [open]);

  useEffect(() => {
    if (isSettingsOpen || isProfileEditOpen) return;

    const onMouseMove = throttle((event: MouseEvent) => {
      if (event.pageX < MOUSE_ENTER_THRESHOLD) {
        setOpen(true);
      }

      if (menuRef.current && event.clientX > menuRef.current.getBoundingClientRect().right + MOUSE_EXIT_THRESHOLD) {
        setOpen(false);
      }
    }, 100);

    window.addEventListener('mousemove', onMouseMove);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      onMouseMove.cancel();
    };
  }, [isSettingsOpen, isProfileEditOpen]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpenSearch(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleDeleteClick = (event: React.UIEvent, item: ChatHistoryItem) => {
    event.preventDefault();
    setDialogContent({ type: 'delete', item });
  };

  const handleDuplicate = async (id: string) => {
    try {
      // Pass only the ID to duplicateCurrentChat
      await duplicateCurrentChat(id);
      loadEntries();
      toast.success('Chat dupliqué avec succès');
    } catch (error) {
      console.error('Erreur lors de la duplication du chat:', error);
      toast.error('Échec de la duplication du chat');
    }
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
    setOpen(false);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  const handleProfileEditClick = () => {
    setIsProfileEditOpen(true);
    setOpen(false);
  };

  const handleProfileEditClose = () => {
    setIsProfileEditOpen(false);
  };

  
  const handleContextOptimizationToggle = () => {
    const newState = !contextOptimizationEnabled;
    enableContextOptimization(newState);
    // toast(`Optimisation du contexte ${newState ? 'activée' : 'désactivée'}`);
  };

  const handleAutoSelectTemplateToggle = () => {
    const newState = !autoSelectTemplate;
    setAutoSelectTemplate(newState);
    // toast(`Sélection de modèle automatique ${newState ? 'activée' : 'désactivée'}`);
  };

  const handleSyncToggle = () => {
    if (!syncFolder) {
      toast.info('Veuillez d\'abord sélectionner un dossier de synchronisation');
      return;
    }
    workbenchStore.toggleProjectSync(!isSyncEnabled);
    toast(`Synchronisation ${!isSyncEnabled ? 'activée' : 'désactivée'}`);
  };

  const handleSyncFolderClick = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      await workbenchStore.setSyncFolder(handle);
      // toast.success('Dossier de synchronisation sélectionné');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Échec de la sélection:', error);
      toast.error('Échec de la sélection');
    }
  };

  const handleEjectSyncFolder = async () => {
    try {
      await workbenchStore.setSyncFolder(null);
      // toast.success('Dossier de synchronisation éjecté');
    } catch (error) {
      console.error('Échec de l\'éjection:', error);
      toast.error('Échec de l\'éjection');
    }
  };

  const handleToggleFavorite = useCallback(async (id: string) => {
    if (db) {
      try {
        await toggleFavorite(db, id);
        loadEntries();
      } catch (error) {
        toast('Erreur lors de la mise à jour des favoris');
        logger.error(error);
      }
    }
  }, [db]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPromptId = e.target.value;
    setPromptId(newPromptId);
    setShowPromptSelect(false);
    toast.success(
      <div className="flex items-center gap-2">
        <div className="i-ph:book w-4 h-4" />
        <span>Prompt système mis à jour : {PromptLibrary.getList().find(p => p.id === newPromptId)?.label}</span>
      </div>
    );
  };

  const filteredAndSortedItems = useMemo(() => {
    return binDates(
      filteredList.filter(item => showFavoritesOnly ? item.favorite : true)
    ).map(({ category, items }) => ({
      category,
      items: items.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0))
    }));
  }, [filteredList, showFavoritesOnly]);

  const handleCustomPromptClick = () => {
    setIsCustomPromptOpen(true);
    setOpen(false);
  };

  const handleCustomPromptClose = () => {
    setIsCustomPromptOpen(false);
  };

  const handleHelpClick = () => {
    setShowHelp(!showHelp);
  };

  return (
    <>
      <motion.div
        ref={menuRef}
        initial="closed"
        animate={open ? 'open' : 'closed'}
        variants={menuVariants}
        style={{ width: '380px' }}
        className={classNames(
          'flex selection-accent flex-col side-menu fixed top-0 h-full',
          'bg-white/95 dark:bg-gray-950/30 backdrop-blur-md',
          'border-r border-gray-100/50 dark:border-gray-800/30',
          'shadow-xl dark:shadow-2xl shadow-gray-200/50 dark:shadow-black/30',
          isSettingsOpen || isProfileEditOpen ? 'z-40' : 'z-sidebar',
          'transition-all duration-300 ease-in-out'
        )}
      >
       <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800/50 bg-gradient-to-b from-gray-50/80 to-white/50 dark:from-gray-900/80 dark:to-gray-950/50">
        <div className="text-gray-900 dark:text-white font-medium"></div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex items-center gap-2">
            {profile?.username && (
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {profile.username}
                </span>
              )}
              <div className="flex items-center justify-center w-10 h-10 overflow-hidden bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-500 rounded-full shrink-0 border-2 border-green-100 dark:border-gray-700 hover:border-green-300 transition-colors cursor-pointer">
                {profile?.avatar ? (
                  <img
                    onClick={handleProfileEditClick}
                    src={profile.avatar}
                    alt={profile?.username || 'User'}
                    className="w-full h-full object-cover"
                    loading="eager"
                    decoding="sync"
                  />
                ) : (
                  <div 
                    className="i-ph:user-fill text-lg"
                    onClick={handleProfileEditClick}
                  />
                )}
              </div>
             
            </div>
            {/* <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-950" /> */}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col border-b border-gray-100 dark:border-gray-800/50 bg-gradient-to-b from-gray-50/50 to-transparent dark:from-gray-900/50">
        <div className="flex items-center px-4 py-3 bg-gray-50/30 dark:bg-gray-900/30 backdrop-blur-sm">
          <div className="flex-1 flex items-center gap-3">
            <motion.button
              onClick={handleSettingsClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={classNames(
                'w-5 h-5 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 bg-bolt-elements-background-depth-2',
                'title="Paramètres"',
                'aria-label="Ouvrir les paramètres"',
                'role="button"',
                'tabIndex={0}'
              )}
            >
              <div className="i-ph:gear w-5 h-5" />
            </motion.button>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />

            <motion.button
              onClick={() => setOpenSearch(!openSearch)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={classNames(
                'w-5 h-5 flex items-center justify-center rounded-xl transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'bg-bolt-elements-background-depth-2',
                openSearch ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'
              )}
              title="Rechercher"
            >
              <div className="i-ph:magnifying-glass w-5 h-5" />
            </motion.button>

            <motion.button
              onClick={() => setShowPromptSelect(!showPromptSelect)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={classNames(
                'w-5 h-5 flex items-center justify-center rounded-xl transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'bg-bolt-elements-background-depth-2',
                showPromptSelect ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'
              )}
              title="Prompts"
            >
              <div className="i-ph:book w-5 h-5" />
            </motion.button>

            <motion.button
              onClick={handleCustomPromptClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={classNames(
                'w-5 h-5 flex items-center justify-center rounded-xl transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'bg-bolt-elements-background-depth-2',
                isCustomPromptOpen ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'
              )}
              title="Instructions personnalisées"
            >
              <div className="i-ph:terminal-window w-5 h-5" />
            </motion.button>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              onClick={handleContextOptimizationToggle}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={classNames(
                'relative w-5 h-5 flex items-center justify-center rounded-xl transition-all',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'bg-bolt-elements-background-depth-2',
                contextOptimizationEnabled ? 'text-white' : 'text-gray-500 dark:text-gray-400'
              )}
              title="Optimisation du contexte"
            >
              <div className="i-ph:brain w-5 h-5" />
              {contextOptimizationEnabled && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-950"
                />
              )}
            </motion.button>

            <motion.button
              onClick={handleAutoSelectTemplateToggle}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={classNames(
                'relative w-5 h-5 flex items-center justify-center rounded-xl transition-all',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'bg-bolt-elements-background-depth-2',
                autoSelectTemplate ? 'text-white' : 'text-gray-500 dark:text-gray-400'
              )}
              title="Sélection automatique des modèles"
            >
              <div className="i-ph:magic-wand w-5 h-5" />
              {autoSelectTemplate && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-950"
                />
              )}
            </motion.button>

            <motion.button
              onClick={() => setShowSyncConfig(!showSyncConfig)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={classNames(
                'relative w-5 h-5 flex items-center justify-center rounded-xl transition-all',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'bg-bolt-elements-background-depth-2',
                isSyncEnabled ? 'text-white' : 'text-gray-500 dark:text-gray-400'
              )}
              title="Configuration de la synchronisation"
            >
              <div className="i-ph:arrows-clockwise w-5 h-5" />
              {!syncFolder && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-950"
                />
              )}
              {syncFolder && isSyncEnabled && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-950"
                />
              )}
            </motion.button>
          </div>
        </div>

        {chatId.get() && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2"
          >
            <motion.button
              onClick={() => window.location.pathname = '/'}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full px-4 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/15 text-green-600 dark:text-green-400 
                         transition-colors flex items-center justify-center gap-2 border border-green-500/20"
              title="Nouvelle conversation"
            >
              <div className="i-ph:plus w-5 h-5" />
              <span className="font-medium">Nouvelle conversation</span>
            </motion.button>
          </motion.div>
        )}
      </div>
      
      {openSearch && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-4 border-b border-gray-100 dark:border-gray-800/50 bg-gradient-to-b from-gray-50/30 to-transparent dark:from-gray-900/30"
        >
          <div className="relative w-full group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors group-hover:text-green-500">
              <div className="i-ph:magnifying-glass h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              className={classNames(
                "w-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm",
                "pl-9 pr-3 py-2.5 rounded-xl",
                "focus:outline-none focus:ring-2 focus:ring-green-500/30",
                "text-sm text-gray-900 dark:text-gray-100",
                "placeholder-gray-500 dark:placeholder-gray-500",
                "border border-gray-200/50 dark:border-gray-800/30",
                "transition-all duration-200",
                "hover:border-green-300/50 focus:border-green-500/50",
                "shadow-sm hover:shadow-md dark:shadow-none"
              )}
              type="search"
              placeholder="Rechercher des conversations..."
              onChange={handleSearchChange}
              aria-label="Rechercher des conversations"
            />
          </div>
        </motion.div>
      )}
      
      {showPromptSelect && (
        <div className="p-4 border-b border-gray-100 dark:border-gray-800/50">
          <div className="bg-bolt-elements-background-depth-2 p-2 rounded-lg border border-bolt-elements-borderColor shadow-lg">
            <div className="mb-2 px-2 py-1 text-sm text-bolt-elements-textSecondary">
              Sélectionnez un prompt système
            </div>
            <div className="max-h-60 overflow-y-auto">
              {PromptLibrary.getList().map((x) => (
                <button
                  key={x.id}
                  onClick={() => {
                    handlePromptChange({ target: { value: x.id } } as React.ChangeEvent<HTMLSelectElement>);
                    setShowPromptSelect(false);
                  }}
                  className={classNames(
                    'w-full px-3 py-2 text-left rounded-md text-sm',
                    'text-bolt-elements-textPrimary',
                    'hover:bg-bolt-elements-background-depth-1',
                    'transition-colors duration-200',
                    'flex items-center justify-between',
                    promptId === x.id ? 'text-white bg-bolt-elements-background-depth-3 font-medium' : 'bg-transparent'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={classNames(
                      'i-ph:file-text w-4 h-4',
                      promptId === x.id ? 'text-green-500' : 'text-bolt-elements-textSecondary'
                    )} />
                    <span>{x.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {x.id === 'smallModel' && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500">(Petit LLM)</span>
                    )}
                    {x.id === 'default' && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500">(Officiel)</span>
                    )}
                    {x.id === 'test' && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500">(UI/UX)</span>
                    )}
                    {promptId === x.id && (
                      <div className="i-ph:check w-4 h-4 text-green-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-2 px-2 pt-2 border-t border-bolt-elements-borderColor">
              <button
                onClick={() => setShowPromptSelect(false)}
                className="w-full px-3 py-1.5 text-sm rounded-md text-bolt-elements-textTertiary bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-3 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showSyncConfig && (
        <div className="p-4 border-b border-gray-100 dark:border-gray-800/50">
          <div className="bg-bolt-elements-background-depth-2 p-2 rounded-lg border border-bolt-elements-borderColor shadow-lg">
            <div className="mb-2 px-2 py-1 text-sm text-bolt-elements-textSecondary">
              Configuration de la synchronisation
            </div>
            <div className="space-y-2">
              {!syncFolder && (
                <button
                  onClick={handleSyncFolderClick}
                  className={classNames(
                    'w-full px-3 py-2 text-left rounded-md text-sm',
                    'text-bolt-elements-textPrimary',
                    'bg-red-500/20 hover:bg-bolt-elements-background-depth-3',
                    'transition-colors duration-200',
                    'flex items-center gap-2'
                  )}
                >
                  <div className="i-ph:arrows-clockwise w-4 h-4" />
                  <span>Configurer la synchronisation</span>
                </button>
              )}
              {syncFolder && (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-bolt-elements-textPrimary">
                    <div className="i-ph:folder-simple-user w-4 h-4" />
                    <span className="truncate">{syncFolder.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEjectSyncFolder}
                      className={classNames(
                        'flex-1 px-3 py-2 text-left rounded-md text-sm',
                        'bg-red-500/20',
                        'text-white',
                        'hover:bg-red-500/10',
                        'transition-colors duration-200',
                        'flex items-center gap-2'
                      )}
                    >
                      <div className="i-ph:eject w-4 h-4" />
                      <span>Éjecter</span>
                    </button>
                    <button
                      onClick={handleSyncToggle}
                      className={classNames(
                        'flex-1 px-3 py-2 text-left rounded-md text-sm',
                        isSyncEnabled ? 'text-white bg-red-500/20 hover:bg-red-500/10' : 'text-white bg-green-500/20 hover:bg-green-500/10',
                        'transition-colors duration-200',
                        'flex items-center gap-2'
                      )}
                    >
                      <div className="i-ph:arrows-clockwise w-4 h-4" />
                      <span>{isSyncEnabled ? 'Désactiver' : 'Activer'}</span>
                    </button>
                  </div>
                </>
              )}
              <button
                onClick={() => setShowSyncConfig(false)}
                className="w-full px-3 py-1.5 text-sm rounded-md text-bolt-elements-textTertiary bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-3 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        <div className={classNames(
          "sticky top-0 z-10",
          "px-4 py-3",
          "bg-gradient-to-b from-white/90 to-white/50",
          "dark:from-gray-950/90 dark:to-gray-950/50",
          "backdrop-blur-sm",
          "border-b border-gray-100/50 dark:border-gray-800/30",
          "text-gray-600 dark:text-gray-400",
          "text-sm font-medium",
          "flex items-center justify-between"
        )}>
          Historique ({filteredList.length}) 
          {favoriteCount > 0 && (
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={classNames(
                'ml-2',
                'bg-bolt-elements-background-depth-2',
                'p-1 rounded-lg',
                showFavoritesOnly ? 'text-yellow-500' : 'text-yellow-500 hover:text-yellow-500/50',
                'transition-colors duration-200'
              )}
            >
              <div className="i-ph:star-fill inline-block w-4 h-4" /> {favoriteCount}
            </button>
          )}
        </div>
        <div className="flex-1 overflow-auto px-3 pb-3">
          {filteredList.length === 0 && (
            <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
              <div className="i-ph:chat-circle-dotted text-3xl text-gray-400 dark:text-gray-500 mb-3" />
              <h3 className="text-gray-600 dark:text-gray-300 font-medium mb-1">
                Aucune conversation trouvée
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-[260px]">
                {list.length === 0
                  ? 'Commencez une nouvelle conversation pour voir apparaître votre historique ici.'
                  : 'Aucun résultat ne correspond à votre recherche.'}
              </p>
              {list.length === 0 && (
                <a
                  href="/"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors"
                >
                  <div className="i-ph:plus" />
                  <span>Nouvelle conversation</span>
                </a>
              )}
            </div>
          )}
          <DialogRoot open={dialogContent !== null}>
            {filteredAndSortedItems.map(({ category, items }) => (
              <div key={category} className="mt-2 first:mt-0 space-y-1">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 sticky top-0 z-1 bg-white/50 dark:bg-transparent backdrop-blur-sm px-4 py-1.5">
                  {category}
                </div>
                <div className="space-y-0.5 pr-1">
                  {items.map((item) => (
                    <HistoryItem
                      key={item.id}
                      item={item}
                      exportChat={exportChat}
                      onDelete={(event) => handleDeleteClick(event, item)}
                      onDuplicate={() => handleDuplicate(item.id)}
                      onFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              </div>
            ))}
            <Dialog onBackdrop={closeDialog} onClose={closeDialog}>
              {dialogContent?.type === 'delete' && (
                <>
                  <div className="p-6 bg-white dark:bg-gray-950">
                    <DialogTitle className="text-gray-900 dark:text-white">Supprimer la conversation?</DialogTitle>
                    <DialogDescription className="mt-2 text-gray-600 dark:text-gray-400">
                      <p>
                        Vous êtes sur le point de supprimer{' '}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {dialogContent.item.description}
                        </span>
                      </p>
                      <p className="mt-2">Cette action est irréversible.</p>
                    </DialogDescription>
                  </div>
                  <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm border-t border-gray-100/50 dark:border-gray-800/30">
                    <DialogButton type="secondary" onClick={closeDialog}>
                      Annuler
                    </DialogButton>
                    <DialogButton
                      type="danger"
                      onClick={(event) => {
                        deleteItem(event, dialogContent.item);
                        closeDialog();
                      }}
                    >
                      Supprimer
                    </DialogButton>
                  </div>
                </>
              )}
            </Dialog>
            
          </DialogRoot>
          
        </div>
       
        
      </div>
      
      <div className="sticky bottom-0 p-4 border-t border-gray-100/50 dark:border-gray-800/30 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm">
        <motion.button
          onClick={handleHelpClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={classNames(
            'w-full px-4 py-2 rounded-xl',
            'bg-blue-500/10 hover:bg-blue-500/15',
            'text-blue-600 dark:text-blue-400',
            'transition-colors flex items-center justify-center gap-2',
            'border border-blue-500/20'
          )}
          title="Aide"
        >
          <div className="i-ph:question w-5 h-5" />
          <span className="font-medium">Aide</span>
        </motion.button>
      </div>
    </motion.div>

    <ControlPanel open={isSettingsOpen} onClose={handleSettingsClose} />
    <ProfileTab open={isProfileEditOpen} onClose={handleProfileEditClose} />
    <DialogRoot open={isCustomPromptOpen}>
      <Dialog onClose={handleCustomPromptClose} className="max-w-2xl w-full">
        <DialogTitle className="sr-only">Instructions personnalisées</DialogTitle>
        <DialogDescription className="sr-only">
          Personnalisez les réponses de l'assistant pour ce projet
        </DialogDescription>
        <CustomPromptSettings 
          open={isCustomPromptOpen} 
          onClose={handleCustomPromptClose} 
        />
      </Dialog>
    </DialogRoot>

    <HelpPanel show={showHelp} onClose={handleHelpClick} />
  </>
);
};
