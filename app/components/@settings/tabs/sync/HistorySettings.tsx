import { classNames } from '~/utils/classNames';
import { IconButton } from '~/components/ui/IconButton';

interface HistorySettingsProps {
  maxHistoryEntries: number;
  onMaxHistoryEntriesChange: (value: number) => void;
  autoClearOldEntries: boolean;
  onAutoClearOldEntriesChange: (value: boolean) => void;
}

export default function HistorySettings({
  maxHistoryEntries,
  onMaxHistoryEntriesChange,
  autoClearOldEntries,
  onAutoClearOldEntriesChange,
}: HistorySettingsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 rounded-lg bg-bolt-elements-background-depth-3">
        <div>
          <div className="text-sm font-medium text-bolt-elements-textPrimary">Nombre maximum d'entrées</div>
          <div className="text-xs text-bolt-elements-textSecondary mt-0.5">
            Limite le nombre d'entrées dans l'historique
          </div>
        </div>
        <input
          type="number"
          min="10"
          max="1000"
          value={maxHistoryEntries}
          onChange={(e) => onMaxHistoryEntriesChange(Number(e.target.value))}
          className={classNames(
            'w-20 px-2 py-1 text-sm rounded-md',
            'bg-bolt-elements-background-depth-2',
            'border border-bolt-elements-borderColor/10',
            'text-bolt-elements-textPrimary',
          )}
        />
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-bolt-elements-background-depth-3">
        <div>
          <div className="text-sm font-medium text-bolt-elements-textPrimary">Nettoyage automatique</div>
          <div className="text-xs text-bolt-elements-textSecondary mt-0.5">
            Supprime automatiquement les anciennes entrées
          </div>
        </div>
        <IconButton
          onClick={() => onAutoClearOldEntriesChange(!autoClearOldEntries)}
          className={classNames(
            'text-xl transition-colors',
            autoClearOldEntries
              ? 'text-green-400 hover:text-green-500'
              : 'text-bolt-elements-textPrimary dark:text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary dark:hover:text-bolt-elements-textSecondary',
          )}
        >
          <div className={autoClearOldEntries ? 'i-ph:check-square-fill' : 'i-ph:square'} />
        </IconButton>
      </div>
    </div>
  );
} 