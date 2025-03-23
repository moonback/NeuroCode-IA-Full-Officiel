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
      enableLatestBranch(false); // Default: OFF - Ne pas mettre à jour automatiquement depuis la branche principale
    }

    if (contextOptimizationEnabled === undefined) {
      enableContextOptimization(false); // Default: OFF - Optimisation du contexte désactivée
    }

    if (autoSelectTemplate === undefined) {
      setAutoSelectTemplate(false); // Default: OFF - Sélection automatique des modèles désactivée
    }

    if (promptId === undefined) {
      setPromptId('default'); // Default: 'default'
    }

    if (eventLogs === undefined) {
      setEventLogs(false); // Default: OFF - Journalisation des événements désactivée
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
        tooltip: 'Désactivé par défaut. Activez cette fonctionnalité pour recevoir les mises à jour de la branche de développement principale. Attention : les mises à jour peuvent introduire des changements non testés.',
      },
      {
        id: 'autoSelectTemplate',
        title: 'Sélection automatique du modèle',
        description: 'Sélectionner automatiquement le modèle de départ le plus approprié',
        icon: 'i-ph:selection',
        enabled: autoSelectTemplate,
        tooltip: 'Désactivé par défaut. Activez cette fonctionnalité pour que le système sélectionne automatiquement le modèle de départ le plus approprié en fonction du contexte. Recommandé pour les utilisateurs expérimentés.',
      },
      {
        id: 'contextOptimization',
        title: 'Optimisation du contexte',
        description: 'Optimiser le contexte pour des réponses plus précises',
        icon: 'i-ph:brain',
        enabled: contextOptimizationEnabled,
        tooltip: 'Désactivé par défaut. Activez cette fonctionnalité pour optimiser le contexte des réponses IA. Cela peut augmenter la précision mais aussi la consommation de ressources.',
      },
      {
        id: 'eventLogs',
        title: 'Journalisation des événements',
        description: 'Activer la journalisation détaillée des événements et des actions de l\'utilisateur',
        icon: 'i-ph:list-bullets',
        enabled: eventLogs,
        tooltip: 'Activé par défaut. Fonctionnalité pour enregistrer les logs détaillés des événements du système et des actions de l\'utilisateur. Utile pour le débogage mais peut affecter les performances.',
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
          'transition-all duration-300 ease-out',
          'rounded-2xl p-8',
          'group',
          'flex flex-col gap-8',
          'shadow-lg hover:shadow-xl'
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
      >
        <div className="flex items-center gap-6">
          <div
            className={classNames(
              'p-4 rounded-2xl text-3xl',
              'bg-gradient-to-br from-green-400/10 to-green-600/10',
              'group-hover:from-green-400/20 group-hover:to-green-600/20',
              'transition-all duration-300 ease-out',
              'text-green-500 shadow-inner'
            )}
          >
            <div className="i-ph:book transform group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-bolt-elements-textPrimary group-hover:text-green-500 transition-colors duration-300">
              Bibliothèque de prompts
            </h4>
            <p className="text-sm text-bolt-elements-textSecondary/90 mt-2 max-w-lg">
              Sélectionnez un prompt système prédéfini pour optimiser vos interactions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PromptLibrary.getList().map((prompt) => (
            <motion.div
              key={prompt.id}
              className={classNames(
                'p-5 rounded-xl cursor-pointer',
                'border-2',
                'transition-all duration-300 ease-out',
                promptId === prompt.id
                  ? 'bg-green-500/10 border-green-500/30 shadow-green-500/5'
                  : 'hover:bg-bolt-elements-background-depth-3 border-bolt-elements-borderColor/20 hover:border-bolt-elements-borderColor/40'
              )}
              whileHover={{ scale: 1.03, y: -4 }}
              onClick={() => {
                setPromptId(prompt.id);
                toast(`Prompt sélectionné : ${prompt.label}`);
              }}
            >
              <div className="flex items-start gap-4">
                <div className={classNames(
                  'p-3 rounded-xl shrink-0',
                  'bg-bolt-elements-background-depth-3 shadow-inner',
                  'transition-all duration-300 ease-out',
                  promptId === prompt.id ? 'text-green-500 bg-green-500/10' : 'text-bolt-elements-textSecondary'
                )}>
                  <div className="i-ph:file-text text-2xl transform group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="space-y-2 flex-1">
                  <h5 className={classNames(
                    'font-semibold text-lg leading-tight',
                    promptId === prompt.id ? 'text-green-500' : 'text-bolt-elements-textPrimary'
                  )}>
                    {prompt.label}
                  </h5>
                  <p className="text-sm text-bolt-elements-textSecondary/80 line-clamp-3">
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
