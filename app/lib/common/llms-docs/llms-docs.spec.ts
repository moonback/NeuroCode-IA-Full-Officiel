import { describe, expect, it } from 'vitest';
import {
  getDocumentById,
  getDocumentContentById,
  listAvailableDocuments,
  enhancePromptWithLibrary,
  autoEnhancePrompt,
  detectLibraryInHistory,
  enhancePromptFromHistory,
} from './index';

describe('llms-docs', () => {
  it('should list available documents', () => {
    const docs = listAvailableDocuments();
    expect(docs).toBeInstanceOf(Array);
    expect(docs.length).toBeGreaterThan(0);
    expect(docs).toContain('fireproof');
    expect(docs).toContain('openrouter');
  });

  it('should get document by ID', () => {
    const doc = getDocumentById('fireproof');
    expect(doc).toBeDefined();
    expect(doc?.id).toBe('fireproof');
    expect(doc?.name).toBe('Fireproof Database');
    expect(doc?.content).toBeDefined();
    expect(typeof doc?.content).toBe('string');
  });

  it('should get document content by ID', () => {
    const content = getDocumentContentById('fireproof');
    expect(content).toBeDefined();
    expect(typeof content).toBe('string');
    expect(content).toContain('Fireproof Database API');
  });

  it('should return undefined for non-existent document', () => {
    const doc = getDocumentById('non-existent');
    expect(doc).toBeUndefined();

    const content = getDocumentContentById('non-existent');
    expect(content).toBeUndefined();
  });

  it('should enhance prompt with specific library documentation', () => {
    const originalPrompt = 'Create a todo app';
    const enhancedPrompt = enhancePromptWithLibrary(originalPrompt, 'fireproof');

    expect(enhancedPrompt).toContain('I want to use the Fireproof Database in my project');
    expect(enhancedPrompt).toContain('API documentation');
    expect(enhancedPrompt).toContain('Fireproof Database API');
    expect(enhancedPrompt).toContain(`Now, with that in mind, please help me with: ${originalPrompt}`);
  });

  it('should not modify prompt when library does not exist', () => {
    const originalPrompt = 'Create a todo app';
    const enhancedPrompt = enhancePromptWithLibrary(originalPrompt, 'non-existent-lib');

    expect(enhancedPrompt).toBe(originalPrompt);
  });

  it('should automatically enhance prompt when library is mentioned', () => {
    const promptWithLibrary = 'Create a todo app using fireproof for storage';
    const enhancedPrompt = autoEnhancePrompt(promptWithLibrary);

    expect(enhancedPrompt).toContain('I want to use the Fireproof Database in my project');
    expect(enhancedPrompt).toContain('API documentation');
  });

  it('should not modify prompt when no library is mentioned', () => {
    const promptWithoutLibrary = 'Create a todo app using local storage';
    const enhancedPrompt = autoEnhancePrompt(promptWithoutLibrary);

    expect(enhancedPrompt).toBe(promptWithoutLibrary);
  });

  it('should detect library mentioned in chat history', () => {
    const chatHistory = [
      { content: 'Hello' },
      { content: 'Create a todo app' },
      { content: 'Can I use fireproof for this?' },
    ];

    const libraryIds = detectLibraryInHistory(chatHistory);
    expect(libraryIds).toBeInstanceOf(Array);
    expect(libraryIds).toContain('fireproof');
    expect(libraryIds.length).toBe(1);
  });

  it('should detect multiple libraries mentioned in chat history', () => {
    /* Test with multiple different libraries in the chat history */
    const chatHistory = [
      { content: 'Hello' },
      { content: 'Can I use fireproof for this todo app?' },
      { content: 'Or maybe I should use openrouter to connect to Claude?' },
    ];

    const libraryIds = detectLibraryInHistory(chatHistory);
    expect(libraryIds).toBeInstanceOf(Array);
    expect(libraryIds).toContain('fireproof');
    expect(libraryIds).toContain('openrouter');
    expect(libraryIds.length).toBe(2);
  });

  it('should enhance prompt using library from chat history', () => {
    const currentPrompt = 'Add a feature to save todos';
    const chatHistory = [
      { content: 'Hello' },
      { content: 'Create a todo app with fireproof' },
      { content: 'Show me how to query data' },
    ];

    const enhancedPrompt = enhancePromptFromHistory(currentPrompt, chatHistory);

    expect(enhancedPrompt).toContain('I want to use the Fireproof Database in my project');
    expect(enhancedPrompt).toContain('API documentation');
    expect(enhancedPrompt).toContain(`Now, with that in mind, please help me with: ${currentPrompt}`);
  });

  it('should use the first detected library when multiple are found in history', () => {
    const currentPrompt = 'Add a feature to save user preferences';
    const chatHistory = [
      { content: 'Hello' },
      { content: 'Can I use fireproof for storage?' },
      { content: 'And maybe openrouter for AI features?' },
    ];

    const enhancedPrompt = enhancePromptFromHistory(currentPrompt, chatHistory);

    // Should use the first library (depends on array order from Set which is insertion order)
    const libraryIds = detectLibraryInHistory(chatHistory);
    const firstLibrary = libraryIds[0];
    const firstLibraryName = getDocumentById(firstLibrary)?.name;
    expect(enhancedPrompt).toContain(`I want to use the ${firstLibraryName} in my project`);
  });

  it('should not enhance from history if current prompt already mentions library', () => {
    const currentPrompt = 'How do I use fireproof to store user preferences?';
    const chatHistory = [{ content: 'Hello' }, { content: 'What about using openrouter for AI?' }];

    const enhancedPrompt = enhancePromptFromHistory(currentPrompt, chatHistory);

    // The enhancement should come from the current prompt, not history
    expect(enhancedPrompt).toContain('I want to use the Fireproof Database in my project');
    expect(enhancedPrompt).toContain('API documentation');
    expect(enhancedPrompt).toContain(`Now, with that in mind, please help me with: ${currentPrompt}`);
  });
});