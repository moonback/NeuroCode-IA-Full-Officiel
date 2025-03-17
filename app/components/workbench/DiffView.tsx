import { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import type { FileMap } from '~/lib/stores/files';
import type { EditorDocument } from '~/components/editor/codemirror/CodeMirrorEditor';
import { diffLines, type Change } from 'diff';
import { getHighlighter } from 'shiki';
import '~/styles/diff-view.css';
import { diffFiles, extractRelativePath } from '~/utils/diff';
import { ActionRunner } from '~/lib/runtime/action-runner';
import type { FileHistory } from '~/types/actions';
import { getLanguageFromExtension } from '~/utils/getLanguageFromExtension';
import { themeStore } from '~/lib/stores/theme';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';

interface CodeComparisonProps {
  beforeCode: string;
  afterCode: string;
  language: string;
  filename: string;
  lightTheme: string;
  darkTheme: string;
}

interface DiffBlock {
  lineNumber: number;
  content: string;
  type: 'added' | 'removed' | 'unchanged';
  correspondingLine?: number;
  charChanges?: Array<{
    value: string;
    type: 'added' | 'removed' | 'unchanged';
  }>;
  selected?: boolean;
}

interface FullscreenButtonProps {
  onClick: () => void;
  isFullscreen: boolean;
}

const FullscreenButton = memo(({ onClick, isFullscreen }: FullscreenButtonProps) => (
  <button
    onClick={onClick}
    className="ml-4 p-1 bg-bolt-elements-background-depth-1 text-xl rounded hover:bg-bolt-elements-background-depth-3 text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary transition-colors"
    title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
  >
    <div className={isFullscreen ? 'i-ph:corners-in' : 'i-ph:corners-out'} />
  </button>
));

const FullscreenOverlay = memo(({ isFullscreen, children }: { isFullscreen: boolean; children: React.ReactNode }) => {
  if (!isFullscreen) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-6">
      <div className="w-full h-full max-w-[90vw] max-h-[90vh] bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor shadow-xl overflow-hidden">
        {children}
      </div>
    </div>
  );
});

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const BINARY_REGEX = /[\x00-\x08\x0E-\x1F]/;

const isBinaryFile = (content: string) => {
  return content.length > MAX_FILE_SIZE || BINARY_REGEX.test(content);
};

