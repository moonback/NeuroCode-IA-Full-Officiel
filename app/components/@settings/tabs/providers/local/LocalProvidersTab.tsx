import React, { useEffect, useState, useCallback } from 'react';
import { Switch } from '~/components/ui/Switch';
import { useSettings } from '~/lib/hooks/useSettings';
import { LOCAL_PROVIDERS, URL_CONFIGURABLE_PROVIDERS } from '~/lib/stores/settings';
import type { IProviderConfig } from '~/types/model';
import { logStore } from '~/lib/stores/logs';
import { motion, AnimatePresence } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { BsRobot } from 'react-icons/bs';
import type { IconType } from 'react-icons';
import { BiChip } from 'react-icons/bi';
import { TbBrandOpenai } from 'react-icons/tb';
import { providerBaseUrlEnvKeys } from '~/utils/constants';
import { useToast } from '~/components/ui/use-toast';
import { Progress } from '~/components/ui/Progress';
import OllamaModelInstaller from './OllamaModelInstaller';

// Add type for provider names to ensure type safety
type ProviderName = 'Ollama' | 'LMStudio' | 'OpenAILike';

// Update the PROVIDER_ICONS type to use the ProviderName type
const PROVIDER_ICONS: Record<ProviderName, IconType> = {
  Ollama: BsRobot,
  LMStudio: BsRobot,
  OpenAILike: TbBrandOpenai,
};

// Update PROVIDER_DESCRIPTIONS to use the same type
const PROVIDER_DESCRIPTIONS: Record<ProviderName, string> = {
  Ollama: 'Run open-source models locally on your machine',
  LMStudio: 'Local model inference with LM Studio',
  OpenAILike: 'Connect to OpenAI-compatible API endpoints',
};

// Add environment-based URLs with fallbacks
const DEFAULT_URLS = {
  Ollama: import.meta.env.VITE_OLLAMA_API_BASE_URL || 'http://127.0.0.1:11434',
  LMStudio: import.meta.env.LMSTUDIO_API_BASE_URL || 'http://127.0.0.1:1234',
  OpenAILike: import.meta.env.OPENAI_LIKE_API_BASE_URL || '',
} as const;

interface OllamaModel {
  name: string;
  digest: string;
  size: number;
  modified_at: string;
  details?: {
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
  status?: 'idle' | 'updating' | 'updated' | 'error' | 'checking';
  error?: string;
  newDigest?: string;
  progress?: {
    current: number;
    total: number;
    status: string;
  };
}

interface OllamaPullResponse {
  status: string;
  completed?: number;
  total?: number;
  digest?: string;
}

const isOllamaPullResponse = (data: unknown): data is OllamaPullResponse => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'status' in data &&
    typeof (data as OllamaPullResponse).status === 'string'
  );
};

// Update the UrlConfigInfo component to include model management info
const UrlConfigInfo = ({ provider }: { provider: IProviderConfig }) => {
  const defaultUrl = DEFAULT_URLS[provider.name as keyof typeof DEFAULT_URLS];

  return (
    <div className="mt-2 text-xs text-bolt-elements-textSecondary">
      <div className="flex items-center gap-1 mb-1">
        <div className="i-ph:info text-green-500" />
        <span className="font-medium">Configuration Help:</span>
      </div>
      <ul className="list-disc list-inside space-y-1 ml-1">
        <li>Default URL: {defaultUrl || 'Not set'}</li>
        <li>Click the URL field above to edit</li>
        <li>Format: http://IP:PORT (e.g., http://127.0.0.1:11434)</li>
        <li>Settings will persist after page reload</li>
        <li>You can also set the URL in your .env.local file</li>
      </ul>

      {provider.name === 'Ollama' && (
        <>
          <div className="flex items-center gap-1 mt-3 mb-1">
            <div className="i-ph:warning text-yellow-500" />
            <span className="font-medium">Important Note:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 ml-1 text-bolt-elements-textTertiary">
            <li>After installing or deleting Ollama models, restart the development server</li>
            <li>This ensures proper model registration with the application</li>
            <li>
              Run <code className="px-1 py-0.5 bg-bolt-elements-background-depth-4 rounded">pnpm dev</code> to restart
            </li>
          </ul>
        </>
      )}
    </div>
  );
};

