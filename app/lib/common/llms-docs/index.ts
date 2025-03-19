/**
 * Utilities for accessing llms.txt documentation
 *
 * This module provides functions to access documentation in llms.txt format
 * which can be used by the AI to generate more accurate code for specific libraries.
 */

import fireproofDocs from './fireproof.txt';
import openrouterDocs from './openrouter.txt';
import reactQueryDocs from './react-query.txt';

interface LlmsDoc {
  id: string;
  name: string;
  content: string;
}

/**
 * Available llms.txt documentation files
 */
export const availableDocuments: LlmsDoc[] = [
  {
    id: 'fireproof',
    name: 'Fireproof Database',
    content: fireproofDocs,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter API',
    content: openrouterDocs,
  },
  {
    id: 'react-query',
    name: 'React Query',
    content: reactQueryDocs,
  },
  // Add more docs here as they are added
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
export function detectLibraryInHistory(messages: Array<{ content: string }>): string[] {
  const detectedLibraries = new Set<string>();

  // Go through messages from newest to oldest
  for (const message of [...messages].reverse()) {
    // Skip non-user messages or messages without content
    if (!message.content) {
      continue;
    }

    // Check each library
    for (const doc of availableDocuments) {
      if (message.content.toLowerCase().includes(doc.id.toLowerCase())) {
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