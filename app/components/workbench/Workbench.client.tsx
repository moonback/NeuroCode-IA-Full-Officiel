import { useStore } from '@nanostores/react';
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useCallback, useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { Popover, Transition, Dialog } from '@headlessui/react';
import { diffLines, type Change } from 'diff';
import { ActionRunner } from '~/lib/runtime/action-runner';
import { getLanguageFromExtension } from '~/utils/getLanguageFromExtension';
import type { FileHistory } from '~/types/actions';
import type { File } from '~/lib/stores/files';
import { DiffView } from './DiffView';
import {
  type OnChangeCallback as OnEditorChange,
  type OnScrollCallback as OnEditorScroll,
} from '~/components/editor/codemirror/CodeMirrorEditor';
import { IconButton } from '~/components/ui/IconButton';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { Slider, type SliderOptions } from '~/components/ui/Slider';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';
import useViewport from '~/lib/hooks';
import { PushToGitHubDialog } from '~/components/@settings/tabs/connections/components/PushToGitHubDialog';
import { NetlifyDeploymentLink } from '~/components/chat/NetlifyDeploymentLink.client';
import { netlifyConnection } from '~/lib/stores/netlify';
import { Markdown } from '~/components/chat/Markdown';
import { FileContextItem, type FileContext } from './FileContextItem';

interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
  actionRunner: ActionRunner;
  metadata?: {
    gitUrl?: string;
    chatSummary?: string;
  };
  updateChatMestaData?: (metadata: any) => void;
}

const viewTransition = { ease: cubicEasingFn };

const sliderOptions: SliderOptions<WorkbenchViewType> = {
  left: {
    value: 'code',
    text: 'Code',
  },
  middle: {
    value: 'diff',
    text: 'Diff',
  },
  right: {
    value: 'preview',
    text: 'Aperçu',
  },
};

