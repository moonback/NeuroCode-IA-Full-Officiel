import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import { Switch } from '~/components/ui/Switch';
import type { ProviderInfo } from '~/types/model';
import Cookies from 'js-cookie';
interface APIKeyManagerProps {
  provider: ProviderInfo;
  apiKey: string;
  setApiKey: (key: string) => void;
  getApiKeyLink?: string;
  labelForGetApiKey?: string;
}

// cache which stores whether the provider's API key is set via environment variable
const providerEnvKeyStatusCache: Record<string, boolean> = {};

const apiKeyMemoizeCache: { [k: string]: Record<string, string> } = {};

export function getApiKeysFromCookies() {
  const storedApiKeys = Cookies.get('apiKeys');
  let parsedKeys: Record<string, string> = {};

  if (storedApiKeys) {
    parsedKeys = apiKeyMemoizeCache[storedApiKeys];

    if (!parsedKeys) {
      parsedKeys = apiKeyMemoizeCache[storedApiKeys] = JSON.parse(storedApiKeys);
    }
  }

  return parsedKeys;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const APIKeyManager: React.FC<APIKeyManagerProps> = ({ provider, apiKey, setApiKey }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [isPromptCachingEnabled, setIsPromptCachingEnabled] = useState(() => {
    // Read initial state from localStorage, defaulting to true
    const savedState = localStorage.getItem('PROMPT_CACHING_ENABLED');
    return savedState !== null ? JSON.parse(savedState) : true;
  });
  const [isEnvKeySet, setIsEnvKeySet] = useState(false);

  useEffect(() => {
    // Update localStorage whenever the prompt caching state changes
    localStorage.setItem('PROMPT_CACHING_ENABLED', JSON.stringify(isPromptCachingEnabled));
  }, [isPromptCachingEnabled]);

  // Reset states and load saved key when provider changes
  useEffect(() => {
    // Load saved API key from cookies for this provider
    const savedKeys = getApiKeysFromCookies();
    const savedKey = savedKeys[provider.name] || '';

    setTempKey(savedKey);
    setApiKey(savedKey);
    setIsEditing(false);
  }, [provider.name]);

  const checkEnvApiKey = useCallback(async () => {
    // Check cache first
    if (providerEnvKeyStatusCache[provider.name] !== undefined) {
      setIsEnvKeySet(providerEnvKeyStatusCache[provider.name]);
      return;
    }

    try {
      const response = await fetch(`/api/check-env-key?provider=${encodeURIComponent(provider.name)}`);
      const data = await response.json();
      const isSet = (data as { isSet: boolean }).isSet;

      // Cache the result
      providerEnvKeyStatusCache[provider.name] = isSet;
      setIsEnvKeySet(isSet);
    } catch (error) {
      console.error('Failed to check environment API key:', error);
      setIsEnvKeySet(false);
    }
  }, [provider.name]);

  useEffect(() => {
    checkEnvApiKey();
  }, [checkEnvApiKey]);

  // Version compacte du status indicator
  const statusIndicator = useMemo(() => (
    <div className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${apiKey || isEnvKeySet ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className={`text-xs ${apiKey || isEnvKeySet ? 'text-green-500' : 'text-red-500'}`}>
        {apiKey ? 'OK' : isEnvKeySet ? 'ENV' : 'Erreur'}
      </span>
    </div>
  ), [apiKey, isEnvKeySet]);

  // Optimized input handler
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTempKey(e.target.value.trim()),
    []
  );

  // Ajout d'une validation plus robuste pour les clés API
  const validateApiKey = useCallback((key: string): boolean => {
    if (!key) return false;
    // Validation basique pour les clés API courantes
    return /^[a-zA-Z0-9-_]{20,100}$/.test(key);
  }, []);

  // Enhanced save handler with better validation
  const handleSave = useCallback(() => {
    if (!validateApiKey(tempKey)) {
      alert('Clé API invalide. Veuillez vérifier le format.');
      return;
    }
    
    setApiKey(tempKey);
    const updatedKeys = { ...getApiKeysFromCookies(), [provider.name]: tempKey };
    Cookies.set('apiKeys', JSON.stringify(updatedKeys), {
      expires: 30, // 30 jours
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    setIsEditing(false);
  }, [tempKey, provider.name, setApiKey, validateApiKey]);

  const handleClear = () => {
    setApiKey('');
    setIsEnvKeySet(false);
    const currentKeys = getApiKeysFromCookies();
    const newKeys = { ...currentKeys, [provider.name]: '' };
    Cookies.set('apiKeys', JSON.stringify(newKeys));
  };

  // Ajout d'un effet pour nettoyer le cache lors du démontage
  useEffect(() => {
    return () => {
      // Cleanup provider cache
      delete providerEnvKeyStatusCache[provider.name];
    };
  }, [provider.name]);

  // Ajout d'un indicateur de sécurité pour les clés API
  const securityIndicator = useMemo(() => (
    <div className="flex items-center gap-1 text-xs text-bolt-elements-textTertiary">
      <div className="i-ph:shield-check" />
      <span>Clé sécurisée</span>
    </div>
  ), []);

  return (
    <div className="group flex flex-col gap-2 p-2 rounded-lg bg-bolt-elements-prompt-background border border-bolt-elements-borderColor/50">
      <div className="flex items-center gap-2">
        {provider?.icon && (
          <div className={`${provider.icon} w-4 h-4 text-bolt-elements-textPrimary/90`} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-medium truncate text-bolt-elements-textPrimary">
              {provider?.name}
            </h3>
            {statusIndicator}
          </div>
          {provider?.description && (
            <p className="text-xs text-bolt-elements-textTertiary line-clamp-1">
              {provider.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="password"
                value={tempKey}
                placeholder="Clé API..."
                onChange={handleInputChange}
                className="w-32 px-2 py-1 text-sm rounded border border-bolt-elements-borderColor/20 bg-transparent focus:outline-none focus:ring-1 focus:ring-bolt-elements-focus"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                aria-label="Entrez votre clé API"
              />
              {securityIndicator}
              <IconButton
                onClick={handleSave}
                aria-label="Enregistrer"
                className="p-1 text-green-500 hover:bg-green-500/10"
              >
                <div className="i-ph:check-bold w-3.5 h-3.5" />
              </IconButton>
              <IconButton
                onClick={() => setIsEditing(false)}
                aria-label="Annuler"
                className="p-1 text-red-500 hover:bg-red-500/10"
              >
                <div className="i-ph:x-bold w-3.5 h-3.5" />
              </IconButton>
            </div>
          ) : (
            <>
              <IconButton
                onClick={() => setIsEditing(true)}
                aria-label="Modifier"
                className="p-1 text-bolt-elements-textPrimary hover:bg-bolt-elements-borderColor/10"
              >
                <div className="i-ph:pencil-simple-line-duotone w-3.5 h-3.5" />
              </IconButton>
              {apiKey && !isEnvKeySet && (
                <IconButton
                  onClick={handleClear}
                  aria-label="Effacer"
                  className="p-1 text-red-500 hover:bg-red-500/10"
                >
                  <div className="i-ph:trash-simple-duotone w-3.5 h-3.5" />
                </IconButton>
              )}
            </>
          )}
        </div>
      </div>

      {provider?.name === 'Anthropic' && (
        <div className="flex items-center gap-2 pt-1 border-t border-bolt-elements-borderColor/15">
          <Switch 
            checked={isPromptCachingEnabled} 
            onCheckedChange={setIsPromptCachingEnabled}
            className="scale-75 data-[state=checked]:bg-green-500"
          />
          <div className="text-xs text-bolt-elements-textPrimary">
            Cache <span className="text-bolt-elements-textTertiary">(économies)</span>
          </div>
        </div>
      )}
    </div>
  );
};