const processChanges = (beforeCode: string, afterCode: string, ignoreWhitespace: boolean = false) => {
  try {
    if (isBinaryFile(beforeCode) || isBinaryFile(afterCode)) {
      return {
        beforeLines: [],
        afterLines: [],
        hasChanges: false,
        lineChanges: { before: new Set(), after: new Set() },
        unifiedBlocks: [],
        isBinary: true,
      };
    }

    // Normalize line endings and content
    const normalizeContent = (content: string): string[] => {
      return content
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => line.trimEnd());
    };

    const beforeLines = normalizeContent(beforeCode);
    const afterLines = normalizeContent(afterCode);

    // Early return if files are identical
    if (beforeLines.join('\n') === afterLines.join('\n')) {
      return {
        beforeLines,
        afterLines,
        hasChanges: false,
        lineChanges: { before: new Set(), after: new Set() },
        unifiedBlocks: [],
        isBinary: false,
      };
    }

    const lineChanges = {
      before: new Set<number>(),
      after: new Set<number>(),
    };

    const unifiedBlocks: DiffBlock[] = [];

    // Compare lines directly for more accurate diff
    let i = 0,
      j = 0;
    while (i < beforeLines.length || j < afterLines.length) {
      if (i < beforeLines.length && j < afterLines.length && beforeLines[i] === afterLines[j]) {
        // Unchanged line
        unifiedBlocks.push({
          lineNumber: j,
          content: afterLines[j],
          type: 'unchanged',
          correspondingLine: i,
        });
        i++;
        j++;
      } else {
        // Look ahead for potential matches
        let matchFound = false;
        const lookAhead = 3; // Number of lines to look ahead

        // Try to find matching lines ahead
        for (let k = 1; k <= lookAhead && i + k < beforeLines.length && j + k < afterLines.length; k++) {
          if (beforeLines[i + k] === afterLines[j]) {
            // Found match in after lines - mark lines as removed
            for (let l = 0; l < k; l++) {
              lineChanges.before.add(i + l);
              unifiedBlocks.push({
                lineNumber: i + l,
                content: beforeLines[i + l],
                type: 'removed',
                correspondingLine: j,
                charChanges: [{ value: beforeLines[i + l], type: 'removed' }],
              });
            }
            i += k;
            matchFound = true;
            break;
          } else if (beforeLines[i] === afterLines[j + k]) {
            // Found match in before lines - mark lines as added
            for (let l = 0; l < k; l++) {
              lineChanges.after.add(j + l);
              unifiedBlocks.push({
                lineNumber: j + l,
                content: afterLines[j + l],
                type: 'added',
                correspondingLine: i,
                charChanges: [{ value: afterLines[j + l], type: 'added' }],
              });
            }
            j += k;
            matchFound = true;
            break;
          }
        }

        if (!matchFound) {
          // No match found - try to find character-level changes
          if (i < beforeLines.length && j < afterLines.length) {
            const beforeLine = beforeLines[i];
            const afterLine = afterLines[j];

            // Find common prefix and suffix
            let prefixLength = 0;
            while (
              prefixLength < beforeLine.length &&
              prefixLength < afterLine.length &&
              beforeLine[prefixLength] === afterLine[prefixLength]
            ) {
              prefixLength++;
            }

            let suffixLength = 0;
            while (
              suffixLength < beforeLine.length - prefixLength &&
              suffixLength < afterLine.length - prefixLength &&
              beforeLine[beforeLine.length - 1 - suffixLength] === afterLine[afterLine.length - 1 - suffixLength]
            ) {
              suffixLength++;
            }

            const prefix = beforeLine.slice(0, prefixLength);
            const beforeMiddle = beforeLine.slice(prefixLength, beforeLine.length - suffixLength);
            const afterMiddle = afterLine.slice(prefixLength, afterLine.length - suffixLength);
            const suffix = beforeLine.slice(beforeLine.length - suffixLength);

            if (beforeMiddle || afterMiddle) {
              // There are character-level changes
              if (beforeMiddle) {
                lineChanges.before.add(i);
                unifiedBlocks.push({
                  lineNumber: i,
                  content: beforeLine,
                  type: 'removed',
                  correspondingLine: j,
                  charChanges: [
                    { value: prefix, type: 'unchanged' },
                    { value: beforeMiddle, type: 'removed' },
                    { value: suffix, type: 'unchanged' },
                  ],
                });
                i++;
              }
              if (afterMiddle) {
                lineChanges.after.add(j);
                unifiedBlocks.push({
                  lineNumber: j,
                  content: afterLine,
                  type: 'added',
                  correspondingLine: i - 1,
                  charChanges: [
                    { value: prefix, type: 'unchanged' },
                    { value: afterMiddle, type: 'added' },
                    { value: suffix, type: 'unchanged' },
                  ],
                });
                j++;
              }
            } else {
              // No character-level changes found, treat as regular line changes
              if (i < beforeLines.length) {
                lineChanges.before.add(i);
                unifiedBlocks.push({
                  lineNumber: i,
                  content: beforeLines[i],
                  type: 'removed',
                  correspondingLine: j,
                  charChanges: [{ value: beforeLines[i], type: 'removed' }],
                });
                i++;
              }
              if (j < afterLines.length) {
                lineChanges.after.add(j);
                unifiedBlocks.push({
                  lineNumber: j,
                  content: afterLines[j],
                  type: 'added',
                  correspondingLine: i - 1,
                  charChanges: [{ value: afterLines[j], type: 'added' }],
                });
                j++;
              }
            }
          } else {
            // Handle remaining lines
            if (i < beforeLines.length) {
              lineChanges.before.add(i);
              unifiedBlocks.push({
                lineNumber: i,
                content: beforeLines[i],
                type: 'removed',
                correspondingLine: j,
                charChanges: [{ value: beforeLines[i], type: 'removed' }],
              });
              i++;
            }
            if (j < afterLines.length) {
              lineChanges.after.add(j);
              unifiedBlocks.push({
                lineNumber: j,
                content: afterLines[j],
                type: 'added',
                correspondingLine: i - 1,
                charChanges: [{ value: afterLines[j], type: 'added' }],
              });
              j++;
            }
          }
        }
      }
    }

    // Sort blocks by line number
    const processedBlocks = unifiedBlocks.sort((a, b) => a.lineNumber - b.lineNumber);

    return {
      beforeLines,
      afterLines,
      hasChanges: lineChanges.before.size > 0 || lineChanges.after.size > 0,
      lineChanges,
      unifiedBlocks: processedBlocks,
      isBinary: false,
    };
  } catch (error) {
    console.error('Error processing changes:', error);
    return {
      beforeLines: [],
      afterLines: [],
      hasChanges: false,
      lineChanges: { before: new Set(), after: new Set() },
      unifiedBlocks: [],
      error: true,
      isBinary: false,
    };
  }
};

