import type { ProviderInfo } from '~/types/model';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import type { ModelInfo } from '~/lib/modules/llm/types';
import { classNames } from '~/utils/classNames';
import { useLocalStorage } from '~/lib/hooks/useLocalStorage';

interface ModelSelectorProps {
  model?: string;
  setModel?: (model: string) => void;
  provider?: ProviderInfo;
  setProvider?: (provider: ProviderInfo) => void;
  modelList: ModelInfo[];
  providerList: ProviderInfo[];
  apiKeys: Record<string, string>;
  modelLoading?: string;
  disabled?: boolean;
}

/**
 * ModelSelector component for selecting AI model and provider
 * @param {string} model - Currently selected model
 * @param {function} setModel - Callback to set selected model
 * @param {ProviderInfo} provider - Currently selected provider
 * @param {function} setProvider - Callback to set selected provider
 * @param {ModelInfo[]} modelList - List of available models
 * @param {ProviderInfo[]} providerList - List of available providers
 * @param {string} modelLoading - Loading state indicator
 * @param {boolean} disabled - Disabled state
 */
export const ModelSelector = ({
  model,
  setModel,
  provider,
  setProvider,
  modelList,
  providerList,
  modelLoading,
  disabled = false,
}: ModelSelectorProps) => {
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [focusedModelIndex, setFocusedModelIndex] = useState(-1);
  const [focusedProviderIndex, setFocusedProviderIndex] = useState(-1);
  const modelSearchInputRef = useRef<HTMLInputElement>(null);
  const providerSearchInputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const providerDropdownRef = useRef<HTMLDivElement>(null);
  const [favorites, setFavorites] = useLocalStorage<Record<string, boolean>>('favoriteModels', {});

  const deduplicateItems = <T extends { name: string }>(items: T[]): T[] => {
    return Array.from(new Map(items.map(item => [item.name, item])).values());
  };

  const filteredProviders = useMemo(() => {
    return deduplicateItems(providerList).filter(provider =>
      provider.name.toLowerCase().includes(providerSearchQuery.toLowerCase())
    );
  }, [providerList, providerSearchQuery]);

  const filteredModels = useMemo(() => {
    const providerModels = modelList.filter(e => e.provider === provider?.name);
    return deduplicateItems(providerModels)
      .filter(model => model.name.toLowerCase().includes(modelSearchQuery.toLowerCase()))
      .sort((a, b) => (favorites[a.name] === favorites[b.name] ? 0 : favorites[a.name] ? -1 : 1));
  }, [modelList, provider?.name, modelSearchQuery, favorites]);

  const handleProviderSelect = useCallback((selectedProvider: ProviderInfo) => {
    setProvider?.(selectedProvider);
    const firstModel = modelList.find(m => m.provider === selectedProvider.name);
    firstModel && setModel?.(firstModel.name);
    setIsProviderDropdownOpen(false);
  }, [setProvider, modelList, setModel]);

  const toggleDropdown = useCallback((type: 'model' | 'provider') => {
    if (disabled) return;
    if (type === 'model') {
      setIsModelDropdownOpen(prev => !prev);
      setModelSearchQuery('');
      modelSearchInputRef.current?.focus();
    } else {
      setIsProviderDropdownOpen(prev => !prev);
      setProviderSearchQuery('');
      providerSearchInputRef.current?.focus();
    }
  }, [disabled]);

  // Reset focused index when search query changes or dropdown opens/closes
  useEffect(() => {
    setFocusedModelIndex(-1);
  }, [modelSearchQuery, isModelDropdownOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isModelDropdownOpen && modelSearchInputRef.current) {
      modelSearchInputRef.current.focus();
    }
  }, [isModelDropdownOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isModelDropdownOpen) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedModelIndex((prev) => {
          const next = prev + 1;

          if (next >= filteredModels.length) {
            return 0;
          }

          return next;
        });
        break;

      case 'ArrowUp':
        e.preventDefault();
        setFocusedModelIndex((prev) => {
          const next = prev - 1;

          if (next < 0) {
            return filteredModels.length - 1;
          }

          return next;
        });
        break;

      case 'Enter':
        e.preventDefault();

        if (focusedModelIndex >= 0 && focusedModelIndex < filteredModels.length) {
          const selectedModel = filteredModels[focusedModelIndex];
          setModel?.(selectedModel.name);
          setIsModelDropdownOpen(false);
          setModelSearchQuery('');
        }

        break;

      case 'Escape':
        e.preventDefault();
        setIsModelDropdownOpen(false);
        setModelSearchQuery('');
        break;

      case 'Tab':
        if (!e.shiftKey && focusedModelIndex === filteredModels.length - 1) {
          setIsModelDropdownOpen(false);
        }

        break;
    }
  };

  // Focus the selected option
  useEffect(() => {
    if (focusedModelIndex >= 0 && modelDropdownRef.current) {
      modelDropdownRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedModelIndex]);

  // Update enabled providers when cookies change
  useEffect(() => {
    // If current provider is disabled, switch to first enabled provider
    if (providerList.length === 0) {
      return;
    }

    if (provider && !providerList.map((p) => p.name).includes(provider.name)) {
      const firstEnabledProvider = providerList[0];
      setProvider?.(firstEnabledProvider);

      // Also update the model to the first available one for the new provider
      const firstModel = modelList.find((m) => m.provider === firstEnabledProvider.name);

      if (firstModel) {
        setModel?.(firstModel.name);
      }
    }
  }, [providerList, provider, setProvider, modelList, setModel]);

  // Add ARIA labels for better accessibility
  const selectAriaLabel = "Sélectionner un fournisseur";
  const modelAriaLabel = "Sélectionner un modèle";

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(event.target as Node) &&
        isModelDropdownOpen
      ) {
        setIsModelDropdownOpen(false);
        setModelSearchQuery('');
      }
      if (
        providerDropdownRef.current &&
        !providerDropdownRef.current.contains(event.target as Node) &&
        isProviderDropdownOpen
      ) {
        setIsProviderDropdownOpen(false);
        setProviderSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModelDropdownOpen, isProviderDropdownOpen]);

  // Memoize model label to prevent unnecessary recalculations
  const selectedModelLabel = useMemo(() => 
    modelList.find((m) => m.name === model)?.label || 'Select model',
    [model, modelList]
  );

  // Add aria-live region for screen reader announcements
  const [ariaLiveMessage, setAriaLiveMessage] = useState('');
  
  // Update aria-live message when selection changes
  useEffect(() => {
    if (provider && model) {
      setAriaLiveMessage(`Fournisseur: ${provider.name}, Modèle: ${selectedModelLabel}`);
    }
  }, [provider, model, selectedModelLabel]);

  // Ajouter cette fonction pour basculer un modèle en favori
  const toggleFavorite = useCallback((modelName: string) => {
    setFavorites(prev => ({
      ...prev,
      [modelName]: !prev[modelName]
    }));
  }, [setFavorites]);

  // Mettre à jour les styles pour une meilleure présentation
  const dropdownStyles = {
    container: 'rounded-lg shadow-lg border border-bolt-elements-borderColor backdrop-blur-sm bg-bolt-elements-background-depth-2 animate-in fade-in-80 zoom-in-95',
    item: 'px-4 py-3 hover:bg-bolt-elements-background-depth-3 transition-colors duration-200 cursor-pointer',
    selectedItem: 'bg-green-50/30 dark:bg-green-900/20 border-l-2 border-green-500',
    search: 'bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor backdrop-blur-sm',
    favorite: 'text-yellow-400 hover:text-yellow-500 dark:hover:text-yellow-300 transition-colors duration-200'
  };

  if (providerList.length === 0) {
    return (
      <div className="mb-2 p-4 rounded-lg border bg-bolt-elements-prompt-background text-bolt-elements-textPrimary">
        <p className="text-center">Aucun fournisseur activé. Veuillez en activer un dans les paramètres.</p>
      </div>
    );
  }

  return (
    <>
      <div aria-live="polite" className="sr-only">
        {ariaLiveMessage}
      </div>
      <div className="mb-4 flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1" ref={providerDropdownRef}>
          <div
            className={classNames(
              'w-full p-3 rounded-xl border',
              'bg-white/80 dark:bg-gray-900/80 text-gray-900 dark:text-gray-100 backdrop-blur-sm',
              'focus-within:outline-none focus-within:ring-2 focus-within:ring-green-500',
              'transition-all duration-200 ease-in-out',
              'hover:border-gray-300/50 dark:hover:border-gray-600/50',
              isProviderDropdownOpen ? 'ring-2 ring-green-500' : undefined,
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            )}
            onClick={() => !disabled && toggleDropdown('provider')}
            role="combobox"
            aria-expanded={isProviderDropdownOpen}
            aria-controls="provider-listbox"
            aria-haspopup="listbox"
            aria-label={selectAriaLabel}
            aria-disabled={disabled}
            aria-labelledby="provider-label"
          >
            <div className="flex items-center justify-between">
              <span id="provider-label" className="truncate">
                {provider?.name || 'Select provider'}
              </span>
              <span
                className={classNames(
                  'i-ph:caret-down transition-transform duration-300 text-bolt-elements-textTertiary',
                  isProviderDropdownOpen ? 'rotate-180' : undefined
                )}
              />
            </div>
          </div>

          {isProviderDropdownOpen && (
            <div
              className={classNames(
                'absolute z-20 w-full mt-1 py-2',
                dropdownStyles.container
              )}
              role="listbox"
              id="provider-listbox"
            >
              <div className="px-3 pb-3">
                <div className="relative">
                  <input
                    ref={providerSearchInputRef}
                    type="text"
                    value={providerSearchQuery}
                    onChange={(e) => setProviderSearchQuery(e.target.value)}
                    placeholder="Rechercher un fournisseur..."
                    className={classNames(
                      'w-full pl-10 pr-4 py-2 rounded-lg text-sm',
                      dropdownStyles.search,
                      'text-bolt-elements-textPrimary placeholder:text-bolt-elements-textTertiary',
                      'focus:outline-none focus:ring-2 focus:ring-green-500',
                      'transition-all duration-200 ease-in-out'
                    )}
                    onClick={(e) => e.stopPropagation()}
                    role="searchbox"
                    aria-label="Rechercher un fournisseur"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <span className="i-ph:magnifying-glass text-bolt-elements-textTertiary text-lg" />
                  </div>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {filteredProviders.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400 dark:text-white">Aucun fournisseur trouvé</div>
                ) : (
                  filteredProviders.map((providerOption, index) => (
                    <div
                      key={index}
                      role="option"
                      aria-selected={provider?.name === providerOption.name}
                      className={classNames(
                        dropdownStyles.item,
                        provider?.name === providerOption.name || focusedProviderIndex === index
                          ? dropdownStyles.selectedItem
                          : undefined,
                        focusedProviderIndex === index ? 'ring-2 ring-green-500' : undefined,
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProviderSelect(providerOption);
                      }}
                      tabIndex={focusedProviderIndex === index ? 0 : -1}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="font-medium truncate text-gray-900 dark:text-gray-100">
                          {providerOption.name} {providerOption.name === 'Pollinations' ? '(Free, No API Key Required)' : ''}
                        </div>
                        {providerOption.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {providerOption.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative flex-1 lg:max-w-[70%]" ref={modelDropdownRef}>
          <div
            className={classNames(
              'w-full p-3 rounded-lg border',
              'bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary backdrop-blur-sm',
              'focus-within:outline-none focus-within:ring-2 focus-within:ring-green-500',
              'transition-all duration-200 ease-in-out',
              'hover:border-bolt-elements-borderColorHover',
              isProviderDropdownOpen ? 'ring-2 ring-green-500 border-green-500/50' : undefined,
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            )}
            onClick={() => !disabled && toggleDropdown('model')}
            role="combobox"
            aria-expanded={isModelDropdownOpen}
            aria-controls="model-listbox"
            aria-haspopup="listbox"
            aria-label={modelAriaLabel}
            aria-disabled={disabled}
            aria-labelledby="model-label"
          >
            <div className="flex items-center justify-between">
              <span id="model-label" className="truncate">
                {selectedModelLabel}
              </span>
              <span
                className={classNames(
                  'i-ph:caret-down transition-transform duration-200 text-gray-400 dark:text-gray-500',
                  isModelDropdownOpen ? 'rotate-180' : undefined
                )}
              />
            </div>
          </div>

          {isModelDropdownOpen && (
            <div
              className={classNames(
                'absolute z-10 w-full mt-1 py-2',
                dropdownStyles.container
              )}
              role="listbox"
              id="model-listbox"
            >
              <div className="px-3 pb-3 flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={modelSearchInputRef}
                    type="text"
                    value={modelSearchQuery}
                    onChange={(e) => setModelSearchQuery(e.target.value)}
                    placeholder="Rechercher un modèle..."
                    className={classNames(
                      'w-full pl-10 pr-4 py-2 rounded-lg text-sm',
                      dropdownStyles.search,
                      'text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500',
                      'focus:outline-none focus:ring-2 focus:ring-green-500',
                      'transition-all duration-200 ease-in-out'
                    )}
                    onClick={(e) => e.stopPropagation()}
                    role="searchbox"
                    aria-label="Rechercher un modèle"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <span className="i-ph:magnifying-glass text-bolt-elements-textTertiary text-lg" />
                  </div>
                </div>
                
              </div>

              <div
                className={classNames(
                  'max-h-60 overflow-y-auto',
                  'sm:scrollbar-none',
                  '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2',
                  '[&::-webkit-scrollbar-thumb]:bg-gray-300/50 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600/50',
                  '[&::-webkit-scrollbar-thumb]:hover:bg-gray-400/50 dark:[&::-webkit-scrollbar-thumb:hover]:bg-gray-500/50',
                  '[&::-webkit-scrollbar-thumb]:rounded-full',
                  '[&::-webkit-scrollbar-track]:bg-gray-100/50 dark:[&::-webkit-scrollbar-track]:bg-gray-800/50',
                  '[&::-webkit-scrollbar-track]:rounded-full',
                  'sm:[&::-webkit-scrollbar]:w-1.5 sm:[&::-webkit-scrollbar]:h-1.5'
                )}
              >
                {modelLoading === 'all' || modelLoading === provider?.name ? (
                  <div className="px-3 py-2 text-sm text-bolt-elements-textTertiary">Chargement des modèles...</div>
                ) : filteredModels.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-bolt-elements-textTertiary">Aucun modèle trouvé</div>
                ) : (
                  filteredModels.map((modelOption, index) => (
                    <div
                      key={index}
                      role="option"
                      aria-selected={model === modelOption.name}
                      className={classNames(
                        'px-3 py-2.5 text-sm cursor-pointer group',
                        'bg-bolt-elements-background-depth-2',
                        'border border-transparent',
                        'text-bolt-elements-textPrimary',
                        'transition-all duration-200 ease-in-out',
                        'hover:border-bolt-elements-borderColorHover',
                        dropdownStyles.item,
                        model === modelOption.name ? dropdownStyles.selectedItem : undefined,
                        focusedModelIndex === index ? 'ring-2 ring-green-500' : undefined
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setModel?.(modelOption.name);
                        setIsModelDropdownOpen(false);
                        setModelSearchQuery('');
                      }}
                      tabIndex={focusedModelIndex === index ? 0 : -1}
                    >
                      <div className="flex items-center justify-between">
                        <span>{modelOption.label}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(modelOption.name);
                          }}
                          className={classNames(
                            'p-1 rounded-md',
                            'bg-bolt-elements-background-depth-3',
                            'border border-bolt-elements-borderColor',
                            'transition-all duration-200',
                            favorites[modelOption.name] ? 'text-yellow-400' : 'text-bolt-elements-textTertiary opacity-0 group-hover:opacity-100 focus:opacity-100'
                          )}
                          aria-label={favorites[modelOption.name] ? "Retirer des favoris" : "Ajouter aux favoris"}
                        >
                          <div className={classNames(
                            'w-4 h-4',
                            favorites[modelOption.name] ? 'i-ph:star-fill' : 'i-ph:star'
                          )} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
