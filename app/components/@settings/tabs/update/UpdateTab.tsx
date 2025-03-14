import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '~/lib/hooks/useSettings';
import { logStore } from '~/lib/stores/logs';
import { toast } from 'react-toastify';
import { Dialog, DialogRoot, DialogTitle, DialogDescription, DialogButton } from '~/components/ui/Dialog';
import { classNames } from '~/utils/classNames';
import { Markdown } from '~/components/chat/Markdown';

interface UpdateProgress {
  stage: 'fetch' | 'pull' | 'install' | 'build' | 'complete';
  message: string;
  progress?: number;
  error?: string;
  details?: {
    changedFiles?: string[];
    additions?: number;
    deletions?: number;
    commitMessages?: string[];
    totalSize?: string;
    currentCommit?: string;
    remoteCommit?: string;
    updateReady?: boolean;
    changelog?: string;
    compareUrl?: string;
  };
}

interface UpdateSettings {
  autoUpdate: boolean;
  notifyInApp: boolean;
  checkInterval: number;
}

const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
    <motion.div
      className="h-full bg-blue-500"
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 0.3 }}
    />
  </div>
);

const UpdateProgressDisplay = ({ progress }: { progress: UpdateProgress }) => (
  <div className="mt-4 space-y-2">
    <div className="flex justify-between items-center">
      <span className="text-sm font-medium">{progress.message}</span>
      <span className="text-sm text-gray-500">{progress.progress}%</span>
    </div>
    <ProgressBar progress={progress.progress || 0} />
    {progress.details && (
      <div className="mt-2 text-sm text-gray-600">
        {progress.details.changedFiles && progress.details.changedFiles.length > 0 && (
          <div className="mt-4">
            <div className="font-medium mb-2">Fichiers modifiés:</div>
            <div className="space-y-2">
              {/* Group files by type */}
              {['Modified', 'Added', 'Deleted'].map((type) => {
                const filesOfType = progress.details?.changedFiles?.filter((file) => file.startsWith(type)) || [];

                if (filesOfType.length === 0) {
                  return null;
                }

                return (
                  <div key={type} className="space-y-1">
                    <div
                      className={classNames('text-sm font-medium', {
                        'text-blue-500': type === 'Modified',
                        'text-green-500': type === 'Added',
                        'text-red-500': type === 'Deleted',
                      })}
                    >
                      {type} ({filesOfType.length})
                    </div>
                    <div className="pl-4 space-y-1">
                      {filesOfType.map((file, index) => {
                        const fileName = file.split(': ')[1];
                        return (
                          <div key={index} className="text-sm text-bolt-elements-textSecondary flex items-center gap-2">
                            <div
                              className={classNames('w-4 h-4', {
                                'i-ph:pencil-simple': type === 'Modified',
                                'i-ph:plus': type === 'Added',
                                'i-ph:trash': type === 'Deleted',
                                'text-blue-500': type === 'Modified',
                                'text-green-500': type === 'Added',
                                'text-red-500': type === 'Deleted',
                              })}
                            />
                            <span className="font-mono text-xs">{fileName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {progress.details.totalSize && <div className="mt-1">Taille totale: {progress.details.totalSize}</div>}
        {progress.details.additions !== undefined && progress.details.deletions !== undefined && (
          <div className="mt-1">
            Changes: <span className="text-green-600">+{progress.details.additions}</span>{' '}
            <span className="text-red-600">-{progress.details.deletions}</span>
          </div>
        )}
        {progress.details.currentCommit && progress.details.remoteCommit && (
          <div className="mt-1">
            Mise à jour de {progress.details.currentCommit} à {progress.details.remoteCommit}
          </div>
        )}
      </div>
    )}
  </div>
);

const UpdateTab = () => {
  const { isLatestBranch } = useSettings();
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateSettings, setUpdateSettings] = useState<UpdateSettings>(() => {
    const stored = localStorage.getItem('update_settings');
    return stored
      ? JSON.parse(stored)
      : {
          autoUpdate: false,
          notifyInApp: true,
          checkInterval: 24,
        };
  });
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);

  useEffect(() => {
    localStorage.setItem('update_settings', JSON.stringify(updateSettings));
  }, [updateSettings]);

  const checkForUpdates = async () => {
    console.log('Début de la vérification des mises à jour...');
    setIsChecking(true);
    setError(null);
    setUpdateProgress(null);

    try {
      const branchToCheck = isLatestBranch ? 'main' : 'stable';

      // Start the update check with streaming progress
      const response = await fetch('/api/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch: branchToCheck,
          autoUpdate: updateSettings.autoUpdate,
        }),
      });

      if (!response.ok) {
        throw new Error(`Update check failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error('No response stream available');
      }

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Convert the chunk to text and parse the JSON
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const progress = JSON.parse(line) as UpdateProgress;
            setUpdateProgress(progress);

            if (progress.error) {
              setError(progress.error);
            }

            // If we're done, update the UI accordingly
            if (progress.stage === 'complete') {
              setIsChecking(false);

              if (!progress.error) {
                // Vérification des mises à jour terminée
                toast('Vérification des mises à jour terminée');

                // Afficher la boîte de dialogue de mise à jour uniquement si il y a des modifications et que l'auto-mise à jour est désactivée
                if (progress.details?.changedFiles?.length && progress.details.updateReady) {
                  setShowUpdateDialog(true);
                }
              }
            }
          } catch (e) {
            console.error('Erreur lors de la vérification des mises à jour:', e);
          }
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Une erreur inconnue est survenue');
      logStore.logWarning('Vérification des mises à jour échouée', {
        type: 'update',
        message: error instanceof Error ? error.message : 'Une erreur inconnue est survenue',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdate = async () => {
    setShowUpdateDialog(false);

    try {
      const branchToCheck = isLatestBranch ? 'main' : 'stable';

      // Démarrer la mise à jour avec autoUpdate défini sur true pour forcer la mise à jour
      const response = await fetch('/api/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch: branchToCheck,
          autoUpdate: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Update failed: ${response.statusText}`);
      }

      // Gérer le flux de progression de la mise à jour
      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error('Aucune réponse disponible');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const progress = JSON.parse(line) as UpdateProgress;
            setUpdateProgress(progress);

            if (progress.error) {
              setError(progress.error);
              toast('La mise à jour a échoué');
            }

            if (progress.stage === 'complete' && !progress.error) {
              toast('La mise à jour a été effectuée avec succès');
            }
          } catch (e) {
            console.error('Erreur lors de la vérification des mises à jour:', e);
          }
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Une erreur inconnue est survenue');
      toast('La mise à jour a échoué');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="i-ph:arrow-circle-up text-xl text-green-500" />
        <div>
            <h3 className="text-lg font-medium text-bolt-elements-textPrimary">Mises à jour</h3>
          <p className="text-sm text-bolt-elements-textSecondary">Vérifier et gérer les mises à jour de l'application</p>
        </div>
      </motion.div>

      {/* Update Settings Card */}
      <motion.div
        className="p-6 rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="i-ph:gear text-green-500 w-5 h-5" />
          <h3 className="text-lg font-medium text-bolt-elements-textPrimary">Paramètres de mise à jour</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-bolt-elements-textPrimary">Mises à jour automatiques</span>
              <p className="text-xs text-bolt-elements-textSecondary">
                Vérifier et appliquer les mises à jour automatiquement lorsqu'elles sont disponibles
              </p>
            </div>
            <button
              onClick={() => setUpdateSettings((prev) => ({ ...prev, autoUpdate: !prev.autoUpdate }))}
              className={classNames(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                updateSettings.autoUpdate ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700',
              )}
            >
              <span
                className={classNames(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  updateSettings.autoUpdate ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-bolt-elements-textPrimary">Notifications dans l'application</span>
              <p className="text-xs text-bolt-elements-textSecondary">Afficher les notifications lorsque des mises à jour sont disponibles</p>
            </div>
            <button
              onClick={() => setUpdateSettings((prev) => ({ ...prev, notifyInApp: !prev.notifyInApp }))}
              className={classNames(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                updateSettings.notifyInApp ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700',
              )}
            >
              <span
                className={classNames(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  updateSettings.notifyInApp ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-bolt-elements-textPrimary">Intervalle de vérification</span>
              <p className="text-xs text-bolt-elements-textSecondary">Combien de temps pour vérifier les mises à jour</p>
            </div>
            <select
              value={updateSettings.checkInterval}
              onChange={(e) => setUpdateSettings((prev) => ({ ...prev, checkInterval: Number(e.target.value) }))}
              className={classNames(
                'px-3 py-2 rounded-lg text-sm',
                'bg-[#F5F5F5] dark:bg-[#1A1A1A]',
                'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                'text-bolt-elements-textPrimary',
                'hover:bg-[#E5E5E5] dark:hover:bg-[#2A2A2A]',
                'transition-colors duration-200',
              )}
            >
              <option value="6">6 heures</option>
              <option value="12">12 heures</option>
              <option value="24">24 heures</option>
              <option value="48">48 heures</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Update Status Card */}
      <motion.div
        className="p-6 rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="i-ph:arrows-clockwise text-green-500 w-5 h-5" />
            <h3 className="text-lg font-medium text-bolt-elements-textPrimary">Statut de la mise à jour</h3>
          </div>
          <div className="flex items-center gap-2">
            {updateProgress?.details?.updateReady && !updateSettings.autoUpdate && (
              <button
                onClick={handleUpdate}
                className={classNames(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm',
                  'bg-green-500 text-white',
                  'hover:bg-green-600',
                  'transition-colors duration-200',
                )}
              >
                <div className="i-ph:arrow-circle-up w-4 h-4" />
                Mettre à jour maintenant
              </button>
            )}
            <button
              onClick={() => {
                setError(null);
                checkForUpdates();
              }}
              className={classNames(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm',
                'bg-[#F5F5F5] dark:bg-[#1A1A1A]',
                'hover:bg-green-500/10 hover:text-green-500',
                'dark:hover:bg-green-500/20 dark:hover:text-green-500',
                'text-bolt-elements-textPrimary',
                'transition-colors duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              disabled={isChecking}
            >
              {isChecking ? (
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="i-ph:arrows-clockwise w-4 h-4"
                  />
                  Checking...
                </div>
              ) : (
                <>
                  <div className="i-ph:arrows-clockwise w-4 h-4" />
                  Vérifier les mises à jour
                </>
              )}
            </button>
          </div>
        </div>

        {/* Show progress information */}
        {updateProgress && <UpdateProgressDisplay progress={updateProgress} />}

        {error && <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

        {/* Show update source information */}
        {updateProgress?.details?.currentCommit && updateProgress?.details?.remoteCommit && (
          <div className="mt-4 text-sm text-bolt-elements-textSecondary">
            <div className="flex items-center justify-between">
              <div>
                <p>
                  Les mises à jour sont récupérées depuis: <span className="font-mono">stackblitz-labs/bolt.diy</span> (
                  {isLatestBranch ? 'main' : 'stable'} branche)
                </p>
                <p className="mt-1">
                  Current version: <span className="font-mono">{updateProgress.details.currentCommit}</span>
                  <span className="mx-2">→</span>
                  Latest version: <span className="font-mono">{updateProgress.details.remoteCommit}</span>
                </p>
              </div>
              {updateProgress?.details?.compareUrl && (
                <a
                  href={updateProgress.details.compareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classNames(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm',
                    'bg-[#F5F5F5] dark:bg-[#1A1A1A]',
                    'hover:bg-green-500/10 hover:text-green-500',
                    'dark:hover:bg-green-500/20 dark:hover:text-green-500',
                    'text-bolt-elements-textPrimary',
                    'transition-colors duration-200',
                    'w-fit',
                  )}
                >
                  <div className="i-ph:github-logo w-4 h-4" />
                  Voir les modifications sur GitHub
                </a>
              )}
            </div>
            {updateProgress?.details?.additions !== undefined && updateProgress?.details?.deletions !== undefined && (
              <div className="mt-2 flex items-center gap-2">
                <div className="i-ph:git-diff text-green-500 w-4 h-4" />
                Changes: <span className="text-green-600">+{updateProgress.details.additions}</span>{' '}
                <span className="text-red-600">-{updateProgress.details.deletions}</span>
              </div>
            )}
          </div>
        )}

        {/* Add this before the changed files section */}
        {updateProgress?.details?.changelog && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="i-ph:scroll text-green-500 w-5 h-5" />
              <p className="font-medium">Journal des modifications</p>
            </div>
            <div className="bg-[#F5F5F5] dark:bg-[#1A1A1A] rounded-lg p-4 overflow-auto max-h-[300px]">
              <div className="prose dark:prose-invert prose-sm max-w-none">
                <Markdown>{updateProgress.details.changelog}</Markdown>
              </div>
            </div>
          </div>
        )}

        {/* Add this in the update status card, after the commit info */}
        {updateProgress?.details?.compareUrl && (
          <div className="mt-4">
            <a
              href={updateProgress.details.compareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={classNames(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm',
                'bg-[#F5F5F5] dark:bg-[#1A1A1A]',
                'hover:bg-green-500/10 hover:text-green-500',
                'dark:hover:bg-green-500/20 dark:hover:text-green-500',
                'text-bolt-elements-textPrimary',
                'transition-colors duration-200',
                'w-fit',
              )}
            >
              <div className="i-ph:github-logo w-4 h-4" />
              Voir les modifications sur GitHub
            </a>
          </div>
        )}

        {updateProgress?.details?.commitMessages && updateProgress.details.commitMessages.length > 0 && (
          <div className="mb-6">
            <p className="font-medium mb-2">Modifications dans cette mise à jour:</p>
            <div className="bg-[#F5F5F5] dark:bg-[#1A1A1A] rounded-lg p-4 overflow-auto max-h-[400px]">
              <div className="prose dark:prose-invert prose-sm max-w-none">
                {updateProgress.details.commitMessages.map((section, index) => (
                  <Markdown key={index}>{section}</Markdown>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Update dialog */}
      <DialogRoot open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <Dialog>
          <DialogTitle>Mise à jour disponible</DialogTitle>
          <DialogDescription>
            <div className="mt-4">
              <p className="text-sm text-bolt-elements-textSecondary mb-4">
                Une nouvelle version est disponible depuis <span className="font-mono">stackblitz-labs/bolt.diy</span> (
                {isLatestBranch ? 'main' : 'stable'} branche)
              </p>

              {updateProgress?.details?.compareUrl && (
                <div className="mb-6">
                  <a
                    href={updateProgress.details.compareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classNames(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm',
                      'bg-[#F5F5F5] dark:bg-[#1A1A1A]',
                      'hover:bg-green-500/10 hover:text-green-500',
                      'dark:hover:bg-green-500/20 dark:hover:text-green-500',
                      'text-bolt-elements-textPrimary',
                      'transition-colors duration-200',
                      'w-fit',
                    )}
                  >
                    <div className="i-ph:github-logo w-4 h-4" />
                    Voir les modifications sur GitHub
                  </a>
                </div>
              )}

              {updateProgress?.details?.commitMessages && updateProgress.details.commitMessages.length > 0 && (
                <div className="mb-6">
                  <p className="font-medium mb-2">Messages de commit:</p>
                  <div className="bg-[#F5F5F5] dark:bg-[#1A1A1A] rounded-lg p-3 space-y-2">
                    {updateProgress.details.commitMessages.map((msg, index) => (
                      <div key={index} className="text-sm text-bolt-elements-textSecondary flex items-start gap-2">
                        <div className="i-ph:git-commit text-green-500 w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {updateProgress?.details?.totalSize && (
                <div className="flex items-center gap-4 text-sm text-bolt-elements-textSecondary">
                  <div className="flex items-center gap-2">
                    <div className="i-ph:file text-green-500 w-4 h-4" />
                    Taille totale: {updateProgress.details.totalSize}
                  </div>
                  {updateProgress?.details?.additions !== undefined &&
                    updateProgress?.details?.deletions !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className="i-ph:git-diff text-green-500 w-4 h-4" />
                        Modifications: <span className="text-green-600">+{updateProgress.details.additions}</span>{' '}
                        <span className="text-red-600">-{updateProgress.details.deletions}</span>
                      </div>
                    )}
                </div>
              )}
            </div>
          </DialogDescription>
          <div className="flex justify-end gap-2 mt-6">
            <DialogButton type="secondary" onClick={() => setShowUpdateDialog(false)}>
              Annuler
            </DialogButton>
            <DialogButton type="primary" onClick={handleUpdate}>
              Mettre à jour maintenant
            </DialogButton>
          </div>
        </Dialog>
      </DialogRoot>
    </div>
  );
};

export default UpdateTab;