const lineNumberStyles =
  'w-9 shrink-0 pl-2 py-1 text-left font-mono text-bolt-elements-textTertiary border-r border-bolt-elements-borderColor bg-bolt-elements-background-depth-1';
const lineContentStyles =
  'px-1 py-1 font-mono whitespace-pre flex-1 group-hover:bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary';
const diffPanelStyles = 'h-full overflow-auto diff-panel-content';

// Updated color styles for better consistency
const diffLineStyles = {
  added: 'bg-green-500/10 dark:bg-green-500/20 border-l-4 border-green-500',
  removed: 'bg-red-500/10 dark:bg-red-500/20 border-l-4 border-red-500',
  unchanged: '',
};

const changeColorStyles = {
  added: 'text-green-700 dark:text-green-500 bg-green-500/10 dark:bg-green-500/20',
  removed: 'text-red-700 dark:text-red-500 bg-red-500/10 dark:bg-red-500/20',
  unchanged: 'text-bolt-elements-textPrimary',
};

const renderContentWarning = (type: 'binary' | 'error') => (
  <div className="h-full flex items-center justify-center p-4">
    <div className="text-center text-bolt-elements-textTertiary">
      <div className={`i-ph:${type === 'binary' ? 'file-x' : 'warning-circle'} text-4xl text-red-400 mb-2 mx-auto`} />
      <p className="font-medium text-bolt-elements-textPrimary">
        {type === 'binary' ? 'Binary file detected' : 'Error processing file'}
      </p>
      <p className="text-sm mt-1">
        {type === 'binary' ? 'Diff view is not available for binary files' : 'Could not generate diff preview'}
      </p>
    </div>
  </div>
);

