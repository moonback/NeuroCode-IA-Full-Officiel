import { memo, useState } from 'react';
import { classNames } from '~/utils/classNames';

export type DiffComparisonMode = 'inline' | 'sideBySide' | 'ignoreSpaces' | 'syntaxHighlight';

interface DiffModeSelectorProps {
  currentMode: DiffComparisonMode;
  onModeChange: (mode: DiffComparisonMode) => void;
  ignoreWhitespace: boolean;
  onIgnoreWhitespaceChange: (ignore: boolean) => void;
  syntaxHighlighting: boolean;
  onSyntaxHighlightingChange: (highlight: boolean) => void;
}

export const DiffModeSelector = memo(({ 
  currentMode, 
  onModeChange,
  ignoreWhitespace,
  onIgnoreWhitespaceChange,
  syntaxHighlighting,
  onSyntaxHighlightingChange
}: DiffModeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  const handleModeChange = (mode: DiffComparisonMode) => {
    onModeChange(mode);
    closeDropdown();
  };

  const getModeIcon = (mode: DiffComparisonMode) => {
    switch (mode) {
      case 'inline':
        return 'i-ph:list-bullets';
      case 'sideBySide':
        return 'i-ph:columns';
      case 'ignoreSpaces':
        return 'i-ph:selection-background';
      case 'syntaxHighlight':
        return 'i-ph:paint-brush';
      default:
        return 'i-ph:list-bullets';
    }
  };

  const getModeLabel = (mode: DiffComparisonMode) => {
    switch (mode) {
      case 'inline':
        return 'Ligne par ligne';
      case 'sideBySide':
        return 'Côte à côte';
      case 'ignoreSpaces':
        return 'Ignorer espaces';
      case 'syntaxHighlight':
        return 'Diff syntaxique';
      default:
        return 'Ligne par ligne';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary transition-colors"
        title="Options de comparaison"
      >
        <div className={getModeIcon(currentMode)} />
        <span className="text-sm">{getModeLabel(currentMode)}</span>
        <div className="i-ph:caret-down text-xs" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor shadow-lg">
          <div className="p-2 space-y-1">
            <div className="text-xs font-medium text-bolt-elements-textTertiary px-2 py-1">
              Mode d'affichage
            </div>
            
            <button
              onClick={() => handleModeChange('inline')}
              className={classNames(
                'w-full px-2 py-1.5 text-sm text-left rounded-md flex items-center gap-2 transition-colors',
                currentMode === 'inline'
                  ? 'bg-blue-500/20 text-blue-500'
                  : 'text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary'
              )}
            >
              <div className="i-ph:list-bullets" />
              Ligne par ligne
              {currentMode === 'inline' && <div className="i-ph:check ml-auto" />}
            </button>
            
            <button
              onClick={() => handleModeChange('sideBySide')}
              className={classNames(
                'w-full px-2 py-1.5 text-sm text-left rounded-md flex items-center gap-2 transition-colors',
                currentMode === 'sideBySide'
                  ? 'bg-blue-500/20 text-blue-500'
                  : 'text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary'
              )}
            >
              <div className="i-ph:columns" />
              Côte à côte
              {currentMode === 'sideBySide' && <div className="i-ph:check ml-auto" />}
            </button>

            <div className="border-t border-bolt-elements-borderColor my-2"></div>
            
            <div className="text-xs font-medium text-bolt-elements-textTertiary px-2 py-1">
              Options
            </div>
            
            <button
              onClick={() => onIgnoreWhitespaceChange(!ignoreWhitespace)}
              className={classNames(
                'w-full px-2 py-1.5 text-sm text-left rounded-md flex items-center gap-2 transition-colors',
                ignoreWhitespace
                  ? 'bg-blue-500/20 text-blue-500'
                  : 'text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary'
              )}
            >
              <div className="i-ph:selection-background" />
              Ignorer espaces
              {ignoreWhitespace && <div className="i-ph:check ml-auto" />}
            </button>
            
            <button
              onClick={() => onSyntaxHighlightingChange(!syntaxHighlighting)}
              className={classNames(
                'w-full px-2 py-1.5 text-sm text-left rounded-md flex items-center gap-2 transition-colors',
                syntaxHighlighting
                  ? 'bg-blue-500/20 text-blue-500'
                  : 'text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary'
              )}
            >
              <div className="i-ph:paint-brush" />
              Diff syntaxique
              {syntaxHighlighting && <div className="i-ph:check ml-auto" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});