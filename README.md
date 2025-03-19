
```markdown
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