const NoChangesView = memo(
  ({
    beforeCode,
    language,
    highlighter,
    theme,
  }: {
    beforeCode: string;
    language: string;
    highlighter: any;
    theme: string;
  }) => (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="text-center text-bolt-elements-textTertiary">
        <div className="i-ph:files text-4xl text-green-400 mb-2 mx-auto" />
        <p className="font-medium text-bolt-elements-textPrimary">Les fichiers sont identiques</p>
        <p className="text-sm mt-1">Les deux versions correspondent exactement</p>
      </div>
      <div className="mt-4 w-full max-w-2xl bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor overflow-hidden">
        <div className="p-2 text-xs font-bold text-bolt-elements-textTertiary border-b border-bolt-elements-borderColor">
        Contenu actuel
        </div>
        <div className="overflow-auto max-h-96">
          {beforeCode.split('\n').map((line, index) => (
            <div key={index} className="flex group min-w-fit">
              <div className={lineNumberStyles}>{index + 1}</div>
              <div className={lineContentStyles}>
                <span className="mr-2"> </span>
                <span
                  dangerouslySetInnerHTML={{
                    __html: highlighter
                      ? highlighter
                          .codeToHtml(line, {
                            lang: language,
                            theme: theme === 'dark' ? 'github-dark' : 'github-light',
                          })
                          .replace(/<\/?pre[^>]*>/g, '')
                          .replace(/<\/?code[^>]*>/g, '')
                      : line,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
);

// Otimização do processamento de diferenças com memoização
const useProcessChanges = (beforeCode: string, afterCode: string, ignoreWhitespace: boolean = false) => {
  return useMemo(() => processChanges(beforeCode, afterCode, ignoreWhitespace), [beforeCode, afterCode, ignoreWhitespace]);
};

// Componente otimizado para renderização de linhas de código
const CodeLine = memo(
  ({
    lineNumber,
    content,
    type,
    highlighter,
    language,
    block,
    theme,
    hideLineNumber
  }: {
    lineNumber: number;
    content: string;
    type: 'added' | 'removed' | 'unchanged';
    highlighter: any;
    language: string;
    block: DiffBlock;
    theme: string;
    hideLineNumber?: boolean;
  }) => {
    const bgColor = diffLineStyles[type];

    const renderContent = () => {
      if (type === 'unchanged' || !block.charChanges) {
        const highlightedCode = highlighter
          ? highlighter
              .codeToHtml(content, { lang: language, theme: theme === 'dark' ? 'github-dark' : 'github-light' })
              .replace(/<\/?pre[^>]*>/g, '')
              .replace(/<\/?code[^>]*>/g, '')
          : content;
        return <span dangerouslySetInnerHTML={{ __html: highlightedCode }} />;
      }

      return (
        <>
          {block.charChanges.map((change, index) => {
            const changeClass = changeColorStyles[change.type];

            const highlightedCode = highlighter
              ? highlighter
                  .codeToHtml(change.value, {
                    lang: language,
                    theme: theme === 'dark' ? 'github-dark' : 'github-light',
                  })
                  .replace(/<\/?pre[^>]*>/g, '')
                  .replace(/<\/?code[^>]*>/g, '')
              : change.value;

            return <span key={index} className={changeClass} dangerouslySetInnerHTML={{ __html: highlightedCode }} />;
          })}
        </>
      );
    };

    return (
      <div className="flex group min-w-fit">
        {!hideLineNumber && <div className={lineNumberStyles}>{lineNumber + 1}</div>}
        <div className={`${lineContentStyles} ${bgColor}`}>
          <span className="mr-2 text-bolt-elements-textTertiary">
            {type === 'added' && <span className="text-green-700 dark:text-green-500">+</span>}
            {type === 'removed' && <span className="text-red-700 dark:text-red-500">-</span>}
            {type === 'unchanged' && ' '}
          </span>
          {renderContent()}
        </div>
      </div>
    );
  },
);

// Componente para exibir informações sobre o arquivo
const FileInfo = memo(
  ({
    filename,
    hasChanges,
    onToggleFullscreen,
    isFullscreen,
    beforeCode,
    afterCode,
  }: {
    filename: string;
    hasChanges: boolean;
    onToggleFullscreen: () => void;
    isFullscreen: boolean;
    beforeCode: string;
    afterCode: string;
  }) => {
    // Calculate additions and deletions from the current document
    const { additions, deletions } = useMemo(() => {
      if (!hasChanges) return { additions: 0, deletions: 0 };

      const changes = diffLines(beforeCode, afterCode, {
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
    }, [hasChanges, beforeCode, afterCode]);

    const showStats = additions > 0 || deletions > 0;

    return (
      <div className="flex items-center bg-bolt-elements-background-depth-1 p-2 text-sm text-bolt-elements-textPrimary shrink-0">
        <div className="i-ph:file mr-2 h-4 w-4 shrink-0" />
        <span className="truncate">{filename}</span>
        <span className="ml-auto shrink-0 flex items-center gap-2">
          {hasChanges ? (
            <>
              {showStats && (
                <div className="flex items-center gap-1 text-xs">
                  {additions > 0 && <span className="text-green-700 dark:text-green-500">+{additions}</span>}
                  {deletions > 0 && <span className="text-red-700 dark:text-red-500">-{deletions}</span>}
                </div>
              )}
              <span className="text-yellow-600 dark:text-yellow-400">Modifié</span>
              <span className="text-bolt-elements-textTertiary text-xs">{new Date().toLocaleTimeString()}</span>
            </>
          ) : (
            <span className="text-green-700 dark:text-green-400">Aucun changement</span>
          )}
          <FullscreenButton onClick={onToggleFullscreen} isFullscreen={isFullscreen} />
        </span>
      </div>
    );
  },
);

let shikiHighlighter: any = null;

// Nouveau hook pour la gestion de la sélection de lignes
const useLineSelection = (unifiedBlocks: DiffBlock[]) => {
    const [selectedLines, setSelectedLines] = useState<DiffBlock[]>([]);
    const [pendingSelectedLines, setPendingSelectedLines] = useState<DiffBlock[]>([]);

  const toggleLineSelection = useCallback((block: DiffBlock, event: React.MouseEvent) => {
      setSelectedLines(prev => {
        const isSelected = prev.some(line => 
          line.lineNumber === block.lineNumber && 
          line.type === block.type
        );
        
        if (event.shiftKey && prev.length > 0) {
          const lastSelected = prev[prev.length - 1];
          const startLine = Math.min(lastSelected.lineNumber, block.lineNumber);
          const endLine = Math.max(lastSelected.lineNumber, block.lineNumber);
          
          const linesToAdd = unifiedBlocks
            .filter(b => b.lineNumber >= startLine && b.lineNumber <= endLine)
            .filter(b => !prev.some(p => p.lineNumber === b.lineNumber && p.type === b.type));
          
          return [...prev, ...linesToAdd];
        }
        
        if (isSelected) {
          return prev.filter(line => 
            !(line.lineNumber === block.lineNumber && line.type === block.type)
          );
        } else {
          return [...prev, block];
        }
      });
  }, [unifiedBlocks]);
    
  const selectAllChangedLines = useCallback(() => {
      const changedLines = unifiedBlocks.filter(block => block.type === 'added' || block.type === 'removed');
      setSelectedLines(changedLines);
  }, [unifiedBlocks]);

  const clearSelection = useCallback(() => {
    setSelectedLines([]);
  }, []);

  return {
    selectedLines,
    pendingSelectedLines,
    setPendingSelectedLines,
    toggleLineSelection,
    selectAllChangedLines,
    clearSelection
  };
};

// Import des nouveaux composants
import { DiffModeSelector, type DiffComparisonMode } from './DiffModeSelector';
import { SideBySideDiffComparison } from './SideBySideDiffComparison';

// Refactorisation du composant InlineDiffComparison
const InlineDiffComparison = memo(
  ({ beforeCode, afterCode, filename, language, lightTheme, darkTheme }: CodeComparisonProps) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [highlighter, setHighlighter] = useState<any>(null);
    const [showInstructionModal, setShowInstructionModal] = useState(false);
    const [instruction, setInstruction] = useState('');
    const [comparisonMode, setComparisonMode] = useState<DiffComparisonMode>('inline');
    const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
    const [syntaxHighlighting, setSyntaxHighlighting] = useState(true);
    const theme = useStore(themeStore);
    
    const { unifiedBlocks, hasChanges, isBinary, error } = useProcessChanges(beforeCode, afterCode, ignoreWhitespace);
    
    const {
      selectedLines,
      pendingSelectedLines,
      setPendingSelectedLines,
      toggleLineSelection,
      selectAllChangedLines,
      clearSelection
    } = useLineSelection(unifiedBlocks);

    const toggleFullscreen = useCallback(() => {
      setIsFullscreen((prev) => !prev);
    }, []);

    useEffect(() => {
      const initializeHighlighter = async () => {
        if (!shikiHighlighter) {
          shikiHighlighter = await getHighlighter({
            themes: ['github-dark', 'github-light'],
            langs: ['typescript', 'javascript', 'json', 'html', 'css', 'jsx', 'tsx', 'python', 'php'],
          });
        }
        setHighlighter(shikiHighlighter);
      };

      initializeHighlighter();
    }, []);

    const copySelectedLines = useCallback(() => {
      if (selectedLines.length === 0) {
        toast.info('Aucune ligne sélectionnée');
        return;
      }
      
      const sortedLines = [...selectedLines].sort((a, b) => a.lineNumber - b.lineNumber);
      const content = sortedLines.map(line => line.content).join('\n');
      
      navigator.clipboard.writeText(content);
      toast.success(`${sortedLines.length} ligne(s) copiée(s) dans le presse-papiers`);
    }, [selectedLines]);

    const sendSelectedLinesToChat = useCallback(() => {
      if (selectedLines.length === 0) {
        toast.info('Aucune ligne sélectionnée');
        return;
      }
      
      setPendingSelectedLines([...selectedLines]);
      setShowInstructionModal(true);
    }, [selectedLines]);

    const finalizeSendToChat = useCallback(() => {
      const sortedLines = [...pendingSelectedLines].sort((a, b) => a.lineNumber - b.lineNumber);
      const content = sortedLines.map(line => line.content).join('\n');
      const instructionText = instruction ? `${instruction}\n\n` : '';
      const message = `${instructionText}\`\`\`${language}\n${content}\n\`\`\`\n\nExtrait de ${filename}, lignes ${sortedLines[0].lineNumber}-${sortedLines[sortedLines.length - 1].lineNumber}`;
      
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      if (!textarea) {
        toast.error('Impossible de trouver le champ de saisie du chat');
        return;
      }
      
      const currentValue = textarea.value;
      textarea.value = currentValue ? `${currentValue}\n\n${message}` : message;
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
      
      clearSelection();
      setPendingSelectedLines([]);
      setInstruction('');
      setShowInstructionModal(false);
      
      toast.success(`${sortedLines.length} ligne(s) envoyée(s) au chat`);
    }, [pendingSelectedLines, instruction, language, filename, clearSelection]);

    if (isBinary || error) return renderContentWarning(isBinary ? 'binary' : 'error');

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between bg-bolt-elements-background-depth-1 p-2 border-b border-bolt-elements-borderColor">
          <DiffModeSelector
            currentMode={comparisonMode}
            onModeChange={setComparisonMode}
            // ignoreWhitespace={ignoreWhitespace}
            // onIgnoreWhitespaceChange={setIgnoreWhitespace}
            // syntaxHighlighting={syntaxHighlighting}
            // onSyntaxHighlightingChange={setSyntaxHighlighting}
          />
          
          {comparisonMode !== 'sideBySide' && (
            <DiffToolbar
              selectedLines={selectedLines}
              onClearSelection={clearSelection}
              onCopy={copySelectedLines}
              onSendToChat={sendSelectedLinesToChat}
            />
          )}
        </div>
        
        <FullscreenOverlay isFullscreen={isFullscreen}>
          <div className="w-full h-full flex flex-col">
            <FileInfo
              filename={filename}
              hasChanges={hasChanges}
              onToggleFullscreen={toggleFullscreen}
              isFullscreen={isFullscreen}
              beforeCode={beforeCode}
              afterCode={afterCode}
            />
            
            {hasChanges ? (
              comparisonMode === 'sideBySide' ? (
                <SideBySideDiffComparison
                  beforeCode={beforeCode}
                  afterCode={afterCode}
                  filename={filename}
                  language={language}
                  lightTheme={lightTheme}
                  darkTheme={darkTheme}
                  unifiedBlocks={unifiedBlocks}
                  // ignoreWhitespace={ignoreWhitespace}
                  // syntaxHighlighting={syntaxHighlighting}
                />
              ) : (
                <div className={diffPanelStyles}>
                  <div className="overflow-x-auto min-w-full">
                    {unifiedBlocks.map((block, index) => (
                      <DiffLine
                        key={`${block.type}-${block.lineNumber}-${index}`}
                        block={block}
                        isSelected={selectedLines.some(line => 
                        line.lineNumber === block.lineNumber && 
                        line.type === block.type
                        )}
                        onSelect={(e) => toggleLineSelection(block, e)}
                        highlighter={highlighter}
                        language={language}
                        theme={theme}
                      />
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className={diffPanelStyles}>
                <NoChangesView beforeCode={beforeCode} language={language} highlighter={highlighter} theme={theme} />
              </div>
            )}
          </div>
        </FullscreenOverlay>
        
        {showInstructionModal && (
          <InstructionModal
            instruction={instruction}
            setInstruction={setInstruction}
            onCancel={() => {
              setShowInstructionModal(false);
              setPendingSelectedLines([]);
              setInstruction('');
            }}
            onSubmit={finalizeSendToChat}
          />
        )}
      </div>
    );
  },
);

// Nouveau composant pour la modal d'instruction
const InstructionModal = memo(({
  instruction,
  setInstruction,
  onCancel,
  onSubmit
}: {
  instruction: string;
  setInstruction: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) => (
          <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-lg bg-bolt-elements-background-depth-2 rounded-xl border border-bolt-elements-borderColor shadow-2xl overflow-hidden transform transition-all duration-200 ease-out scale-95 hover:scale-100">
              <div className="p-5 border-b border-bolt-elements-borderColor bg-gradient-to-r from-bolt-elements-background-depth-2 to-bolt-elements-background-depth-3">
                <h3 className="text-lg font-semibold text-bolt-elements-textPrimary flex items-center gap-2">
                  <span className="i-ph-pencil w-5 h-5 text-bolt-elements-textSecondary" />
                  Ajouter une instruction au code sélectionnée
                </h3>
                <p className="text-sm text-bolt-elements-textSecondary mt-1">
                  Votre instruction guidera l'IA dans l'analyse du code sélectionné
                </p>
              </div>
              <div className="p-5">
                <textarea
                  className="w-full h-48 p-3 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg text-bolt-elements-textPrimary focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none placeholder:text-bolt-elements-textSecondary/50"
                  placeholder="Exemple: 'Explique cette fonction' ou 'Optimise cette boucle'..."
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      onSubmit();
                    }
                  }}
                />
                <p className="text-xs text-bolt-elements-textSecondary mt-2">
                  Astuce: Soyez précis pour obtenir de meilleurs résultats
                </p>
                <p className="text-xs text-bolt-elements-textSecondary mt-1">
                  (Cmd/Ctrl + Enter pour envoyer)
                </p>
              </div>
              <div className="p-5 border-t border-bolt-elements-borderColor flex justify-end gap-3 bg-bolt-elements-background-depth-3">
                <button
                  onClick={onCancel}
                  className="px-5 py-2.5 rounded-lg bg-bolt-elements-background-depth-1 text-bolt-elements-textSecondary hover:bg-red-500 hover:text-bolt-elements-textPrimary transition-colors flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                  aria-label="Annuler"
                >
                  <span className="i-ph-x w-4 h-4" />
                  Annuler
                </button>
                <button
                  onClick={onSubmit}
                  className="px-5 py-2.5 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30 transition-colors flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                  disabled={!instruction.trim()}
                  aria-label="Envoyer au chat"
                >
                  <span className="i-ph:chat-circle-text-duotone w-4 h-4" />
                  Envoyer au chat
                </button>
              </div>
            </div>
          </div>
));

// Nouveau composant pour une ligne de diff
const DiffLine = memo(({
  block,
  isSelected,
  onSelect,
  highlighter,
  language,
  theme
}: {
  block: DiffBlock;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  highlighter: any;
  language: string;
  theme: string;
}) => {
  return (
    <div 
      onClick={onSelect}
      className={classNames(
        'diff-line group cursor-pointer',
        {
          'diff-added': block.type === 'added' && !isSelected,
          'diff-removed': block.type === 'removed' && !isSelected,
          'selected': isSelected
        }
      )}
    >
      <div className={classNames("diff-line-number", { "selected": isSelected })}>
        {isSelected && <span className="text-blue-500 mr-1">✓</span>}
        {/* Fix: Display the correct line number based on type */}
        {block.type === 'removed' ? block.lineNumber + 1 : 
         block.type === 'added' ? block.lineNumber + 1 : 
         block.lineNumber + 1}
      </div>
      <div className={classNames("diff-line-content", {
        'bg-blue-500/30 border-l-4 border-blue-500': isSelected
      })}>
        <CodeLine
          lineNumber={block.lineNumber}
          content={block.content}
          type={block.type}
          highlighter={highlighter}
          language={language}
          block={block}
          theme={theme}
          hideLineNumber
        />
      </div>
    </div>
  );
});

// Nouveau composant pour la barre d'outils
const DiffToolbar = memo(({
  selectedLines,
  onClearSelection,
  onCopy,
  onSendToChat
}: {
  selectedLines: DiffBlock[];
  onClearSelection: () => void;
  onCopy: () => void;
  onSendToChat: () => void;
}) => {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  
  const handleExport = useCallback(() => {
    const content = selectedLines.map(line => line.content).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selection_${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Sélection exportée avec succès');
  }, [selectedLines]);

  const handleCreateSnippet = useCallback(() => {
    const content = selectedLines.map(line => line.content).join('\n');
    navigator.clipboard.writeText(`\`\`\`\n${content}\n\`\`\``);
    toast.success('Snippet copié dans le presse-papiers');
  }, [selectedLines]);

  return (
    <div className="flex items-center justify-between p-2 border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 relative">
      <div className="flex items-center gap-2">
        <span className="text-sm text-bolt-elements-textSecondary">
          {selectedLines.length > 0 
            ? `${selectedLines.length} ligne${selectedLines.length > 1 ? 's' : ''} sélectionnée${selectedLines.length > 1 ? 's' : ''}` 
            : 'Sélectionnez des lignes'}
        </span>
        {selectedLines.length > 0 && (
          <button 
            onClick={onClearSelection}
            className="text-xs p-1 rounded transition-colors bg-red-500/20 text-bolt-elements-textTertiary hover:bg-red-500/50 hover:text-bolt-elements-textPrimary"
            title="Effacer la sélection"
          >
            <div className="i-ph:x-circle" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onCopy}
          disabled={selectedLines.length === 0}
          className={`p-1.5 rounded transition-colors ${
            selectedLines.length > 0 
              ? 'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary' 
              : 'bg-bolt-elements-background-depth-1 text-bolt-elements-textTertiary cursor-not-allowed'
          }`}
          title="Copier"
        >
          <div className="i-ph:copy text-xl" />
        </button>
        <button
          onClick={onSendToChat}
          disabled={selectedLines.length === 0}
          className={`p-1.5 rounded transition-colors ${
            selectedLines.length > 0 
              ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' 
              : 'bg-bolt-elements-background-depth-1 text-bolt-elements-textTertiary cursor-not-allowed'
          }`}
          title="Envoyer au chat"
        >
          <div className="i-ph:chat-circle-text text-xl" />
        </button>
        <button
          onClick={() => setShowMoreOptions(!showMoreOptions)}
          className="p-1.5 rounded transition-colors bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary"
          title="Plus d'options"
        >
          <div className="i-ph:dots-three-vertical text-xl" />
        </button>
        
        {showMoreOptions && (
          <div className="absolute right-0 top-10 z-50 bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor shadow-lg">
            <div className="p-1">
              <button
                onClick={handleExport}
                disabled={selectedLines.length === 0}
                className="w-full px-4 py-2 text-white text-sm bg-green-500/20 text-left text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 rounded-md flex items-center gap-2"
              >
                <div className="i-ph:export text-xl" />
                Exporter la sélection
              </button>
              <button
                onClick={handleCreateSnippet}
                disabled={selectedLines.length === 0}
                className="w-full px-4 py-2 text-white text-sm bg-green-500/20 text-left text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 rounded-md flex items-center gap-2"
              >
                <div className="i-ph:code text-xl" />
                Créer un snippet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

interface DiffViewProps {
  fileHistory: Record<string, FileHistory>;
  setFileHistory: React.Dispatch<React.SetStateAction<Record<string, FileHistory>>>;
  actionRunner: ActionRunner;
}

export type { DiffBlock };

export const DiffView = memo(({ fileHistory, setFileHistory, actionRunner }: DiffViewProps) => {
  const files = useStore(workbenchStore.files) as FileMap;
  const selectedFile = useStore(workbenchStore.selectedFile);
  const currentDocument = useStore(workbenchStore.currentDocument) as EditorDocument;
  const unsavedFiles = useStore(workbenchStore.unsavedFiles);

  useEffect(() => {
    if (selectedFile && currentDocument) {
      const file = files[selectedFile];
      if (!file || !('content' in file)) return;

      const existingHistory = fileHistory[selectedFile];
      const currentContent = currentDocument.value;

      // Normalizar o conteúdo para comparação
      const normalizedCurrentContent = currentContent.replace(/\r\n/g, '\n').trim();
      const normalizedOriginalContent = (existingHistory?.originalContent || file.content)
        .replace(/\r\n/g, '\n')
        .trim();

      // Se não há histórico existente, criar um novo apenas se houver diferenças
      if (!existingHistory) {
        if (normalizedCurrentContent !== normalizedOriginalContent) {
          const newChanges = diffLines(file.content, currentContent);
          setFileHistory((prev) => ({
            ...prev,
            [selectedFile]: {
              originalContent: file.content,
              lastModified: Date.now(),
              changes: newChanges,
              versions: [
                {
                  timestamp: Date.now(),
                  content: currentContent,
                },
              ],
              changeSource: 'auto-save',
            },
          }));
        }
        return;
      }

      // Se já existe histórico, verificar se há mudanças reais desde a última versão
      const lastVersion = existingHistory.versions[existingHistory.versions.length - 1];
      const normalizedLastContent = lastVersion?.content.replace(/\r\n/g, '\n').trim();

      if (normalizedCurrentContent === normalizedLastContent) {
        return; // Não criar novo histórico se o conteúdo é o mesmo
      }

      // Verificar se há mudanças significativas usando diffFiles
      const relativePath = extractRelativePath(selectedFile);
      const unifiedDiff = diffFiles(relativePath, existingHistory.originalContent, currentContent);

      if (unifiedDiff) {
        const newChanges = diffLines(existingHistory.originalContent, currentContent);

        // Verificar se as mudanças são significativas
        const hasSignificantChanges = newChanges.some(
          (change) => (change.added || change.removed) && change.value.trim().length > 0,
        );

        if (hasSignificantChanges) {
          const newHistory: FileHistory = {
            originalContent: existingHistory.originalContent,
            lastModified: Date.now(),
            changes: [...existingHistory.changes, ...newChanges].slice(-100), // Limitar histórico de mudanças
            versions: [
              ...existingHistory.versions,
              {
                timestamp: Date.now(),
                content: currentContent,
              },
            ].slice(-10), // Manter apenas as 10 últimas versões
            changeSource: 'auto-save',
          };

          setFileHistory((prev) => ({ ...prev, [selectedFile]: newHistory }));
        }
      }
    }
  }, [selectedFile, currentDocument?.value, files, setFileHistory, unsavedFiles]);

  if (!selectedFile || !currentDocument) {
    return (
      <div className="flex w-full h-full justify-center items-center bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary">
        Sélectionnez un fichier pour afficher les différences
      </div>
    );
  }

  const file = files[selectedFile];
  const originalContent = file && 'content' in file ? file.content : '';
  const currentContent = currentDocument.value;

  const history = fileHistory[selectedFile];
  const effectiveOriginalContent = history?.originalContent || originalContent;
  const language = getLanguageFromExtension(selectedFile.split('.').pop() || '');

  try {
    return (
      <div className="h-full overflow-hidden">
        <InlineDiffComparison
          beforeCode={effectiveOriginalContent}
          afterCode={currentContent}
          language={language}
          filename={selectedFile}
          lightTheme="github-light"
          darkTheme="github-dark"
        />
      </div>
    );
  } catch (error) {
    console.error('DiffView render error:', error);
    return (
      <div className="flex w-full h-full justify-center items-center bg-bolt-elements-background-depth-1 text-red-400">
        <div className="text-center">
          <div className="i-ph:warning-circle text-4xl mb-2" />
          <p>Échec du rendu de la vue différentielle</p>
        </div>
      </div>
    );
  }
});
