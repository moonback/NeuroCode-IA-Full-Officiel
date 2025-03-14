import type { GitHubRepoInfo, GitHubContent, RepositoryStats } from '~/types/GitHub';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as Dialog from '@radix-ui/react-dialog';
import { classNames } from '~/utils/classNames';
import { getLocalStorage } from '~/lib/persistence';
import { motion } from 'framer-motion';
import { formatSize } from '~/utils/formatSize';
import { Input } from '~/components/ui/Input';

interface GitHubTreeResponse {
  tree: Array<{
    path: string;
    type: string;
    size?: number;
  }>;
}

interface RepositorySelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

interface SearchFilters {
  language?: string;
  stars?: number;
  forks?: number;
}

interface StatsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  stats: RepositoryStats;
  isLargeRepo?: boolean;
}

function StatsDialog({ isOpen, onClose, onConfirm, stats, isLargeRepo }: StatsDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]" />
        <div className="fixed inset-0 flex items-center justify-center z-[9999]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-[90vw] md:w-[500px]"
          >
            <Dialog.Content 
              className="bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1-dark rounded-lg border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark shadow-xl overflow-hidden"
              onPointerDownOutside={(e) => e.preventDefault()}
            >
              <div className="p-6 space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark flex items-center gap-2">
                    <span className="i-ph:git-branch text-green-500 w-5 h-5" />
                    <span>
                      Aperçu du dépôt
                      <span className="block text-xs font-normal text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark mt-1">
                        Vérifiez les détails avant l'importation
                      </span>
                    </span>
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <StatItem
                        icon="i-ph:files"
                        label="Fichiers"
                        value={stats.totalFiles.toLocaleString()}
                        tooltip="Nombre total de fichiers dans le dépôt"
                      />
                      <StatItem
                        icon="i-ph:database"
                        label="Taille totale"
                        value={formatSize(stats.totalSize)}
                        tooltip="Taille totale du dépôt en octets"
                      />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark flex items-center gap-1">
                        Langages principaux
                        <span className="i-ph:info text-xs text-bolt-elements-textTertiary dark:text-bolt-elements-textTertiary-dark" />
                      </h4>
                      <LanguageBars languages={stats.languages} />
                      <div className="text-xs text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark">
                        Répartition des langages par taille de code
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {stats.hasPackageJson && (
                        <Badge icon="i-ph:package" label="package.json" color="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
                      )}
                      {stats.hasDependencies && (
                        <Badge icon="i-ph:tree-structure" label="Dépendances" color="bg-purple-500/10 text-purple-600 dark:text-purple-400" />
                      )}
                    </div>
                  </div>
                  {isLargeRepo && (
                    <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg flex items-start gap-2">
                      <span className="i-ph:warning text-yellow-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-yellow-600 dark:text-yellow-500">
                        <p className="font-medium">Attention : Dépôt volumineux</p>
                        <p className="mt-1">Taille totale : {formatSize(stats.totalSize)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark p-4 flex justify-end gap-2 bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2-dark">
                <button
                  onClick={onClose}
                  disabled={isConfirming}
                  className="px-4 py-2 rounded-lg bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1-dark border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark hover:bg-bolt-elements-background-depth-2 dark:hover:bg-bolt-elements-background-depth-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConfirming ? (
                    <span className="i-ph:spinner animate-spin w-4 h-4" />
                  ) : (
                    <span className="i-ph:check-circle w-4 h-4" />
                  )}
                  Confirmer
                </button>
              </div>
            </Dialog.Content>
          </motion.div>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function RepositorySelectionDialog({ isOpen, onClose, onSelect }: RepositorySelectionDialogProps) {
  const [selectedRepository, setSelectedRepository] = useState<GitHubRepoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [repositories, setRepositories] = useState<GitHubRepoInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GitHubRepoInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'my-repos' | 'search' | 'url'>('my-repos');
  const [customUrl, setCustomUrl] = useState('');
  const [branches, setBranches] = useState<{ name: string; default?: boolean }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [stats, setStats] = useState<RepositoryStats | null>(null);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [currentStats, setCurrentStats] = useState<RepositoryStats | null>(null);
  const [pendingGitUrl, setPendingGitUrl] = useState<string>('');

  // Fetch user's repositories when dialog opens
  useEffect(() => {
    if (isOpen && activeTab === 'my-repos') {
      fetchUserRepos();
    }
  }, [isOpen, activeTab]);

  const fetchUserRepos = async () => {
    const connection = getLocalStorage('github_connection');

    if (!connection?.token) {
      toast('Veuillez d\'abord connecter votre compte GitHub');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&type=all', {
        headers: {
          Authorization: `Bearer ${connection.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Impossible de récupérer les dépôts');
      }

      const data = await response.json();

      // Add type assertion and validation
      if (
        Array.isArray(data) &&
        data.every((item) => typeof item === 'object' && item !== null && 'full_name' in item)
      ) {
        setRepositories(data as GitHubRepoInfo[]);
      } else {
        throw new Error('Invalid repository data format');
      }
    } catch (error) {
      console.error('Error fetching repos:', error);
      toast('Impossible de récupérer vos dépôts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setSearchResults([]);

    try {
      let searchQuery = query;

      if (filters.language) {
        searchQuery += ` language:${filters.language}`;
      }

      if (filters.stars) {
        searchQuery += ` stars:>${filters.stars}`;
      }

      if (filters.forks) {
        searchQuery += ` forks:>${filters.forks}`;
      }

      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Impossible de rechercher les dépôts');
      }

      const data = await response.json();

      // Add type assertion and validation
      if (typeof data === 'object' && data !== null && 'items' in data && Array.isArray(data.items)) {
        setSearchResults(data.items as GitHubRepoInfo[]);
      } else {
        throw new Error('Format de résultats de recherche invalide');
      }
    } catch (error) {
      console.error('Error searching repos:', error);
      toast('Impossible de rechercher les dépôts');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranches = async (repo: GitHubRepoInfo) => {
    setIsLoading(true);

    try {
      const response = await fetch(`https://api.github.com/repos/${repo.full_name}/branches`, {
        headers: {
          Authorization: `Bearer ${getLocalStorage('github_connection')?.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Impossible de récupérer les branches');
      }

      const data = await response.json();

      // Add type assertion and validation
      if (Array.isArray(data) && data.every((item) => typeof item === 'object' && item !== null && 'name' in item)) {
        setBranches(
          data.map((branch) => ({
            name: branch.name,
            default: branch.name === repo.default_branch,
          })),
        );
      } else {
        throw new Error('Format de données de branche invalide');
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast('Impossible de récupérer les branches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepoSelect = async (repo: GitHubRepoInfo) => {
    setSelectedRepository(repo);
    await fetchBranches(repo);
  };

  const formatGitUrl = (url: string): string => {
    // Remove any tree references and ensure .git extension
    const baseUrl = url
      .replace(/\/tree\/[^/]+/, '') // Remove /tree/branch-name
      .replace(/\/$/, '') // Remove trailing slash
      .replace(/\.git$/, ''); // Remove .git if present
    return `${baseUrl}.git`;
  };

  const verifyRepository = async (repoUrl: string): Promise<RepositoryStats | null> => {
    try {
      const [owner, repo] = repoUrl
        .replace(/\.git$/, '')
        .split('/')
        .slice(-2);

      const connection = getLocalStorage('github_connection');
      const headers: HeadersInit = connection?.token ? { Authorization: `Bearer ${connection.token}` } : {};

      // Fetch repository tree
      const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, {
        headers,
      });

      if (!treeResponse.ok) {
        throw new Error('Impossible de récupérer la structure du dépôt');
      }

      const treeData = (await treeResponse.json()) as GitHubTreeResponse;

      // Calculate repository stats
      let totalSize = 0;
      let totalFiles = 0;
      const languages: { [key: string]: number } = {};
      let hasPackageJson = false;
      let hasDependencies = false;

      for (const file of treeData.tree) {
        if (file.type === 'blob') {
          totalFiles++;

          if (file.size) {
            totalSize += file.size;
          }

          // Check for package.json
          if (file.path === 'package.json') {
            hasPackageJson = true;

            // Fetch package.json content to check dependencies
            const contentResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, {
              headers,
            });

            if (contentResponse.ok) {
              const content = (await contentResponse.json()) as GitHubContent;
              const packageJson = JSON.parse(Buffer.from(content.content, 'base64').toString());
              hasDependencies = !!(
                packageJson.dependencies ||
                packageJson.devDependencies ||
                packageJson.peerDependencies
              );
            }
          }

          // Detect language based on file extension
          const ext = file.path.split('.').pop()?.toLowerCase();

          if (ext) {
            languages[ext] = (languages[ext] || 0) + (file.size || 0);
          }
        }
      }

      const stats: RepositoryStats = {
        totalFiles,
        totalSize,
        languages,
        hasPackageJson,
        hasDependencies,
      };

      setStats(stats);

      return stats;
    } catch (error) {
      console.error('Error verifying repository:', error);
      toast('Impossible de vérifier le dépôt');

      return null;
    }
  };

  const handleImport = async () => {
    try {
      let gitUrl: string;

      if (activeTab === 'url' && customUrl) {
        gitUrl = formatGitUrl(customUrl);
      } else if (selectedRepository) {
        gitUrl = formatGitUrl(selectedRepository.html_url);

        if (selectedBranch) {
          gitUrl = `${gitUrl}#${selectedBranch}`;
        }
      } else {
        return;
      }

      // Verify repository before importing
      const stats = await verifyRepository(gitUrl);

      if (!stats) {
        return;
      }

      setCurrentStats(stats);
      setPendingGitUrl(gitUrl);
      setShowStatsDialog(true);
    } catch (error) {
      console.error('Error preparing repository:', error);
      toast('Impossible de préparer le dépôt. Veuillez réessayer.');
    }
  };

  const handleStatsConfirm = () => {
    setShowStatsDialog(false);

    if (pendingGitUrl) {
      onSelect(pendingGitUrl);
      onClose();
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    let parsedValue: string | number | undefined = value;

    if (key === 'stars' || key === 'forks') {
      parsedValue = value ? parseInt(value, 10) : undefined;
    }

    setFilters((prev) => ({ ...prev, [key]: parsedValue }));
    handleSearch(searchQuery);
  };

  // Handle dialog close properly
  const handleClose = () => {
    setIsLoading(false); // Reset loading state
    setSearchQuery(''); // Reset search
    setSearchResults([]); // Reset results
    onClose();
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[90vw] md:w-[600px] max-h-[85vh] overflow-hidden bg-white dark:bg-[#1A1A1A] rounded-xl shadow-xl z-[51] border border-[#E5E5E5] dark:border-[#333333]">
          <div className="p-4 border-b border-[#E5E5E5] dark:border-[#333333] flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark">
              Importer un dépôt GitHub
            </Dialog.Title>
            <Dialog.Close
              onClick={handleClose}
              className={classNames(
                'p-2 rounded-lg transition-all duration-200 ease-in-out',
                'text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary',
                'dark:text-bolt-elements-textTertiary-dark dark:hover:text-bolt-elements-textPrimary-dark',
                'hover:bg-bolt-elements-background-depth-2 dark:hover:bg-bolt-elements-background-depth-3',
                'focus:outline-none focus:ring-2 focus:ring-bolt-elements-borderColor dark:focus:ring-bolt-elements-borderColor-dark',
              )}
            >
              <span className="i-ph:x block w-5 h-5" aria-hidden="true" />
              <span className="sr-only">Fermer la boîte de dialogue</span>
            </Dialog.Close>
          </div>

          <div className="p-4">
            <div className="flex gap-2 mb-4">
              <TabButton active={activeTab === 'my-repos'} onClick={() => setActiveTab('my-repos')}>
                <span className="i-ph:book-bookmark" />
                Mes dépôts
              </TabButton>
              <TabButton active={activeTab === 'search'} onClick={() => setActiveTab('search')}>
                <span className="i-ph:magnifying-glass" />
                Rechercher
              </TabButton>
              <TabButton active={activeTab === 'url'} onClick={() => setActiveTab('url')}>
                <span className="i-ph:link" />
                URL
              </TabButton>
            </div>

            {activeTab === 'url' ? (
              <div className="space-y-4">
                <Input
                  placeholder="Entrez l'URL du dépôt"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className={classNames('w-full', {
                    'border-red-500': false,
                  })}
                />
                <button
                  onClick={handleImport}
                  disabled={!customUrl}
                  className="w-full h-10 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 justify-center"
                >
                  Importer le dépôt
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'search' && (
                  <div className="space-y-4 mb-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Rechercher des dépôts..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          handleSearch(e.target.value);
                        }}
                        className="flex-1 px-4 py-2 rounded-lg bg-[#F5F5F5] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#333333] text-bolt-elements-textPrimary"
                      />
                      <button
                        onClick={() => setFilters({})}
                        className="px-3 py-2 rounded-lg bg-[#F5F5F5] dark:bg-[#252525] text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary"
                      >
                        <span className="i-ph:funnel-simple" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Filtrer par langue..."
                        value={filters.language || ''}
                        onChange={(e) => {
                          setFilters({ ...filters, language: e.target.value });
                          handleSearch(searchQuery);
                        }}
                        className="px-3 py-1.5 text-sm rounded-lg bg-[#F5F5F5] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#333333]"
                      />
                      <input
                        type="number"
                        placeholder="Min étoiles..."
                        value={filters.stars || ''}
                        onChange={(e) => handleFilterChange('stars', e.target.value)}
                        className="px-3 py-1.5 text-sm rounded-lg bg-[#F5F5F5] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#333333]"
                      />
                    </div>
                    <input
                      type="number"
                      placeholder="Min forks..."
                      value={filters.forks || ''}
                      onChange={(e) => handleFilterChange('forks', e.target.value)}
                      className="px-3 py-1.5 text-sm rounded-lg bg-[#F5F5F5] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#333333]"
                    />
                  </div>
                )}

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedRepository ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedRepository(null)}
                          className="p-1.5 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-[#252525]"
                        >
                          <span className="i-ph:arrow-left w-4 h-4" />
                        </button>
                        <h3 className="font-medium">{selectedRepository.full_name}</h3>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-bolt-elements-textSecondary">Sélectionner une branche</label>
                        <select
                          value={selectedBranch}
                          onChange={(e) => setSelectedBranch(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark focus:outline-none focus:ring-2 focus:ring-bolt-elements-borderColor dark:focus:ring-bolt-elements-borderColor-dark"
                        >
                          {branches.map((branch) => (
                            <option
                              key={branch.name}
                              value={branch.name}
                              className="bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark"
                            >
                              {branch.name} {branch.default ? '(default)' : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleImport}
                          className="w-full h-10 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all duration-200 flex items-center gap-2 justify-center"
                        >
                          Importer la branche sélectionnée
                        </button>
                      </div>
                    </div>
                  ) : (
                    <RepositoryList
                      repos={activeTab === 'my-repos' ? repositories : searchResults}
                      isLoading={isLoading}
                      onSelect={handleRepoSelect}
                      activeTab={activeTab}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      {currentStats && (
        <StatsDialog
          isOpen={showStatsDialog}
          onClose={handleStatsConfirm}
          onConfirm={handleStatsConfirm}
          stats={currentStats}
          isLargeRepo={currentStats.totalSize > 50 * 1024 * 1024}
        />
      )}
    </Dialog.Root>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        'px-4 py-2 h-10 rounded-lg transition-all duration-200 flex items-center gap-2 min-w-[120px] justify-center border',
        active
          ? 'bg-green-500/10 border-green-500 text-green-600 dark:text-green-400 hover:bg-green-500/20'
          : 'bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2-dark border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark hover:bg-bolt-elements-background-depth-3 dark:hover:bg-bolt-elements-background-depth-3-dark',
      )}
    >
      {children}
    </button>
  );
}

function RepositoryList({
  repos,
  isLoading,
  onSelect,
  activeTab,
}: {
  repos: GitHubRepoInfo[];
  isLoading: boolean;
  onSelect: (repo: GitHubRepoInfo) => void;
  activeTab: string;
}) {
  const [visibleRepos, setVisibleRepos] = useState(10);

  const loadMore = () => {
    setVisibleRepos((prev) => prev + 10);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-bolt-elements-textSecondary">
        <span className="i-ph:spinner animate-spin mr-2" />
        Chargement des dépôts...
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-bolt-elements-textSecondary">
        <span className="i-ph:folder-simple-dashed w-12 h-12 mb-2 opacity-50" />
        <p>{activeTab === 'my-repos' ? 'Aucun dépôt trouvé' : 'Rechercher des dépôts'}</p>
      </div>
    );
  }

  return (
    <>
      {repos.slice(0, visibleRepos).map((repo) => (
        <RepositoryCard key={repo.full_name} repo={repo} onSelect={() => onSelect(repo)} />
      ))}
      {visibleRepos < repos.length && (
        <button
          onClick={loadMore}
          className="w-full py-2 text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark hover:text-bolt-elements-textPrimary dark:hover:text-bolt-elements-textPrimary-dark transition-colors"
        >
          Charger plus de dépôts...
        </button>
      )}
    </>
  );
}

function RepositoryCard({ repo, onSelect }: { repo: GitHubRepoInfo; onSelect: () => void }) {
  return (
    <div className="group p-4 rounded-lg bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-1-dark border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark hover:border-green-500/50 transition-colors shadow-sm hover:shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="i-ph:git-repository text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark w-5 h-5" />
            <div>
              <h3 className="font-semibold text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark">{repo.name}</h3>
              <p className="text-xs text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark mt-0.5">{repo.full_name}</p>
            </div>
          </div>
          {repo.description && (
            <p className="text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark line-clamp-2 mb-3">{repo.description}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <RepoStat icon="i-ph:code" value={repo.language} />
            <RepoStat icon="i-ph:star" value={repo.stargazers_count.toLocaleString()} />
            <RepoStat icon="i-ph:clock" value={new Date(repo.updated_at).toLocaleDateString()} />
          </div>
        </div>
        <button
          onClick={onSelect}
          className="px-4 py-2 h-10 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-all flex items-center gap-2"
        >
          <span className="i-ph:download-simple w-4 h-4" />
          <span className="hidden sm:inline">Importer</span>
        </button>
      </div>
    </div>
  );
}

function RepoStat({ icon, value }: { icon: string; value?: string | number }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-[#666666] dark:text-[#999999] bg-[#F5F5F5] dark:bg-[#252525] px-2 py-1 rounded-md">
      <span className={`${icon} w-3.5 h-3.5`} />
      <span>{value}</span>
    </div>
  );
}

function StatItem({ icon, label, value, tooltip }: { icon: string; label: string; value: string; tooltip?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2-dark rounded-lg relative group">
      <span className={`${icon} w-6 h-6 text-green-500`} />
      <div>
        <p className="text-sm text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark">{label}</p>
        <p className="font-medium text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark">{value}</p>
      </div>
      {tooltip && (
        <div className="absolute -top-2 -right-2">
          <span className="i-ph:info text-xs text-bolt-elements-textTertiary dark:text-bolt-elements-textTertiary-dark cursor-help" />
          <div className="absolute hidden group-hover:block bg-bolt-elements-background-depth-3 dark:bg-bolt-elements-background-depth-3-dark text-xs text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark p-2 rounded-lg shadow-lg w-48 right-0 mt-2">
            {tooltip}
          </div>
        </div>
      )}
    </div>
  );
}

function LanguageBars({ languages }: { languages: RepositoryStats['languages'] }) {
  const total = Object.values(languages).reduce((acc, val) => acc + val, 0);
  const sortedLanguages = Object.entries(languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const languageColors: Record<string, string> = {
    js: '#f1e05a',
    ts: '#3178c6',
    py: '#3572A5',
    java: '#b07219',
    html: '#e34c26',
    css: '#563d7c',
    scss: '#c6538c',
    json: '#292929',
    md: '#083fa1',
    yml: '#cb171e',
    xml: '#f34b7d',
    php: '#4F5D95',
    rb: '#701516',
    go: '#00ADD8',
    rs: '#dea584',
    cpp: '#f34b7d',
    cs: '#178600',
  };

  const [showAll, setShowAll] = useState(false);

  const visibleLanguages = showAll ? sortedLanguages : sortedLanguages.slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden bg-[#F5F5F5] dark:bg-[#333333]">
        {visibleLanguages.map(([lang]) => (
          <div
            key={lang}
            style={{
              width: `${(languages[lang] / total) * 100}%`,
              backgroundColor: languageColors[lang] || '#4ade80',
            }}
            className="h-full transition-all duration-500"
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleLanguages.map(([lang, size]) => (
          <div
            key={lang}
            className="flex items-center gap-1.5 text-xs text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-2-dark px-2 py-1 rounded-md"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: languageColors[lang] || '#4ade80' }}
            />
            <span className="font-medium">{lang.toUpperCase()}</span>
            <span className="text-bolt-elements-textTertiary dark:text-bolt-elements-textTertiary-dark">
              {(size / total * 100).toFixed(1)}%
            </span>
          </div>
        ))}
        {sortedLanguages.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs bg-transparent text-bolt-elements-textSecondary dark:text-bolt-elements-textSecondary-dark hover:text-bolt-elements-textPrimary dark:hover:text-bolt-elements-textPrimary-dark transition-colors"
          >
            {showAll ? 'Voir moins' : `+${sortedLanguages.length - 3} autres`}
          </button>
        )}
      </div>
    </div>
  );
}

function Badge({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div className={`${color} px-3 py-1.5 rounded-full flex items-center gap-2 text-sm`}>
      <span className={`${icon} w-4 h-4`} />
      {label}
    </div>
  );
}
