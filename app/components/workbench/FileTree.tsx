import { memo, useEffect, useMemo, useState, type ReactNode, useCallback, useRef } from 'react';
import type { FileMap } from '~/lib/stores/files';
import { classNames } from '~/utils/classNames';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import * as ContextMenu from '@radix-ui/react-context-menu';
import type { FileHistory } from '~/types/actions';
import { diffLines, type Change } from 'diff';
import { toast } from 'react-toastify';
import { addTargetedFile } from '~/components/chat/TargetedFilesDisplay';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import type { MapStore } from 'nanostores';

const logger = createScopedLogger('FileTree');

const NODE_PADDING_LEFT = 8;
const DEFAULT_HIDDEN_FILES = [/\/node_modules\//, /\/\.next/, /\/\.astro/];

interface Props {
  files?: FileMap;
  selectedFile?: string;
  selectedFiles?: Set<string>;
  onFileSelect?: (filePath: string) => void;
  onMultiFileSelect?: (filePaths: string[]) => void;
  rootFolder?: string;
  hideRoot?: boolean;
  collapsed?: boolean;
  allowFolderSelection?: boolean;
  hiddenFiles?: Array<string | RegExp>;
  unsavedFiles?: Set<string>;
  fileHistory?: Record<string, FileHistory>;
  className?: string;
}

export const FileTree = memo(
  ({
    files = {},
    onFileSelect,
    selectedFile,
    selectedFiles,
    rootFolder,
    hideRoot = false,
    collapsed = false,
    allowFolderSelection = false,
    hiddenFiles,
    className,
    unsavedFiles,
    fileHistory = {},
    onMultiFileSelect,
    }: Props) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragTarget, setDragTarget] = useState<string | null>(null);
    const workbench =  workbenchStore;;
    renderLogger.trace('FileTree');

    const computedHiddenFiles = useMemo(() => [...DEFAULT_HIDDEN_FILES, ...(hiddenFiles ?? [])], [hiddenFiles]);

    const fileList = useMemo(() => {
      return buildFileList(files, rootFolder, hideRoot, computedHiddenFiles);
    }, [files, rootFolder, hideRoot, computedHiddenFiles]);

    const [collapsedFolders, setCollapsedFolders] = useState(() => {
      return collapsed
        ? new Set(fileList.filter((item) => item.kind === 'folder').map((item) => item.fullPath))
        : new Set<string>();
    });

    useEffect(() => {
      if (collapsed) {
        setCollapsedFolders(new Set(fileList.filter((item) => item.kind === 'folder').map((item) => item.fullPath)));
        return;
      }

      setCollapsedFolders((prevCollapsed) => {
        const newCollapsed = new Set<string>();

        for (const folder of fileList) {
          if (folder.kind === 'folder' && prevCollapsed.has(folder.fullPath)) {
            newCollapsed.add(folder.fullPath);
          }
        }

        return newCollapsed;
      });
    }, [fileList, collapsed]);

    const filteredFileList = useMemo(() => {
      const list = [];

      let lastDepth = Number.MAX_SAFE_INTEGER;

      for (const fileOrFolder of fileList) {
        const depth = fileOrFolder.depth;

        // if the depth is equal we reached the end of the collaped group
        if (lastDepth === depth) {
          lastDepth = Number.MAX_SAFE_INTEGER;
        }

        // ignore collapsed folders
        if (collapsedFolders.has(fileOrFolder.fullPath)) {
          lastDepth = Math.min(lastDepth, depth);
        }

        // ignore files and folders below the last collapsed folder
        if (lastDepth < depth) {
          continue;
        }

        list.push(fileOrFolder);
      }

      return list;
    }, [fileList, collapsedFolders]);

    const toggleCollapseState = (fullPath: string) => {
      setCollapsedFolders((prevSet) => {
        const newSet = new Set(prevSet);

        if (newSet.has(fullPath)) {
          newSet.delete(fullPath);
        } else {
          newSet.add(fullPath);
        }

        return newSet;
      });
    };

    const onCopyPath = (fileOrFolder: FileNode | FolderNode) => {
      try {
        navigator.clipboard.writeText(fileOrFolder.fullPath);
      } catch (error) {
        logger.error(error);
      }
    };

    const onCopyRelativePath = (fileOrFolder: FileNode | FolderNode) => {
      try {
        navigator.clipboard.writeText(fileOrFolder.fullPath.substring((rootFolder || '').length));
      } catch (error) {
        logger.error(error);
      }
    };

    const onDownload = useCallback((filePath: string) => {
      const file = files[filePath];
      if (!file || file.type !== 'file') {
        toast.error(`Impossible de télécharger ${filePath}`);
        return;
      }

      try {
        const blob = new Blob([file.content], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filePath.split('/').pop() || 'download';
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        logger.error(`Erreur lors du téléchargement de ${filePath}:`, error);
        toast.error(`Échec du téléchargement de ${filePath}`);
      }
    }, [files]);

    return (
      <div className={classNames('text-sm', className, 'overflow-y-auto')}>
        {filteredFileList.map((fileOrFolder) => {
          switch (fileOrFolder.kind) {
            case 'file': {
              return (
                <File
                  key={fileOrFolder.id}
                  selected={selectedFile === fileOrFolder.fullPath}
                  selectedFiles={selectedFiles}
                  file={fileOrFolder}
                  unsavedChanges={unsavedFiles?.has(fileOrFolder.fullPath)}
                  fileHistory={fileHistory}
                  onCopyPath={() => {
                    onCopyPath(fileOrFolder);
                  }}
                  onCopyRelativePath={() => {
                    onCopyRelativePath(fileOrFolder);
                  }}
                  onDownload={() => onDownload(fileOrFolder.fullPath)}
                  onClick={() => {
                    onFileSelect?.(fileOrFolder.fullPath);
                  }}
                />
              );
            }
            case 'folder': {
              return (
                <Folder
                  key={fileOrFolder.id}
                  folder={fileOrFolder}
                  selected={allowFolderSelection && selectedFile === fileOrFolder.fullPath}
                  collapsed={collapsedFolders.has(fileOrFolder.fullPath)}
                  onCopyPath={() => {
                    onCopyPath(fileOrFolder);
                  }}
                  onCopyRelativePath={() => {
                    onCopyRelativePath(fileOrFolder);
                  }}
                  onClick={() => {
                    toggleCollapseState(fileOrFolder.fullPath);
                  }}
                />
              );
            }
            default: {
              return undefined;
            }
          }
        })}
      </div>
    );
  },
);