const workbenchVariants = {
  closed: {
    width: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    width: 'var(--workbench-width)',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

const FileModifiedDropdown = memo(
  ({
    fileHistory,
    onSelectFile,
  }: {
    fileHistory: Record<string, FileHistory>;
    onSelectFile: (filePath: string) => void;
  }) => {
    const modifiedFiles = Object.entries(fileHistory);
    const hasChanges = modifiedFiles.length > 0;
    const [searchQuery, setSearchQuery] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    const filteredFiles = useMemo(() => {
      return modifiedFiles.filter(([filePath]) => filePath.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [modifiedFiles, searchQuery]);

    const handleCopyFileList = useCallback(() => {
      navigator.clipboard.writeText(filteredFiles.map(([filePath]) => filePath).join('\n'));
      setIsCopied(true);
      toast('Liste des fichiers copiée dans le presse-papiers', {
        icon: <div className="i-ph:check-circle text-accent-500" />,
      });
      setTimeout(() => setIsCopied(false), 2000);
    }, [filteredFiles]);

    return (
      <div className="flex items-center gap-2">
        <Popover className="relative">
          {({ open }: { open: boolean }) => (
            <>
              <Popover.Button 
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 transition-colors text-bolt-elements-textPrimary border border-bolt-elements-borderColor"
                aria-label="Afficher les fichiers modifiés"
              >
                <div className="i-ph:file-diff" />
                <span className="font-medium">Fichiers modifiés</span>
                {hasChanges && (
                  <span className="w-5 h-5 rounded-full bg-green-500/20 text-white text-xs flex items-center justify-center border border-green-500/30">
                    {modifiedFiles.length}
                  </span>
                )}
              </Popover.Button>
              <Transition
                show={open}
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                <Popover.Panel className="absolute right-0 z-20 mt-2 w-80 origin-top-right rounded-xl bg-bolt-elements-background-depth-2 shadow-xl border border-bolt-elements-borderColor">
                  <div className="p-2">
                    <div className="relative mx-2 mb-2">
                      <input
                        type="text"
                        placeholder="Rechercher un fichier..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-bolt-elements-textTertiary">
                        <div className="i-ph:magnifying-glass" />
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                      {filteredFiles.length > 0 ? (
                        filteredFiles.map(([filePath, history]) => {
                          const extension = filePath.split('.').pop() || '';
                          const language = getLanguageFromExtension(extension);

                          return (
                            <button
                              key={filePath}
                              onClick={() => onSelectFile(filePath)}
                              className="w-full px-3 py-2 text-left rounded-md hover:bg-bolt-elements-background-depth-1 transition-colors group bg-transparent"
                            >
                              <div className="flex items-center gap-2">
                                <div className="shrink-0 w-5 h-5 text-bolt-elements-textTertiary">
                                  {['typescript', 'javascript', 'jsx', 'tsx'].includes(language) && (
                                    <div className="i-ph:file-js" />
                                  )}
                                  {['css', 'scss', 'less'].includes(language) && <div className="i-ph:paint-brush" />}
                                  {language === 'html' && <div className="i-ph:code" />}
                                  {language === 'json' && <div className="i-ph:brackets-curly" />}
                                  {language === 'python' && <div className="i-ph:file-text" />}
                                  {language === 'markdown' && <div className="i-ph:article" />}
                                  {['yaml', 'yml'].includes(language) && <div className="i-ph:file-text" />}
                                  {language === 'sql' && <div className="i-ph:database" />}
                                  {language === 'dockerfile' && <div className="i-ph:cube" />}
                                  {language === 'shell' && <div className="i-ph:terminal" />}
                                  {![
                                    'typescript',
                                    'javascript',
                                    'css',
                                    'html',
                                    'json',
                                    'python',
                                    'markdown',
                                    'yaml',
                                    'yml',
                                    'sql',
                                    'dockerfile',
                                    'shell',
                                    'jsx',
                                    'tsx',
                                    'scss',
                                    'less',
                                  ].includes(language) && <div className="i-ph:file-text" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex flex-col min-w-0">
                                      <span className="truncate text-sm font-medium text-bolt-elements-textPrimary">
                                        {filePath.split('/').pop()}
                                      </span>
                                      <span className="truncate text-xs text-bolt-elements-textTertiary">
                                        {filePath}
                                      </span>
                                    </div>
                                    {(() => {
                                      // Calculate diff stats
                                      const { additions, deletions } = (() => {
                                        if (!history.originalContent) {
                                          return { additions: 0, deletions: 0 };
                                        }

                                        const normalizedOriginal = history.originalContent.replace(/\r\n/g, '\n');
                                        const normalizedCurrent =
                                          history.versions[history.versions.length - 1]?.content.replace(
                                            /\r\n/g,
                                            '\n',
                                          ) || '';

                                        if (normalizedOriginal === normalizedCurrent) {
                                          return { additions: 0, deletions: 0 };
                                        }

                                        const changes = diffLines(normalizedOriginal, normalizedCurrent, {
                                          newlineIsToken: false,
                                          ignoreWhitespace: true,
                                          ignoreCase: false,
                                        });

                                        return changes.reduce(
                                          (acc: { additions: number; deletions: number }, change: Change) => {
                                            if (change.added) {
                                              acc.additions += change.value.split('\n').length;
                                            }

                                            if (change.removed) {
                                              acc.deletions += change.value.split('\n').length;
                                            }

                                            return acc;
                                          },
                                          { additions: 0, deletions: 0 },
                                        );
                                      })();

                                      const showStats = additions > 0 || deletions > 0;

                                      return (
                                        showStats && (
                                          <div className="flex items-center gap-1 text-xs shrink-0">
                                            {additions > 0 && <span className="text-green-500">+{additions}</span>}
                                            {deletions > 0 && <span className="text-red-500">-{deletions}</span>}
                                          </div>
                                        )
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <div className="w-12 h-12 mb-2 text-bolt-elements-textTertiary">
                            <div className="i-ph:file-dashed" />
                          </div>
                          <p className="text-sm font-medium text-bolt-elements-textPrimary">
                            {searchQuery ? 'Aucun fichier correspondant' : 'Aucun fichier modifié'}
                          </p>
                          <p className="text-xs text-bolt-elements-textTertiary mt-1">
                            {searchQuery ? 'Essayez une autre recherche' : 'Les modifications apparaîtront ici lorsque vous modifierez'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {hasChanges && (
                    <div className="border-t border-bolt-elements-borderColor p-2">
                      <button
                        onClick={handleCopyFileList}
                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-3 transition-colors text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary"
                        disabled={isCopied}
                      >
                        {isCopied ? (
                          <>
                            <div className="i-ph:check-circle" />
                            Copié !
                          </>
                        ) : (
                          <>
                            <div className="i-ph:clipboard-text" />
                            Copier la liste des fichiers
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </Popover.Panel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    );
  },
);

const ContextSection = memo(({ title, files }: { title: string; files: FileContext[] }) => {
  if (!files.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-bolt-elements-textSecondary px-2">
        {title}
      </h3>
      <div className="space-y-1">
        {files.map((file) => (
          <FileContextItem key={file.path} file={file} />
        ))}
      </div>
    </div>
  );
});

interface StatItemProps {
  label: string;
  value: number;
  icon: string;
  formatValue?: (value: number) => string;
}

const StatItem = memo(({ label, value, icon, formatValue }: StatItemProps) => (
  <div className="flex items-center justify-between group">
    <div className="flex items-center gap-2">
      <div className={`${icon} text-bolt-elements-textTertiary group-hover:text-green-500 transition-colors`} />
      <span className="text-sm text-bolt-elements-textTertiary">{label}</span>
    </div>
    <span className="text-sm font-medium text-bolt-elements-textPrimary">
      {formatValue ? formatValue(value) : value}
    </span>
  </div>
));

// Déplacer la configuration des catégories en constante
const FILE_CATEGORIES = [
  { id: 'source', label: 'Source', icon: 'i-ph:code' },
  { id: 'config', label: 'Configuration', icon: 'i-ph:gear' },
  { id: 'test', label: 'Tests', icon: 'i-ph:test-tube' },
  { id: 'docs', label: 'Documentation', icon: 'i-ph:book' },
];

// Créer un composant réutilisable pour les boutons de catégorie
const CategoryButton = memo(({ 
  category,
  isSelected,
  onClick 
}: {
  category: typeof FILE_CATEGORIES[number];
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={classNames(
      "px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1",
      isSelected
        ? "bg-green-500/20 text-green-500 border border-green-500/30"
        : "bg-bolt-elements-background-depth-2 text-bolt-elements-textTertiary border border-bolt-elements-borderColor/20 hover:bg-bolt-elements-background-depth-3"
    )}
  >
    <div className={category.icon} />
    {category.label}
  </button>
));

// Modifier le composant DependencyCard pour qu'il corresponde au style de la page
const DependencyCard = memo(({ name, version }: { name: string; version: string }) => {
  const npmUrl = `https://www.npmjs.com/package/${name}`;
  const isDevDependency = name.startsWith('@types/') || name.includes('-plugin') || name.includes('-loader');

  return (
    <div className="p-3 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor/20 hover:border-green-500/30 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="i-ph:package text-bolt-elements-textTertiary group-hover:text-green-500 transition-colors" />
          <div>
            <div className="text-sm font-medium text-bolt-elements-textPrimary group-hover:text-green-500 transition-colors">
              {name}
            </div>
            <div className="text-xs text-bolt-elements-textTertiary">v{version}</div>
          </div>
        </div>
        {isDevDependency && (
          <div className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">
            Dev
          </div>
        )}
      </div>
    </div>
  );
});

interface NpmPackageInfo {
  readme?: string;
}

const DependencyDetails = memo(({ dependency, onClose }: { 
  dependency: { name: string; version: string }, 
  onClose: () => void 
}) => {
  const npmUrl = `https://www.npmjs.com/package/${dependency.name}`;
  const [readme, setReadme] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReadme = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`https://registry.npmjs.org/${dependency.name}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: NpmPackageInfo = await response.json();
        setReadme(data.readme || 'Aucune documentation disponible');
      } catch (error) {
        console.error('Erreur lors de la récupération de la documentation:', error);
        setError('Impossible de charger la documentation');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReadme();
  }, [dependency.name]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[99999]">
      <div className="w-full max-w-3xl bg-bolt-elements-background-depth-1 rounded-xl shadow-2xl border border-bolt-elements-borderColor/20">
        <div className="flex items-center justify-between p-4 border-b border-bolt-elements-borderColor/20">
          <div className="flex items-center gap-2">
            <div className="i-ph:package text-xl text-blue-500" />
            <h2 className="text-lg font-semibold text-bolt-elements-textPrimary">
              {dependency.name} <span className="text-sm text-bolt-elements-textTertiary">v{dependency.version}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bolt-elements-background-depth-2 transition-colors text-bolt-elements-textSecondary hover:text-red-400"
            aria-label="Fermer"
          >
            <div className="i-ph:x w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <div className="i-ph:spinner animate-spin text-xl text-bolt-elements-textTertiary" />
            </div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : readme ? (
            <div className="prose prose-sm dark:prose-invert">
              <Markdown>{readme}</Markdown>
            </div>
          ) : (
            <div className="text-center text-bolt-elements-textTertiary">
              Aucune documentation disponible
            </div>
          )}
        </div>

        <div className="p-4 border-t border-bolt-elements-borderColor/20">
          <a
            href={npmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 transition-colors text-bolt-elements-textPrimary"
          >
            <div className="i-ph:arrow-square-out" />
            Voir sur npm
          </a>
        </div>
      </div>
    </div>
  );
});

export const Workbench = memo(
  ({ chatStarted, isStreaming, actionRunner, metadata, updateChatMestaData }: WorkspaceProps) => {
    renderLogger.trace('Workbench');

    const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
    const [fileHistory, setFileHistory] = useState<Record<string, FileHistory>>({});
    const [isNetlifyModalOpen, setIsNetlifyModalOpen] = useState(false);
    const netlifyConnectionState = useStore(netlifyConnection);
    const [isContextModalOpen, setIsContextModalOpen] = useState(false);
    const [chatSummary, setChatSummary] = useState<string | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'stats'>('overview');
    const [fileSearchQuery, setFileSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'type' | 'size'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showAdvancedStats, setShowAdvancedStats] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDependenciesModalOpen, setIsDependenciesModalOpen] = useState(false);
    const [dependencies, setDependencies] = useState<{ name: string; version: string }[]>([]);
    const [dependencySearchQuery, setDependencySearchQuery] = useState('');
    const [dependencySortBy, setDependencySortBy] = useState<'name' | 'type'>('name');
    const [dependencySortOrder, setDependencySortOrder] = useState<'asc' | 'desc'>('asc');

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isContextModalOpen) return;

        // Close modal with Escape
        if (e.key === 'Escape') {
          setIsContextModalOpen(false);
        }

        // Switch tabs with number keys
        if (e.key === '1') {
          setActiveTab('overview');
        } else if (e.key === '2') {
          setActiveTab('files');
        } else if (e.key === '3') {
          setActiveTab('stats');
        }

        // Toggle sort order with S
        if (e.key === 's' && e.ctrlKey) {
          setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        }

        // Toggle advanced stats with A
        if (e.key === 'a' && e.ctrlKey) {
          setShowAdvancedStats(prev => !prev);
        }

        // Clear filters with C
        if (e.key === 'c' && e.ctrlKey) {
          setSelectedFilters(new Set());
          setFileSearchQuery('');
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isContextModalOpen]);

    // const modifiedFiles = Array.from(useStore(workbenchStore.unsavedFiles).keys());

    const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));
    const showWorkbench = useStore(workbenchStore.showWorkbench);
    const selectedFile = useStore(workbenchStore.selectedFile);
    const currentDocument = useStore(workbenchStore.currentDocument);
    const unsavedFiles = useStore(workbenchStore.unsavedFiles);
    const files = useStore(workbenchStore.files);
    const selectedView = useStore(workbenchStore.currentView);

    const isSmallViewport = useViewport(1024);

    const setSelectedView = (view: WorkbenchViewType) => {
      workbenchStore.currentView.set(view);
    };

    useEffect(() => {
      if (hasPreview) {
        setSelectedView('preview');
      }
    }, [hasPreview]);

    useEffect(() => {
      workbenchStore.setDocuments(files);
    }, [files]);

    const onEditorChange = useCallback<OnEditorChange>((update) => {
      workbenchStore.setCurrentDocumentContent(update.content);
    }, []);

    const onEditorScroll = useCallback<OnEditorScroll>((position) => {
      workbenchStore.setCurrentDocumentScrollPosition(position);
    }, []);

    const onFileSelect = useCallback((filePath: string | undefined) => {
      workbenchStore.setSelectedFile(filePath);
    }, []);

    const onFileSave = useCallback(() => {
      workbenchStore.saveCurrentDocument().catch(() => {
        toast.error('Failed to update file content');
      });
    }, []);

    const onFileReset = useCallback(() => {
      workbenchStore.resetCurrentDocument();
    }, []);

    const handleSelectFile = useCallback((filePath: string) => {
      workbenchStore.setSelectedFile(filePath);
      workbenchStore.currentView.set('diff');
    }, []);

    const contextFiles = useMemo(() => {
      return Object.entries(files)
        .filter((entry): entry is [string, File] => {
          const [_, dirent] = entry;
          return dirent?.type === 'file';
        })
        .map(([path, dirent]) => ({
          path,
          type: path.endsWith('.ts') || path.endsWith('.tsx') ? 'typescript' : 'javascript',
          metadata: {
            lineCount: dirent.content.split('\n').length,
            hasTypes: path.endsWith('.ts') || path.endsWith('.tsx'),
            hasComponents: path.includes('components'),
            hasHooks: path.includes('hooks'),
            hasStyles: path.includes('styles') || path.includes('css'),
            dependencies: 0 // This should be updated with actual dependency count
          }
        }));
    }, [files]);

    useEffect(() => {
      if (metadata?.chatSummary) {
        setChatSummary(metadata.chatSummary);
      }
    }, [metadata?.chatSummary]);

    const sortedAndFilteredFiles = useMemo(() => {
      let result = [...contextFiles];

      // Apply search filter
      if (fileSearchQuery) {
        result = result.filter(f => 
          f.path.toLowerCase().includes(fileSearchQuery.toLowerCase()) ||
          f.type.toLowerCase().includes(fileSearchQuery.toLowerCase())
        );
      }

      // Apply type filters
      if (selectedFilters.size > 0) {
        result = result.filter(f => selectedFilters.has(f.type));
      }

      // Apply category filter
      if (selectedCategory) {
        result = result.filter(f => {
          switch (selectedCategory) {
            case 'source':
              return f.type === 'typescript' || f.type === 'javascript';
            case 'config':
              return f.path.includes('config') || f.path.endsWith('.json') || f.path.endsWith('.yaml');
            case 'test':
              return f.path.includes('test') || f.path.includes('spec');
            case 'docs':
              return f.path.endsWith('.md') || f.path.includes('docs');
            default:
              return true;
          }
        });
      }

      // Apply sorting
      result.sort((a, b) => {
        const multiplier = sortOrder === 'asc' ? 1 : -1;
        
        switch (sortBy) {
          case 'name':
            return multiplier * a.path.localeCompare(b.path);
          case 'type':
            return multiplier * a.type.localeCompare(b.type);
          case 'size':
            return multiplier * ((a.metadata?.lineCount || 0) - (b.metadata?.lineCount || 0));
          default:
            return 0;
        }
      });

      return result;
    }, [contextFiles, fileSearchQuery, selectedFilters, sortBy, sortOrder, selectedCategory]);

    const fileTypes = useMemo(() => {
      const types = new Set(contextFiles.map(f => f.type));
      return Array.from(types);
    }, [contextFiles]);

    const { totalFiles, totalLines, totalSize, typescriptFiles, javascriptFiles, componentFiles, hookFiles, styleFiles } = useMemo(() => {
      return contextFiles.reduce((acc, f) => {
        acc.totalFiles++;
        acc.totalLines += f.metadata?.lineCount || 0;
        acc.totalSize += (f.metadata?.lineCount || 0) * 2;
        if (f.type === 'typescript') acc.typescriptFiles++;
        if (f.type === 'javascript') acc.javascriptFiles++;
        if (f.metadata?.hasComponents) acc.componentFiles++;
        if (f.metadata?.hasHooks) acc.hookFiles++;
        if (f.metadata?.hasStyles) acc.styleFiles++;
        return acc;
      }, {
        totalFiles: 0,
        totalLines: 0,
        totalSize: 0,
        typescriptFiles: 0,
        javascriptFiles: 0,
        componentFiles: 0,
        hookFiles: 0,
        styleFiles: 0
      });
    }, [contextFiles]);

    const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
      setSortBy(e.target.value as 'name' | 'type' | 'size');
    }, []);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setFileSearchQuery(e.target.value);
    }, []);

    const handleRefresh = useCallback(async () => {
      setIsLoading(true);
      try {
        // Simulate refresh delay
        await new Promise(resolve => setTimeout(resolve, 500));
        // Add your refresh logic here
      } finally {
        setIsLoading(false);
      }
    }, []);

    // Fetch dependencies from package.json
    useEffect(() => {
      const fetchDependencies = async () => {
        const files = workbenchStore.files.get();
        
        // Trouver le package.json
        const packageJsonEntry = Object.entries(files).find(([path]) => 
          path.endsWith('package.json')
        );

        if (!packageJsonEntry) {
          console.warn('Aucun fichier package.json trouvé');
          return;
        }

        const [path, dirent] = packageJsonEntry;

        // Vérifier que c'est bien un fichier
        if (dirent?.type !== 'file') {
          console.warn('package.json n\'est pas un fichier valide');
          return;
        }

        try {
          // Parser le contenu
          const { dependencies: deps = {}, devDependencies: devDeps = {} } = JSON.parse(dirent.content);
          const allDeps = { ...deps, ...devDeps };
          
          // Mettre à jour l'état
          setDependencies(
            Object.entries(allDeps).map(([name, version]) => ({ 
              name, 
              version: version as string 
            }))
          );
        } catch (error) {
          console.error('Erreur lors du parsing du package.json:', error);
          toast.error('Format de package.json invalide');
        }
      };

      if (isDependenciesModalOpen) {
        fetchDependencies();
      }
    }, [isDependenciesModalOpen]);

    const sortedAndFilteredDependencies = useMemo(() => {
      let result = [...dependencies];

      // Appliquer le filtre de recherche
      if (dependencySearchQuery) {
        result = result.filter(dep => 
          dep.name.toLowerCase().includes(dependencySearchQuery.toLowerCase())
        );
      }

      // Appliquer le tri
      result.sort((a, b) => {
        const multiplier = dependencySortOrder === 'asc' ? 1 : -1;
        
        switch (dependencySortBy) {
          case 'name':
            return multiplier * a.name.localeCompare(b.name);
          case 'type':
            const aType = a.name.startsWith('@types/') || a.name.includes('-plugin') || a.name.includes('-loader') ? 'dev' : 'prod';
            const bType = b.name.startsWith('@types/') || b.name.includes('-plugin') || b.name.includes('-loader') ? 'dev' : 'prod';
            return multiplier * aType.localeCompare(bType);
          default:
            return 0;
        }
      });

      return result;
    }, [dependencies, dependencySearchQuery, dependencySortBy, dependencySortOrder]);

    return (
      chatStarted && (
        <motion.div
          initial="closed"
          animate={showWorkbench ? 'open' : 'closed'}
          variants={workbenchVariants}
          className="z-workbench"
        >
          <div
            className={classNames(
              'fixed top-[calc(var(--header-height)+1.5rem)] bottom-6 w-[var(--workbench-inner-width)] mr-4 z-0 transition-[left,width] duration-200 bolt-ease-cubic-bezier',
              {
                'w-full': isSmallViewport,
                'left-0': showWorkbench && isSmallViewport,
                'left-[var(--workbench-left)]': showWorkbench,
                'left-[100%]': !showWorkbench,
              },
            )}
          >
            <div className="absolute inset-0 px-2 lg:px-6">
              <div className="h-full flex flex-col bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor shadow-sm rounded-lg overflow-hidden">
                {/* Header with view controls and actions */}
                <div className="flex items-center px-3 py-2 border-b border-bolt-elements-borderColor">
                  <Slider 
                    selected={selectedView} 
                    options={sliderOptions} 
                    setSelected={setSelectedView} 
                    aria-label="Select workbench view"
                  />
                  <div className="ml-auto" />
                  
                  {/* View-specific actions */}
                  {selectedView === 'code' && (
                    <div className="flex items-center gap-2">
                      <PanelHeaderButton
                        className="text-sm hover:bg-bolt-elements-background-depth-3 transition-colors"
                        onClick={() => setIsContextModalOpen(true)}
                        aria-label="Afficher le contexte du code"
                      >
                        <div className="i-ph:info text-green-500" />
                        <span className="hidden sm:inline">Projet</span>
                      </PanelHeaderButton>
                      <PanelHeaderButton
                        className="text-sm hover:bg-bolt-elements-background-depth-3 transition-colors"
                        onClick={() => setIsDependenciesModalOpen(true)}
                        aria-label="Afficher les dépendances du projet"
                      >
                        <div className="i-ph:package text-blue-500" />
                        <span className="hidden sm:inline">Dépendances</span>
                      </PanelHeaderButton>
                      <PanelHeaderButton
                        className="text-sm hover:bg-bolt-elements-background-depth-3 transition-colors"
                        onClick={() => workbenchStore.downloadZip()}
                        aria-label="Télécharger le code au format ZIP"
                      >
                        <div className="i-ph:download-simple text-purple-500" />
                        <span className="hidden sm:inline">Télécharger</span>
                      </PanelHeaderButton>
                      <PanelHeaderButton 
                        className="text-sm hover:bg-bolt-elements-background-depth-3 transition-colors"
                        onClick={() => setIsPushDialogOpen(true)}
                        aria-label="Push to GitHub"
                      >
                        <div className="i-ph:git-branch text-orange-500" />
                        <span className="hidden sm:inline">Push GitHub</span>
                      </PanelHeaderButton>
                      <PanelHeaderButton
                        className="text-sm hover:bg-bolt-elements-background-depth-3 transition-colors"
                        onClick={() => workbenchStore.toggleTerminal(!workbenchStore.showTerminal.get())}
                        aria-label="Toggle terminal"
                      >
                        <div className="i-ph:terminal text-cyan-500" />
                        <span className="hidden sm:inline">Terminal</span>
                      </PanelHeaderButton>
                    </div>
                  )}
                  
                  {selectedView === 'diff' && (
                    <FileModifiedDropdown 
                      fileHistory={fileHistory} 
                      onSelectFile={handleSelectFile} 
                    />
                  )}
                  
                  <IconButton
                    icon="i-ph:x-circle"
                    className="-mr-1 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    size="xl"
                    onClick={() => workbenchStore.showWorkbench.set(false)}
                    aria-label="Close workbench"
                  />
                </div>

                {/* Main content area with animated views */}
                <div className="relative flex-1 overflow-hidden">
                  <View 
                    initial={{ x: '0%' }} 
                    animate={{ x: selectedView === 'code' ? '0%' : '-100%' }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <EditorPanel
                      editorDocument={currentDocument}
                      isStreaming={isStreaming}
                      selectedFile={selectedFile}
                      files={files}
                      unsavedFiles={unsavedFiles}
                      fileHistory={fileHistory}
                      onFileSelect={onFileSelect}
                      onEditorScroll={onEditorScroll}
                      onEditorChange={onEditorChange}
                      onFileSave={onFileSave}
                      onFileReset={onFileReset}
                    />
                  </View>
                  
                  <View
                    initial={{ x: '100%' }}
                    animate={{ x: selectedView === 'diff' ? '0%' : selectedView === 'code' ? '100%' : '-100%' }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <DiffView 
                      fileHistory={fileHistory} 
                      setFileHistory={setFileHistory} 
                      actionRunner={actionRunner} 
                    />
                  </View>
                  
                  <View 
                    initial={{ x: '100%' }} 
                    animate={{ x: selectedView === 'preview' ? '0%' : '100%' }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <Preview />
                  </View>
                </div>
              </div>
            </div>
          </div>

          <PushToGitHubDialog
            isOpen={isPushDialogOpen}
            onClose={() => setIsPushDialogOpen(false)}
            onPush={async (repoName, username, token) => {
              try {
                const commitMessage = prompt('Please enter a commit message:', 'Initial commit') || 'Initial commit';
                await workbenchStore.pushToGitHub(repoName, commitMessage, username, token);

                const repoUrl = `https://github.com/${username}/${repoName}`;

                if (updateChatMestaData && !metadata?.gitUrl) {
                  updateChatMestaData({
                    ...(metadata || {}),
                    gitUrl: repoUrl,
                  });
                }

                return repoUrl;
              } catch (error) {
                console.error('Error pushing to GitHub:', error);
                toast.error('Failed to push to GitHub');
                throw error;
              }
            }}
          />

          <Dialog
            open={isContextModalOpen}
            onClose={() => setIsContextModalOpen(false)}
            className="relative z-[99999]"
          >
            <Transition.Child
              as="div"
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
            </Transition.Child>

            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Transition.Child
                as="div"
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl bg-bolt-elements-background-depth-1 rounded-xl shadow-2xl border border-bolt-elements-borderColor/20">
                  <div className="flex items-center justify-between p-4 border-b border-bolt-elements-borderColor/20">
                    <Dialog.Title className="text-lg font-semibold text-bolt-elements-textPrimary flex items-center gap-2">
                      <div className="i-ph:info text-xl text-green-500" />
                      Aperçu du projet
                    </Dialog.Title>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg bg-transparent hover:bg-bolt-elements-background-depth-2 transition-colors text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary disabled:opacity-50"
                        title="Actualiser"
                      >
                        <div className={`i-ph:arrows-clockwise ${isLoading ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="p-1.5 rounded-lg bg-transparent hover:bg-bolt-elements-background-depth-2 transition-colors text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary"
                        title={`Trier ${sortOrder === 'asc' ? 'décroissant' : 'croissant'}`}
                      >
                        <div className={`i-ph:arrows-down-up ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFilters(new Set());
                          setFileSearchQuery('');
                          setSelectedCategory(null);
                        }}
                        className="p-1.5 rounded-lg bg-transparent hover:bg-bolt-elements-background-depth-2 transition-colors text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary"
                        title="Réinitialiser les filtres"
                      >
                        <div className="i-ph:x-circle" />
                      </button>
                      <button
                        onClick={() => setIsContextModalOpen(false)}
                        className="p-1.5 rounded-lg hover:bg-bolt-elements-background-depth-2 transition-colors text-bolt-elements-textSecondary hover:text-red-400"
                        aria-label="Fermer"
                      >
                        <div className="i-ph:x w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex gap-4 mb-6 border-b border-bolt-elements-borderColor/20">
                      {(contextFiles.length > 10 || chatSummary) && (
                        <TabButton
                          active={activeTab === 'overview'}
                          onClick={() => setActiveTab('overview')}
                          label="Vue d'ensemble"
                        />
                      )}
                      <TabButton
                        active={activeTab === 'files'}
                        onClick={() => setActiveTab('files')}
                        label="Fichiers"
                      />
                      <TabButton
                        active={activeTab === 'stats'}
                        onClick={() => setActiveTab('stats')}
                        label="Statistiques"
                      />
                    </div>

                    <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                      <Transition
                        show={activeTab === 'overview'}
                        enter="transition-all duration-200"
                        enterFrom="opacity-0 translate-y-2"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition-all duration-200"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-2"
                      >
                        <div>
                          {chatSummary && (
                            <div className="p-4 bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor/20">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="i-ph:chat-circle-text text-xl text-green-500" />
                                <h3 className="text-sm font-medium text-bolt-elements-textSecondary">Résumé du chat</h3>
                              </div>
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <Markdown>{chatSummary}</Markdown>
                              </div>
                            </div>
                          )}
                        </div>
                      </Transition>

                      <Transition
                        show={activeTab === 'stats'}
                        enter="transition-all duration-200"
                        enterFrom="opacity-0 translate-y-2"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition-all duration-200"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-2"
                      >
                        <div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor/20">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-bolt-elements-textSecondary">Statistiques</h3>
                                <button
                                  onClick={() => setShowAdvancedStats(prev => !prev)}
                                  className="text-xs bg-transparent text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-bolt-elements-background-depth-2"
                                >
                                  {showAdvancedStats ? 'Basique' : 'Avancé'}
                                </button>
                              </div>
                              <div className="space-y-2">
                                <StatItem 
                                  label="Total des fichiers" 
                                  value={totalFiles}
                                  icon="i-ph:files"
                                />
                                <StatItem 
                                  label="Fichiers TypeScript" 
                                  value={typescriptFiles}
                                  icon="i-ph:file-ts"
                                />
                                <StatItem 
                                  label="Fichiers JavaScript" 
                                  value={javascriptFiles}
                                  icon="i-ph:file-js"
                                />
                                {showAdvancedStats && (
                                  <>
                                    <StatItem 
                                      label="Total des lignes" 
                                      value={totalLines}
                                      icon="i-ph:lines"
                                    />
                                    <StatItem 
                                      label="Taille totale" 
                                      value={totalSize}
                                      icon="i-ph:hard-drive"
                                      formatValue={(v) => `${(v / 1024).toFixed(2)} KB`}
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="p-4 bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor/20">
                              <h3 className="text-sm font-medium text-bolt-elements-textSecondary mb-2">Structure</h3>
                              <div className="space-y-2">
                                <StatItem 
                                  label="Composants" 
                                  value={componentFiles}
                                  icon="i-ph:component"
                                />
                                <StatItem 
                                  label="Hooks" 
                                  value={hookFiles}
                                  icon="i-ph:hook"
                                />
                                <StatItem 
                                  label="Styles" 
                                  value={styleFiles}
                                  icon="i-ph:paint-brush"
                                />
                                {showAdvancedStats && (
                                  <>
                                    <StatItem 
                                      label="Ratio TypeScript" 
                                      value={typescriptFiles / totalFiles * 100 || 0}
                                      icon="i-ph:chart-pie"
                                      formatValue={(v) => `${v.toFixed(1)}%`}
                                    />
                                    <StatItem 
                                      label="Ratio Composants" 
                                      value={componentFiles / totalFiles * 100 || 0}
                                      icon="i-ph:chart-pie"
                                      formatValue={(v) => `${v.toFixed(1)}%`}
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Transition>

                      <Transition
                        show={activeTab === 'files'}
                        enter="transition-all duration-200"
                        enterFrom="opacity-0 translate-y-2"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition-all duration-200"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-2"
                      >
                        <div>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                              <h3 className="text-sm font-medium text-bolt-elements-textSecondary">Fichiers par catégorie</h3>
                              <div className="flex items-center gap-2">
                                <select
                                  value={sortBy}
                                  onChange={handleSortChange}
                                  className="px-3 py-1.5 text-sm rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor/20 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                                >
                                  <option value="name">Nom</option>
                                  <option value="type">Type</option>
                                  <option value="size">Taille</option>
                                </select>
                                <input
                                  type="text"
                                  placeholder="Rechercher..."
                                  value={fileSearchQuery}
                                  onChange={handleSearchChange}
                                  className="px-3 py-1.5 text-sm rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor/20 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {FILE_CATEGORIES.map(category => (
                                <CategoryButton
                                  key={category.id}
                                  category={category}
                                  isSelected={selectedCategory === category.id}
                                  onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                                />
                              ))}
                            </div>

                            <div className="space-y-4">
                              <ContextSection 
                                title="Fichiers source" 
                                files={sortedAndFilteredFiles.filter(f => f.type === 'typescript' || f.type === 'javascript')} 
                              />
                              <ContextSection 
                                title="Configuration" 
                                files={sortedAndFilteredFiles.filter(f => f.path.includes('config') || f.path.endsWith('.json') || f.path.endsWith('.yaml'))} 
                              />
                              <ContextSection 
                                title="Tests" 
                                files={sortedAndFilteredFiles.filter(f => f.path.includes('test') || f.path.includes('spec'))} 
                              />
                              <ContextSection 
                                title="Documentation" 
                                files={sortedAndFilteredFiles.filter(f => f.path.endsWith('.md') || f.path.includes('docs'))} 
                              />
                            </div>
                          </div>
                        </div>
                      </Transition>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>

          {/* Dependencies Modal */}
          <Dialog
            open={isDependenciesModalOpen}
            onClose={() => setIsDependenciesModalOpen(false)}
            className="relative z-[99999]"
          >
            <Transition.Child
              as="div"
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
            </Transition.Child>

            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Transition.Child
                as="div"
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl bg-bolt-elements-background-depth-1 rounded-xl shadow-2xl border border-bolt-elements-borderColor/20">
                  <div className="flex items-center justify-between p-4 border-b border-bolt-elements-borderColor/20">
                    <Dialog.Title className="text-lg font-semibold text-bolt-elements-textPrimary flex items-center gap-2">
                      <div className="i-ph:package text-xl text-blue-500" />
                      Dépendances du projet
                      {dependencies.length > 0 && (
                        <span className="text-sm font-normal text-bolt-elements-textTertiary">
                          ({dependencies.length} dépendances)
                        </span>
                      )}
                    </Dialog.Title>
                    <button
                      onClick={() => setIsDependenciesModalOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-bolt-elements-background-depth-2 transition-colors text-bolt-elements-textSecondary hover:text-red-400"
                      aria-label="Fermer"
                    >
                      <div className="i-ph:x w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-4">
                    <div className="space-y-4">
                      {dependencies.length > 0 ? (
                        <>
                          <div className="flex items-center gap-3">
                            <input
                              type="text"
                              placeholder="Rechercher une dépendance..."
                              value={dependencySearchQuery}
                              onChange={(e) => setDependencySearchQuery(e.target.value)}
                              className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                            <select
                              value={dependencySortBy}
                              onChange={(e) => setDependencySortBy(e.target.value as 'name' | 'type')}
                              className="px-3 py-1.5 text-sm rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            >
                              <option value="name">Nom</option>
                              <option value="type">Type</option>
                            </select>
                            <button
                              onClick={() => setDependencySortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                              className="p-1.5 rounded-lg bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 transition-colors text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary"
                              title={`Trier ${dependencySortOrder === 'asc' ? 'décroissant' : 'croissant'}`}
                            >
                              <div className={`i-ph:arrows-down-up ${dependencySortOrder === 'desc' ? 'rotate-180' : ''}`} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {sortedAndFilteredDependencies.map((dep, index) => (
                              <DependencyCard key={index} name={dep.name} version={dep.version} />
                            ))}
                          </div>

                          <div className="text-xs text-bolt-elements-textTertiary mt-2 px-2">
                            <div className="i-ph:info" /> Les dépendances marquées "Dev" sont des dépendances de développement.
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <div className="w-12 h-12 mb-2 text-bolt-elements-textTertiary">
                            <div className="i-ph:package" />
                          </div>
                          <p className="text-sm font-medium text-bolt-elements-textPrimary">
                            Aucune dépendance trouvée
                          </p>
                          <p className="text-xs text-bolt-elements-textTertiary mt-1">
                            Assurez-vous qu'un fichier package.json existe dans votre projet
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </motion.div>
      )
    );
  },
);

// View component for rendering content with motion transitions
interface ViewProps extends HTMLMotionProps<'div'> {
  children: JSX.Element;
}

const View = memo(({ children, ...props }: ViewProps) => {
  return (
    <motion.div className="absolute inset-0" transition={viewTransition} {...props}>
      {children}
    </motion.div>
  );
});

// Nouveau composant réutilisable pour les onglets
const TabButton = memo(({ active, onClick, label }: { 
  active: boolean; 
  onClick: () => void; 
  label: string 
}) => (
  <button
    className={classNames(
      "px-4 py-2 text-sm font-medium bg-transparent border-b-2 transition-colors",
      active
        ? "text-bolt-elements-textPrimary border-green-500"
        : "text-bolt-elements-textSecondary border-transparent hover:border-green-500/50"
    )}
    onClick={onClick}
    aria-selected={active}
  >
    {label}
  </button>
));
