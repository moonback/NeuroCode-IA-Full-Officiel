import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@nanostores/react';
import { Switch } from '@radix-ui/react-switch';
import * as RadixDialog from '@radix-ui/react-dialog';
import { classNames } from '~/utils/classNames';
import { TabManagement } from '~/components/@settings/shared/components/TabManagement';
import { TabTile } from '~/components/@settings/shared/components/TabTile';
import { useUpdateCheck } from '~/lib/hooks/useUpdateCheck';
import { useFeatures } from '~/lib/hooks/useFeatures';
import { useNotifications } from '~/lib/hooks/useNotifications';
import { useConnectionStatus } from '~/lib/hooks/useConnectionStatus';
import { useDebugStatus } from '~/lib/hooks/useDebugStatus';
import {
  tabConfigurationStore,
  developerModeStore,
  setDeveloperMode,
  resetTabConfiguration,
} from '~/lib/stores/settings';
import { profileStore } from '~/lib/stores/profile';
import type { TabType, TabVisibilityConfig, Profile } from './types';
import { TAB_LABELS, DEFAULT_TAB_CONFIG } from './constants';
import { DialogTitle } from '~/components/ui/Dialog';
import { AvatarDropdown } from './AvatarDropdown';
import BackgroundRays from '~/components/ui/BackgroundRays';

// Import all tab components
// import ProfileTab from '~/components/@settings/tabs/profile/ProfileTab';
import SettingsTab from '~/components/@settings/tabs/settings/SettingsTab';
import NotificationsTab from '~/components/@settings/tabs/notifications/NotificationsTab';
import FeaturesTab from '~/components/@settings/tabs/features/FeaturesTab';
import DataTab from '~/components/@settings/tabs/data/DataTab';
import DebugTab from '~/components/@settings/tabs/debug/DebugTab';
import { EventLogsTab } from '~/components/@settings/tabs/event-logs/EventLogsTab';
import UpdateTab from '~/components/@settings/tabs/update/UpdateTab';
import ConnectionsTab from '~/components/@settings/tabs/connections/ConnectionsTab';
import CloudProvidersTab from '~/components/@settings/tabs/providers/cloud/CloudProvidersTab';
import ServiceStatusTab from '~/components/@settings/tabs/providers/status/ServiceStatusTab';
import LocalProvidersTab from '~/components/@settings/tabs/providers/local/LocalProvidersTab';
import TaskManagerTab from '~/components/@settings/tabs/task-manager/TaskManagerTab';
import SyncTab from '~/components/@settings/tabs/sync/SyncTab';
import { CustomPromptSettings } from './CustomPromptSettings';
import MCPTab from '~/components/@settings/tabs/mcp/MCPTab';


interface ControlPanelProps {
  open: boolean;
  onClose: () => void;
}

interface TabWithDevType extends TabVisibilityConfig {
  isExtraDevTab?: boolean;
}

interface ExtendedTabConfig extends TabVisibilityConfig {
  isExtraDevTab?: boolean;
}

interface BaseTabConfig {
  id: TabType;
  visible: boolean;
  window: 'user' | 'developer';
  order: number;
}

interface AnimatedSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id: string;
  label: string;
}

const TAB_DESCRIPTIONS: Record<TabType, string> = {
  settings: 'Configurez les préférences de l\'application',
  notifications: 'Consultez et gérez vos notifications',
  features: 'Découvrez les nouvelles fonctionnalités et celles à venir',
  data: 'Gérez vos données et votre stockage',
  'cloud-providers': 'Configurez les fournisseurs d\'IA cloud et les modèles',
  'local-providers': 'Configurez les fournisseurs d\'IA locaux et les modèles',
  'service-status': 'Surveillez l\'état des services LLM cloud',
  connection: 'Vérifiez l\'état de la connexion et les paramètres',
  debug: 'Outils de débogage et informations système',
  'event-logs': 'Consultez les événements et journaux système',
  update: 'Vérifiez les mises à jour et les notes de version',
  'task-manager': 'Surveillez les ressources système et les processus',
  'tab-management': 'Configurez les onglets visibles et leur ordre',
  sync: 'Synchronisez vos données et paramètres',
  'custom-prompt': 'Configurez les instructions système personnalisées',
  mcp: 'Configurez les paramètres MCP',
};

// Beta status for experimental features
const BETA_TABS = new Set<TabType>(['task-manager', 'custom-prompt', 'service-status', 'update', 'local-providers', 'mcp']);