export default FileTree;

interface FolderProps {
  folder: FolderNode;
  collapsed: boolean;
  selected?: boolean;
  onCopyPath: () => void;
  onCopyRelativePath: () => void;
  onClick: () => void;
}

interface FolderContextMenuProps {
  onCopyPath?: () => void;
  onCopyRelativePath?: () => void;
  onSendToChat?: () => void;
  onDownload?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onCreateFile?: () => void;
  onCreateFolder?: () => void;
  isFolder?: boolean;
  children: ReactNode;
}

function ContextMenuItem({ onSelect, children }: { onSelect?: () => void; children: ReactNode }) {
  return (
    <ContextMenu.Item
      onSelect={onSelect}
      className="flex items-center gap-2 px-2 py-1.5 outline-0 text-sm text-white cursor-pointer ws-nowrap text-bolt-elements-item-contentDefault hover:text-bolt-elements-item-contentActive hover:bg-bolt-elements-item-backgroundActive rounded-md"
    >
      {children}
    </ContextMenu.Item>
  );
}

function FileContextMenu({ onCopyPath, onCopyRelativePath, onSendToChat, onDownload, onRename, onDelete, onCreateFile, onCreateFolder, isFolder = false, children }: FolderContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          style={{ zIndex: 998 }}
          className="border border-bolt-elements-borderColor rounded-md z-context-menu bg-bolt-elements-background-depth-1 dark:bg-bolt-elements-background-depth-2 data-[state=open]:animate-in animate-duration-100 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-98 w-56"
        >
          <ContextMenu.Group className="p-1 border-b border-bolt-elements-borderColor/50">
            {onSendToChat && (
              <ContextMenuItem 
                onSelect={onSendToChat}
                data-testid="context-menu-send-to-chat"
              >
                <span className="i-ph:chat-circle-text text-white text-xl mr-2 text-bolt-elements-textSecondary" />
                <span className="text-bolt-elements-textPrimary">Cibler le fichier</span>
              </ContextMenuItem>
            )}
            <ContextMenuItem 
              onSelect={onCopyPath}
              data-testid="context-menu-copy-path"
            >
              <span className="i-ph:clipboard text-white text-xl mr-2 text-bolt-elements-textSecondary" />
              <span className="text-bolt-elements-textPrimary">Copier le chemin</span>
            </ContextMenuItem>
            <ContextMenuItem 
              onSelect={onCopyRelativePath}
              data-testid="context-menu-copy-relative-path"
            >
              <span className="i-ph:clipboard-text text-white text-xl mr-2 text-bolt-elements-textSecondary" />
              <span className="text-bolt-elements-textPrimary">Copier le chemin relatif</span>
            </ContextMenuItem>
            {onDownload && (
              <ContextMenuItem 
                onSelect={onDownload}
                data-testid="context-menu-download"
              >
                <span className="i-ph:download-simple text-white text-xl mr-2 text-bolt-elements-textSecondary" />
                <span className="text-bolt-elements-textPrimary">Télécharger</span>
              </ContextMenuItem>
            )}
          </ContextMenu.Group>
          
          <ContextMenu.Group className="p-1 border-b border-bolt-elements-borderColor/50">
            {onRename && (
              <ContextMenuItem 
                onSelect={onRename}
                data-testid="context-menu-rename"
              >
                <span className="i-ph:pencil-simple text-white text-xl mr-2 text-bolt-elements-textSecondary" />
                <span className="text-bolt-elements-textPrimary">Renommer</span>
              </ContextMenuItem>
            )}
            {onDelete && (
              <ContextMenuItem 
                onSelect={onDelete}
                data-testid="context-menu-delete"
              >
                <span className="i-ph:trash text-white text-xl mr-2 text-red-500" />
                <span className="text-bolt-elements-textPrimary">Supprimer</span>
              </ContextMenuItem>
            )}
          </ContextMenu.Group>
          
          {isFolder && (
            <ContextMenu.Group className="p-1">
              {onCreateFile && (
                <ContextMenuItem 
                  onSelect={onCreateFile}
                  data-testid="context-menu-create-file"
                >
                  <span className="i-ph:file-plus text-white text-xl mr-2 text-bolt-elements-textSecondary" />
                  <span className="text-bolt-elements-textPrimary">Nouveau fichier</span>
                </ContextMenuItem>
              )}
              {onCreateFolder && (
                <ContextMenuItem 
                  onSelect={onCreateFolder}
                  data-testid="context-menu-create-folder"
                >
                  <span className="i-ph:folder-plus text-white text-xl mr-2 text-bolt-elements-textSecondary" />
                  <span className="text-bolt-elements-textPrimary">Nouveau dossier</span>
                </ContextMenuItem>
              )}
            </ContextMenu.Group>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function Folder({ folder, collapsed, selected = false, onCopyPath, onCopyRelativePath, onClick }: FolderProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [showCreateFileInput, setShowCreateFileInput] = useState(false);
  const [showCreateFolderInput, setShowCreateFolderInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const createFolderInputRef = useRef<HTMLInputElement>(null);
  
  // Importer le store workbench
  const workbench =  workbenchStore;;
  
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);
  
  useEffect(() => {
    if (showCreateFileInput && createFileInputRef.current) {
      createFileInputRef.current.focus();
    }
  }, [showCreateFileInput]);
  
  useEffect(() => {
    if (showCreateFolderInput && createFolderInputRef.current) {
      createFolderInputRef.current.focus();
    }
  }, [showCreateFolderInput]);
  
  const handleRename = () => {
    setIsRenaming(true);
  };
  
  const handleRenameSubmit = async () => {
    if (newName && newName !== folder.name) {
      const oldPath = folder.fullPath;
      const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
      const newPath = `${parentPath}/${newName}`;
      
      const success = await workbench.renameFile(oldPath, newPath);
      if (success) {
        toast.success(`Dossier renommé avec succès`);
      } else {
        toast.error(`Échec du renommage du dossier`);
        setNewName(folder.name); // Reset to original name
      }
    }
    setIsRenaming(false);
  };
  
  const handleDelete = () => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le dossier "${folder.name}" et tout son contenu ?`)) {
      workbench.deleteFolder(folder.fullPath).then((success: boolean) => {
        if (success) {
          toast.success(`Dossier supprimé avec succès`);
        } else {
          toast.error(`Échec de la suppression du dossier`);
        }
      });
    }
  };
  
  const handleCreateFile = () => {
    setShowCreateFileInput(true);
  };
  
  const handleCreateFolder = () => {
    setShowCreateFolderInput(true);
  };
  
  const handleCreateFileSubmit = async () => {
    if (newFileName) {
      const newFilePath = `${folder.fullPath}/${newFileName}`;
      const success = await workbench.createFile(newFilePath, '');
      if (success) {
        toast.success(`Fichier créé avec succès`);
      } else {
        toast.error(`Échec de la création du fichier`);
      }
    }
    setShowCreateFileInput(false);
    setNewFileName('');
  };
  
  const handleCreateFolderSubmit = async () => {
    if (newFolderName) {
      const newFolderPath = `${folder.fullPath}/${newFolderName}`;
      const success = await workbench.createFolder(newFolderPath);
      if (success) {
        toast.success(`Dossier créé avec succès`);
      } else {
        toast.error(`Échec de la création du dossier`);
      }
    }
    setShowCreateFolderInput(false);
    setNewFolderName('');
  };
  
  if (isRenaming) {
    return (
      <div 
        className="flex items-center w-full pr-2 border-2 border-transparent text-faded py-0.5"
        style={{ paddingLeft: `${6 + folder.depth * NODE_PADDING_LEFT}px` }}
      >
        <div className={classNames('scale-120 shrink-0', {
          'i-ph:caret-right scale-98': collapsed,
          'i-ph:caret-down scale-98': !collapsed,
        })}></div>
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit();
            if (e.key === 'Escape') {
              setNewName(folder.name);
              setIsRenaming(false);
            }
          }}
          className="bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border border-bolt-elements-borderColor rounded px-1 py-0 w-full"
        />
      </div>
    );
  }
  
  return (
    <>
      <FileContextMenu 
        onCopyPath={onCopyPath}
        onCopyRelativePath={onCopyRelativePath}
        onRename={handleRename}
        onDelete={handleDelete}
        onCreateFile={handleCreateFile}
        onCreateFolder={handleCreateFolder}
        isFolder={true}
      >
        <NodeButton
          className={classNames('group', {
            'bg-transparent text-bolt-elements-item-contentDefault hover:text-bolt-elements-item-contentActive hover:bg-bolt-elements-item-backgroundActive':
              !selected,
            'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent': selected,
          })}
          depth={folder.depth}
          iconClasses={classNames({
            'i-ph:caret-right scale-98': collapsed,
            'i-ph:caret-down scale-98': !collapsed,
          })}
          onClick={onClick}
        >
          {folder.name}
        </NodeButton>
      </FileContextMenu>
      
      {showCreateFileInput && (
        <div 
          className="flex items-center w-full pr-2 border-2 border-transparent text-faded py-0.5 pl-8"
          style={{ paddingLeft: `${6 + (folder.depth + 1) * NODE_PADDING_LEFT}px` }}
        >
          <div className="scale-120 shrink-0 i-ph:file-plus scale-98"></div>
          <input
            ref={createFileInputRef}
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onBlur={handleCreateFileSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFileSubmit();
              if (e.key === 'Escape') {
                setNewFileName('');
                setShowCreateFileInput(false);
              }
            }}
            placeholder="Nom du fichier"
            className="bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border border-bolt-elements-borderColor rounded px-1 py-0 w-full ml-2"
          />
        </div>
      )}
      
      {showCreateFolderInput && (
        <div 
          className="flex items-center w-full pr-2 border-2 border-transparent text-faded py-0.5 pl-8"
          style={{ paddingLeft: `${6 + (folder.depth + 1) * NODE_PADDING_LEFT}px` }}
        >
          <div className="scale-120 shrink-0 i-ph:folder-plus scale-98"></div>
          <input
            ref={createFolderInputRef}
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={handleCreateFolderSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolderSubmit();
              if (e.key === 'Escape') {
                setNewFolderName('');
                setShowCreateFolderInput(false);
              }
            }}
            placeholder="Nom du dossier"
            className="bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border border-bolt-elements-borderColor rounded px-1 py-0 w-full ml-2"
          />
        </div>
      )}
    </>
  );
}

interface FileProps {
  file: FileNode;
  selected: boolean;
  selectedFiles?: Set<string>;
  unsavedChanges?: boolean;
  fileHistory?: Record<string, FileHistory>;
  onCopyPath: () => void;
  onCopyRelativePath: () => void;
  onDownload: () => void;
  onClick: () => void;
}

// Ajout de la carte d'icônes pour les types de fichiers
const iconMap: Record<string, string> = {
  js: 'i-ph:file-js-duotone text-yellow-400',
  jsx: 'i-ph:file-jsx-duotone text-blue-400',
  ts: 'i-ph:file-ts-duotone text-blue-500',
  tsx: 'i-ph:file-tsx-duotone text-blue-500',
  css: 'i-ph:file-css-duotone text-blue-400',
  scss: 'i-ph:file-css-duotone text-pink-400',
  html: 'i-ph:file-html-duotone text-orange-500',
  json: 'i-ph:file-json-duotone text-yellow-300',
  md: 'i-ph:file-text-duotone text-gray-400',
  py: 'i-ph:file-py-duotone text-blue-500',
  java: 'i-ph:file-code-duotone text-orange-600',
  php: 'i-ph:file-php-duotone text-indigo-400',
  env: 'i-ph:file-lock-duotone text-green-300',
  lock: 'i-ph:lock-key-duotone text-yellow-500',
  dockerfile: 'i-ph:cube-duotone text-blue-400',
};

// Fonction utilitaire pour obtenir l'icône appropriée
function getFileIcon(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const specialFiles = {
    'dockerfile': 'i-ph:cube-duotone text-blue-400',
    'package.json': 'i-ph:file-js-duotone text-green-400',
    'readme.md': 'i-ph:file-text-duotone text-blue-300',
  } as const;

  return specialFiles[fileName.toLowerCase() as keyof typeof specialFiles] 
    || iconMap[extension] 
    || 'i-ph:file-duotone text-gray-400';
}


function File({
  file: { depth, name, fullPath },
  onClick,
  onCopyPath,
  onCopyRelativePath,
  onDownload,
  selected,
  selectedFiles,
  unsavedChanges = false,
  fileHistory = {},
}: FileProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMultiSelected = selectedFiles?.has(fullPath);
  const fileIcon = getFileIcon(name);
  
  // Importer le store workbench
  const workbench = workbenchStore;
  
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);
  
  const handleRename = () => {
    setIsRenaming(true);
  };
  
  const handleRenameSubmit = async () => {
    if (newName && newName !== name) {
      const oldPath = fullPath;
      const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
      const newPath = `${parentPath}/${newName}`;
      
      const success = await workbench.renameFile(oldPath, newPath);
      if (success) {
        toast.success(`Fichier renommé avec succès`);
      } else {
        toast.error(`Échec du renommage du fichier`);
        setNewName(name); // Reset to original name
      }
    }
    setIsRenaming(false);
  };
  
  const handleDelete = () => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le fichier "${name}" ?`)) {
      workbench.deleteFile(fullPath).then((success: boolean) => {
        if (success) {
          toast.success(`Fichier supprimé avec succès`);
        } else {
          toast.error(`Échec de la suppression du fichier`);
        }
      });
    }
  };
  
  const handleSendToChat = () => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) {
      toast.error('❌ Impossible de trouver le champ de saisie du chat');
      return;
    }
  
    try {
      // Détermination des fichiers à envoyer
      const filesToSend = selectedFiles && selectedFiles.size > 1 
        ? Array.from(selectedFiles) 
        : [fullPath];
      
      // Add each file to the targeted files
      let addedCount = 0;
      filesToSend.forEach(path => {
        if (addTargetedFile(path, textarea)) {
          addedCount++;
        }
      });
      
      // Show success message
      if (addedCount > 0) {
        toast.success(`${addedCount} fichier(s) ciblé(s) dans le chat`, 
          { autoClose: 2000, position: 'bottom-right', theme: 'dark' }
        );
      } else {
        toast.info('ℹ️ Ces fichiers sont déjà ciblés', 
          { autoClose: 2000, position: 'bottom-right', theme: 'dark' }
        );
      }
    } catch (error) {
      console.error('Error sending files to chat:', error);
      toast.error('❌ Erreur lors de l\'ajout des fichiers au chat');
    }
  };
  
  const fileModifications = fileHistory[fullPath];
  // const hasModifications = fileModifications !== undefined;

  // Calculate added and removed lines from the most recent changes
  const { additions, deletions } = useMemo(() => {
    if (!fileModifications?.originalContent) {
      return { additions: 0, deletions: 0 };
    }
    // Usar a mesma lógica do DiffView para processar as mudanças
    const normalizedOriginal = fileModifications.originalContent.replace(/\r\n/g, '\n');
    const normalizedCurrent =
    fileModifications.versions[fileModifications.versions.length - 1]?.content.replace(/\r\n/g, '\n') || '';
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
  }, [fileModifications]);

  const showStats = additions > 0 || deletions > 0;
  
  if (isRenaming) {
    return (
      <div 
        className="flex items-center w-full pr-2 border-2 border-transparent text-faded py-0.5"
        style={{ paddingLeft: `${6 + depth * NODE_PADDING_LEFT}px` }}
      >
        <div className={classNames('scale-120 shrink-0', fileIcon)}></div>
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit();
            if (e.key === 'Escape') {
              setNewName(name);
              setIsRenaming(false);
            }
          }}
          className="bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border border-bolt-elements-borderColor rounded px-1 py-0 w-full ml-2"
        />
      </div>
    );
  }
  
  return (
    <FileContextMenu 
      onCopyPath={onCopyPath}
      onCopyRelativePath={onCopyRelativePath}
      onSendToChat={handleSendToChat}
      onDownload={onDownload}
      onRename={handleRename}
      onDelete={handleDelete}
    >
      <NodeButton
        className={classNames('group', {
          'bg-transparent hover:bg-green-500/10 text-bolt-elements-item-contentDefault': 
            !selected && !isMultiSelected,
          'bg-green-500/20 text-white': Boolean(selected || isMultiSelected),
        })}
        depth={depth}
        iconClasses={classNames(`${fileIcon} scale-98`, {
          'group-hover:text-bolt-elements-item-contentActive': !selected && !isMultiSelected,
        })}
        onClick={onClick}
      >
        <div className={classNames('flex items-center', {
          'group-hover:text-bolt-elements-item-contentActive': !selected && !isMultiSelected,
        })}>
          <div className="flex-1 truncate pr-2">{name}</div>
          <div className="flex items-center gap-1">
            {showStats && (
              <div className="flex items-center gap-1 text-xs">
                {additions > 0 && <span className="text-green-500">+{additions}</span>}
                {deletions > 0 && <span className="text-red-500">-{deletions}</span>}
              </div>
            )}
            {unsavedChanges && <span className="i-ph:circle-fill scale-68 shrink-0 text-orange-500" />}
          </div>
          {unsavedChanges && <span className="i-ph:circle-fill scale-68 shrink-0 text-red-500 dark:text-green-400 animate-pulse" />}
        </div>
      </NodeButton>
    </FileContextMenu>
  );
}


