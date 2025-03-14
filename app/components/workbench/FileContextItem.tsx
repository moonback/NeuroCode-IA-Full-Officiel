import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { workbenchStore } from '~/lib/stores/workbench';
import { getLanguageFromExtension } from '~/utils/getLanguageFromExtension';

export interface FileContext {
  path: string;
  type: string;
  metadata?: {
    lineCount: number;
    hasTypes: boolean;
    hasComponents: boolean;
    hasHooks: boolean;
    hasStyles: boolean;
    dependencies: number;
    lastModified?: Date;
    size?: number;
    complexity?: number;
    imports?: number;
    exports?: number;
    testCoverage?: number;
  };
}

interface FileContextItemProps {
  file: FileContext;
  onSelect?: (path: string) => void;
  showMetadata?: boolean;
  className?: string;
  showAdvancedStats?: boolean;
}

const getFileIcon = (path: string) => {
  const extension = path.split('.').pop() || '';
  const language = getLanguageFromExtension(extension);

  if (['typescript', 'javascript', 'jsx', 'tsx'].includes(language)) {
    return 'i-ph:file-js';
  }
  if (['css', 'scss', 'less'].includes(language)) {
    return 'i-ph:paint-brush';
  }
  if (language === 'html') {
    return 'i-ph:code';
  }
  if (language === 'json') {
    return 'i-ph:brackets-curly';
  }
  if (language === 'python') {
    return 'i-ph:file-text';
  }
  if (language === 'markdown') {
    return 'i-ph:article';
  }
  if (['yaml', 'yml'].includes(language)) {
    return 'i-ph:file-text';
  }
  if (language === 'sql') {
    return 'i-ph:database';
  }
  if (language === 'dockerfile') {
    return 'i-ph:cube';
  }
  if (language === 'shell') {
    return 'i-ph:terminal';
  }
  return 'i-ph:file-text';
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDate = (date?: Date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const MetadataBadge = memo(({ 
  icon, 
  title, 
  children, 
  color = 'text-bolt-elements-textTertiary',
  hoverColor = 'group-hover:text-green-500'
}: { 
  icon: string; 
  title: string; 
  children: React.ReactNode;
  color?: string;
  hoverColor?: string;
}) => (
  <span 
    className={classNames(
      "flex items-center gap-1 text-xs transition-colors",
      color,
      hoverColor
    )} 
    title={title}
  >
    <span className={icon} />
    {children}
  </span>
));

export const FileContextItem = memo(({ 
  file, 
  onSelect, 
  showMetadata = true,
  showAdvancedStats = false,
  className 
}: FileContextItemProps) => {
  const handleClick = useCallback(() => {
    if (onSelect) {
      onSelect(file.path);
    } else {
      workbenchStore.setSelectedFile(file.path);
    }
  }, [file.path, onSelect]);

  const fileName = file.path.split('/').pop() || '';
  const fileIcon = getFileIcon(file.path);

  return (
    <motion.div
      className={classNames(
        "group flex items-center gap-2 p-2 rounded-lg",
        "bg-bolt-elements-background-depth-1/50",
        "hover:bg-bolt-elements-background-depth-1",
        "transition-colors cursor-pointer",
        className
      )}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Fichier ${fileName}`}
    >
      <div className="shrink-0 w-5 h-5 text-bolt-elements-textTertiary">
        <div className={fileIcon} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono text-bolt-elements-textPrimary truncate">
            {fileName}
          </code>
          {showMetadata && file.metadata && (
            <div className="flex items-center gap-1 text-xs text-bolt-elements-textTertiary">
              {/* Basic Stats */}
              <MetadataBadge 
                icon="i-ph:lines" 
                title="Nombre de lignes"
                color="text-bolt-elements-textTertiary"
                hoverColor="group-hover:text-blue-500"
              >
                {file.metadata.lineCount}
              </MetadataBadge>
              {file.metadata.hasTypes && (
                <MetadataBadge 
                  icon="i-ph:type" 
                  title="TypeScript"
                  color="text-blue-500"
                >
                  TS
                </MetadataBadge>
              )}
              {file.metadata.hasComponents && (
                <MetadataBadge 
                  icon="i-ph:component" 
                  title="Composants"
                  color="text-purple-500"
                >
                  Comp
                </MetadataBadge>
              )}
              {file.metadata.hasHooks && (
                <MetadataBadge 
                  icon="i-ph:hook" 
                  title="Hooks"
                  color="text-pink-500"
                >
                  Hook
                </MetadataBadge>
              )}
              {file.metadata.hasStyles && (
                <MetadataBadge 
                  icon="i-ph:paint-brush" 
                  title="Styles"
                  color="text-orange-500"
                >
                  CSS
                </MetadataBadge>
              )}
              <MetadataBadge 
                icon="i-ph:link" 
                title={`${file.metadata.dependencies} dépendances`}
                color="text-cyan-500"
              >
                {file.metadata.dependencies}
              </MetadataBadge>

              {/* Advanced Stats */}
              {showAdvancedStats && (
                <>
                  {file.metadata.size && (
                    <MetadataBadge 
                      icon="i-ph:hard-drive" 
                      title="Taille du fichier"
                      color="text-emerald-500"
                    >
                      {formatFileSize(file.metadata.size)}
                    </MetadataBadge>
                  )}
                  {file.metadata.complexity && (
                    <MetadataBadge 
                      icon="i-ph:chart-line" 
                      title="Complexité cyclomatique"
                      color="text-red-500"
                    >
                      {file.metadata.complexity}
                    </MetadataBadge>
                  )}
                  {file.metadata.imports && (
                    <MetadataBadge 
                      icon="i-ph:arrow-down-left" 
                      title="Imports"
                      color="text-indigo-500"
                    >
                      {file.metadata.imports}
                    </MetadataBadge>
                  )}
                  {file.metadata.exports && (
                    <MetadataBadge 
                      icon="i-ph:arrow-up-right" 
                      title="Exports"
                      color="text-teal-500"
                    >
                      {file.metadata.exports}
                    </MetadataBadge>
                  )}
                  {file.metadata.testCoverage && (
                    <MetadataBadge 
                      icon="i-ph:test-tube" 
                      title="Couverture de tests"
                      color="text-yellow-500"
                    >
                      {file.metadata.testCoverage}%
                    </MetadataBadge>
                  )}
                  {file.metadata.lastModified && (
                    <MetadataBadge 
                      icon="i-ph:clock" 
                      title="Dernière modification"
                      color="text-gray-500"
                    >
                      {formatDate(file.metadata.lastModified)}
                    </MetadataBadge>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="i-ph:arrow-right text-bolt-elements-textTertiary" />
      </div>
    </motion.div>
  );
}); 