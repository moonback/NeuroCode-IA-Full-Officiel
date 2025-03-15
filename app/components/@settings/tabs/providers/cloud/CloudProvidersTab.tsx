import React, { useEffect, useState, useCallback } from 'react';
import { Switch } from '~/components/ui/Switch';
import { useSettings } from '~/lib/hooks/useSettings';
import { URL_CONFIGURABLE_PROVIDERS } from '~/lib/stores/settings';
import type { IProviderConfig } from '~/types/model';
import { logStore } from '~/lib/stores/logs';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { toast } from 'react-toastify';
import { providerBaseUrlEnvKeys } from '~/utils/constants';
import { SiAmazon, SiGoogle, SiHuggingface, SiPerplexity, SiOpenai } from 'react-icons/si';
import { BsRobot, BsCloud } from 'react-icons/bs';
import { TbBrain, TbCloudComputing } from 'react-icons/tb';
import { BiCodeBlock, BiChip } from 'react-icons/bi';
import { FaCloud, FaBrain } from 'react-icons/fa';
import type { IconType } from 'react-icons';

// Add type for provider names to ensure type safety
type ProviderName =
  | 'AmazonBedrock'
  | 'Anthropic'
  | 'Cohere'
  | 'Deepseek'
  | 'Google'
  | 'Groq'
  | 'HuggingFace'
  | 'Hyperbolic'
  | 'Mistral'
  | 'OpenAI'
  | 'OpenRouter'
  | 'Perplexity'
  | 'Together'
  | 'XAI';

// Update the PROVIDER_ICONS type to use the ProviderName type
const PROVIDER_ICONS: Record<ProviderName, IconType> = {
  AmazonBedrock: SiAmazon,
  Anthropic: FaBrain,
  Cohere: BiChip,
  Deepseek: BiCodeBlock,
  Google: SiGoogle,
  Groq: BsCloud,
  HuggingFace: SiHuggingface,
  Hyperbolic: TbCloudComputing,
  Mistral: TbBrain,
  OpenAI: SiOpenai,
  OpenRouter: FaCloud,
  Perplexity: SiPerplexity,
  Together: BsCloud,
  XAI: BsRobot,
};

// Update PROVIDER_DESCRIPTIONS to use the same type
const PROVIDER_DESCRIPTIONS: Partial<Record<ProviderName, string>> = {
  Anthropic: 'Accéder à Claude et autres modèles Anthropic',
  OpenAI: 'Utiliser GPT-4, GPT-3.5 et autres modèles OpenAI',
};

