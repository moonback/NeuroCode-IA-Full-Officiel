import type { ActionAlert } from '~/types/actions';

type ErrorPattern = {
  pattern: RegExp;
  documentation: {
    title: string;
    url: string;
    description?: string;
  }[];
};

const errorPatterns: ErrorPattern[] = [
  {
    pattern: /Module not found|Cannot find module/i,
    documentation: [
      {
        title: 'Guide d\'installation des dépendances',
        url: 'https://docs.npmjs.com/cli/v8/commands/npm-install',
        description: 'Comment installer et gérer les dépendances npm'
      },
      {
        title: 'Résolution des problèmes de modules manquants',
        url: 'https://nodejs.org/en/learn/getting-started/troubleshooting-dependencies',
        description: 'Guide de dépannage pour les modules Node.js manquants'
      }
    ]
  },
  {
    pattern: /TypeError|ReferenceError|SyntaxError/i,
    documentation: [
      {
        title: 'Guide JavaScript MDN',
        url: 'https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Errors',
        description: 'Documentation complète sur les erreurs JavaScript courantes'
      }
    ]
  },
  {
    pattern: /ENOENT|no such file or directory/i,
    documentation: [
      {
        title: 'Gestion des fichiers Node.js',
        url: 'https://nodejs.org/api/fs.html',
        description: 'Documentation sur la manipulation des fichiers en Node.js'
      }
    ]
  },
  {
    pattern: /Failed to compile|Build failed/i,
    documentation: [
      {
        title: 'Guide de débogage des erreurs de compilation',
        url: 'https://vitejs.dev/guide/troubleshooting.html',
        description: 'Solutions aux problèmes courants de compilation'
      }
    ]
  }
];

export function findRelevantDocumentation(alert: ActionAlert) {
  const { description = '', content = '' } = alert;
  const errorText = `${description} ${content}`;

  const relevantDocs = errorPatterns
    .filter(pattern => pattern.pattern.test(errorText))
    .flatMap(pattern => pattern.documentation);

  return relevantDocs.length > 0 ? relevantDocs : undefined;
}