interface ButtonProps {
  depth: number;
  iconClasses: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

function NodeButton({ depth, iconClasses, onClick, className, children }: ButtonProps) {
  return (
    <button
      className={classNames(
        'flex items-center gap-1.5 w-full pr-2 border-2 border-transparent text-faded py-0.5',
        className,
      )}
      style={{ paddingLeft: `${6 + depth * NODE_PADDING_LEFT}px` }}
      onClick={() => onClick?.()}
    >
      <div className={classNames('scale-120 shrink-0', iconClasses)}></div>
      <div className="truncate w-full text-left">{children}</div>
    </button>
  );
}

type Node = FileNode | FolderNode;

interface BaseNode {
  id: number;
  depth: number;
  name: string;
  fullPath: string;
}

interface FileNode extends BaseNode {
  kind: 'file';
}

interface FolderNode extends BaseNode {
  kind: 'folder';
}

function buildFileList(
  files: FileMap,
  rootFolder = '/',
  hideRoot: boolean,
  hiddenFiles: Array<string | RegExp>,
): Node[] {
  const folderPaths = new Set<string>();
  const fileList: Node[] = [];

  let defaultDepth = 0;

  if (rootFolder === '/' && !hideRoot) {
    defaultDepth = 1;
    fileList.push({ kind: 'folder', name: '/', depth: 0, id: 0, fullPath: '/' });
  }

  for (const [filePath, dirent] of Object.entries(files)) {
    const segments = filePath.split('/').filter((segment) => segment);
    const fileName = segments.at(-1);

    if (!fileName || isHiddenFile(filePath, fileName, hiddenFiles)) {
      continue;
    }

    let currentPath = '';

    let i = 0;
    let depth = 0;

    while (i < segments.length) {
      const name = segments[i];
      const fullPath = (currentPath += `/${name}`);

      if (!fullPath.startsWith(rootFolder) || (hideRoot && fullPath === rootFolder)) {
        i++;
        continue;
      }

      if (i === segments.length - 1 && dirent?.type === 'file') {
        fileList.push({
          kind: 'file',
          id: fileList.length,
          name,
          fullPath,
          depth: depth + defaultDepth,
        });
      } else if (!folderPaths.has(fullPath)) {
        folderPaths.add(fullPath);

        fileList.push({
          kind: 'folder',
          id: fileList.length,
          name,
          fullPath,
          depth: depth + defaultDepth,
        });
      }

      i++;
      depth++;
    }
  }

  return sortFileList(rootFolder, fileList, hideRoot);
}

function isHiddenFile(filePath: string, fileName: string, hiddenFiles: Array<string | RegExp>) {
  return hiddenFiles.some((pathOrRegex) => {
    if (typeof pathOrRegex === 'string') {
      return fileName === pathOrRegex;
    }

    return pathOrRegex.test(filePath);
  });
}

/**
 * Sorts the given list of nodes into a tree structure (still a flat list).
 *
 * This function organizes the nodes into a hierarchical structure based on their paths,
 * with folders appearing before files and all items sorted alphabetically within their level.
 *
 * @note This function mutates the given `nodeList` array for performance reasons.
 *
 * @param rootFolder - The path of the root folder to start the sorting from.
 * @param nodeList - The list of nodes to be sorted.
 *
 * @returns A new array of nodes sorted in depth-first order.
 */
function sortFileList(rootFolder: string, nodeList: Node[], hideRoot: boolean): Node[] {
  logger.trace('sortFileList');

  const nodeMap = new Map<string, Node>();
  const childrenMap = new Map<string, Node[]>();

  // pre-sort nodes by name and type
  nodeList.sort((a, b) => compareNodes(a, b));

  for (const node of nodeList) {
    nodeMap.set(node.fullPath, node);

    const parentPath = node.fullPath.slice(0, node.fullPath.lastIndexOf('/'));

    if (parentPath !== rootFolder.slice(0, rootFolder.lastIndexOf('/'))) {
      if (!childrenMap.has(parentPath)) {
        childrenMap.set(parentPath, []);
      }

      childrenMap.get(parentPath)?.push(node);
    }
  }

  const sortedList: Node[] = [];

  const depthFirstTraversal = (path: string): void => {
    const node = nodeMap.get(path);

    if (node) {
      sortedList.push(node);
    }

    const children = childrenMap.get(path);

    if (children) {
      for (const child of children) {
        if (child.kind === 'folder') {
          depthFirstTraversal(child.fullPath);
        } else {
          sortedList.push(child);
        }
      }
    }
  };

  if (hideRoot) {
    // if root is hidden, start traversal from its immediate children
    const rootChildren = childrenMap.get(rootFolder) || [];

    for (const child of rootChildren) {
      depthFirstTraversal(child.fullPath);
    }
  } else {
    depthFirstTraversal(rootFolder);
  }

  return sortedList;
}

function compareNodes(a: Node, b: Node): number {
  if (a.kind !== b.kind) {
    return a.kind === 'folder' ? -1 : 1;
  }

  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
}