const CloudProvidersTab = () => {
  const settings = useSettings();
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [filteredProviders, setFilteredProviders] = useState<IProviderConfig[]>([]);
  const [categoryEnabled, setCategoryEnabled] = useState<boolean>(false);

  // Load and filter providers
  useEffect(() => {
    const newFilteredProviders = Object.entries(settings.providers || {})
      .filter(([key]) => !['Ollama', 'LMStudio', 'OpenAILike'].includes(key))
      .map(([key, value]) => ({
        name: key,
        settings: value.settings,
        staticModels: value.staticModels || [],
        getDynamicModels: value.getDynamicModels,
        getApiKeyLink: value.getApiKeyLink,
        labelForGetApiKey: value.labelForGetApiKey,
        icon: value.icon,
      }));

    const sorted = newFilteredProviders.sort((a, b) => a.name.localeCompare(b.name));
    setFilteredProviders(sorted);

    // Update category enabled state
    const allEnabled = newFilteredProviders.every((p) => p.settings.enabled);
    setCategoryEnabled(allEnabled);
  }, [settings.providers]);

  const handleToggleCategory = useCallback(
    (enabled: boolean) => {
      // Update all providers
      filteredProviders.forEach((provider) => {
        settings.updateProviderSettings(provider.name, { ...provider.settings, enabled });
      });

      setCategoryEnabled(enabled);
      toast(enabled ? 'Tous les fournisseurs cloud activés' : 'Tous les fournisseurs cloud désactivés');
    },
    [filteredProviders, settings],
  );

  const handleToggleProvider = useCallback(
    (provider: IProviderConfig, enabled: boolean) => {
      // Update the provider settings in the store
      settings.updateProviderSettings(provider.name, { ...provider.settings, enabled });

      if (enabled) {
        logStore.logProvider(`Fournisseur ${provider.name} activé`, { provider: provider.name });
        toast(`${provider.name} activé`);
      } else {
        logStore.logProvider(`Fournisseur ${provider.name} désactivé`, { provider: provider.name });
        toast(`${provider.name} désactivé`);
      }
    },
    [settings],
  );

  const handleUpdateBaseUrl = useCallback(
    (provider: IProviderConfig, baseUrl: string) => {
      const newBaseUrl: string | undefined = baseUrl.trim() || undefined;

      // Update the provider settings in the store
      settings.updateProviderSettings(provider.name, { ...provider.settings, baseUrl: newBaseUrl });

      logStore.logProvider(`Base URL updated for ${provider.name}`, {
        provider: provider.name,
        baseUrl: newBaseUrl,
      });
      toast(`Base URL mise à jour pour ${provider.name}`);
      setEditingProvider(null);
    },
    [settings],
  );

  return (
    <div className="space-y-8">
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, type: 'spring' }}
      >
        <div className="flex items-center justify-between gap-4 p-6 bg-bolt-elements-background-depth-2 rounded-xl">
          <div className="flex items-center gap-4">
            <div
              className={classNames(
                'w-10 h-10 flex items-center justify-center rounded-xl',
                'bg-bolt-elements-background-depth-3',
                'text-green-500',
                'shadow-sm'
              )}
            >
              <TbCloudComputing className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-bolt-elements-textPrimary">Fournisseurs cloud</h4>
              <p className="text-sm text-bolt-elements-textSecondary/90 mt-1">
                Connecter aux modèles et services cloud-based AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-bolt-elements-textSecondary">Activer tous</span>
            <Switch 
              checked={categoryEnabled} 
              onCheckedChange={handleToggleCategory}
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-bolt-elements-borderColor/50"
              // thumbClassName="bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProviders.map((provider, index) => (
            <motion.div
              key={provider.name}
              className={classNames(
                'rounded-xl border bg-bolt-elements-background text-bolt-elements-textPrimary shadow-sm',
                'bg-bolt-elements-background-depth-2',
                'hover:bg-bolt-elements-background-depth-3',
                'transition-all duration-200 ease-in-out',
                'relative overflow-hidden group',
                'flex flex-col',
                provider.settings.enabled ? 'border-green-500/20' : 'border-bolt-elements-borderColor/20'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, type: 'spring' }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="absolute top-0 right-0 p-3">
                {URL_CONFIGURABLE_PROVIDERS.includes(provider.name) && (
                  <motion.span
                    className="px-2.5 py-1 text-xs rounded-full bg-green-500/10 text-green-500 font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Configurable
                  </motion.span>
                )}
              </div>

              <div className="flex items-start gap-4 p-5">
                <motion.div
                  className={classNames(
                    'w-12 h-12 flex items-center justify-center rounded-xl',
                    'bg-bolt-elements-background-depth-3 group-hover:bg-bolt-elements-background-depth-4',
                    'transition-all duration-200',
                    provider.settings.enabled ? 'text-green-500' : 'text-bolt-elements-textSecondary',
                    'shadow-sm'
                  )}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {React.createElement(PROVIDER_ICONS[provider.name as ProviderName] || BsRobot, {
                    className: 'w-6 h-6',
                    'aria-label': `${provider.name} logo`,
                  })}
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <h4 className="text-base font-semibold text-bolt-elements-textPrimary group-hover:text-green-500 transition-colors">
                        {provider.name}
                      </h4>
                      <p className="text-sm text-bolt-elements-textSecondary/90 mt-1">
                        {PROVIDER_DESCRIPTIONS[provider.name as keyof typeof PROVIDER_DESCRIPTIONS] ||
                          (URL_CONFIGURABLE_PROVIDERS.includes(provider.name)
                            ? 'Configurer un point de terminaison personnalisé'
                            : 'Fournisseur AI standard')}
                      </p>
                    </div>
                    <Switch
                      checked={provider.settings.enabled}
                      onCheckedChange={(checked) => handleToggleProvider(provider, checked)}
                      className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-bolt-elements-borderColor/50"
                      // thumbClassName="bg-white"
                    />
                  </div>

                  {provider.settings.enabled && URL_CONFIGURABLE_PROVIDERS.includes(provider.name) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, type: 'spring' }}
                      className="mt-4"
                    >
                      <div className="flex items-center gap-2">
                        {editingProvider === provider.name ? (
                          <input
                            type="text"
                            defaultValue={provider.settings.baseUrl}
                            placeholder={`URL de base pour ${provider.name}`}
                            className={classNames(
                              'flex-1 px-3 py-2 rounded-lg text-sm',
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
                            className="flex-1 px-3 py-2 rounded-lg text-sm cursor-pointer group/url hover:bg-bolt-elements-background-depth-3 transition-colors"
                            onClick={() => setEditingProvider(provider.name)}
                          >
                            <div className="flex items-center gap-2 text-bolt-elements-textSecondary">
                              <div className="i-ph:link text-sm" />
                              <span className="group-hover/url:text-green-500 transition-colors">
                                {provider.settings.baseUrl || 'Définir l\'URL de base'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {providerBaseUrlEnvKeys[provider.name]?.baseUrlKey && (
                        <div className="mt-2 text-xs text-green-500 flex items-center gap-1.5">
                          <div className="i-ph:info" />
                          <span>URL définie dans le fichier .env</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default CloudProvidersTab;
