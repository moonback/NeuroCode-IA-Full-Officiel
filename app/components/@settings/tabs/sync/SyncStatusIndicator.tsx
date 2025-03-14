import { classNames } from '~/utils/classNames';

interface SyncStatusIndicatorProps {
  status: 'idle' | 'syncing' | 'error';
}

export function SyncStatusIndicator({ status }: SyncStatusIndicatorProps) {
  return (
    <div className="group flex items-center gap-2">
      <div
        className={classNames('w-2 h-2 rounded-full transition-all duration-200', 'shadow-sm', {
          'bg-gray-300 dark:bg-gray-700': status === 'idle',
          'bg-purple-500 dark:bg-purple-400 animate-pulse shadow-purple-500/20 dark:shadow-purple-400/20':
            status === 'syncing',
          'bg-red-500 dark:bg-red-400 shadow-red-500/20 dark:shadow-red-400/20': status === 'error',
        })}
      />
      <span
        className={classNames('text-sm font-medium transition-colors duration-200', {
          'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300':
            status === 'idle',
          'text-purple-500 dark:text-purple-400 group-hover:text-purple-600 dark:group-hover:text-purple-300':
            status === 'syncing',
          'text-red-500 dark:text-red-400 group-hover:text-red-600 dark:group-hover:text-red-300': status === 'error',
        })}
      >
        {status === 'idle' ? 'Inactif' : status === 'syncing' ? 'En cours...' : 'Erreur'}
      </span>
    </div>
  );
}

// Also export as default
export default SyncStatusIndicator;