const BetaLabel = () => (
  <motion.div
    className="absolute top-0 right-2 px-2.5 py-1 rounded-full bg-green-500/10 dark:bg-green-500/20 hover:bg-green-500/20 dark:hover:bg-green-500/30 transition-all duration-200 group backdrop-blur-sm border border-green-500/20 shadow-sm hover:shadow-md"
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    whileHover={{ scale: 1.05, backgroundColor: 'rgba(16, 185, 129, 0.15)' }}
    whileTap={{ scale: 0.95 }}
  >
    <motion.span
      className="text-[11px] font-semibold text-green-600 dark:text-white hover:text-green-700 dark:hover:text-green-300 transition-colors duration-200 relative inline-flex items-center gap-1.5"
      whileHover={{ x: 2 }}
    >
      <motion.span
        className="i-ph:flask-fill w-3.5 h-3.5 text-green-500/80 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-300 transition-colors duration-200"
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
      />
      <span className="relative -top-px tracking-wide bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent dark:from-green-300 dark:to-green-200">
        BÊTA
      </span>
    </motion.span>
  </motion.div>
);

const AnimatedSwitch = ({ checked, onCheckedChange, id, label }: AnimatedSwitchProps) => {
  return (
    <div className="flex items-center gap-2">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={classNames(
          'relative inline-flex h-6 w-11 items-center rounded-full',
          'transition-all duration-300 ease-[cubic-bezier(0.87,_0,_0.13,_1)]',
          'bg-gray-200 dark:bg-gray-700',
          'data-[state=checked]:bg-green-500',
          'focus:outline-none focus:ring-2 focus:ring-green-500/20',
          'cursor-pointer',
          'group',
        )}
      >
        <motion.span
          className={classNames(
            'absolute left-[2px] top-[2px]',
            'inline-block h-5 w-5 rounded-full',
            'bg-white shadow-lg',
            'transition-shadow duration-300',
            'group-hover:shadow-md group-active:shadow-sm',
            'group-hover:scale-95 group-active:scale-90',
          )}
          initial={false}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
            duration: 0.2,
          }}
          animate={{
            x: checked ? '1.25rem' : '0rem',
          }}
        />
      </Switch>
      <label
        htmlFor={id}
        className="text-sm font-medium text-gray-600 dark:text-gray-300 select-none cursor-pointer whitespace-nowrap"
      >
        {label}
      </label>
    </div>
  );
};

export const ControlPanel = ({ open, onClose }: ControlPanelProps) => {
  // State
  const [activeTab, setActiveTab] = useState<TabType | null>(null);
  const [loadingTab, setLoadingTab] = useState<TabType | null>(null);
  const [showTabManagement, setShowTabManagement] = useState(false);

  // Store values
  const tabConfiguration = useStore(tabConfigurationStore);
  const developerMode = useStore(developerModeStore);
  const profile = useStore(profileStore) as Profile;

  // Status hooks
  const { hasUpdate, currentVersion, acknowledgeUpdate } = useUpdateCheck();
  const { hasNewFeatures, unviewedFeatures, acknowledgeAllFeatures } = useFeatures();
  const { hasUnreadNotifications, unreadNotifications, markAllAsRead } = useNotifications();
  const { hasConnectionIssues, currentIssue, acknowledgeIssue } = useConnectionStatus();
  const { hasActiveWarnings, activeIssues, acknowledgeAllIssues } = useDebugStatus();

  // Memoize the base tab configurations to avoid recalculation
  const baseTabConfig = useMemo(() => {
    return new Map(DEFAULT_TAB_CONFIG.map((tab) => [tab.id, tab]));
  }, []);

  // Add visibleTabs logic using useMemo with optimized calculations
  const visibleTabs = useMemo(() => {
    if (!tabConfiguration?.userTabs || !Array.isArray(tabConfiguration.userTabs)) {
      console.warn('Configuration de l\'onglet invalide, réinitialisation aux valeurs par défaut');
      resetTabConfiguration();

      return [];
    }

    const notificationsDisabled = profile?.preferences?.notifications === false;

    // In developer mode, show ALL tabs without restrictions
    if (developerMode) {
      const seenTabs = new Set<TabType>();
      const devTabs: ExtendedTabConfig[] = [];

      // Process tabs in order of priority: developer, user, default
      const processTab = (tab: BaseTabConfig) => {
        if (!seenTabs.has(tab.id)) {
          seenTabs.add(tab.id);
          devTabs.push({
            id: tab.id,
            visible: true,
            window: 'developer',
            order: tab.order || devTabs.length,
          });
        }
      };

      // Process tabs in priority order
      tabConfiguration.developerTabs?.forEach((tab) => processTab(tab as BaseTabConfig));
      tabConfiguration.userTabs.forEach((tab) => processTab(tab as BaseTabConfig));
      DEFAULT_TAB_CONFIG.forEach((tab) => processTab(tab as BaseTabConfig));

      // Add Tab Management tile
      devTabs.push({
        id: 'tab-management' as TabType,
        visible: true,
        window: 'developer',
        order: devTabs.length,
        isExtraDevTab: true,
      });

      return devTabs.sort((a, b) => a.order - b.order);
    }

    // Optimize user mode tab filtering
    return tabConfiguration.userTabs
      .filter((tab) => {
        if (!tab?.id) {
          return false;
        }

        if (tab.id === 'notifications' && notificationsDisabled) {
          return false;
        }

        return tab.visible && tab.window === 'user';
      })
      .sort((a, b) => a.order - b.order);
  }, [tabConfiguration, developerMode, profile?.preferences?.notifications, baseTabConfig]);

  // Optimize animation performance with layout animations
  const gridLayoutVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.02,
        staggerDirection: -1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
        mass: 0.6,
      },
    },
    hover: {
      scale: 1.03,
      boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
      transition: { duration: 0.2 },
    },
  };
