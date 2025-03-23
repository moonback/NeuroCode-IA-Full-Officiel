// Remove unused imports
import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Switch } from '~/components/ui/Switch';
import { useSettings } from '~/lib/hooks/useSettings';
import { classNames } from '~/utils/classNames';
import { toast } from 'react-toastify';
import { PromptLibrary } from '~/lib/common/prompt-library';

interface FeatureToggle {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  beta?: boolean;
  experimental?: boolean;
  tooltip?: string;
}

const FeatureCard = memo(
  ({
    feature,
    index,
    onToggle,
  }: {
    feature: FeatureToggle;
    index: number;
    onToggle: (id: string, enabled: boolean) => void;
  }) => (
    <motion.div
      key={feature.id}
      layoutId={feature.id}
      className={classNames(
        'relative group cursor-pointer',
        'bg-bolt-elements-background-depth-1',
        'hover:bg-bolt-elements-background-depth-2',
        'transition-all duration-300 ease-out',
        'rounded-xl overflow-hidden',
        'shadow-md hover:shadow-lg',
        'border border-bolt-elements-borderColor/20 hover:border-bolt-elements-borderColor/50',
        'transform hover:-translate-y-1'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 100 }}
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={classNames(
              feature.icon, 
              'w-8 h-8 p-1.5 rounded-lg',
              'text-white',
              'bg-gradient-to-br from-green-400 to-green-600',
              'shadow-sm'
            )} />
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-lg text-bolt-elements-textPrimary group-hover:text-green-500 transition-colors">{feature.title}</h4>
              {feature.beta && (
                <span className="px-3 py-1 text-xs rounded-full bg-blue-500/10 text-blue-500 font-semibold shadow-sm group-hover:bg-blue-500/20 transition-colors">Bêta</span>
              )}
              {feature.experimental && (
                <span className="px-3 py-1 text-xs rounded-full bg-orange-500/10 text-orange-500 font-semibold shadow-sm group-hover:bg-orange-500/20 transition-colors">
                  Expérimental
                </span>
              )}
            </div>
          </div>
          <Switch 
            checked={feature.enabled} 
            onCheckedChange={(checked) => onToggle(feature.id, checked)}
            className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-bolt-elements-borderColor/50"
          />
        </div>
        <p className="text-sm text-bolt-elements-textSecondary leading-relaxed group-hover:text-bolt-elements-textPrimary transition-colors">{feature.description}</p>
        {feature.tooltip && (
          <p className="text-xs text-bolt-elements-textTertiary/80 italic group-hover:text-bolt-elements-textSecondary/80 transition-colors">
            {feature.tooltip}
          </p>
        )}
      </div>
    </motion.div>
  ),
);

