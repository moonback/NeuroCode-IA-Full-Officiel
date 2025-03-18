import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import StarterTemplates from './StarterTemplates';
import { EXAMPLE_PROMPTS, type Prompt } from './prompts';

interface ExamplePromptsProps {
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  className?: string;
  onPromptSelect?: (promptId: string) => void;
}

interface PromptButtonProps {
  prompt: Prompt;
  onClick: (event: React.UIEvent, text: string) => void;
  onPromptSelect?: (promptId: string) => void;
}

const PromptButton = React.memo(({ prompt, onClick, onPromptSelect }: PromptButtonProps) => {
  const handleClick = (event: React.UIEvent) => {
    onClick(event, prompt.text);
    onPromptSelect?.(prompt.id);
  };

  // Truncate the prompt text to show only the beginning
  const truncatedText = prompt.text.length > 50 
    ? `${prompt.text.substring(0, 50)}...` 
    : prompt.text;

  return (
    <motion.button
      key={prompt.id}
      onClick={handleClick}
      className="
        flex flex-col items-center justify-center
        border border-bolt-elements-borderColor rounded-xl
        bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3
        text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary
        px-4 py-3 text-sm transition-colors duration-200
        h-28
        focus:outline-none focus:ring-2 focus:ring-blue-500
      "
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400 }}
      aria-label={prompt.ariaLabel}
    >
      <span className="text-center line-clamp-3">
        {truncatedText}
      </span>
    </motion.button>
  );
});

const ITEMS_PER_PAGE = 8;

export function ExamplePrompts({ sendMessage }: { sendMessage?: (event: React.UIEvent, messageInput?: string) => void }) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);
  const [customPromptText, setCustomPromptText] = useState('');
  const [savedPrompts, setSavedPrompts] = useState<Prompt[]>(() => {
    // Load saved prompts from localStorage
    const saved = localStorage.getItem('customPrompts');
    return saved ? JSON.parse(saved) : [];
  });
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const handleShowExamples = useCallback(() => setShowTemplates(false), []);
  const handleShowTemplates = useCallback(() => setShowTemplates(true), []);
  const toggleCreatePrompt = useCallback(() => setShowCreatePrompt(prev => !prev), []);

  const handleDeletePrompt = useCallback((promptId: string) => {
    const updatedPrompts = savedPrompts.filter(prompt => prompt.id !== promptId);
    localStorage.setItem('customPrompts', JSON.stringify(updatedPrompts));
    setSavedPrompts(updatedPrompts);
  }, [savedPrompts]);

  const handleEditPrompt = useCallback((promptId: string) => {
    const promptToEdit = savedPrompts.find(prompt => prompt.id === promptId);
    if (promptToEdit) {
      setCustomPromptText(promptToEdit.text);
      setEditingPromptId(promptId);
      setShowCreatePrompt(true);
    }
  }, [savedPrompts]);

  const handleCreatePrompt = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    if (customPromptText.trim()) {
      let updatedPrompts;
      if (editingPromptId) {
        // Edit existing prompt
        updatedPrompts = savedPrompts.map(prompt => 
          prompt.id === editingPromptId ? { ...prompt, text: customPromptText } : prompt
        );
      } else {
        // Create new prompt
        const newPrompt: Prompt = {
          id: `custom-${Date.now()}`,
          text: customPromptText,
          ariaLabel: `Prompt personnalisé: ${customPromptText}`
        };
        updatedPrompts = [...savedPrompts, newPrompt];
      }

      localStorage.setItem('customPrompts', JSON.stringify(updatedPrompts));
      setSavedPrompts(updatedPrompts);
      setCustomPromptText('');
      setShowCreatePrompt(false);
      setEditingPromptId(null);
    }
  }, [customPromptText, savedPrompts, editingPromptId]);

  const allPrompts = useMemo(() => [...EXAMPLE_PROMPTS, ...savedPrompts], [savedPrompts]);

  // Calculate paginated prompts
  const paginatedPrompts = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return allPrompts.slice(start, start + ITEMS_PER_PAGE);
  }, [allPrompts, currentPage]);

  const totalPages = Math.ceil(allPrompts.length / ITEMS_PER_PAGE);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(Math.max(0, Math.min(newPage, totalPages - 1)));
  }, [totalPages]);

  return (
    <div id="examples" className="relative w-full max-w-3xl mx-auto">
      <div className="flex justify-center mb-2 gap-2">
        <div 
          role="tablist" 
          aria-label="Sélectionnez le type de projet"
          className="bg-bolt-elements-background-depth-2 rounded-full p-1 shadow-sm"
        >
          <button
            role="tab"
            aria-selected={!showTemplates}
            onClick={handleShowExamples}
            className={`
              px-6 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${!showTemplates ? 
                'bg-bolt-elements-background-depth-4 text-white shadow-lg' :
                'bg-transparent text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3'
              }
            `}
          >
            Mes prompts
          </button>
          <button
            role="tab"
            aria-selected={showTemplates}
            onClick={handleShowTemplates}
            className={`
              px-6 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${showTemplates ? 
                'bg-bolt-elements-background-depth-4 text-white shadow-lg' :
                'bg-transparent text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3'
              }
            `}
          >
            Projets vierges
          </button>
        </div>
        <button
          onClick={toggleCreatePrompt}
          className="
            px-4 py-2 rounded-full text-sm font-medium
            bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3
            text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary
            transition-colors duration-200
          "
        >
          {showCreatePrompt ? 'Annuler' : 'Créer un prompt'}
        </button>
      </div>

      {showCreatePrompt && (
        <form onSubmit={handleCreatePrompt} className="mb-4 px-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={customPromptText}
              onChange={(e) => setCustomPromptText(e.target.value)}
              placeholder="Entrez votre prompt personnalisé"
              className="
                flex-1 px-4 py-2 rounded-lg
                bg-bolt-elements-background-depth-2
                text-bolt-elements-textPrimary
                border border-bolt-elements-borderColor
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
            />
            <button
              type="submit"
              className="
                px-4 py-2 rounded-lg
                bg-blue-500 hover:bg-blue-600
                text-white
                transition-colors duration-200
              "
            >
              {editingPromptId ? 'Modifier' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {!showTemplates && (
        <>
          <div
            className="flex flex-wrap justify-center gap-2 px-4"
            style={{
              animation: '.25s ease-out 0s 1 _fade-and-move-in_g2ptj_1 forwards',
            }}
          >
            {paginatedPrompts.map((prompt) => (
              <div key={prompt.id} className="relative group">
                <button
                  onClick={(event) => {
                    sendMessage?.(event, prompt.text);
                  }}
                  className="border border-bolt-elements-borderColor rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-900 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary px-3 py-1 text-xs transition-theme"
                >
                  {prompt.text}
                </button>
                {savedPrompts.some(p => p.id === prompt.id) && (
                  <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditPrompt(prompt.id)}
                      className="
                        p-1 rounded-full 
                        bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3
                        text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary
                        transition-colors duration-200
                        shadow-sm
                      "
                      aria-label="Modifier"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeletePrompt(prompt.id)}
                      className="
                        p-1 rounded-full 
                        bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3
                        text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary
                        transition-colors duration-200
                        shadow-sm
                      "
                      aria-label="Supprimer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="
                  px-3 py-1 rounded-md
                  bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3
                  text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200
                "
              >
                Précédent
              </button>
              <span className="px-3 py-1 text-bolt-elements-textSecondary">
                Page {currentPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
                className="
                  px-3 py-1 rounded-md
                  bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3
                  text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200
                "
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
      {showTemplates && <StarterTemplates />}
    </div>
  );
}