export default function LocalProvidersTab() {
  const { providers, updateProviderSettings } = useSettings();
  const [filteredProviders, setFilteredProviders] = useState<IProviderConfig[]>([]);
  const [categoryEnabled, setCategoryEnabled] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const { toast } = useToast();

  // Effect to filter and sort providers
  useEffect(() => {
    const newFilteredProviders = Object.entries(providers || {})
      .filter(([key]) => [...LOCAL_PROVIDERS, 'OpenAILike'].includes(key))
      .map(([key, value]) => {
        const provider = value as IProviderConfig;
        const envKey = providerBaseUrlEnvKeys[key]?.baseUrlKey;
        const envUrl = envKey ? (import.meta.env[envKey] as string | undefined) : undefined;

        // Set base URL if provided by environment
        const baseUrl = provider.settings.baseUrl || envUrl || DEFAULT_URLS[key as keyof typeof DEFAULT_URLS];

        // Update provider settings if needed
        if (!provider.settings.baseUrl && (envUrl || DEFAULT_URLS[key as keyof typeof DEFAULT_URLS])) {
          updateProviderSettings(key, {
            ...provider.settings,
            baseUrl,
          });
        }

        return {
          name: key,
          settings: {
            ...provider.settings,
            baseUrl,
          },
          staticModels: provider.staticModels || [],
          getDynamicModels: provider.getDynamicModels,
          getApiKeyLink: provider.getApiKeyLink,
          labelForGetApiKey: provider.labelForGetApiKey,
          icon: provider.icon,
        } as IProviderConfig;
      });

    // Custom sort function to ensure LMStudio appears before OpenAILike
    const sorted = newFilteredProviders.sort((a, b) => {
      if (a.name === 'LMStudio') {
        return -1;
      }

      if (b.name === 'LMStudio') {
        return 1;
      }

      if (a.name === 'OpenAILike') {
        return 1;
      }

      if (b.name === 'OpenAILike') {
        return -1;
      }

      return a.name.localeCompare(b.name);
    });
    setFilteredProviders(sorted);
  }, [providers, updateProviderSettings]);

  // Add effect to update category toggle state based on provider states
  useEffect(() => {
    const newCategoryState = filteredProviders.every((p) => p.settings.enabled);
    setCategoryEnabled(newCategoryState);
  }, [filteredProviders]);

  // Fetch Ollama models when enabled
  useEffect(() => {
    const ollamaProvider = filteredProviders.find((p) => p.name === 'Ollama');

    if (ollamaProvider?.settings.enabled) {
      fetchOllamaModels();
    }
  }, [filteredProviders]);

  const fetchOllamaModels = async () => {
    try {
      setIsLoadingModels(true);

      const ollamaProvider = filteredProviders.find((p) => p.name === 'Ollama');
      const baseUrl = ollamaProvider?.settings.baseUrl || DEFAULT_URLS.Ollama;

      const checkResponse = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!checkResponse.ok) {
        throw new Error(`Failed to fetch models: ${checkResponse.statusText}`);
      }

      const data = (await checkResponse.json()) as { models: OllamaModel[] };

      if (!data.models) {
        throw new Error('Invalid response format from Ollama API');
      }

      setOllamaModels(
        data.models.map((model) => ({
          ...model,
          status: 'idle' as const,
        })),
      );

      // Log success
      logStore.logProvider('Successfully fetched Ollama models', {
        provider: 'Ollama',
        modelCount: data.models.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error fetching Ollama models:', errorMessage);

      // Show error toast to user
      toast('Failed to fetch models - Please ensure Ollama is running and accessible');

      // Log error
      logStore.logProvider('Failed to fetch Ollama models', {
        provider: 'Ollama',
        error: errorMessage,
      });

      // Clear models list on error
      setOllamaModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const updateOllamaModel = async (modelName: string): Promise<boolean> => {
    try {
      const response = await fetch(`${DEFAULT_URLS.Ollama}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update ${modelName}`);
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error('No response reader available');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n').filter(Boolean);

        for (const line of lines) {
          const rawData = JSON.parse(line);

          if (!isOllamaPullResponse(rawData)) {
            console.error('Invalid response format:', rawData);
            continue;
          }

          setOllamaModels((current) =>
            current.map((m) =>
              m.name === modelName
                ? {
                    ...m,
                    progress: {
                      current: rawData.completed || 0,
                      total: rawData.total || 0,
                      status: rawData.status,
                    },
                    newDigest: rawData.digest,
                  }
                : m,
            ),
          );
        }
      }

      const updatedResponse = await fetch('http://127.0.0.1:11434/api/tags');
      const updatedData = (await updatedResponse.json()) as { models: OllamaModel[] };
      const updatedModel = updatedData.models.find((m) => m.name === modelName);

      return updatedModel !== undefined;
    } catch (error) {
      console.error(`Error updating ${modelName}:`, error);
      return false;
    }
  };

  const handleToggleCategory = useCallback(
    async (enabled: boolean) => {
      filteredProviders.forEach((provider) => {
        updateProviderSettings(provider.name, { ...provider.settings, enabled });
      });
      toast(enabled ? 'All local providers enabled' : 'All local providers disabled');
    },
    [filteredProviders, updateProviderSettings],
  );

  const handleToggleProvider = (provider: IProviderConfig, enabled: boolean) => {
    // If enabling provider, ensure base URL is set from environment
    if (enabled) {
      updateProviderSettings(provider.name, {
        ...provider.settings,
        enabled,
        baseUrl: provider.settings.baseUrl || DEFAULT_URLS[provider.name as keyof typeof DEFAULT_URLS],
      });
    } else {
      updateProviderSettings(provider.name, {
        ...provider.settings,
        enabled,
      });
    }

    if (enabled) {
      logStore.logProvider(`Provider ${provider.name} enabled`, { provider: provider.name });
      toast(`${provider.name} enabled`);
    } else {
      logStore.logProvider(`Provider ${provider.name} disabled`, { provider: provider.name });
      toast(`${provider.name} disabled`);
    }
  };

  const handleUpdateBaseUrl = (provider: IProviderConfig, newBaseUrl: string) => {
    updateProviderSettings(provider.name, {
      ...provider.settings,
      baseUrl: newBaseUrl,
    });
    toast(`${provider.name} base URL updated`);
    setEditingProvider(null);
  };

  const handleUpdateOllamaModel = async (modelName: string) => {
    const updateSuccess = await updateOllamaModel(modelName);

    if (updateSuccess) {
      toast(`Updated ${modelName} - Please restart the development server for changes to take effect`);
    } else {
      toast(`Failed to update ${modelName}`);
    }
  };

  const handleDeleteOllamaModel = async (modelName: string) => {
    try {
      const response = await fetch(`${DEFAULT_URLS.Ollama}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete ${modelName}`);
      }

      setOllamaModels((current) => current.filter((m) => m.name !== modelName));
      toast(`Deleted ${modelName} - Please restart the development server for changes to take effect`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error(`Error deleting ${modelName}:`, errorMessage);
      toast(`Failed to delete ${modelName}`);
    }
  };

  // Update model details display
  const ModelDetails = ({ model }: { model: OllamaModel }) => (
    <div className="flex items-center gap-3 text-xs text-bolt-elements-textSecondary">
      <div className="flex items-center gap-1">
        <div className="i-ph:code text-green-500" />
        <span>{model.digest.substring(0, 7)}</span>
      </div>
      {model.details && (
        <>
          <div className="flex items-center gap-1">
            <div className="i-ph:database text-green-500" />
            <span>{model.details.parameter_size}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="i-ph:cube text-green-500" />
            <span>{model.details.quantization_level}</span>
          </div>
        </>
      )}
    </div>
  );

  // Update model actions to not use Tooltip
  const ModelActions = ({
    model,
    onUpdate,
    onDelete,
  }: {
    model: OllamaModel;
    onUpdate: () => void;
    onDelete: () => void;
  }) => (
    <div className="flex items-center gap-2">
      <motion.button
        onClick={onUpdate}
        disabled={model.status === 'updating'}
        className={classNames(
          'rounded-lg p-2',
          'bg-green-500/10 text-green-500',
          'hover:bg-green-500/20',
          'transition-all duration-200',
          { 'opacity-50 cursor-not-allowed': model.status === 'updating' },
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Update model"
      >
        {model.status === 'updating' ? (
          <div className="flex items-center gap-2">
            <div className="i-ph:spinner-gap-bold animate-spin w-4 h-4" />
            <span className="text-sm">Updating...</span>
          </div>
        ) : (
          <div className="i-ph:arrows-clockwise text-lg" />
        )}
      </motion.button>
      <motion.button
        onClick={onDelete}
        disabled={model.status === 'updating'}
        className={classNames(
          'rounded-lg p-2',
          'bg-red-500/10 text-red-500',
          'hover:bg-red-500/20',
          'transition-all duration-200',
          { 'opacity-50 cursor-not-allowed': model.status === 'updating' },
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Delete model"
      >
        <div className="i-ph:trash text-lg" />
      </motion.button>
    </div>
  );

  // Add this near your other components
  const OllamaStatus = () => {
    const [status, setStatus] = useState<'checking' | 'running' | 'not-running'>('checking');

    useEffect(() => {
      const checkOllamaStatus = async () => {
        try {
          const response = await fetch('http://127.0.0.1:11434/api/tags', {
            signal: AbortSignal.timeout(3000),
          });
          setStatus(response.ok ? 'running' : 'not-running');
        } catch {
          setStatus('not-running');
        }
      };

      checkOllamaStatus();
    }, []);

    if (status === 'checking') {
      return (
        <div className="flex items-center gap-2 text-bolt-elements-textSecondary">
          <div className="i-ph:spinner-gap-bold animate-spin w-4 h-4" />
          <span>Checking Ollama status...</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2 ${status === 'running' ? 'text-green-500' : 'text-red-500'}`}>
        <div className={`i-ph:${status === 'running' ? 'check-circle' : 'x-circle'} w-4 h-4`} />
        <span>
          {status === 'running' ? 'Ollama is running' : 'Ollama is not running - Please start Ollama service'}
        </span>
      </div>
    );
  };

  return (
    <div
      className={classNames(
        'rounded-xl bg-bolt-elements-background text-bolt-elements-textPrimary shadow-sm p-6',
        'hover:bg-bolt-elements-background-depth-2',
        'transition-all duration-200',
      )}
      role="region"
      aria-label="Local Providers Configuration"
    >
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, type: 'spring' }}
      >
        {/* Header section */}
        <div className="flex items-center justify-between gap-4 border-b border-bolt-elements-borderColor/30 pb-6">
          <div className="flex items-center gap-4">
            <motion.div
              className={classNames(
                'w-12 h-12 flex items-center justify-center rounded-xl',
                'bg-green-500/10 text-green-500',
                'shadow-sm'
              )}
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <BiChip className="w-7 h-7" />
            </motion.div>
            <div>
              <h2 className="text-xl font-semibold text-bolt-elements-textPrimary">Local AI Models</h2>
              <p className="text-sm text-bolt-elements-textSecondary/90 mt-1">
                Configure and manage your local AI providers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-bolt-elements-textSecondary">Enable All</span>
            <Switch
              checked={categoryEnabled}
              onCheckedChange={handleToggleCategory}
              aria-label="Toggle all local providers"
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-bolt-elements-borderColor/50"
              // thumbClassName="bg-white"
            />
          </div>
        </div>

        {/* Ollama Section */}
        {filteredProviders
          .filter((provider) => provider.name === 'Ollama')
          .map((provider) => (
            <motion.div
              key={provider.name}
              className={classNames(
                'bg-bolt-elements-background-depth-2 rounded-xl',
                'hover:bg-bolt-elements-background-depth-3',
                'transition-all duration-200 p-6',
                'relative overflow-hidden group',
                provider.settings.enabled ? 'border-green-500/20' : 'border-bolt-elements-borderColor/20'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
            >
              {/* Provider Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <motion.div
                    className={classNames(
                      'w-12 h-12 flex items-center justify-center rounded-xl',
                      'bg-bolt-elements-background-depth-3',
                      provider.settings.enabled ? 'text-green-500' : 'text-bolt-elements-textSecondary',
                      'shadow-sm'
                    )}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    {React.createElement(PROVIDER_ICONS[provider.name as ProviderName] || BsRobot, {
                      className: 'w-7 h-7',
                      'aria-label': `${provider.name} icon`,
                    })}
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-bolt-elements-textPrimary">{provider.name}</h3>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-500">Local</span>
                    </div>
                    <p className="text-sm text-bolt-elements-textSecondary/90 mt-1">
                      {PROVIDER_DESCRIPTIONS[provider.name as ProviderName]}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={provider.settings.enabled}
                  onCheckedChange={(checked) => handleToggleProvider(provider, checked)}
                  aria-label={`Toggle ${provider.name} provider`}
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-bolt-elements-borderColor/50"
                  // thumbClassName="bg-white"
                />
              </div>

              {/* URL Configuration Section */}
              <AnimatePresence>
                {provider.settings.enabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-bolt-elements-textSecondary">API Endpoint</label>
                        {editingProvider === provider.name && (
                          <span className="text-xs text-green-500">Press Enter to save, Escape to cancel</span>
                        )}
                      </div>
                      {editingProvider === provider.name ? (
                        <input
                          type="text"
                          defaultValue={
                            provider.settings.baseUrl || DEFAULT_URLS[provider.name as keyof typeof DEFAULT_URLS]
                          }
                          placeholder={`Enter ${provider.name} base URL`}
                          className={classNames(
                            'w-full px-3 py-2 rounded-lg text-sm',
                            'bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor/30',
                            'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                            'focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50',
                            'transition-all duration-200',
                          )}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateBaseUrl(provider, e.currentTarget.value);
                            } else if (e.key === 'Escape') {
                              setEditingProvider(null);
                            }
                          }}
                          onBlur={(e) => handleUpdateBaseUrl(provider, e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => setEditingProvider(provider.name)}
                          className={classNames(
                            'w-full px-3 py-2 rounded-lg text-sm cursor-pointer',
                            'bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor/30',
                            'hover:border-green-500/30 hover:bg-bolt-elements-background-depth-4',
                            'transition-all duration-200',
                          )}
                        >
                          <div className="flex items-center gap-2 text-bolt-elements-textSecondary">
                            <div className="i-ph:link text-sm" />
                            <span>
                              {provider.settings.baseUrl || DEFAULT_URLS[provider.name as keyof typeof DEFAULT_URLS]}
                            </span>
                          </div>
                        </div>
                      )}
                      <UrlConfigInfo provider={provider} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Ollama Models Section */}
              {provider.settings.enabled && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="i-ph:cube-duotone text-green-500 text-xl" />
                      <h4 className="text-base font-semibold text-bolt-elements-textPrimary">Installed Models</h4>
                    </div>
                    {isLoadingModels ? (
                      <div className="flex items-center gap-2">
                        <div className="i-ph:spinner-gap-bold animate-spin w-4 h-4" />
                        <span className="text-sm text-bolt-elements-textSecondary">Loading models...</span>
                      </div>
                    ) : (
                      <span className="text-sm text-bolt-elements-textSecondary">
                        {ollamaModels.length} models available
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    {isLoadingModels ? (
                      <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-20 w-full bg-bolt-elements-background-depth-3 rounded-lg animate-pulse"
                          />
                        ))}
                      </div>
                    ) : ollamaModels.length === 0 ? (
                      <div className="text-center py-8 text-bolt-elements-textSecondary">
                        <div className="i-ph:cube-transparent text-4xl mx-auto mb-2" />
                        <p>No models installed yet</p>
                        <p className="text-sm text-bolt-elements-textTertiary px-1">
                          Browse models at{' '}
                          <a
                            href="https://ollama.com/library"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-500 hover:underline inline-flex items-center gap-0.5 text-base font-medium"
                          >
                            ollama.com/library
                            <div className="i-ph:arrow-square-out text-xs" />
                          </a>{' '}
                          and copy model names to install
                        </p>
                      </div>
                    ) : (
                      ollamaModels.map((model) => (
                        <motion.div
                          key={model.name}
                          className={classNames(
                            'p-4 rounded-xl',
                            'bg-bolt-elements-background-depth-3',
                            'hover:bg-bolt-elements-background-depth-4',
                            'transition-all duration-200',
                          )}
                          whileHover={{ scale: 1.01 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h5 className="text-sm font-medium text-bolt-elements-textPrimary">{model.name}</h5>
                                <ModelStatusBadge status={model.status} />
                              </div>
                              <ModelDetails model={model} />
                            </div>
                            <ModelActions
                              model={model}
                              onUpdate={() => handleUpdateOllamaModel(model.name)}
                              onDelete={() => {
                                if (window.confirm(`Are you sure you want to delete ${model.name}?`)) {
                                  handleDeleteOllamaModel(model.name);
                                }
                              }}
                            />
                          </div>
                          {model.progress && (
                            <div className="mt-3">
                              <Progress
                                value={Math.round((model.progress.current / model.progress.total) * 100)}
                                className="h-1"
                              />
                              <div className="flex justify-between mt-1 text-xs text-bolt-elements-textSecondary">
                                <span>{model.progress.status}</span>
                                <span>{Math.round((model.progress.current / model.progress.total) * 100)}%</span>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>

                  {/* Model Installation Section */}
                  <OllamaModelInstaller onModelInstalled={fetchOllamaModels} />
                </motion.div>
              )}

              {/* Ollama Status Section */}
              {provider.name === 'Ollama' && <OllamaStatus />}
            </motion.div>
          ))}

        {/* Other Providers Section */}
        <div className="border-t border-bolt-elements-borderColor pt-6 mt-8">
          <h3 className="text-lg font-semibold text-bolt-elements-textPrimary mb-4">Other Local Providers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProviders
              .filter((provider) => provider.name !== 'Ollama')
              .map((provider, index) => (
                <motion.div
                  key={provider.name}
                  className={classNames(
                    'bg-bolt-elements-background-depth-2 rounded-xl',
                    'hover:bg-bolt-elements-background-depth-3',
                    'transition-all duration-200 p-5',
                    'relative overflow-hidden group',
                  )}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                >
                  {/* Provider Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <motion.div
                        className={classNames(
                          'w-12 h-12 flex items-center justify-center rounded-xl',
                          'bg-bolt-elements-background-depth-3',
                          provider.settings.enabled ? 'text-green-500' : 'text-bolt-elements-textSecondary',
                        )}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        {React.createElement(PROVIDER_ICONS[provider.name as ProviderName] || BsRobot, {
                          className: 'w-7 h-7',
                          'aria-label': `${provider.name} icon`,
                        })}
                      </motion.div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-md font-semibold text-bolt-elements-textPrimary">{provider.name}</h3>
                          <div className="flex gap-1">
                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-500">
                              Local
                            </span>
                            {URL_CONFIGURABLE_PROVIDERS.includes(provider.name) && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-500">
                                Configurable
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-bolt-elements-textSecondary mt-1">
                          {PROVIDER_DESCRIPTIONS[provider.name as ProviderName]}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={provider.settings.enabled}
                      onCheckedChange={(checked) => handleToggleProvider(provider, checked)}
                      aria-label={`Toggle ${provider.name} provider`}
                    />
                  </div>

                  {/* URL Configuration Section */}
                  <AnimatePresence>
                    {provider.settings.enabled && URL_CONFIGURABLE_PROVIDERS.includes(provider.name) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm text-bolt-elements-textSecondary">API Endpoint</label>
                            {editingProvider === provider.name && (
                              <span className="text-xs text-green-500">Press Enter to save, Escape to cancel</span>
                            )}
                          </div>
                          {editingProvider === provider.name ? (
                            <input
                              type="text"
                              defaultValue={provider.settings.baseUrl}
                              placeholder={`Enter ${provider.name} base URL`}
                              className={classNames(
                                'w-full px-3 py-2 rounded-lg text-sm',
                                'bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor',
                                'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                                'focus:outline-none focus:ring-2 focus:ring-green-500/30',
                                'transition-all duration-200',
                              )}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateBaseUrl(provider, e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                  setEditingProvider(null);
                                }
                              }}
                              onBlur={(e) => handleUpdateBaseUrl(provider, e.target.value)}
                              autoFocus
                            />
                          ) : (
                            <div
                              onClick={() => setEditingProvider(provider.name)}
                              className={classNames(
                                'w-full px-3 py-2 rounded-lg text-sm cursor-pointer',
                                'bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor',
                                'hover:border-green-500/30 hover:bg-bolt-elements-background-depth-4',
                                'transition-all duration-200',
                              )}
                            >
                              <div className="flex items-center gap-2 text-bolt-elements-textSecondary">
                                <div className="i-ph:link text-sm" />
                                <span>{provider.settings.baseUrl || 'Click to set base URL'}</span>
                              </div>
                            </div>
                          )}
                          <UrlConfigInfo provider={provider} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Helper component for model status badge
function ModelStatusBadge({ status }: { status?: string }) {
  if (!status || status === 'idle') {
    return null;
  }

  const statusConfig = {
    updating: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', label: 'Updating' },
    updated: { bg: 'bg-green-500/10', text: 'text-green-500', label: 'Updated' },
    error: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Error' },
  };

  const config = statusConfig[status as keyof typeof statusConfig];

  if (!config) {
    return null;
  }

  return (
    <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', config.bg, config.text)}>
      {config.label}
    </span>
  );
}