const FeatureSection = memo(
  ({
    title,
    features,
    icon,
    description,
    onToggleFeature,
  }: {
    title: string;
    features: FeatureToggle[];
    icon: string;
    description: string;
    onToggleFeature: (id: string, enabled: boolean) => void;
  }) => (
    <motion.div
      layout
      className="flex flex-col gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, type: 'spring' }}
    >
      <div className="flex items-center gap-4">
        <div className={classNames(
          icon, 
          'text-2xl p-2 rounded-lg',
          'bg-bolt-elements-background-depth-3',
          'text-green-500'
        )} />
        <div>
          <h3 className="text-xl font-semibold text-bolt-elements-textPrimary">{title}</h3>
          <p className="text-sm text-bolt-elements-textSecondary/90 mt-1">{description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {features.map((feature, index) => (
          <FeatureCard key={feature.id} feature={feature} index={index} onToggle={onToggleFeature} />
        ))}
      </div>
    </motion.div>
  ),
);

export default function FeaturesTab() {
  const {
    autoSelectTemplate,
    isLatestBranch,
    contextOptimizationEnabled,
    eventLogs,
    setAutoSelectTemplate,
    enableLatestBranch,
    enableContextOptimization,
    setEventLogs,
    setPromptId,
    promptId,
  } = useSettings();

  // Enable features by default on first load
  React.useEffect(() => {
    // Only set defaults if values are undefined
    if (isLatestBranch === undefined) {
      enableLatestBranch(false); // Default: OFF - Don't auto-update from main branch
    }

    if (contextOptimizationEnabled === undefined) {
      enableContextOptimization(true); // Default: ON - Enable context optimization
    }

    if (autoSelectTemplate === undefined) {
      setAutoSelectTemplate(true); // Default: ON - Enable auto-select templates
    }

    if (promptId === undefined) {
      setPromptId('default'); // Default: 'default'
    }

    if (eventLogs === undefined) {
      setEventLogs(true); // Default: ON - Enable event logging
    }
  }, []); // Only run once on component mount

  const handleToggleFeature = useCallback(
    (id: string, enabled: boolean) => {
      switch (id) {
        case 'latestBranch': {
          enableLatestBranch(enabled);
          toast(`Mise à jour de la branche principale ${enabled ? 'activée' : 'désactivée'}`);
          break;
        }

        case 'autoSelectTemplate': {
          setAutoSelectTemplate(enabled);
          toast(`Sélection automatique du modèle ${enabled ? 'activée' : 'désactivée'}`);
          break;
        }

        case 'contextOptimization': {
          enableContextOptimization(enabled);
          toast(`Optimisation du contexte ${enabled ? 'activée' : 'désactivée'}`);
          break;
        }

        case 'eventLogs': {
          setEventLogs(enabled);
          toast(`Journalisation des événements ${enabled ? 'activée' : 'désactivée'}`);
          break;
        }

        default:
          break;
      }
    },
    [enableLatestBranch, setAutoSelectTemplate, enableContextOptimization, setEventLogs],
  );

  const features = {
    stable: [
      {
        id: 'latestBranch',
        title: 'Mise à jour de la branche principale',
        description: 'Recevoir les dernières mises à jour de la branche principale',
        icon: 'i-ph:git-branch',
        enabled: isLatestBranch,
        tooltip: 'Activé par défaut pour recevoir les mises à jour de la branche de développement principale',
      },
      {
        id: 'autoSelectTemplate',
        title: 'Sélection automatique du modèle',
        description: 'Sélectionner automatiquement le modèle de départ le plus approprié',
        icon: 'i-ph:selection',
        enabled: autoSelectTemplate,
        tooltip: 'Activé par défaut pour sélectionner automatiquement le modèle de départ le plus approprié',
      },
      {
        id: 'contextOptimization',
        title: 'Optimisation du contexte',
        description: 'Optimiser le contexte pour des réponses plus précises',
        icon: 'i-ph:brain',
        enabled: contextOptimizationEnabled,
        tooltip: 'Activé par défaut pour améliorer les réponses IA',
      },
      {
        id: 'eventLogs',
        title: 'Journalisation des événements',
        description: 'Activer la journalisation détaillée des événements et des actions de l\'utilisateur',
        icon: 'i-ph:list-bullets',
        enabled: eventLogs,
        tooltip: 'Activé par défaut pour enregistrer les logs détaillés des événements du système et des actions de l\'utilisateur',
      },
    ],
    beta: [],
  };

  return (
    <div className="flex flex-col gap-8">
      <FeatureSection
        title="Fonctionnalités essentielles"
        features={features.stable}
        icon="i-ph:check-circle"
        description="Fonctionnalités essentielles activées par défaut pour un performance optimale"
        onToggleFeature={handleToggleFeature}
      />

      {features.beta.length > 0 && (
        <FeatureSection
          title="Fonctionnalités bêta"
          features={features.beta}
          icon="i-ph:test-tube"
          description="Nouvelles fonctionnalités prêtes à être testées mais qui peuvent avoir des bords rugueux"
          onToggleFeature={handleToggleFeature}
        />
      )}

      <motion.div
        layout
        className={classNames(
          'bg-bolt-elements-background-depth-2',
          'hover:bg-bolt-elements-background-depth-3',
          'transition-all duration-200',
          'rounded-xl p-6',
          'group',
          'flex flex-col gap-6'
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-4">
          <div
            className={classNames(
              'p-3 rounded-xl text-2xl',
              'bg-bolt-elements-background-depth-3 group-hover:bg-bolt-elements-background-depth-4',
              'transition-colors duration-200',
              'text-green-500',
            )}
          >
            <div className="i-ph:book" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-bolt-elements-textPrimary group-hover:text-green-500 transition-colors">
              Bibliothèque de prompts
            </h4>
            <p className="text-sm text-bolt-elements-textSecondary mt-1">
              Sélectionnez un prompt système prédéfini
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PromptLibrary.getList().map((prompt) => (
            <motion.div
              key={prompt.id}
              className={classNames(
                'p-4 rounded-lg cursor-pointer',
                'border border-bolt-elements-borderColor/20',
                'transition-all duration-200',
                promptId === prompt.id
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'hover:bg-bolt-elements-background-depth-3 hover:border-bolt-elements-borderColor/40'
              )}
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                setPromptId(prompt.id);
                toast(`Prompt sélectionné : ${prompt.label}`);
              }}
            >
              <div className="flex items-center gap-3">
                <div className={classNames(
                  'p-2 rounded-lg',
                  'bg-bolt-elements-background-depth-3',
                  promptId === prompt.id ? 'text-green-500' : 'text-bolt-elements-textSecondary'
                )}>
                  <div className="i-ph:file-text text-xl" />
                </div>
                <div>
                  <h5 className={classNames(
                    'font-medium',
                    promptId === prompt.id ? 'text-green-500' : 'text-bolt-elements-textPrimary'
                  )}>
                    {prompt.label}
                  </h5>
                  <p className="text-xs text-bolt-elements-textSecondary mt-1 line-clamp-2">
                    {prompt.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
