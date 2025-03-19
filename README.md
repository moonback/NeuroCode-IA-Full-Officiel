
# NeuroCode - Plateforme de Développement Web Assistée par IA

[![Version](https://img.shields.io/badge/version-1.0.0-important)]()
[![License](https://img.shields.io/badge/license-MIT-success)](LICENSE)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fneurocode.app)](https://neurocode.app)

NeuroCode est une plateforme de développement web full-stack de nouvelle génération, propulsée par l'IA, conçue pour accélérer et optimiser le processus de développement. Elle s'exécute entièrement dans le navigateur grâce à [WebContainers](https://webcontainers.io/), offrant une expérience de développement intégrée et performante, sans nécessiter d'installation locale complexe.

## Aperçu du Projet

NeuroCode combine un éditeur de code, un terminal, une prévisualisation en direct, une gestion de projet, et une interface de chat avec des modèles de langage (LLM).  L'IA assiste l'utilisateur dans la rédaction de code, la génération de prompts, l'explication de code, et l'automatisation de tâches.

## Démonstrations

Voici quelques captures d'écran de l'interface de NeuroCode :

![NeuroCode Interface 1](https://github.com/moonback/NeuroCode-IA-Full-Officiel/raw/main/public/neurocode-interface-2.png?raw=true)
![NeuroCode Interface 2](https://github.com/moonback/NeuroCode-IA-Full-Officiel/raw/main/public/neurocode-interface.png?raw=true)
![NeuroCode Interface 3](https://github.com/moonback/NeuroCode-IA-Full-Officiel/raw/main/public/neurocode-interface-3.png?raw=true)
![NeuroCode Interface 4](https://github.com/moonback/NeuroCode-IA-Full-Officiel/raw/main/public/neurocode-interface-4.png?raw=true)

## Fonctionnalités Principales

*   **Éditeur de Code Intégré (CodeMirror 6)**: Coloration syntaxique, auto-complétion, indentation, thèmes multiples, et intégration avec les LLM pour la suggestion de code.  Supporte de nombreux langages, dont JavaScript, TypeScript, HTML, CSS, Python, et plus.
*   **Terminal Intégré (xterm.js)**: Exécution de commandes shell directement dans le navigateur. Permet d'installer des dépendances (via npm), d'exécuter des scripts, et de lancer des serveurs de développement.
*   **Prévisualisation en Direct**:  Mises à jour en temps réel des modifications du code dans un iframe.  Modes "Responsive" et "Device" (simulation de différents appareils).
*   **Gestion de Projet**: Arborescence de fichiers, création, suppression, renommage, et édition de fichiers.
*   **Intégration Git**: Clonage de dépôts GitHub (authentifié et non authentifié) directement dans l'environnement WebContainer. Affichage des différences (diffs) avant et après les modifications.
*   **Interface de Chat avec IA**: Interaction avec des LLM (OpenAI, Anthropic, Google, Mistral, etc.) pour l'assistance au développement.  L'interface prend en charge le streaming des réponses.
*   **Génération de Code**: Création de code à partir de descriptions en langage naturel.
*   **Explication de Code**: Génération d'explications pour des blocs de code sélectionnés.
*   **Amélioration de Prompts**: Optimisation des prompts pour de meilleures interactions avec les LLM.
*   **Optimisation du Contexte (BETA)**: Analyse intelligente du contexte (historique du chat, fichiers du projet) pour améliorer la pertinence des réponses de l'IA.
*   **Gestion des Paramètres**: Panneau de paramètres complet pour la configuration des préférences de l'utilisateur, des fournisseurs de LLM, des notifications, des fonctionnalités bêta, etc.
*   **Synchronisation de Fichiers (Expérimental)**: Synchronisation des fichiers du projet avec un dossier local.
*   **Gestion des Tâches (BETA)**: Suivi des ressources système (CPU, mémoire, réseau).
*   **Support Multi-langues**: Interface utilisateur traduisible (actuellement en anglais et français, avec des options pour d'autres langues).
*   **Mode Sombre/Clair**: Thèmes d'interface personnalisables.
*   **Notifications**: Notifications en temps réel pour les mises à jour, les erreurs et les alertes.
*    **Importation/Exportation**: Possibilité d'importer et d'exporter l'historique des chats au format JSON.
*   **Déploiement Netlify**: Intégration avec Netlify pour un déploiement facile.
*   **Bibliothèque de Prompts**: Sélection de prompts système prédéfinis.
* **Instructions Personnalisées**: Définition d'instructions personnalisées pour guider l'assistant.
* **Barre latérale masquable**: pour une interface plus épurée
* **Raccourcis clavier**: pour les actions courantes

## Technologies Utilisées

*   **Framework principal**: [Remix](https://remix.run/)
*   **Interface utilisateur**: [React](https://react.dev/)
*   **Éditeur de code**: [CodeMirror 6](https://codemirror.net/6/)
*   **Terminal**: [xterm.js](https://xtermjs.org/)
*   **WebContainers**: [@webcontainer/api](https://www.npmjs.com/package/@webcontainer/api)
*   **Git**: [isomorphic-git](https://isomorphic-git.org/)
*   **Gestion de l'état**: [nanostores](https://github.com/nanostores/nanostores)
*   **Persistance**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), [js-cookie](https://www.npmjs.com/package/js-cookie)
*   **Styling**: [SCSS](https://sass-lang.com/), [Tailwind CSS](https://tailwindcss.com/)
*   **Animations**: [Framer Motion](https://www.framer.com/motion/)
*   **UI components**:  [@radix-ui](https://www.radix-ui.com/)
*   **Diff**: [diff](https://www.npmjs.com/package/diff)
*   **PDF**: [pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist)
*   **Tests**: [Vitest](https://vitest.dev/)
*   **Autres**: node-fetch, classnames, lodash, react-toastify, etc.

## Structure du Projet

Le projet est structuré en plusieurs répertoires :

*   `app/`: Contient le code source de l'application Remix.
    *   `components/`: Composants React réutilisables, organisés en sous-répertoires par fonctionnalité (e.g., `@settings`, `chat`, `editor`, `git`, `header`, `modals`, `sidebar`, `sync`, `ui`, `workbench`).
    *   `hooks/`: Hooks React personnalisés (e.g., `useClipboard`, `useLocalStorage`, `useUpdateCheck`).
    *   `lib/`: Fonctions utilitaires, logique métier, et intégrations avec des services tiers.
        *   `api/`: Fonctions pour interagir avec des API externes.
        *   `common/`: Fonctions et constantes partagées entre le client et le serveur.
            * `llms-docs`: Documentation pour divers LLM et frameworks.
            * `prompts`: Prompts système par défaut.
        *   `modules/`: Modules spécifiques (actuellement, principalement la gestion des LLM).
            *   `llm/`:
                * `base-provider.ts`: Classe abstraite de base pour les fournisseurs de LLM.
                * `manager.ts`:  Gestionnaire centralisé des fournisseurs de LLM.
                * `providers/`:  Implémentations concrètes des fournisseurs de LLM (OpenAI, Anthropic, Google, etc.).
                * `registry.ts`: Enregistre les fournisseurs disponibles.
                * `types.ts`: Types pour les LLM.
        *   `persistence/`: Fonctions pour la persistance des données (IndexedDB, localStorage, gestion de l'historique des chats).
        *   `runtime/`: Fonctions liées à l'exécution du code (e.g., parsing des messages, exécution d'actions).
        *   `stores/`: Stores [Nanostores](https://github.com/nanostores/nanostores) pour la gestion de l'état global de l'application (thème, paramètres, fichiers, etc.).
        *   `utils/`: Fonctions utilitaires diverses (manipulation de chaînes, formatage, etc.).
        *   `webcontainer/`: Initialisation et configuration de WebContainer.
    *   `routes/`: Définition des routes de l'application Remix (API et pages).
    *   `styles/`: Feuilles de style globales et spécifiques aux composants (principalement SCSS).
    *   `types/`: Définitions de types TypeScript globales.
    *   `root.tsx`: Composant racine de l'application.
    *   `entry.client.tsx`: Point d'entrée côté client.
    *   `entry.server.tsx`: Point d'entrée côté serveur.


**Fonctionnalités de NeuroCode (de la plus complexe à la plus simple)**

| Fonctionnalité                                      | Description                                                                                                                                                                                                                                                           | Fichiers clés                                                                                                                                                  |
| :------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intégration LLM et Fournisseurs d'IA               | Gestion de multiples fournisseurs d'IA (OpenAI, Anthropic, Google, etc.), locaux (Ollama, LM Studio) et cloud. Appels API, sélection de modèles, configuration des paramètres (température, max_tokens, etc.).                                                             | `lib/modules/llm/*`, `components/@settings/tabs/providers/*`, `routes/api.llmcall.ts`, `routes/api.models.ts`, `components/chat/ModelSelector.tsx`              |
| Synchronisation de Fichiers (Sync) et historique     | Synchronisation bidirectionnelle des fichiers du projet avec un dossier local. Historique des synchronisations, gestion des conflits, statistiques (fichiers synchronisés, taille, durée).                                                                              | `components/sync/*`, `lib/stores/workbench.ts`, `lib/persistence/*`, `types/sync.ts`,  `components/@settings/tabs/sync/*`, `components/sidebar/date-binning.ts`      |
| Workbench (Environnement de Développement Intégré) | Gestion de l'arborescence des fichiers, éditeur de code (CodeMirror), aperçu des différences (DiffView), terminal intégré (XTerm.js), gestion des onglets, déploiement (GitHub, Netlify).                                                                                 | `components/workbench/*`, `components/editor/*`, `components/git/*`, `components/modals/*`, `lib/stores/files.ts`, `lib/stores/editor.ts`, `lib/stores/terminal.ts`, `lib/stores/previews.ts`, `lib/webcontainer/*`|
| Gestion des Paramètres (ControlPanel)           | Interface utilisateur pour configurer les préférences de l'application, gérer les notifications, les fonctionnalités, les données, les fournisseurs d'IA, les connexions, le débogage, etc.  Gestion des onglets dynamiques et de la visibilité.                         | `components/@settings/*`, `lib/stores/settings.ts`, `lib/hooks/useSettings.ts`, `components/ui/Tabs.tsx`, `components/@settings/core/ControlPanel.tsx`           |
| Chat et Messagerie                                   | Composants d'interface utilisateur pour l'interaction avec les LLM (messages utilisateur/assistant, saisie de texte, boutons d'envoi, etc.).  Gestion des prompts système personnalisés, importation/exportation de chats.                                          | `components/chat/*`, `lib/stores/chat.ts`, `lib/common/prompts/*`, `components/chat/chatExportAndImport/*`, `lib/stores/promptStore.ts`                          |
| Composants UI                                       | Composants d'interface utilisateur réutilisables (boutons, entrées, dialogues, etc.) et thèmes.                                                                                                                                                                | `components/ui/*`, `styles/*`, `utils/classNames.ts`, `utils/cn.ts`, `components/ui/theme/StyleGuide.tsx`, `lib/stores/theme.ts`                             |
| Hooks et Utilitaires                                | Fonctions utilitaires et hooks réutilisables (clipboard, localStorage, gestion des raccourcis, etc.).                                                                                                                                                            | `hooks/*`, `lib/utils/*`, `lib/crypto.ts`, `lib/fetch.ts`, `utils/buffer.ts`, `utils/easings.ts`, `utils/path.ts`                                            |
|API Routes | Fourniture de points de terminaison d'API pour la communication avec des LLMs, récupération d'informations système et exécution d'actions spécifiques à la plateform|`routes/api.*.ts`|

**Détails des Fonctionnalités (avec exemples de code)**

1.  **Intégration LLM et Fournisseurs d'IA:**

    *   **`lib/modules/llm/base-provider.ts`**:  Classe abstraite de base pour tous les fournisseurs d'IA. Définit l'interface commune et les méthodes comme `checkApiEndpoint`.

        ```typescript
        export abstract class BaseProviderChecker {
          protected config: ProviderConfig;

          constructor(config: ProviderConfig) {
            this.config = config;
          }

          protected async checkApiEndpoint(...) { ... }

          abstract checkStatus(): Promise<StatusCheckResult>;
        }
        ```

    *   **`lib/modules/llm/manager.ts`**:  Le `LLMManager` gère l'enregistrement, la récupération et la configuration des différents fournisseurs. Il charge dynamiquement les fournisseurs à partir du répertoire `providers`.  Il maintient également une liste des modèles disponibles.
    *   **`lib/modules/llm/providers/*`**:  Implémentations concrètes des fournisseurs d'IA (OpenAI, Anthropic, Google, etc.). Chaque fournisseur étend `BaseProvider` et implémente les méthodes spécifiques pour interagir avec l'API du fournisseur. Ex: `openai.ts`, `anthropic.ts`, `google.ts`.
    *   **`routes/api.llmcall.ts`**:  Point de terminaison de l'API pour les appels LLM.  Gère la communication avec les fournisseurs et le streaming des réponses.
    *   **`routes/api.models.ts`**: Point de terminaison pour récuperer les models disponibles

2.  **Synchronisation de Fichiers (Sync):**

    *   **`components/sync/SyncSidebar.tsx`**:  Interface utilisateur pour la configuration de la synchronisation (sélection du dossier, activation/désactivation, paramètres).
    *   **`components/sync/SyncStats.tsx`**:  Affiche les statistiques de synchronisation (fichiers synchronisés, taille, durée, historique).
    *   **`components/sync/SyncStatusIndicator.tsx`**:  Indicateur visuel de l'état de la synchronisation.
    *   **`lib/stores/workbench.ts`**:  Logique de synchronisation dans le `workbenchStore`. Gère l'état de la synchronisation, l'historique, etc.  Inclut des méthodes comme `syncFiles()`, `toggleProjectSync()`.
    *   **`lib/persistence/sync-folder.ts`**: Gère la sauvegarde et la restauration du handle du dossier de synchronisation dans IndexedDB.
    *   **`components/sidebar/date-binning.ts`: composants pour l'organisation et l'affichage de l'historique de synchronisation.**
    *  `components/@settings/tabs/sync/*` : plusieurs composants pour la gestion du paramétrage de la synchronisation.

        Exemple de code (`workbenchStore`):

        ```typescript
        async syncFiles(): Promise<void> {
          // ... logique de synchronisation ...
        }

        toggleProjectSync(enabled: boolean) {
          // ... activer/désactiver la synchronisation ...
        }
        ```

3.  **Workbench:**

    *   **`components/workbench/Workbench.client.tsx`**:  Composant principal de l'environnement de développement.  Gère la disposition (panneaux, onglets), l'intégration des autres composants (éditeur, terminal, aperçu), et la logique d'interaction globale.
    *   **`components/editor/codemirror/*`**:  Intégration de l'éditeur CodeMirror pour l'édition de code, avec prise en charge de la coloration syntaxique, de l'indentation, etc. (`CodeMirrorEditor.tsx`). Gestion du contenu binaire (`BinaryContent.tsx`).
    *   **`components/git/GitUrlImport.client.tsx`**:  Permet d'importer un projet depuis un dépôt Git.
    *   **`components/modals/NetlifyModal.client.tsx`**: Gère le déploiement via une fenetre modal.
    *   **`components/workbench/terminal/*`**:  Intégration du terminal (XTerm.js).
    *   **`components/workbench/DiffView.tsx`**: Composant pour afficher les différences de code (comparaison avant/après).  Utilise la bibliothèque `diff`.
        *   **`DiffModeSelector.tsx`**: permet de choisir le mode d'affichage des différences.
    * **`components/workbench/EditorPanel.tsx`**: Gère l'affichage de l'éditeur de code, de l'arborescence de fichiers et du terminal.
    * **`components/workbench/FileBreadcrumb.tsx`**: Affiche un fil d'Ariane pour la navigation dans l'arborescence de fichiers.
    * **`components/workbench/FileTree.tsx`**: Affiche l'arborescence des fichiers du projet.
    *  **`components/workbench/InstructionsModal.tsx`**: Une fenêtre modale pour afficher/saisir des instructions.
    *   **`lib/stores/files.ts`**: Gère l'état des fichiers du projet (contenu, type, etc.).
    *   **`lib/stores/editor.ts`**: Gère l'état de l'éditeur (fichier sélectionné, contenu, position du curseur).
    *   **`lib/stores/terminal.ts`**: Gère l'état du terminal.
    *   **`lib/stores/previews.ts`**: Gère l'état des aperçus (preview).
    *   **`lib/webcontainer/*`**: Intégration de WebContainer (environnement d'exécution Node.js dans le navigateur).

4.  **Gestion des Paramètres (ControlPanel):**

    *   **`components/@settings/core/ControlPanel.tsx`**:  Le composant principal du panneau de contrôle.  Gère l'ouverture/fermeture, la navigation entre les onglets, et l'affichage des composants de paramètres spécifiques.
    *   **`components/@settings/tabs/*`**:  Composants individuels pour chaque onglet de paramètres (ex: `SettingsTab.tsx`, `NotificationsTab.tsx`, `FeaturesTab.tsx`, etc.).
    *   **`components/@settings/core/types.ts`**:  Types et interfaces pour la configuration des paramètres.
    *   **`components/@settings/core/constants.ts`**:  Constantes pour les libellés, descriptions, et configurations par défaut des onglets.
    *   **`lib/stores/settings.ts`**:  Gère l'état global des paramètres de l'application (thème, langue, notifications, etc.).  Persistance dans `localStorage`.
    *   **`lib/hooks/useSettings.ts`**:  Hook personnalisé pour accéder et modifier facilement les paramètres.
    *   **`components/ui/Tabs.tsx`**:  Composant réutilisable pour la gestion des onglets.
    * `components/@settings/shared/components`: Contient `DraggableTabList.tsx`, `TabManagement.tsx`, `TabTile.tsx` pour la gestion des onglets et leur organisation.
    * `components/@settings/utils`: contient des fichiers comme `tab-helpers.ts` et `animations.ts`

        Exemple de code (fichier `constants.ts`):

        ```typescript
        export const TAB_LABELS: Record<TabType, string> = {
          settings: 'Paramètres',
          notifications: 'Notifications',
          // ... autres onglets ...
        };

        export const DEFAULT_TAB_CONFIG = [
          // ... configuration par défaut des onglets ...
        ];
        ```

5.  **Chat et Messagerie:**

    *   **`components/chat/Chat.client.tsx`**:  Composant principal de l'interface de chat.  Intègre `BaseChat`, `Messages`, `SendButton`, etc.
    *   **`components/chat/BaseChat.tsx`**:  Gère la logique de base du chat (envoi de messages, gestion de l'entrée, etc.).
    *   **`components/chat/Messages.client.tsx`**:  Affiche la liste des messages (utilisateur et assistant).
    *   **`components/chat/UserMessage.tsx`**:  Composant pour afficher un message utilisateur.
    *   **`components/chat/AssistantMessage.tsx`**:  Composant pour afficher un message de l'assistant, incluant le rendu Markdown et la gestion des artefacts.
    *   **`components/chat/Markdown.tsx`**:  Composant pour le rendu du Markdown, avec gestion de la coloration syntaxique (via `shiki`).
    *   **`lib/stores/chat.ts`**:  Gère l'état du chat (si le chat est visible, s'il a démarré, etc.).
    *    **`components/chat/chatExportAndImport/*`**: Composants pour gérer l'export et l'import des chats.
        *   **`components/chat/ExamplePrompts.tsx`**: Affiche des exemples de prompts.
        *   **`components/chat/SpeechRecognition.tsx`**: Gère la reconnaissance vocale.
        *   **`components/chat/ThoughtBox.tsx`**: Affiche une zone de pensée.
        *   **`lib/stores/promptStore.ts`**: Gère les instructions systèmes personnalisées.

        Exemple de code (fichier `Chat.client.tsx`):

        ```typescript
        import { useChat } from 'ai/react';

        // ...

        const { messages, input, handleInputChange, handleSubmit } = useChat({
          api: '/api/chat', // Point de terminaison de l'API pour le chat
          // ... autres options ...
        });

        // ... rendu de l'interface utilisateur ...
        ```

6.  **Composants UI:**

    *   **`components/ui/*`**:  Dossier contenant les composants d'interface utilisateur réutilisables (boutons, entrées, dialogues, etc.).
        *   **`Button.tsx`**:  Composant bouton générique.
        *   **`Input.tsx`**:  Composant champ de saisie générique.
        *   **`Dialog.tsx`**:  Composant pour les boîtes de dialogue.
        *   **`Tabs.tsx`**:  Composant pour la navigation par onglets.
        *   ... et d'autres composants UI.
    *   **`styles/*`**:  Fichiers de style globaux, variables CSS, animations.
    *   **`utils/classNames.ts`**:  Utilitaire pour combiner des classes CSS conditionnellement (utilise `clsx` et `tailwind-merge`).
    * `components/ui/BackgroundRays`: Gère les effets visuels de rayons en arrière-plan.
    *   **`lib/stores/theme.ts`**:  Gère le thème de l'application (clair/sombre).

        Exemple de code (fichier `Button.tsx`):

        ```typescript
        import { cva } from 'class-variance-authority';

        const buttonVariants = cva(
          'inline-flex items-center justify-center ...',
          {
            variants: {
              variant: {
                default: 'bg-blue-500 text-white',
                secondary: 'bg-gray-200 text-gray-900',
              },
              size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 px-3',
              },
            },
            defaultVariants: {
              variant: 'default',
              size: 'default',
            },
          },
        );

        export function Button({ className, variant, size, ...props }: ButtonProps) {
          return <button className={classNames(buttonVariants({ variant, size }), className)} {...props} />;
        }
        ```

7.  **Hooks et Utilitaires:**

    *   **`hooks/*`**:  Hooks React personnalisés pour des fonctionnalités spécifiques (ex: `useClipboard.ts`, `useLocalStorage.ts`).
    *   **`lib/utils/*`**:  Fonctions utilitaires diverses (ex: `formatSize.ts`, `getLanguageFromExtension.ts`).
    *   **`lib/crypto.ts`**: Fonctions de cryptage (si présentes, non fournies dans le code source).
    *   **`lib/fetch.ts`**: Utilitaires pour les requêtes réseau (probablement une abstraction autour de `fetch`).
    *   `utils/debounce.ts`, `utils/stacktrace.ts`, `utils/unreachable.ts`:  Fonctions utilitaires diverses.

        Exemple de code (fichier `useLocalStorage.ts`):

        ```typescript
        export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
          // ... implémentation du hook ...
        }
        ```

## Installation et Exécution

1.  **Prérequis**:
    *   Node.js (version 18 ou supérieure)
    *   pnpm
2.  **Clonez le dépôt**:
    ```bash
    git clone https://github.com/moonback/NeuroCode-IA-Full-Officiel.git
    ```
3. **Installation des dépendances:**
    ```bash
     cd NeuroCode-IA-Full-Officiel
     pnpm install
    ```
4.  **Exécuter le projet :**
    ```bash
     pnpm run dev
    ```
    `pnpm run dev` ouvre l'application dans votre navigateur. L'interface utilisateur s'affiche à la racine (`/`), tandis que l'éditeur et les autres outils sont accessibles via l'URL `/chat/:id`, où `:id` est un identifiant unique.

## Configuration

La plupart des paramètres de l'application peuvent être configurés via le panneau "Paramètres" accessible depuis l'interface utilisateur.  Cependant, certains paramètres plus avancés peuvent être configurés via des variables d'environnement (dans un fichier `.env` ou directement dans l'environnement d'exécution).

**Variables d'environnement importantes :**

*   `VITE_GITHUB_ACCESS_TOKEN`: (Optionnel) Jeton d'accès GitHub personnel pour l'intégration Git (portée `repo` requise).  Si non fourni, l'authentification GitHub sera limitée aux dépôts publics.
*   **Clés API des fournisseurs LLM**:  Vous *devez* configurer les clés API pour les fournisseurs de LLM que vous souhaitez utiliser (ex: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`).  Vous pouvez également définir des URLs de base personnalisées pour certains fournisseurs.
*   `VITE_OLLAMA_API_BASE_URL`: URL de base pour l'API Ollama (par défaut: `http://127.0.0.1:11434`).
*   `VITE_GITHUB_ACCESS_TOKEN`: Jeton d'accès personnel GitHub (utilisé par `GitUrlImport.client.tsx` pour l'importation de dépôts).

## Contribution

Les contributions à NeuroCode sont les bienvenues! Veuillez consulter le fichier `CONTRIBUTING.md` (à créer) pour connaître les directives. En résumé:

1.  Faites un fork du dépôt.
2.  Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`).
3.  Faites vos modifications et assurez-vous que les tests passent (`pnpm test`).
4.  Commitez vos changements (`git commit -m 'Ajout de la fonctionnalité incroyable'`).
5.  Poussez vers la branche (`git push origin feature/AmazingFeature`).
6.  Ouvrez une Pull Request.

## Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## FAQ

**Q: Comment puis-je contribuer au projet ?**

**R:** Nous apprécions les contributions de la communauté! Veuillez consulter notre fichier `CONTRIBUTING.md` pour connaître les directives. En résumé :
   1. Fork le dépôt.
   2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`).
   3. Faites vos modifications et assurez-vous que les tests passent (`pnpm test`).
   4. Commitez vos changements (`git commit -m 'Ajout de la fonctionnalité incroyable'`).
   5. Poussez vers la branche (`git push origin feature/AmazingFeature`).
   6. Ouvrez une Pull Request.

**Q: Puis-je utiliser ce projet à des fins commerciales ?**

**R:** Oui, NeuroCode est sous licence MIT, ce qui signifie que vous pouvez l'utiliser, le modifier et le distribuer à des fins commerciales.  Cependant, nous vous demandons d'inclure une attribution à NeuroCode.

**Q: Comment puis-je signaler un bug ou demander une fonctionnalité ?**

**R:** Vous pouvez signaler les bugs et demander des fonctionnalités en ouvrant une "issue" sur notre dépôt GitHub : [https://github.com/moonback/NeuroCode-IA-Full-Officiel/issues](https://github.com/moonback/NeuroCode-IA-Full-Officiel/issues).
Soyez aussi précis que possible dans votre description.

**Q: Comment puis-je configurer mon environnement de développement ?**

**R:**  Assurez-vous d'avoir installé Node.js (version 18 ou supérieure) et pnpm.  Clonez le dépôt, exécutez `pnpm install` pour installer les dépendances, puis `pnpm dev` pour démarrer le serveur de développement.  L'application sera accessible à l'adresse `http://localhost:3000`.

**Q: Comment puis-je personnaliser l'invite (prompt) de l'IA ?**

**R:** Vous pouvez personnaliser l'invite de l'IA en allant dans les paramètres, puis l'onglet "Instructions personnalisées".  Entrez votre invite personnalisé dans la zone de texte et enregistrez.

**Q: Comment activer/désactiver la synchronisation des fichiers ?**

**R:** Vous pouvez activer ou désactiver la synchronisation des fichiers dans l'onglet "Synchronisation de fichiers" des paramètres.  Vous devez d'abord sélectionner un dossier de synchronisation.

**Q: Où puis-je trouver la documentation des modèles de langage (LLMs) supportés ?**

**R:** Vous pouvez trouver la documentation des LLMs supportés dans `app/lib/common/llms-docs`.  Chaque fichier texte correspond à un modèle ou à une bibliothèque spécifique (par exemple, `openai.txt`, `anthropic.txt`, `nextjs.txt`, etc.). Vous pouvez également accéder à cette documentation via l'API en utilisant le point de terminaison `/api/library-docs`.

**Q: Comment puis-je contribuer à la documentation des LLMs ?**

**R:** Si vous souhaitez améliorer la documentation des LLMs, vous pouvez modifier les fichiers texte correspondants dans `app/lib/common/llms-docs` et soumettre une Pull Request.  Assurez-vous que vos modifications sont claires, concises et précises.

**Q: Comment accéder à la version de l'application ?**

**R:** La version de l'application est disponible via une requête à `/api/system/app-info`. La réponse inclut la version, le nom de l'application, la description, la licence, et d'autres informations utiles.  Ces informations sont également affichées dans l'onglet "Débogage" des paramètres.

**Q: L'application prend-elle en charge d'autres langues que le français ?**

**R:** Oui, l'application prend en charge plusieurs langues, y compris l'anglais, l'espagnol, le français, l'allemand, l'italien, le portugais, le russe, le chinois, le japonais et le coréen. Vous pouvez changer la langue de l'application dans l'onglet "Paramètres".

**Q: Où puis-je trouver la documentation de l'API ?**

**R:** Une documentation OpenAPI (Swagger) n'est pas *directement* intégrée dans ce projet, mais est une excellente suggestion d'amélioration. La structure du code et le nommage des routes (par exemple, `routes/api.chat.ts`, `routes/api.models.$provider.ts`) fournissent une bonne indication des endpoints disponibles. Le code est bien commenté, ce qui facilite la compréhension.

**Q: Comment signaler un problème de sécurité ?**

**R:** Si vous trouvez un problème de sécurité, veuillez NE PAS l'ouvrir publiquement. Envoyez plutôt un e-mail directement aux mainteneurs du projet (remplacer par une adresse email valide) en décrivant le problème et les étapes pour le reproduire.

**Q: Comment puis-je exporter ou importer mon historique de chat ?**

**R:** Vous pouvez exporter l'historique de votre chat au format JSON en utilisant le bouton "Exporter les conversations" dans l'onglet "Gestion des données" des paramètres. Pour importer un historique, utilisez le bouton "Importer les paramètres" dans le même onglet.

**Q: Comment puis-je personnaliser les paramètres de synchronisation des fichiers ?**

**R:** Vous pouvez personnaliser les paramètres de synchronisation des fichiers, tels que l'activation/désactivation de la synchronisation automatique, l'intervalle de synchronisation et la synchronisation à la sauvegarde, dans l'onglet "Synchronisation de fichiers" des paramètres.
