import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { logStore } from '~/lib/stores/logs';
import { useStore } from '@nanostores/react';
import { formatDistanceToNow } from 'date-fns';
import { classNames } from '~/utils/classNames';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface NotificationDetails {
  type?: string;
  message?: string;
  currentVersion?: string;
  latestVersion?: string;
  branch?: string;
  updateUrl?: string;
}

type FilterType = 'all' | 'system' | 'error' | 'warning' | 'update' | 'info' | 'provider' | 'network';

interface FilterOption {
  id: FilterType;
  label: string;
  icon: string;
  color: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'Toutes les notifications', icon: 'i-ph:bell', color: '#9333ea' },
  { id: 'system', label: 'Système', icon: 'i-ph:gear', color: '#6b7280' },
  { id: 'update', label: 'Mise à jour', icon: 'i-ph:arrow-circle-up', color: '#9333ea' },
  { id: 'error', label: 'Erreurs', icon: 'i-ph:warning-circle', color: '#ef4444' },
  { id: 'warning', label: 'Avertissements', icon: 'i-ph:warning', color: '#f59e0b' },
  { id: 'info', label: 'Informations', icon: 'i-ph:info', color: '#3b82f6' },
  { id: 'provider', label: 'Fournisseurs', icon: 'i-ph:robot', color: '#10b981' },
  { id: 'network', label: 'Réseau', icon: 'i-ph:wifi-high', color: '#6366f1' },
];

const FilterButton = ({ filter }: { filter: FilterType }) => {
  const currentFilter = FILTER_OPTIONS.find((opt) => opt.id === filter);
  return (
    <button
      className={classNames(
        'flex items-center gap-2',
        'rounded-lg px-3 py-1.5',
        'text-sm text-gray-900 dark:text-white',
        'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
        'border border-[#E5E5E5] dark:border-[#1A1A1A]',
        'hover:bg-green-500/10 dark:hover:bg-green-500/20',
        'transition-all duration-200',
      )}
    >
      <span
        className={classNames('text-lg', currentFilter?.icon || 'i-ph:funnel')}
        style={{ color: currentFilter?.color }}
      />
      {currentFilter?.label || 'Filtrer les notifications'}
      <span className="i-ph:caret-down text-lg text-gray-500 dark:text-gray-400" />
    </button>
  );
};

