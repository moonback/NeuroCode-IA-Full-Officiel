/**
 * Utilities for accessing llms.txt documentation
 *
 * This module provides functions to access documentation in llms.txt format
 * which can be used by the AI to generate more accurate code for specific libraries.
 */

import axiosDocs from './axios.txt';
import cypressDocs from './cypress.txt';
import expressDocs from './express.txt';
import fastifyDocs from './fastify.txt';
import fireproofDocs from './fireproof.txt';
import graphqlDocs from './graphql.txt';
import jestDocs from './jest.txt';
import nextjsDocs from './nextjs.txt';
import openapiDocs from './openapi.txt';
import openrouterDocs from './openrouter.txt';
import prismaDocs from './prisma.txt';
import reactQueryDocs from './react-query.txt';
import reactRouterDomDocs from './react-router-dom.txt';
import reduxDocs from './redux.txt';
import reduxToolkitDocs from './redux-toolkit.txt';
import socketioDocs from './socketio.txt';
import tailwindDocs from './tailwind.txt';
import turboDocs from './turbo.txt';
import viteDocs from './vite.txt';
import vitestDocs from './vitest.txt';
import webpackDocs from './webpack.txt';
import zustandDocs from './zustand.txt';
import mongooseDocs from './mongoose.txt';
import nestjsDocs from './nestjs.txt';
// import sequelizeDocs from './sequelize.txt';

interface LlmsDoc {
  id: string;
  name: string;
  content: string;
  version?: string;
  priority?: number;
  categories?: string[];
}

/**
 * Available llms.txt documentation files
 */
export const availableDocuments: LlmsDoc[] = [
  {
    id: 'axios',
    name: 'Axios HTTP Client',
    content: axiosDocs,
  },
  {
    id: 'turbo',
    name: 'Turborepo Build System',
    content: turboDocs,
  },
  {
    id: 'fastify',
    name: 'Fastify Framework',
    content: fastifyDocs,
  },
  {
    id: 'graphql',
    name: 'GraphQL Query Language',
    content: graphqlDocs,
  },
  {
    id: 'mongoose',
    name: 'Mongoose ODM',
    content: mongooseDocs,
  },
  {
    id: 'nestjs',
    name: 'NestJS Framework',
    content: nestjsDocs,
  },
  // {
  //   id: 'sequelize',
  //   name: 'Sequelize ORM',
  //   content: sequelizeDocs,
  // },
  {
    id: 'webpack',
    name: 'Webpack Bundler',
    content: webpackDocs,
  },
  {
    id: 'socketio',
    name: 'Socket.IO',
    content: socketioDocs,
  },
  {
    id: 'cypress',
    name: 'Cypress Testing Framework',
    content: cypressDocs,
  },
  {
    id: 'express',
    name: 'Express.js Framework',
    content: expressDocs,
  },
  {
    id: 'fireproof',
    name: 'Fireproof Database',
    content: fireproofDocs,
  },
  {
    id: 'jest',
    name: 'Jest Testing Framework',
    content: jestDocs,
  },
  {
    id: 'nextjs',
    name: 'Next.js Framework',
    content: nextjsDocs,
  },
  {
    id: 'openapi',
    name: 'OpenAPI Specification',
    content: openapiDocs,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter API',
    content: openrouterDocs,
  },
  {
    id: 'prisma',
    name: 'Prisma ORM',
    content: prismaDocs,
  },
  {
    id: 'react-query',
    name: 'React Query',
    content: reactQueryDocs,
  },
  {
    id: 'react-router-dom',
    name: 'React Router DOM',
    content: reactRouterDomDocs,
  },
  {
    id: 'redux',
    name: 'Redux State Management',
    content: reduxDocs,
  },
  {
    id: 'redux-toolkit',
    name: 'Redux Toolkit',
    content: reduxToolkitDocs,
  },
  {
    id: 'tailwind',
    name: 'Tailwind CSS Framework',
    content: tailwindDocs,
  },
  {
    id: 'vite',
    name: 'Vite Build Tool',
    content: viteDocs,
  },
  {
    id: 'vitest',
    name: 'Vitest Testing Framework',
    content: vitestDocs,
  },
  {
    id: 'zustand',
    name: 'Zustand State Management',
    content: zustandDocs,
  },
];


/**
 * Get llms.txt documentation by ID
 */
export function getDocumentById(id: string): LlmsDoc | undefined {
  return availableDocuments.find((doc) => doc.id === id);
}

/**
 * Get llms.txt content by ID
 */
export function getDocumentContentById(id: string): string | undefined {
  return getDocumentById(id)?.content;
}

/**
 * List all available llms.txt documents
 */
export function listAvailableDocuments(): string[] {
  return availableDocuments.map((doc) => doc.id);
}

/**
 * Enhance user prompt with specific library documentation
 * This can be used to dynamically inject library documentation into the prompt
 *
 * @param userPrompt The original user prompt
 * @param libraryId The ID of the library to include documentation for
 * @returns Enhanced prompt with library documentation
 */
