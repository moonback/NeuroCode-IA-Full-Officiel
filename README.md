# NeuroCode - AI-Powered Web Development Platform

[![Version](https://img.shields.io/badge/version-1.0.0-important)](https://github.com/moonback/NeuroCode-IA/releases)
[![License](https://img.shields.io/badge/license-MIT-success)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/moonback/NeuroCode-IA/build.yml?branch=main)](https://github.com/moonback/NeuroCode-IA/actions)
[![Downloads](https://img.shields.io/github/downloads/moonback/NeuroCode-IA/total?color=blue)](https://github.com/moonback/NeuroCode-IA/releases)
[![Stars](https://img.shields.io/github/stars/moonback/NeuroCode-IA?style=social)](https://github.com/moonback/NeuroCode-IA)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fneurocode.app)](https://neurocode.app)
[![Documentation](https://img.shields.io/badge/docs-neurocode.app-informational)](https://docs.neurocode.app)

# NeuroCode

NeuroCode est une plateforme de développement full-stack de nouvelle génération qui intègre l'intelligence artificielle pour accélérer et optimiser le processus de développement web. Ce README fournit un aperçu du projet, de sa structure, et de ses composants principaux.

## Aperçu du Projet

NeuroCode est conçu pour fonctionner dans un environnement de navigateur, utilisant WebContainers pour l'exécution du code Node.js. Il offre une expérience de développement intégrée, combinant un éditeur de code (basé sur CodeMirror), un terminal, une prévisualisation en direct, et des fonctionnalités de gestion de projet.  L'IA est au cœur du projet, offrant une assistance à la fois pour l'écriture de prompts, la suggestion de code, et l'automatisation de tâches.

## Structure du Projet

Le projet est structuré en plusieurs répertoires principaux, chacun ayant un rôle spécifique:

- **`app`**: Racine de l'application Remix.
    - **`components`**: Composants React réutilisables.
        - **`@settings`**: Composants pour le panneau de paramètres (profil, notifications, connexions à des services externes, débogage, etc.).
        - **`chat`**: Composants liés à l'interface de chat et à l'interaction avec l'IA.
        - **`editor`**: Composants de l'éditeur de code, incluant des extensions CodeMirror personnalisées.
        - **`git`**: Composants pour l'intégration de Git (ex: importation depuis une URL Git).
        - **`header`**: Composants de l'en-tête de l'application.
        - **`modals`**: Composants de fenêtres modales (ex: modal Netlify).
        - **`sidebar`**: Composants de la barre latérale (historique des chats, etc.).
        - **`sync`**: Composants pour la synchronisation de fichiers (expérimental).
        - **`ui`**: Composants d'interface utilisateur de base (boutons, entrées, etc.).
        - **`workbench`**: Composants de l'espace de travail principal (éditeur, terminal, aperçu).
    - **`hooks`**: Hooks React personnalisés (ex: `useClipboard`, `useLocalStorage`).
    - **`lib`**: Fonctions utilitaires et logiques métier.
        - **`api`**: Fonctions pour interagir avec des API externes (ex: vérification de l'état des connexions).
        - **`common`**: Fonctions et constantes partagées.
        - **`crypto`**: Fonctions de cryptographie (non utilisées dans l'extrait de code).
        - **`hooks`**: Hooks React personnalisés, regroupés.
        - **`modules`**:
            - **`llm`**: Gestion des modèles de langage (LLM), y compris les fournisseurs (OpenAI, Anthropic, etc.).
        - **`persistence`**: Fonctions de persistance des données (ex: IndexedDB, localStorage).
        - **`runtime`**: Fonctions liées à l'exécution du code (ex: analyse des messages).
        - **`stores`**: Stores Nanostores pour la gestion de l'état global.
        - **`utils`**: Fonctions utilitaires diverses.
        - **`webcontainer`**: Fonctions liées à l'intégration de WebContainer.
    - **`routes`**: Définition des routes de l'application Remix.
    - **`styles`**: Feuilles de style globales et spécifiques aux composants.
    - **`types`**: Définitions de types TypeScript.
    - **`utils`**: Fonctions utilitaires diverses.

## Composants Clés

### 1. `components/@settings`

Ce répertoire contient tous les composants liés au panneau de paramètres de l'application.

- **`core`**:
    - **`AvatarDropdown.tsx`**: Menu déroulant pour la gestion du profil utilisateur.
    - **`constants.ts`**: Constantes pour les icônes, labels, descriptions et configuration par défaut des onglets.
    - **`ControlPanel.tsx`**: Le panneau de contrôle principal, qui gère l'affichage des différents onglets de paramètres.
    - **`CustomPromptSettings.tsx`**: Interface pour personnaliser les instructions système.
    - **`types.ts`**: Définitions de types pour les paramètres.
- **`index.ts`**: Exporte les composants et utilitaires principaux du répertoire `@settings`.
- **`shared/components`**: Composants réutilisables utilisés dans les différents onglets.
    - **`DraggableTabList.tsx`**: Liste d'onglets réorganisables par glisser-déposer.
    - **`TabManagement.tsx`**: Interface pour gérer la visibilité et l'ordre des onglets.
    - **`TabTile.tsx`**: Composant pour afficher une tuile d'onglet individuel.
- **`tabs`**: Composants pour chaque onglet du panneau de paramètres.
    - **`connections`**: Gestion des connexions à des services externes (GitHub, Netlify).
        - **`components`**: Sous-composants pour la gestion des connexions (formulaires, dialogues, etc.).
        - **`types`**: Types spécifiques à GitHub.
    - **`data`**: Gestion des données de l'application (export, import, suppression).
    - **`debug`**: Outils de débogage et informations système.
    - **`event-logs`**: Affichage des journaux d'événements.
    - **`features`**: Gestion des fonctionnalités expérimentales.
    - **`notifications`**: Gestion des notifications.
    - **`profile`**: Gestion du profil utilisateur.
    - **`providers`**: Configuration des fournisseurs de modèles de langage (cloud et local).
    - **`settings`**: Paramètres généraux de l'application.
    - **`sync`**: Paramètres de synchronisation des fichiers.
    - **`task-manager`**: Gestionnaire de tâches (expérimental).
    - **`update`**: Gestion des mises à jour de l'application.
- **`utils`**: Fonctions utilitaires pour la gestion des onglets (ex: réorganisation, réinitialisation).

### 2. `components/chat`

Ce répertoire contient les composants liés à l'interface de chat et à l'interaction avec l'IA.

- **`APIKeyManager.tsx`**: Gère les clés API pour les différents fournisseurs.
- **`Artifact.tsx`**: Affiche les artefacts générés par l'IA (fichiers, commandes shell, etc.).
- **`AssistantMessage.tsx`**: Affiche un message de l'assistant (IA).
- **`BaseChat.tsx`**: Composant de base pour le chat, incluant la zone de saisie et la liste des messages.
- **`Chat.client.tsx`**: Point d'entrée du chat côté client.
- **`ChatAlert.tsx`**: Affiche une alerte dans le chat (ex: erreur de preview).
- **`chatExportAndImport`**:  Gestion de l'export et import de l'historique des chats.
- **`CodeBlock.tsx`**: Affiche un bloc de code avec coloration syntaxique.
- **`Markdown.tsx`**: Affiche du texte Markdown.
- **`Messages.client.tsx`**: Gère l'affichage de la liste des messages (utilisateur et assistant).
- **`ModelSelector.tsx`**: Permet de sélectionner le modèle de langage à utiliser.
- **`SendButton.client.tsx`**: Bouton d'envoi du message.
- **`SpeechRecognition.tsx`**: Composant pour la reconnaissance vocale (expérimental).

### 3. `components/editor`

Ce répertoire contient les composants de l'éditeur de code.

- **`codemirror`**:
    - **`BinaryContent.tsx`**: Affiche un message pour les fichiers binaires.
    - **`cm-theme.ts`**: Configuration du thème CodeMirror.
    - **`CodeMirrorEditor.tsx`**: L'éditeur de code principal, basé sur CodeMirror.
    - **`indent.ts`**: Configuration de l'indentation.
    - **`languages.ts`**: Configuration des langages supportés.

### 4. `components/workbench`

- **`DiffView.tsx`**: Affiche les différences entre deux versions d'un fichier.
- **`EditorPanel.tsx`**: Le panneau de l'éditeur, qui contient l'éditeur de code et la gestion des fichiers.
- **`FileBreadcrumb.tsx`**: Affiche un fil d'Ariane pour le fichier sélectionné.
- **`FileTree.tsx`**: Affiche l'arborescence des fichiers du projet.
- **`Preview.tsx`**: Affiche l'aperçu en direct de l'application.
- **`TargetFileButton.tsx`**: Button for file targeting in chat.
- **`DependenciesPanel.tsx`**: Gestion et visualisation des dépendances du projet (extrait du package.json).
- **`terminal`**:
    - **`Terminal.tsx`**: Le composant de terminal, basé sur xterm.js.
    - **`TerminalTabs.tsx`**: Gère les onglets du terminal.
    - **`theme.ts`**: Configuration du thème du terminal.
- **`Workbench.client.tsx`**: Le composant principal de l'espace de travail, qui gère la disposition et l'interaction entre les différents panneaux (éditeur, terminal, aperçu).

### 5. `lib`

- **`api`**:
  - `connection.ts`: Vérifie la connectivité réseau.
  - `cookies.ts`: Fonctions utilitaires pour parser les cookies (notamment les clés API et les paramètres des fournisseurs).
  - `debug.ts`: Fonctions pour le débogage (vérification de l'utilisation de la mémoire, etc.).
  - `features.ts`: Gestion des fonctionnalités expérimentales (non implémenté dans l'extrait).
  - `notifications.ts`: Gestion des notifications (lecture, marquage comme lu, etc.).
  - `updates.ts`: Vérification des mises à jour de l'application.
- **`modules/llm`**:
  - `base-provider.ts`: Définit une classe abstraite pour les fournisseurs de modèles de langage.
  - `manager.ts`: Gère les différents fournisseurs de modèles de langage.
  - `providers`: Implémentation des différents fournisseurs (OpenAI, Anthropic, etc.).
  - `registry.ts`: Enregistre les différents fournisseurs.
  - `types.ts`: Types pour les modèles de langage.
- **`persistence`**:
  - `ChatDescription.client.tsx`: Gère la description du chat (affichage et édition).
  - `db.ts`: Fonctions pour interagir avec la base de données IndexedDB (stockage de l'historique des chats).
  - `index.ts`: Exporte les fonctions de persistance.
  - `localStorage.ts`: Fonctions pour interagir avec le stockage local du navigateur.
  - `project-folders.ts`: Gestion des dossiers de projet (pour la synchronisation).
  - `sync-folder.ts`: Gestion du dossier de synchronisation.
  - `types.ts`: Types pour la persistance.
  - `useChatHistory.ts`: Hook pour gérer l'historique des chats.
- **`runtime`**:
  - `action-runner.ts`: Exécute les actions définies dans les artefacts (commandes shell, écriture de fichiers, etc.).
  - `message-parser.ts`: Analyse les messages de l'IA pour extraire les artefacts et les actions.
- **`stores`**:
  - `chat.ts`: Store pour l'état du chat (ex: visibilité).
  - `editor.ts`: Store pour l'état de l'éditeur (documents, fichier sélectionné, etc.).
  - `files.ts`: Store pour la gestion des fichiers (contenu, état binaire, etc.).
  - `logs.ts`: Store pour les logs.
  - `previews.ts`: Store pour la gestion des aperçus.
  - `profile.ts`: Store pour le profil de l'utilisateur.
  - `settings.ts`: Store pour les paramètres de l'application (thème, langue, notifications, etc.).
  - `sync-sidebar.ts`: Store pour la visibilité de la barre latérale de synchronisation.
  - `terminal.ts`: Store pour la gestion du terminal (processus shell, etc.).
  - `theme.ts`: Store pour le thème de l'application (clair/sombre).
  - `workbench.ts`: Store pour l'état de l'espace de travail (vue sélectionnée, visibilité des panneaux, etc.).
- **`utils`**:
    - `clipboard.ts`:  Fonction pour copier du texte dans le presse-papiers.
    - `cn.ts`, `classNames.ts`: Utilitaires pour la gestion des noms de classe CSS.
    - `constants.ts`: Constantes globales (ex: répertoire de travail, expressions régulières).
    - `debounce.ts`: Implémentation de la fonction `debounce`.
    - `diff.ts`: Fonctions pour calculer et afficher les différences entre les fichiers.
    - `documentUtils.ts`: Fonctions pour extraire du texte des PDF et DOCX.
    - `easings.ts`: Fonctions d'easing pour les animations.
    - `fileUtils.ts`: Fonctions utilitaires pour la gestion des fichiers (vérification du type, taille, etc.).
    - `formatSize.ts`: Formate une taille de fichier en unités lisibles.
    - `getLanguageFromExtension.ts`: Détermine le langage de programmation à partir de l'extension du fichier.
    - `logger.ts`: Implémentation d'un logger personnalisé.
    - `markdown.ts`: Configuration de la génération de Markdown (plugins, éléments HTML autorisés, etc.).
    - `mergeRefs.ts`: Utilitaires pour fusionner plusieurs refs React.
    - `os.ts`: Détection de l'OS (utile pour les raccourcis clavier).
    - `path.ts`: Fonctions pour la manipulation des chemins de fichiers (compatibles avec le navigateur).
    - `projectCommands.ts`: Détection et création de commandes de projet (ex: `npm install`, `npm run dev`).
    - `promises.ts`: Utilitaires pour les promesses.
    - `react.ts`: Fonctions utilitaires pour React (ex: `genericMemo`).
    - `sampler.ts`: Utilitaires pour les appels de fonction.
    - `stripIndent.ts`: Supprime les indentations inutiles des chaînes de caractères.
    - `unreachable.ts`: Fonction pour signaler les cas inatteignables.
- **`webcontainer`**:
    - `index.ts`: Initialisation du WebContainer.

## Technologies

- **Framework**: Remix
- **Langage**: TypeScript
- **Interface utilisateur**: React, CodeMirror (éditeur), xterm.js (terminal)
- **Gestion de l'état**: Nanostores
- **Persistance**: IndexedDB, localStorage, cookies
- **Styling**: SCSS, Tailwind CSS
- **Animations**: Framer Motion
- **Gestion des listes et tableaux**: Radix UI
- **Gestion du drag and drop** : react-dnd
- **Gestion du thème** : use-context-selector
- **Intégration Git**: isomorphic-git
- **Format de diff**: jsdiff
- **Génération de PDF**: jsPDF
- **Gestion asynchrone des messages** : message-parser.ts (custom)
- **Fournisseurs LLM**: Multiples (OpenAI, Anthropic, Google, etc.)
- **Utilitaires**: classnames, date-fns, lodash, nanoid, etc.

## Conclusion

NeuroCode est une plateforme de développement web ambitieuse qui tire parti de l'IA pour améliorer l'expérience de développement. Sa structure modulaire et l'utilisation de technologies modernes en font un outil puissant et flexible.
`;
