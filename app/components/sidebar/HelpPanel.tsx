import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useMemo, type PropsWithChildren } from 'react';
import { classNames } from '~/utils/classNames';
import { Input } from '~/components/ui/Input'; // Import existing Input

interface HelpPanelProps {
  show: boolean;
  onClose: () => void;
}
interface AccordionItem {
    title: string;
    content: string;
    icon: string;
}

export function HelpPanel({ show, onClose }: HelpPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
    const [openSection, setOpenSection] = useState<string | null>(null);

  const sections: { title: string; content: React.ReactNode; icon: string }[] = [
    {
      title: 'Démarrer',
      icon: 'i-ph-rocket-launch-duotone',
      content: (
        <>
          <p>
            NeuroCode est un assistant de développement IA.  Pour commencer, tapez une requête dans la zone de saisie de texte,
            ou importez un projet existant en utilisant le bouton "Importer un dossier" dans la barre latérale.
          </p>
          <p>
            Vous pouvez également importer un dépôt GitHub distant à l'aide du bouton "Importer un dépôt".
          </p>
          <p>
            Utilisez <kbd className="p-1 rounded-md bg-gray-800 text-white text-xs">Shift</kbd> +{' '}
            <kbd className="p-1 rounded-md bg-gray-800 text-white text-xs">Enter</kbd> pour les sauts de ligne
            dans la zone de saisie.
          </p>
        </>
      ),
    },
    {
      title: 'Configuration des Fournisseurs d\'IA',
      icon: 'i-ph-plugs-connected',
      content: (
        <>
          <p>
            NeuroCode prend en charge plusieurs fournisseurs d'IA (OpenAI, Anthropic, etc.). Vous pouvez configurer vos
            clés API dans le panneau "Paramètres" accessible via le bouton d'engrenage.  Certains fournisseurs (comme
            Ollama) fonctionnent localement et ne nécessitent pas de clé API.
          </p>
          <p>
            Une fois votre clé API configurée, vous pourrez sélectionner le modèle que vous souhaitez utiliser dans
            la liste déroulante au-dessus de la zone de saisie.
          </p>
        </>
      ),
    },
    {
      title: 'Gestion des Fichiers',
      icon: 'i-ph:folder-open-duotone',
      content: (
        <>
          <p>
            Les fichiers de votre projet sont affichés dans l'arborescence de fichiers à gauche.  Cliquez sur un
            fichier pour l'ouvrir dans l'éditeur de code. Les modifications sont automatiquement enregistrées.
          </p>
          <p>
            Vous pouvez importer un dossier complet en cliquant sur le bouton "Importer un dossier" dans la barre latérale.
          </p>
            <ul>
              <li>Cliquez sur un fichier pour l'ouvrir dans l'éditeur de code.</li>
              <li>Les modifications sont automatiquement enregistrées.</li>
              <li>
                  Pour cibler des fichiers spécifiques dans votre prompt, utilisez l'icône de trombone
                  en bas à gauche de la zone de saisie.
              </li>
            </ul>
        </>
      ),
    },
    
        {
            title: 'Synchronisation des Fichiers',
            icon: 'i-ph:arrows-clockwise-duotone',
            content: (
            <>
                <p>
                Cliquez sur l'icône de dossier en bas à gauche de la barre latérale pour sélectionner un
                dossier de synchronisation.  Activez ensuite la synchronisation en utilisant le bouton
                à double flèche.
                </p>
                <ul>
                <li>Les fichiers de votre projet seront synchronisés avec le dossier sélectionné.</li>
                <li>Vous pouvez activer la synchronisation automatique ou la synchronisation lors de la sauvegarde.</li>
                </ul>
            </>
            ),
        },
        {
            title: "Dépannage",
            icon: "i-ph:bug-duotone",
            content: (
              <>
                <p>Si vous rencontrez des problèmes, consultez l'onglet "Débogage" dans les paramètres pour obtenir des informations système.</p>
                <p>Vous pouvez également signaler les problèmes sur notre <a href="https://github.com/stackblitz-labs/bolt.diy/issues" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">page GitHub Issues</a>.</p>
              </>
            ),
        },
      ];
      const toggleSection = (title: string) => {
        setOpenSection(openSection === title ? null : title);
      };

      const filteredSections = useMemo(() => {
        if (!searchQuery) return sections;

        const query = searchQuery.toLowerCase();
        return sections.filter(section => 
            section.title.toLowerCase().includes(query) || 
            (typeof section.content === 'string' && section.content.toLowerCase().includes(query))
        );
      }, [sections, searchQuery]);
    
      if (!show) return null;
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-lg z-[100] flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="bg-bolt-elements-background-depth-1 rounded-2xl p-8 w-full max-w-2xl border-2 border-bolt-elements-border/20 shadow-2xl relative"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-xl hover:bg-bolt-elements-background-depth-2 transition-all duration-200 text-bolt-elements-textSecondary hover:text-red-400 hover:scale-105"
                        aria-label="Fermer la modale"
                    >
                        <div className="i-ph:x-bold w-6 h-6" />
                    </button>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-bolt-elements-textPrimary flex items-center gap-3">
                                <div className="i-ph:question w-7 h-7 text-green-500" />
                                Aide
                            </h2>
                            
                        </div>
                        <Input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full mb-4"
                        />

                        {filteredSections.map((section, index) => (
                        <div key={index} className="mb-4">
                        <button
                            onClick={() => toggleSection(section.title)}
                            className="flex items-center justify-between w-full text-left p-2 rounded-lg bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                            <div className={classNames(section.icon, "w-5 h-5 text-bolt-elements-textPrimary")} />
                            <h3 className="text-lg font-medium text-bolt-elements-textPrimary">{section.title}</h3>
                            </div>
                            <div className={classNames(
                                'i-ph:caret-down',
                                'w-4 h-4 transition-transform',
                                { 'rotate-180': openSection === section.title }
                            )} />
                        </button>
                        <AnimatePresence>
                            {openSection === section.title && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="p-4 text-white bg-bolt-elements-background-depth-3 rounded-lg mt-2"
                            >
                                {section.content}
                            </motion.div>
                            )}
                        </AnimatePresence>
                        </div>
                    ))}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
  );
}