export function enhancePromptWithLibrary(userPrompt: string, libraryId: string): string {
  const libDoc = getDocumentById(libraryId);

  if (!libDoc) {
    return userPrompt;
  }

  return `I want to use the ${libDoc.name} in my project. 
Here is the API documentation:
"""
${libDoc.content}
"""
Now, with that in mind, please help me with: ${userPrompt}`;
}

/**
 * Detect if a library is mentioned in the prompt and enhance it
 * This automatically detects library names in the prompt and adds their documentation
 *
 * @param userPrompt The original user prompt
 * @returns Enhanced prompt with relevant library documentation
 */
export function autoEnhancePrompt(userPrompt: string): string {
  let enhancedPrompt = userPrompt;

  // Check each library to see if it's mentioned
  for (const doc of availableDocuments) {
    if (userPrompt.toLowerCase().includes(doc.id.toLowerCase())) {
      enhancedPrompt = enhancePromptWithLibrary(enhancedPrompt, doc.id);
      break; // Only enhance with one library at a time to avoid token overload
    }
  }

  return enhancedPrompt;
}

/**
 * Detect libraries mentioned in chat history
 * Returns all libraries found in the chat history
 *
 * @param messages Array of messages in the chat history
 * @returns Array of library IDs found in history
 */
export function detectLibraryInHistory(messages: Array<{ content: string | { type: string; text: string }[] }>): string[] {
  const detectedLibraries = new Set<string>();

  // Go through messages from newest to oldest
  for (const message of [...messages].reverse()) {
    // Skip non-user messages or messages without content
    if (!message.content) {
      continue;
    }

    const textContent = Array.isArray(message.content)
      ? message.content.find((item) => item.type === 'text')?.text || ''
      : message.content;

    // Check each library
    for (const doc of availableDocuments) {
      if (textContent.toLowerCase().includes(doc.id.toLowerCase())) {
        detectedLibraries.add(doc.id);
      }
    }
  }

  return Array.from(detectedLibraries);
}

/**
 * Enhance prompt with libraries from chat history
 * If the current prompt doesn't mention a library but previous messages did,
 * this will enhance the prompt with that library's documentation
 *
 * @param userPrompt The original user prompt
 * @param messages Array of messages in the chat history
 * @returns Enhanced prompt with relevant library documentation from history
 */
export function enhancePromptFromHistory(userPrompt: string, messages: Array<{ content: string }>): string {
  // First check if the current prompt already mentions a library
  let enhancedPrompt = autoEnhancePrompt(userPrompt);

  // If the prompt wasn't enhanced but there are libraries in history, use those
  if (enhancedPrompt === userPrompt) {
    const historyLibraryIds = detectLibraryInHistory(messages);

    if (historyLibraryIds.length > 0) {
      // Start with just the first detected library to avoid token overload
      enhancedPrompt = enhancePromptWithLibrary(userPrompt, historyLibraryIds[0]);
    }
  }

  return enhancedPrompt;
}


/**
 * Trie les documents par priorité et pertinence contextuelle
 * @param documents Liste des documents à trier
 * @param context Contexte du projet (optionnel)
 * @returns Documents triés par priorité
 */
export function sortDocumentsByPriority(documents: LlmsDoc[], context?: string): LlmsDoc[] {
  return [...documents].sort((a, b) => {
    // Priorité explicite d'abord
    const priorityDiff = (b.priority || 0) - (a.priority || 0);
    if (priorityDiff !== 0) return priorityDiff;

    // Si un contexte est fourni, prioriser les documents pertinents
    if (context) {
      const aRelevance = isDocumentRelevantToContext(a, context);
      const bRelevance = isDocumentRelevantToContext(b, context);
      if (aRelevance !== bRelevance) {
        return bRelevance ? 1 : -1;
      }
    }

    return a.name.localeCompare(b.name);
  });
}

/**
 * Vérifie si un document est pertinent pour un contexte donné
 */
function isDocumentRelevantToContext(doc: LlmsDoc, context: string): boolean {
  const contextLower = context.toLowerCase();
  return (
    doc.categories?.some(cat => contextLower.includes(cat.toLowerCase())) ||
    doc.name.toLowerCase().includes(contextLower) ||
    doc.id.toLowerCase().includes(contextLower)
  );
}

/**
 * Amélioration de la fonction enhancePromptWithLibrary pour supporter
 * plusieurs bibliothèques et la priorisation
 */
export function enhancePromptWithLibraries(
  userPrompt: string,
  libraryIds: string[],
  context?: string
): string {
  const docs = libraryIds
    .map(id => getDocumentById(id))
    .filter((doc): doc is LlmsDoc => doc !== undefined);

  const sortedDocs = sortDocumentsByPriority(docs, context);
  
  let enhancedPrompt = userPrompt;
  for (const doc of sortedDocs) {
    enhancedPrompt = `Je veux utiliser ${doc.name}${doc.version ? ` (version ${doc.version})` : ''} dans mon projet.
Voici la documentation de l'API :
"""
${doc.content}
"""
Maintenant, avec cela en tête, aidez-moi avec : ${enhancedPrompt}`;
  }

  return enhancedPrompt;
}