const NotificationsTab = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const logs = useStore(logStore.logs);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      logStore.logPerformanceMetric('NotificationsTab', 'mount-duration', duration);
    };
  }, []);

  const handleClearNotifications = () => {
    const count = Object.keys(logs).length;
    logStore.logInfo('Cleared notifications', {
      type: 'notification_clear',
      message: `Cleared ${count} notifications`,
      clearedCount: count,
      component: 'notifications',
    });
    logStore.clearLogs();
  };

  const handleUpdateAction = (updateUrl: string) => {
    logStore.logInfo('Update link clicked', {
      type: 'update_click',
      message: 'L\'utilisateur a cliqué sur le lien de mise à jour',
      updateUrl,
      component: 'notifications',
    });
    window.open(updateUrl, '_blank');
  };

  const handleFilterChange = (newFilter: FilterType) => {
    logStore.logInfo('Notification filter changed', {
      type: 'filter_change',
      message: `Filtre changé pour ${newFilter}`,
      previousFilter: filter,
      newFilter,
      component: 'notifications',
    });
    setFilter(newFilter);
  };

  const filteredLogs = Object.values(logs)
    .filter((log) => {
      switch (filter) {
        case 'all':
          return true;
        case 'update':
          return log.details?.type === 'update';
        case 'system':
          return log.category === 'system';
        case 'provider':
          return log.category === 'provider';
        case 'network':
          return log.category === 'network';
        default:
          return log.level === filter;
      }
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const getNotificationStyle = (level: string, type?: string) => {
    if (type === 'update') {
      return {
        icon: 'i-ph:arrow-circle-up',
        color: 'text-green-500 dark:text-green-400',
        bg: 'hover:bg-green-500/10 dark:hover:bg-green-500/20',
      };
    }

    switch (level) {
      case 'error':
        return {
          icon: 'i-ph:warning-circle',
          color: 'text-red-500 dark:text-red-400',
          bg: 'hover:bg-red-500/10 dark:hover:bg-red-500/20',
        };
      case 'warning':
        return {
          icon: 'i-ph:warning',
          color: 'text-yellow-500 dark:text-yellow-400',
          bg: 'hover:bg-yellow-500/10 dark:hover:bg-yellow-500/20',
        };
      case 'info':
        return {
          icon: 'i-ph:info',
          color: 'text-blue-500 dark:text-blue-400',
          bg: 'hover:bg-blue-500/10 dark:hover:bg-blue-500/20',
        };
      default:
        return {
          icon: 'i-ph:bell',
          color: 'text-gray-500 dark:text-gray-400',
          bg: 'hover:bg-gray-500/10 dark:hover:bg-gray-500/20',
        };
    }
  };

  const renderNotificationDetails = (details: NotificationDetails) => {
    if (details.type === 'update') {
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">{details.message}</p>
          <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-500">
            <p>Version actuelle: {details.currentVersion}</p>
            <p>Version la plus récente: {details.latestVersion}</p>
            <p>Branche: {details.branch}</p>
          </div>
          <button
            onClick={() => details.updateUrl && handleUpdateAction(details.updateUrl)}
            className={classNames(
              'mt-2 inline-flex items-center gap-2',
              'rounded-lg px-3 py-1.5',
              'text-sm font-medium',
              'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
              'border border-[#E5E5E5] dark:border-[#1A1A1A]',
              'text-gray-900 dark:text-white',
              'hover:bg-green-500/10 dark:hover:bg-green-500/20',
              'transition-all duration-200',
            )}
          >
            <span className="i-ph:git-branch text-lg" />
            Voir les modifications
          </button>
        </div>
      );
    }

    return details.message ? <p className="text-sm text-gray-600 dark:text-gray-400">{details.message}</p> : null;
  };

  const PaginationControls = () => (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">Notifications par page :</span>
        <select
          value={itemsPerPage}
          onChange={(e) => setItemsPerPage(Number(e.target.value))}
          className="px-2 py-1 text-sm rounded-lg bg-[#FAFAFA] dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A]"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm rounded-lg bg-[#FAFAFA] dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] hover:bg-green-500/10 dark:hover:bg-green-500/20 disabled:opacity-50"
        >
          Précédent
        </button>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Page {currentPage} sur {Math.ceil(filteredLogs.length / itemsPerPage)}
        </span>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(filteredLogs.length / itemsPerPage)))}
          disabled={currentPage === Math.ceil(filteredLogs.length / itemsPerPage)}
          className="px-3 py-1 text-sm rounded-lg bg-[#FAFAFA] dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] hover:bg-green-500/10 dark:hover:bg-green-500/20 disabled:opacity-50"
        >
          Suivant
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <FilterButton filter={filter} />
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[200px] bg-white dark:bg-[#0A0A0A] rounded-lg shadow-lg py-1 z-[250] animate-in fade-in-0 zoom-in-95 border border-[#E5E5E5] dark:border-[#1A1A1A]"
              sideOffset={5}
              align="start"
              side="bottom"
            >
              {FILTER_OPTIONS.map((option) => (
                <DropdownMenu.Item
                  key={option.id}
                  className="group flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-green-500/10 dark:hover:bg-green-500/20 cursor-pointer transition-colors"
                  onClick={() => handleFilterChange(option.id)}
                >
                  <div className="mr-3 flex h-5 w-5 items-center justify-center">
                    <div
                      className={classNames(option.icon, 'text-lg group-hover:text-green-500 transition-colors')}
                      style={{ color: option.color }}
                    />
                  </div>
                  <span className="group-hover:text-green-500 transition-colors">{option.label}</span>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <button
          onClick={handleClearNotifications}
          className={classNames(
            'group flex items-center gap-2',
            'rounded-lg px-3 py-1.5',
            'text-sm text-gray-900 dark:text-white',
            'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
            'border border-[#E5E5E5] dark:border-[#1A1A1A]',
            'hover:bg-green-500/10 dark:hover:bg-green-500/20',
            'transition-all duration-200',
          )}
        >
          <span className="i-ph:trash text-lg text-gray-500 dark:text-gray-400 group-hover:text-green-500 transition-colors" />
          Effacer toutes les notifications
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {filteredLogs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={classNames(
              'flex flex-col items-center justify-center gap-4',
              'rounded-lg p-8 text-center',
              'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
              'border border-[#E5E5E5] dark:border-[#1A1A1A]',
            )}
          >
            <span className="i-ph:bell-slash text-4xl text-gray-400 dark:text-gray-600" />
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Aucune notification</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Vous êtes à jour !</p>
            </div>
          </motion.div>
        ) : (
          paginatedLogs.map((log) => {
            const style = getNotificationStyle(log.level, log.details?.type);
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={classNames(
                  'flex flex-col gap-2',
                  'rounded-lg p-4',
                  'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
                  'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                  style.bg,
                  'transition-all duration-200',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className={classNames('text-lg', style.icon, style.color)} />
                    <div className="flex flex-col gap-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{log.message}</h3>
                      {log.details && renderNotificationDetails(log.details as NotificationDetails)}
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Catégorie: {log.category}
                        {log.subCategory ? ` > ${log.subCategory}` : ''}
                      </p>
                    </div>
                  </div>
                  <time className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                  </time>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <PaginationControls />
    </div>
  );
};

export default NotificationsTab;
