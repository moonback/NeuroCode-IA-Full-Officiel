import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import StarterTemplates from './StarterTemplates';
import { EXAMPLE_PROMPTS, type Prompt } from './prompts';

// Ajout des catégories par défaut
const DEFAULT_CATEGORIES = [
  'Général',
  'Développement Web',
  'UI/UX',
  'Débogage',
  'Tests',
  'Optimisation',
  'Création de contenu',
  'Documentation',
  'API',
  'Base de données'
];

// Mise à jour du type Prompt pour inclure une catégorie
interface PromptWithCategory extends Prompt {
  category: string;
}

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
        focus:outline-none focus:ring-2 focus:ring-green-500
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
  const [customPromptCategory, setCustomPromptCategory] = useState('Général');
  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<PromptWithCategory[]>(() => {
    // Load saved prompts from localStorage
    const saved = localStorage.getItem('customPrompts');
    // Convert old prompts to new format with category if needed
    if (saved) {
      const parsedPrompts = JSON.parse(saved);
      return parsedPrompts.map((prompt: any) => 
        prompt.category ? prompt : { ...prompt, category: 'Général' }
      );
    }
    return [];
  });
  
  // Récupérer les catégories sauvegardées
  const [categories, setCategories] = useState<string[]>(() => {
    const savedCategories = localStorage.getItem('promptCategories');
    return savedCategories 
      ? [...DEFAULT_CATEGORIES, ...JSON.parse(savedCategories)]
      : DEFAULT_CATEGORIES;
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
      setCustomPromptCategory(promptToEdit.category || 'Général');
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
          prompt.id === editingPromptId 
            ? { ...prompt, text: customPromptText, category: customPromptCategory } 
            : prompt
        );
      } else {
        // Create new prompt
        const newPrompt: PromptWithCategory = {
          id: `custom-${Date.now()}`,
          text: customPromptText,
          category: customPromptCategory,
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
  }, [customPromptText, customPromptCategory, savedPrompts, editingPromptId]);

  const handleAddCategory = useCallback(() => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updatedCategories = [...categories, newCategory.trim()];
      setCategories(updatedCategories);
      localStorage.setItem('promptCategories', JSON.stringify(
        updatedCategories.filter(cat => !DEFAULT_CATEGORIES.includes(cat))
      ));
      setNewCategory('');
      setShowAddCategory(false);
      setCustomPromptCategory(newCategory.trim());
    }
  }, [newCategory, categories]);

  // Filtrer les prompts par catégorie
  const filteredPrompts = useMemo(() => {
    const prompts = [...EXAMPLE_PROMPTS.map(p => ({ ...p, category: 'Exemple' })), ...savedPrompts];
    return activeCategory 
      ? prompts.filter(p => p.category === activeCategory)
      : prompts;
  }, [savedPrompts, activeCategory]);

  // Calculate paginated prompts
  const paginatedPrompts = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return filteredPrompts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPrompts, currentPage]);

  const totalPages = Math.ceil(filteredPrompts.length / ITEMS_PER_PAGE);

  // Reset page when changing category
  React.useEffect(() => {
    setCurrentPage(0);
  }, [activeCategory]);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(Math.max(0, Math.min(newPage, totalPages - 1)));
  }, [totalPages]);

  return (
    <div id="examples" className="relative w-full max-w-3xl mx-auto">
      <div className="flex justify-center mb-4 gap-3">
        <div 
          role="tablist" 
          aria-label="Sélectionnez le type de projet"
          className="bg-bolt-elements-background-depth-2 rounded-full p-1 shadow-md"
        >
          <button
            role="tab"
            aria-selected={!showTemplates}
            onClick={handleShowExamples}
            className={`
              px-6 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${!showTemplates ? 
                'bg-green-500 text-white shadow-lg' :
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
                'bg-green-500 text-white shadow-lg' :
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
            px-5 py-2 rounded-full text-sm font-medium
            bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3
            text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary
            transition-colors duration-200 shadow-md
            flex items-center gap-1
          "
        >
          {showCreatePrompt ? (
            <>
              <span>Annuler</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </>
          ) : (
            <>
              <span>Créer un prompt</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </>
          )}
        </button>
      </div>

      {showCreatePrompt && (
        <form onSubmit={handleCreatePrompt} className="mb-6 px-4">
          <div className="flex flex-col gap-3 bg-bolt-elements-background-depth-1 p-4 rounded-xl shadow-sm border border-bolt-elements-borderColor">
            <h3 className="font-medium text-bolt-elements-textPrimary">
              {editingPromptId ? 'Modifier un prompt' : 'Créer un nouveau prompt'}
            </h3>
            <input
              type="text"
              value={customPromptText}
              onChange={(e) => setCustomPromptText(e.target.value)}
              placeholder="Entrez votre prompt personnalisé"
              className="
                flex-1 px-4 py-3 rounded-lg
                bg-bolt-elements-background-depth-2
                text-bolt-elements-textPrimary
                border border-bolt-elements-borderColor
                focus:outline-none focus:ring-2 focus:ring-green-500
                shadow-inner
              "
            />
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={customPromptCategory}
                  onChange={(e) => setCustomPromptCategory(e.target.value)}
                  className="
                    w-full px-4 py-3 rounded-lg appearance-none
                    bg-bolt-elements-background-depth-2
                    text-bolt-elements-textPrimary
                    border border-bolt-elements-borderColor
                    focus:outline-none focus:ring-2 focus:ring-green-500
                    shadow-inner
                  "
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-bolt-elements-textSecondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setShowAddCategory(true)}
                className="
                  px-4 py-3 rounded-lg
                  bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4
                  text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary
                  transition-colors duration-200
                  flex items-center gap-1
                "
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Catégorie</span>
              </button>
              
            <button
              type="submit"
              className="
                  px-5 py-3 rounded-lg
                  bg-green-500 hover:bg-green-600
                  text-white font-medium
                transition-colors duration-200
                  shadow-md
              "
            >
              {editingPromptId ? 'Modifier' : 'Enregistrer'}
            </button>
            </div>
            
            {showAddCategory && (
              <div className="flex gap-2 mt-1 p-3 bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Nouvelle catégorie"
                  className="
                    flex-1 px-4 py-2 rounded-lg
                    bg-bolt-elements-background-depth-1
                    text-bolt-elements-textPrimary
                    border border-bolt-elements-borderColor
                    focus:outline-none focus:ring-2 focus:ring-green-500
                  "
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="
                    px-4 py-2 rounded-lg
                    bg-green-500 hover:bg-green-600
                    text-white font-medium
                    transition-colors duration-200
                  "
                >
                  Ajouter
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="
                    px-3 py-2 rounded-lg
                    bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4
                    text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary
                    transition-colors duration-200
                  "
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {!showTemplates && (
        <>
          {/* Filtres par catégorie */}
          <div className="flex flex-wrap gap-2 justify-center mb-5 overflow-x-auto px-5 py-3 bg-bolt-elements-background-depth-1 rounded-2xl mx-4 shadow-md border border-bolt-elements-borderColor">
            <button
              onClick={() => setActiveCategory(null)}
              className={`
                px-4 py-2 rounded-full text-xs whitespace-nowrap
                ${!activeCategory 
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md font-bold' 
                  : 'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:shadow'}
                transition-all duration-200 font-medium border border-bolt-elements-borderColor
              `}
            >
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>Tous</span>
              </div>
            </button>
            
            <div className="h-6 border-r border-bolt-elements-borderColor mx-1"></div>
            
            {['Exemple', ...categories].map(category => {
              // Choisir une icône en fonction de la catégorie
              let icon;
              switch(category) {
                case 'Exemple':
                  icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>;
                  break;
                case 'Général':
                  icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>;
                  break;
                case 'Développement Web':
                  icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>;
                  break;
                case 'UI/UX':
                  icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>;
                  break;
                case 'Débogage':
                  icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>;
                  break;
                case 'Tests':
                  icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>;
                  break;
                case 'Optimisation':
                  icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>;
                  break;
                default:
                  icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>;
              }
              
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`
                    px-4 py-2 rounded-full text-xs whitespace-nowrap
                    ${activeCategory === category 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md font-bold' 
                      : 'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:shadow'}
                    transition-all duration-200 font-medium border border-bolt-elements-borderColor
                  `}
                >
                  <div className="flex items-center gap-1.5">
                    {icon}
                    <span>{category}</span>
                    <span className="ml-1 bg-bolt-elements-background-depth-3 px-1.5 py-0.5 rounded-full text-[10px] text-bolt-elements-textTertiary">
                      {filteredPrompts.filter(p => p.category === category).length}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Liste des prompts */}
          <div
            className="flex flex-wrap justify-center gap-2 px-4 mb-4"
            style={{
              animation: '.25s ease-out 0s 1 _fade-and-move-in_g2ptj_1 forwards',
            }}
          >
            {paginatedPrompts.length > 0 ? (
              paginatedPrompts.map((prompt) => (
              <div key={prompt.id} className="relative group">
                <button
                  onClick={(event) => {
                    sendMessage?.(event, prompt.text);
                  }}
                    className="
                      border border-bolt-elements-borderColor rounded-full 
                      bg-gray-50 hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-900 
                      text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary 
                      px-3.5 py-1.5 text-xs transition-theme shadow-sm hover:shadow
                    "
                  >
                    {prompt.text.length > 50 ? `${prompt.text.substring(0, 50)}...` : prompt.text}
                    {prompt.category && (
                      <span className="ml-2 text-bolt-elements-textTertiary text-xs bg-bolt-elements-background-depth-1 px-2 py-0.5 rounded-full">
                        {prompt.category}
                      </span>
                    )}
                </button>
                {savedPrompts.some(p => p.id === prompt.id) && (
                  <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditPrompt(prompt.id)}
                      className="
                          p-1.5 rounded-full 
                        bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3
                        text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary
                        transition-colors duration-200
                        shadow-sm
                      "
                      aria-label="Modifier"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeletePrompt(prompt.id)}
                      className="
                          p-1.5 rounded-full 
                          bg-bolt-elements-background-depth-2 hover:bg-red-500
                          text-bolt-elements-textSecondary hover:text-white
                        transition-colors duration-200
                        shadow-sm
                      "
                      aria-label="Supprimer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              ))
            ) : (
              <div className="text-center py-5 px-4 bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor shadow-sm mx-auto">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-6 w-6 text-green-500"
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
                  <p className="text-bolt-elements-textSecondary text-sm font-medium">
                    {activeCategory 
                      ? `Aucun prompt dans "${activeCategory}"` 
                      : "Aucun prompt disponible"}
                  </p>
                </div>
                <button
                  onClick={toggleCreatePrompt}
                  className="
                    inline-flex items-center gap-1.5 px-3 py-1.5 
                    text-xs font-medium text-white
                    bg-green-500 hover:bg-green-600
                    rounded-md shadow-sm transition-colors duration-200
                  "
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Créer un prompt</span>
                </button>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-3 mt-4 mb-6">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="
                  px-4 py-2 rounded-lg
                  bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3
                  text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200 shadow-sm
                  flex items-center gap-1
                "
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="px-3 py-1 text-bolt-elements-textSecondary">
                Page {currentPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
                className="
                  px-4 py-2 rounded-lg
                  bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3
                  text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200 shadow-sm
                  flex items-center gap-1
                "
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
      {showTemplates && <StarterTemplates />}
    </div>
  );
}
