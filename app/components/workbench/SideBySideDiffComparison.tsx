import { memo, useState, useEffect, useCallback } from 'react';
import { classNames } from '~/utils/classNames';
import { toast } from 'react-toastify';
import { getHighlighter } from 'shiki';
import { useStore } from '@nanostores/react';
import { themeStore } from '~/lib/stores/theme';
import type { DiffBlock } from './DiffView';

import { InstructionsModal } from './InstructionsModal';

interface SideBySideDiffComparisonProps {
  beforeCode: string;
  afterCode: string;
  filename: string;
  language: string;
  lightTheme: string;
  darkTheme: string;
  unifiedBlocks: DiffBlock[];
}

const lineNumberStyles =
  'w-9 shrink-0 pl-2 py-1 text-left font-mono text-bolt-elements-textTertiary border-r border-bolt-elements-borderColor bg-bolt-elements-background-depth-1';
const lineContentStyles =
  'px-1 py-1 font-mono whitespace-pre flex-1 group-hover:bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary';

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

export const SideBySideDiffComparison = memo(({ 
  beforeCode, 
  afterCode, 
  filename, 
  language, 
  lightTheme, 
  darkTheme,
  unifiedBlocks
}: SideBySideDiffComparisonProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlighter, setHighlighter] = useState<any>(null);
  const [selectedLines, setSelectedLines] = useState<DiffBlock[]>([]);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [instruction, setInstruction] = useState('');
  const theme = useStore(themeStore);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  useEffect(() => {
    const initializeHighlighter = async () => {
      try {
        const shikiHighlighter = await getHighlighter({
          themes: ['github-dark', 'github-light'],
          langs: ['typescript', 'javascript', 'json', 'html', 'css', 'jsx', 'tsx', 'python', 'php'],
        });
        setHighlighter(shikiHighlighter);
      } catch (error) {
        console.error('Failed to initialize syntax highlighter:', error);
      }
    };

    initializeHighlighter();
  }, []);

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

  // Group blocks by their corresponding line to align them side by side
  const groupedBlocks = unifiedBlocks.reduce((acc, block) => {
    const key = block.correspondingLine !== undefined ? block.correspondingLine : block.lineNumber;
    
    if (!acc[key]) {
      acc[key] = { left: null, right: null };
    }
    
    if (block.type === 'removed') {
      acc[key].left = block;
    } else if (block.type === 'added') {
      acc[key].right = block;
    } else {
      // For unchanged lines, add to both sides
      acc[key].left = block;
      acc[key].right = block;
    }
    
    return acc;
  }, {} as Record<number, { left: DiffBlock | null; right: DiffBlock | null }>);

  const renderCodeLine = (block: DiffBlock | null, side: 'left' | 'right') => {
    if (!block) return <div className="h-full"></div>;
    
    const isSelected = selectedLines.some(line => 
      line.lineNumber === block.lineNumber && 
      line.type === block.type
    );
    
    const bgColor = diffLineStyles[block.type];
    
    const renderContent = () => {
      if (block.type === 'unchanged' || !block.charChanges) {
        return <span>{block.content}</span>;
      }

      return (
        <>
          {block.charChanges.map((change, index) => {
            const changeClass = changeColorStyles[change.type];

            return <span key={index} className={changeClass}>{change.value}</span>;
          })}
        </>
      );
    };

    return (
      <div 
        onClick={(e) => toggleLineSelection(block, e)}
        className={classNames(
          'flex group min-w-fit cursor-pointer',
          isSelected ? 'bg-blue-500/30' : ''
        )}
      >
        <div className={classNames(lineNumberStyles, { "selected": isSelected })}>
          {isSelected && <span className="text-blue-500 mr-1">✓</span>}
          {block.lineNumber + 1}
        </div>
        <div className={classNames(lineContentStyles, bgColor, {
          'border-l-4 border-blue-500': isSelected
        })}>
          <span className="mr-2 text-bolt-elements-textTertiary">
            {block.type === 'added' && <span className="text-green-700 dark:text-green-500">+</span>}
            {block.type === 'removed' && <span className="text-red-700 dark:text-red-500">-</span>}
            {block.type === 'unchanged' && ' '}
          </span>
          {renderContent()}
        </div>
      </div>
    );
  };

  const sendSelectedLinesToChat = useCallback(() => {
    if (selectedLines.length === 0) {
      toast.info('Aucune ligne sélectionnée');
      return;
    }
    
    setShowInstructionModal(true);
  }, [selectedLines]);
  
  const finalizeSendToChat = useCallback(() => {
    const sortedLines = [...selectedLines].sort((a, b) => a.lineNumber - b.lineNumber);
    const content = sortedLines.map(line => line.content).join('\n');
    const instructionText = instruction ? `${instruction}\n\n` : '';
    
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) {
      toast.error('Impossible de trouver le champ de saisie du chat');
      return;
    }
    
    const message = `${instructionText}\`\`\`${language}\n${content}\n\`\`\`\n\nExtrait de ${filename}, lignes ${sortedLines[0].lineNumber + 1}-${sortedLines[sortedLines.length - 1].lineNumber + 1}`;
    
    const currentValue = textarea.value;
    textarea.value = currentValue ? `${currentValue}\n\n${message}` : message;
    const event = new Event('input', { bubbles: true });
    textarea.dispatchEvent(event);
    
    // Trigger autoresize event if it exists
    textarea.dispatchEvent(new Event('autoresize', { bubbles: true }));
    
    // Focus and scroll to the end of the text
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    textarea.scrollTop = textarea.scrollHeight;
    
    setInstruction('');
    setShowInstructionModal(false);
    
    toast.success(`${sortedLines.length} ligne(s) envoyée(s) au chat`);
  }, [selectedLines, instruction, language, filename]);

  return (
    <div className="flex flex-col h-full">
      {showInstructionModal && (
        <InstructionsModal
          isOpen={showInstructionModal}
          instruction={instruction}
          setInstruction={setInstruction}
          onCancel={() => setShowInstructionModal(false)}
          onSubmit={finalizeSendToChat}
        />
      )}
      <div className="flex items-center justify-between p-2 border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-1">
        <span className="text-sm text-bolt-elements-textSecondary">
          {selectedLines.length > 0 
            ? `${selectedLines.length} ligne${selectedLines.length > 1 ? 's' : ''} sélectionnée${selectedLines.length > 1 ? 's' : ''}` 
            : 'Sélectionnez des lignes'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={copySelectedLines}
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
            onClick={sendSelectedLinesToChat}
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
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="flex h-full">
          {/* Left panel (before) */}
          <div className="w-1/2 overflow-auto border-r border-bolt-elements-borderColor">
            <div className="sticky top-0 z-10 text-white bg-bolt-elements-background-depth-1 p-2 text-sm font-medium border-b border-bolt-elements-borderColor">
              Version originale
            </div>
            <div className="overflow-x-auto">
              {Object.entries(groupedBlocks).map(([key, { left }]) => (
                <div key={`left-${key}`} className="min-w-fit">
                  {renderCodeLine(left, 'left')}
                </div>
              ))}
            </div>
          </div>
          
          {/* Right panel (after) */}
          <div className="w-1/2 overflow-auto">
            <div className="sticky  text-white  top-0 z-10 bg-bolt-elements-background-depth-1 p-2 text-sm font-medium border-b border-bolt-elements-borderColor">
              Version modifiée
            </div>
            <div className="overflow-x-auto">
              {Object.entries(groupedBlocks).map(([key, { right }]) => (
                <div key={`right-${key}`} className="min-w-fit">
                  {renderCodeLine(right, 'right')}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
