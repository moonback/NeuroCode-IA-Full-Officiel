import { classNames } from '~/utils/classNames';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '~/components/ui/Progress';
import type { SyncHistoryEntry } from '~/types/sync';

interface HistoryEntryProps {
  entry: SyncHistoryEntry;
  expanded: boolean;
  onToggle: () => void;
  formatters: {
    size: (size: number) => string;
    time: (timestamp: number) => string;
  };
}

export default function HistoryEntry({ entry, expanded, onToggle, formatters }: HistoryEntryProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success':
        return {
          icon: 'i-ph:check-circle',
          color: 'text-green-500',
          bg: 'bg-green-500/10',
          label: 'Succès',
        };
      case 'partial':
        return {
          icon: 'i-ph:warning-circle',
          color: 'text-yellow-500',
          bg: 'bg-yellow-500/10',
          label: 'Partiel',
        };
      case 'failed':
        return {
          icon: 'i-ph:x-circle',
          color: 'text-red-500',
          bg: 'bg-red-500/10',
          label: 'Échec',
        };
      default:
        return {
          icon: 'i-ph:question-circle',
          color: 'text-bolt-elements-textSecondary',
          bg: 'bg-bolt-elements-textSecondary/10',
          label: 'Inconnu',
        };
    }
  };

  const statusConfig = getStatusConfig(entry.status);
  const progress = Math.min(100, (entry.statistics.syncedFiles / entry.statistics.totalFiles) * 100);
  const speed = entry.statistics.totalSize / (entry.statistics.duration / 1000);

  return (
    <motion.div
      className={classNames(
        'rounded-xl p-4',
        'bg-bolt-elements-background-depth-2',
        'hover:bg-bolt-elements-background-depth-3',
        'transition-all duration-200',
        'border border-bolt-elements-borderColor/10',
        'cursor-pointer',
      )}
      onClick={onToggle}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.01 }}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={classNames('w-8 h-8 rounded-lg flex items-center justify-center', statusConfig.bg)}>
              <div className={classNames(statusConfig.icon, statusConfig.color, 'w-5 h-5')} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-bolt-elements-textPrimary">{entry.projectName}</h3>
                <span className={classNames('text-xs px-2 py-0.5 rounded-full', statusConfig.bg, statusConfig.color)}>
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-xs text-bolt-elements-textSecondary">{formatters.time(entry.timestamp)} ago</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xs text-bolt-elements-textSecondary">
              {entry.statistics.syncedFiles} / {entry.statistics.totalFiles} files
            </div>
            <div
              className={classNames('i-ph:caret-down w-4 h-4 text-bolt-elements-textSecondary transition-transform', {
                'rotate-180': expanded,
              })}
            />
          </div>
        </div>

        {/* Progress */}
        <Progress
          value={progress}
          className={classNames(
            'h-1.5',
            entry.status === 'success'
              ? 'bg-green-500/10 [&>div]:bg-green-500'
              : entry.status === 'partial'
                ? 'bg-yellow-500/10 [&>div]:bg-yellow-500'
                : entry.status === 'failed'
                  ? 'bg-red-500/10 [&>div]:bg-red-500'
                  : 'bg-bolt-elements-textSecondary/10 [&>div]:bg-bolt-elements-textSecondary',
          )}
        />

        {/* Details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              className="space-y-4 pt-4 border-t border-bolt-elements-borderColor/10"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-bolt-elements-textSecondary">
                    <div className="i-ph:files text-purple-500 w-4 h-4" />
                    Total fichiers
                  </div>
                  <div className="text-sm font-medium text-bolt-elements-textPrimary">
                    {entry.statistics.totalFiles}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-bolt-elements-textSecondary">
                    <div className="i-ph:database text-purple-500 w-4 h-4" />
                    Taille totale
                  </div>
                  <div className="text-sm font-medium text-bolt-elements-textPrimary">
                    {formatters.size(entry.statistics.totalSize)}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-bolt-elements-textSecondary">
                    <div className="i-ph:timer text-purple-500 w-4 h-4" />
                    Durée
                  </div>
                  <div className="text-sm font-medium text-bolt-elements-textPrimary">
                    {(entry.statistics.duration / 1000).toFixed(1)}s
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-bolt-elements-textSecondary">
                    <div className="i-ph:lightning text-purple-500 w-4 h-4" />
                    Vitesse
                  </div>
                  <div className="text-sm font-medium text-bolt-elements-textPrimary">{formatters.size(speed)}/s</div>
                </div>
              </div>

              {/* Files */}
              {entry.files && entry.files.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-bolt-elements-textSecondary">Fichiers synchronisés</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-bolt-elements-borderColor scrollbar-track-transparent">
                    {entry.files.map((file, index) => (
                      <div
                        key={index}
                        className={classNames(
                          'text-xs px-2 py-1 rounded',
                          'bg-bolt-elements-background-depth-3',
                          'text-bolt-elements-textSecondary',
                          'truncate',
                        )}
                      >
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {entry.error && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-red-500">Détails de l'erreur</h4>
                  <div className={classNames('text-xs p-2 rounded', 'bg-red-500/10', 'text-red-500', 'font-mono')}>
                    {entry.error}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}