// Reset to default view when modal opens/closes
useEffect(() => {
  if (!open) {
    // Reset when closing
    setActiveTab(null);
    setLoadingTab(null);
    setShowTabManagement(false);
  } else {
    // When opening, set to null to show the main view
    setActiveTab(null);
  }
}, [open]);

// Handle closing
const handleClose = () => {
  setActiveTab(null);
  setLoadingTab(null);
  setShowTabManagement(false);
  onClose();
};
  // Handlers
  const handleBack = () => {
    if (showTabManagement) {
      setShowTabManagement(false);
    } else if (activeTab) {
      setActiveTab(null);
    }
  };

  const handleDeveloperModeChange = (checked: boolean) => {
    setDeveloperMode(checked);
  };

  // // Add effect to log developer mode changes
  // useEffect(() => {
  // }, [developerMode]);

  const getTabComponent = (tabId: TabType | 'tab-management') => {
    switch (tabId) {
      // case 'profile':
        // return <ProfileTab />;
      case 'settings':
        return <SettingsTab />;
      case 'notifications':
        return <NotificationsTab />;
      case 'features':
        return <FeaturesTab />;
      case 'data':
        return <DataTab />;
      case 'cloud-providers':
        return <CloudProvidersTab />;
      case 'local-providers':
        return <LocalProvidersTab />;
      case 'service-status':
        return <ServiceStatusTab />;
      case 'connection':
        return <ConnectionsTab />;
      case 'debug':
        return <DebugTab />;
      case 'event-logs':
        return <EventLogsTab />;
      case 'update':
        return <UpdateTab />;
      case 'task-manager':
        return <TaskManagerTab />;
      case 'tab-management':
        return <TabManagement />;
      case 'sync':
        return <SyncTab />;
      case 'custom-prompt':
        return <CustomPromptSettings open={activeTab === 'custom-prompt'} onClose={handleBack} />;
      default:
        return null;
    }
  };

  const getTabUpdateStatus = (tabId: TabType): boolean => {
    switch (tabId) {
      case 'update':
        return hasUpdate;
      case 'features':
        return hasNewFeatures;
      case 'notifications':
        return hasUnreadNotifications;
      case 'connection':
        return hasConnectionIssues;
      case 'debug':
        return hasActiveWarnings;
      default:
        return false;
    }
  };

  const getStatusMessage = (tabId: TabType): string => {
    switch (tabId) {
      case 'update':
        return `Nouvelle mise à jour disponible (v${currentVersion})`;
      case 'features':
        return `${unviewedFeatures.length} nouvelle fonctionnalité${unviewedFeatures.length === 1 ? '' : 's'} à explorer`;
      case 'notifications':
        return `${unreadNotifications.length} notification${unreadNotifications.length === 1 ? '' : 's'} non lue${unreadNotifications.length === 1 ? '' : 's'}`;
      case 'connection':
        return currentIssue === 'disconnected'
          ? 'Connexion perdue'
          : currentIssue === 'high-latency'
            ? 'Latence élevée détectée'
            : 'Problèmes de connexion détectés';
      case 'debug': {
        const warnings = activeIssues.filter((i) => i.type === 'warning').length;
        const errors = activeIssues.filter((i) => i.type === 'error').length;

        return `${warnings} warning${warnings === 1 ? '' : 's'}, ${errors} error${errors === 1 ? '' : 's'}`;
      }
      default:
        return '';
    }
  };

  const handleTabClick = (tabId: TabType) => {
    setLoadingTab(tabId);
    setActiveTab(tabId);
    setShowTabManagement(false);

    // Acknowledge notifications based on tab
    switch (tabId) {
      case 'update':
        acknowledgeUpdate();
        break;
      case 'features':
        acknowledgeAllFeatures();
        break;
      case 'notifications':
        markAllAsRead();
        break;
      case 'connection':
        acknowledgeIssue();
        break;
      case 'debug':
        acknowledgeAllIssues();
        break;
    }

    // Clear loading state after a delay
    setTimeout(() => setLoadingTab(null), 500);
  };

  return (
    <RadixDialog.Root open={open}>
      <RadixDialog.Portal>
        <div className="fixed inset-0 flex items-center justify-center z-[100]">
          <RadixDialog.Overlay asChild>
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </RadixDialog.Overlay>

          <RadixDialog.Content
            aria-describedby={undefined}
            onEscapeKeyDown={handleClose}
            onPointerDownOutside={handleClose}
            className="relative z-[101]"
          >
            <motion.div
              className={classNames(
                'w-[1200px] h-[90vh] max-w-[95vw]',
                'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
                'rounded-2xl shadow-2xl',
                'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                'flex flex-col overflow-hidden',
                'relative',
              )}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div className="absolute inset-0 overflow-hidden rounded-2xl">
                <BackgroundRays />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-black/30 backdrop-blur-sm">
                  <div className="flex items-center space-x-4">
                    {(activeTab || showTabManagement) && (
                      <button
                        onClick={handleBack}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-transparent hover:bg-green-500/10 dark:hover:bg-green-500/20 group transition-all duration-200"
                      >
                        <div className="i-ph:arrow-left w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-green-500 transition-colors" />
                      </button>
                    )}
                    <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                      {showTabManagement ? 'Gestion des onglets' : activeTab ? TAB_LABELS[activeTab] : 'Panneau de contrôle'}
                    </DialogTitle>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Mode Toggle */}
                    <div className="flex items-center gap-2 min-w-[140px] border-r border-gray-200 dark:border-gray-800 pr-4">
                      <AnimatedSwitch
                        id="developer-mode"
                        checked={developerMode}
                        onCheckedChange={handleDeveloperModeChange}
                        label={developerMode ? 'Développeur' : 'Utilisateur'}
                      />
                    </div>

                    {/* Avatar and Dropdown */}
                    <div className="border-l border-gray-200 dark:border-gray-800 pl-4">
                      <AvatarDropdown onSelectTab={handleTabClick} />
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={handleClose}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-transparent hover:bg-green-500/10 dark:hover:bg-green-500/20 group transition-all duration-200"
                    >
                      <div className="i-ph:x w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-green-500 transition-colors" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div
                  className={classNames(
                    'flex-1',
                    'overflow-y-auto',
                    'scrollbar scrollbar-w-2',
                    'scrollbar-track-transparent',
                    'scrollbar-thumb-[#E5E5E5] hover:scrollbar-thumb-[#CCCCCC]',
                    'dark:scrollbar-thumb-[#333333] dark:hover:scrollbar-thumb-[#444444]',
                    'will-change-scroll',
                    'touch-auto',
                    'p-6',
                  )}
                >
                  <motion.div
                    key={activeTab || 'home'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="h-full"
                  >
                    {showTabManagement ? (
                      <TabManagement />
                    ) : activeTab ? (
                      getTabComponent(activeTab)
                    ) : (
                      <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative"
                        variants={gridLayoutVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <AnimatePresence mode="popLayout">
                          {(visibleTabs as TabWithDevType[]).map((tab: TabWithDevType) => (
                            <motion.div 
                              key={tab.id} 
                              layout 
                              variants={itemVariants}
                              className="aspect-[1.5/1]"
                              whileHover="hover"
                              whileTap={{ scale: 0.98 }}
                            >
                              <TabTile
                                tab={tab}
                                onClick={() => handleTabClick(tab.id as TabType)}
                                isActive={activeTab === tab.id}
                                hasUpdate={getTabUpdateStatus(tab.id)}
                                statusMessage={getStatusMessage(tab.id)}
                                description={TAB_DESCRIPTIONS[tab.id]}
                                isLoading={loadingTab === tab.id}
                                className="h-full relative bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl overflow-hidden"
                              >
                                {BETA_TABS.has(tab.id) && <BetaLabel />}
                              </TabTile>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
