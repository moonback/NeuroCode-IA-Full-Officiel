import { generateText, type CoreTool, type GenerateTextResult, type Message } from 'ai';
import ignore from 'ignore';
import type { IProviderSetting } from '~/types/model';
import { IGNORE_PATTERNS, type FileMap } from './constants';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, PROVIDER_LIST } from '~/utils/constants';
import { createFilesContext, extractCurrentContext, extractPropertiesFromMessage, simplifyBoltActions } from './utils';
import { createScopedLogger } from '~/utils/logger';
import { LLMManager } from '~/lib/modules/llm/manager';

// Common patterns to ignore, similar to .gitignore

const ig = ignore().add(IGNORE_PATTERNS);
const logger = createScopedLogger('select-context');

export async function selectContext(props: {
  messages: Message[];
  env?: Env;
  apiKeys?: Record<string, string>;
  files: FileMap;
  providerSettings?: Record<string, IProviderSetting>;
  promptId?: string;
  contextOptimization?: boolean;
  summary: string;
  onFinish?: (resp: GenerateTextResult<Record<string, CoreTool<any, any>>, never>) => void;
}) {
  const { messages, env: serverEnv, apiKeys, files, providerSettings, summary, onFinish } = props;
  let currentModel = DEFAULT_MODEL;
  let currentProvider = DEFAULT_PROVIDER.name;
  const processedMessages = messages.map((message) => {
    if (message.role === 'user') {
      const { model, provider, content } = extractPropertiesFromMessage(message);
      currentModel = model;
      currentProvider = provider;

      return { ...message, content };
    } else if (message.role == 'assistant') {
      let content = message.content;

      content = simplifyBoltActions(content);

      content = content.replace(/<div class=\\"__boltThought__\\">.*?<\/div>/s, '');
      content = content.replace(/<think>.*?<\/think>/s, '');

      return { ...message, content };
    }

    return message;
  });

  const provider = PROVIDER_LIST.find((p) => p.name === currentProvider) || DEFAULT_PROVIDER;
  const staticModels = LLMManager.getInstance().getStaticModelListFromProvider(provider);
  let modelDetails = staticModels.find((m) => m.name === currentModel);

  if (!modelDetails) {
    const modelsList = [
      ...(provider.staticModels || []),
      ...(await LLMManager.getInstance().getModelListFromProvider(provider, {
        apiKeys,
        providerSettings,
        serverEnv: serverEnv as any,
      })),
    ];

    if (!modelsList.length) {
      throw new Error(`Aucun modèle trouvé pour le fournisseur ${provider.name}`);
    }

    modelDetails = modelsList.find((m) => m.name === currentModel);

    if (!modelDetails) {
      // Fallback to first model
      logger.warn(
        `MODÈLE [${currentModel}] introuvable chez le fournisseur [${provider.name}]. Utilisation du premier modèle disponible : ${modelsList[0].name}`,
      );
      modelDetails = modelsList[0];
    }
  }

  const { codeContext } = extractCurrentContext(processedMessages);

  let filePaths = getFilePaths(files || {});
  filePaths = filePaths.filter((x) => {
    const relPath = x.replace('/home/project/', '');
    return !ig.ignores(relPath);
  });

  let context = '';
  const currrentFiles: string[] = [];
  const contextFiles: FileMap = {};

  // Group files by type and relevance with priority levels
  const fileGroups = {
    sourceFiles: {
      high: [] as string[],
      medium: [] as string[],
      low: [] as string[]
    },
    configFiles: {
      high: [] as string[],
      medium: [] as string[],
      low: [] as string[]
    },
    testFiles: {
      high: [] as string[],
      medium: [] as string[],
      low: [] as string[]
    },
    documentation: {
      high: [] as string[],
      medium: [] as string[],
      low: [] as string[]
    },
    other: {
      high: [] as string[],
      medium: [] as string[],
      low: [] as string[]
    }
  };

  // Helper function to determine file priority with more sophisticated analysis
  const getFilePriority = (path: string, relativePath: string): 'high' | 'medium' | 'low' => {
    // High priority files - Core application files
    if (relativePath.includes('main') || 
        relativePath.includes('index') || 
        relativePath.includes('app') ||
        relativePath.includes('core') ||
        relativePath.includes('utils') ||
        relativePath.includes('entry') ||
        relativePath.includes('bootstrap') ||
        relativePath.includes('config') ||
        relativePath.includes('setup')) {
      return 'high';
    }
    
    // Medium priority files - Feature and component files
    if (relativePath.includes('components') || 
        relativePath.includes('services') || 
        relativePath.includes('models') ||
        relativePath.includes('types') ||
        relativePath.includes('hooks') ||
        relativePath.includes('context') ||
        relativePath.includes('providers') ||
        relativePath.includes('layouts') ||
        relativePath.includes('pages')) {
      return 'medium';
    }
    
    // Low priority files - Supporting files
    return 'low';
  };

  // Helper function to analyze file dependencies
  const analyzeFileDependencies = (files: FileMap, path: string): string[] => {
    const dependencies: string[] = [];
    const file = files[path];
    if (!file || file.type !== 'file') return dependencies;
    
    const content = file.content;
    
    // Look for import statements
    const importMatches = content.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      importMatches.forEach((match: string) => {
        const importPath = match.match(/['"]([^'"]+)['"]/)?.[1];
        if (importPath) {
          dependencies.push(importPath);
        }
      });
    }
    
    // Look for require statements
    const requireMatches = content.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
    if (requireMatches) {
      requireMatches.forEach((match: string) => {
        const requirePath = match.match(/['"]([^'"]+)['"]/)?.[1];
        if (requirePath) {
          dependencies.push(requirePath);
        }
      });
    }
    
    return dependencies;
  };

  // Helper function to get file metadata
  const getFileMetadata = (path: string, content: string) => {
    const lines = content.split('\n');
    return {
      lineCount: lines.length,
      hasTests: path.includes('test') || path.includes('spec'),
      hasTypes: path.endsWith('.d.ts') || content.includes('interface ') || content.includes('type '),
      hasComponents: content.includes('export function') || content.includes('export const'),
      hasHooks: content.includes('use') && content.includes('export function'),
      hasStyles: content.includes('css') || content.includes('styled') || content.includes('className'),
      lastModified: new Date().toISOString(), // This should be replaced with actual file metadata
    };
  };

  if (codeContext?.type === 'codeContext') {
    const codeContextFiles: string[] = codeContext.files;
    Object.keys(files || {}).forEach((path) => {
      let relativePath = path;

      if (path.startsWith('/home/project/')) {
        relativePath = path.replace('/home/project/', '');
      }

      if (codeContextFiles.includes(relativePath)) {
        const priority = getFilePriority(path, relativePath);
        const file = files[path];
        if (!file || file.type !== 'file') return;
        
        const fileContent = file.content;
        const metadata = getFileMetadata(path, fileContent);
        const dependencies = analyzeFileDependencies(files, path);
        
        // Store additional metadata with the file
        const fileInfo = {
          path,
          priority,
          metadata,
          dependencies
        };
        
        // Categorize files based on their type and location
        if (relativePath.endsWith('.ts') || relativePath.endsWith('.tsx') || relativePath.endsWith('.js') || relativePath.endsWith('.jsx')) {
          if (metadata.hasTests) {
            fileGroups.testFiles[priority].push(path);
          } else {
            fileGroups.sourceFiles[priority].push(path);
          }
        } else if (relativePath.includes('config') || relativePath.endsWith('.json') || relativePath.endsWith('.yaml')) {
          fileGroups.configFiles[priority].push(path);
        } else if (relativePath.endsWith('.md') || relativePath.includes('docs')) {
          fileGroups.documentation[priority].push(path);
        } else {
          fileGroups.other[priority].push(path);
        }
      }
    });

    // Create a structured context with clear sections and priorities
    context = `Project Structure and Context:\n\n`;

    // Helper function to format file list with priorities and metadata
    const formatFileList = (fileGroup: { high: string[], medium: string[], low: string[] }, files: FileMap) => {
      let result = '';
      
      const formatFileInfo = (path: string) => {
        const file = files[path];
        if (!file || file.type !== 'file') return '';
        
        const content = file.content;
        const metadata = getFileMetadata(path, content);
        const dependencies = analyzeFileDependencies(files, path);
        
        return `  • ${path.replace('/home/project/', '')}
    - Lines: ${metadata.lineCount}
    - Type: ${metadata.hasTypes ? 'TypeScript' : 'JavaScript'}
    - Components: ${metadata.hasComponents ? 'Yes' : 'No'}
    - Hooks: ${metadata.hasHooks ? 'Yes' : 'No'}
    - Styles: ${metadata.hasStyles ? 'Yes' : 'No'}
    - Dependencies: ${dependencies.length} imports`;
      };

      if (fileGroup.high.length > 0) {
        result += `High Priority:\n${fileGroup.high.map(formatFileInfo).join('\n')}\n\n`;
      }
      if (fileGroup.medium.length > 0) {
        result += `Medium Priority:\n${fileGroup.medium.map(formatFileInfo).join('\n')}\n\n`;
      }
      if (fileGroup.low.length > 0) {
        result += `Low Priority:\n${fileGroup.low.map(formatFileInfo).join('\n')}\n\n`;
      }
      return result;
    };

    // Add source files section with priorities
    if (fileGroups.sourceFiles.high.length > 0 || fileGroups.sourceFiles.medium.length > 0 || fileGroups.sourceFiles.low.length > 0) {
      context += `Source Files:\n${formatFileList(fileGroups.sourceFiles, files)}\n`;
    }

    // Add configuration section with priorities
    if (fileGroups.configFiles.high.length > 0 || fileGroups.configFiles.medium.length > 0 || fileGroups.configFiles.low.length > 0) {
      context += `Configuration Files:\n${formatFileList(fileGroups.configFiles, files)}\n`;
    }

    // Add test files section with priorities
    if (fileGroups.testFiles.high.length > 0 || fileGroups.testFiles.medium.length > 0 || fileGroups.testFiles.low.length > 0) {
      context += `Test Files:\n${formatFileList(fileGroups.testFiles, files)}\n`;
    }

    // Add documentation section with priorities
    if (fileGroups.documentation.high.length > 0 || fileGroups.documentation.medium.length > 0 || fileGroups.documentation.low.length > 0) {
      context += `Documentation:\n${formatFileList(fileGroups.documentation, files)}\n`;
    }

    // Add other relevant files with priorities
    if (fileGroups.other.high.length > 0 || fileGroups.other.medium.length > 0 || fileGroups.other.low.length > 0) {
      context += `Other Relevant Files:\n${formatFileList(fileGroups.other, files)}\n`;
    }

    // Add project summary if available
    if (summary) {
      context += `\nProject Summary:\n${summary}\n`;
    }

    // Add file statistics
    const totalFiles = Object.values(fileGroups).reduce((acc, group) => 
      acc + group.high.length + group.medium.length + group.low.length, 0);
    context += `\nTotal Files in Context: ${totalFiles}\n`;
  }

  const summaryText = `Voici le résumé de la conversation jusqu'à présent: ${summary}`;

  const extractTextContent = (message: Message) =>
    Array.isArray(message.content)
      ? (message.content.find((item) => item.type === 'text')?.text as string) || ''
      : message.content;

  const lastUserMessage = processedMessages.filter((x) => x.role == 'user').pop();

  if (!lastUserMessage) {
    throw new Error('Aucun message utilisateur trouvé');
  }

  // select files from the list of code file from the project that might be useful for the current request from the user
  const resp = await generateText({
    system: `
        You are a software engineer. You are working on a project. You have access to the following files:

        AVAILABLE FILES PATHS
        ---
        ${filePaths.map((path) => `- ${path}`).join('\n')}
        ---

        You have following code loaded in the context buffer that you can refer to:

        CURRENT CONTEXT BUFFER
        ---
        ${context}
        ---

        Now, you are given a task. You need to select the files that are relevant to the task from the list of files above.

        RESPONSE FORMAT:
        your response should be in following format:
---
<updateContextBuffer>
    <includeFile path="path/to/file"/>
    <excludeFile path="path/to/file"/>
</updateContextBuffer>
---
        * Your should start with <updateContextBuffer> and end with </updateContextBuffer>.
        * You can include multiple <includeFile> and <excludeFile> tags in the response.
        * You should not include any other text in the response.
        * You should not include any file that is not in the list of files above.
        * You should not include any file that is already in the context buffer.
        * If no changes are needed, you can leave the response empty updateContextBuffer tag.
        `,
    prompt: `
        ${summaryText}

        Users Question: ${extractTextContent(lastUserMessage)}

        update the context buffer with the files that are relevant to the task from the list of files above.

        CRITICAL RULES:
        * Only include relevant files in the context buffer.
        * context buffer should not include any file that is not in the list of files above.
        * context buffer is extremlly expensive, so only include files that are absolutely necessary.
        * If no changes are needed, you can leave the response empty updateContextBuffer tag.
        * Only 5 files can be placed in the context buffer at a time.
        * if the buffer is full, you need to exclude files that is not needed and include files that is relevent.

        `,
    model: provider.getModelInstance({
      model: currentModel,
      serverEnv,
      apiKeys,
      providerSettings,
    }),
  });

  const response = resp.text;
  const updateContextBuffer = response.match(/<updateContextBuffer>([\s\S]*?)<\/updateContextBuffer>/);

  if (!updateContextBuffer) {
    throw new Error('Format de réponse invalide. Veuillez suivre le format de réponse');
  }

  const includeFiles =
    updateContextBuffer[1]
      .match(/<includeFile path="(.*?)"/gm)
      ?.map((x) => x.replace('<includeFile path="', '').replace('"', '')) || [];
  const excludeFiles =
    updateContextBuffer[1]
      .match(/<excludeFile path="(.*?)"/gm)
      ?.map((x) => x.replace('<excludeFile path="', '').replace('"', '')) || [];

  const filteredFiles: FileMap = {};
  excludeFiles.forEach((path) => {
    delete contextFiles[path];
  });
  includeFiles.forEach((path) => {
    let fullPath = path;

    if (!path.startsWith('/home/project/')) {
      fullPath = `/home/project/${path}`;
    }

    if (!filePaths.includes(fullPath)) {
      logger.warn(`Le fichier ${path} n'est pas dans la liste des fichiers disponibles.`);
      return;    }

    if (currrentFiles.includes(path)) {
      return;
    }

    filteredFiles[path] = files[fullPath];
  });

  if (onFinish) {
    onFinish(resp);
  }

  return filteredFiles;

  // generateText({
}

export function getFilePaths(files: FileMap) {
  let filePaths = Object.keys(files);
  filePaths = filePaths.filter((x) => {
    const relPath = x.replace('/home/project/', '');
    return !ig.ignores(relPath);
  });

  return filePaths;
}
