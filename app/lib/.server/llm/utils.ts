import { type Message } from 'ai';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, MODEL_REGEX, PROVIDER_REGEX } from '~/utils/constants';
import { IGNORE_PATTERNS, type FileMap } from './constants';
import ignore from 'ignore';
import type { ContextAnnotation } from '~/types/context';

export function extractPropertiesFromMessage(message: Omit<Message, 'id'>): {
  model: string;
  provider: string;
  content: string;
} {
  const textContent = Array.isArray(message.content)
    ? message.content.find((item) => item.type === 'text')?.text || ''
    : message.content;

  const modelMatch = textContent.match(MODEL_REGEX);
  const providerMatch = textContent.match(PROVIDER_REGEX);

  /*
   * Extract model
   * const modelMatch = message.content.match(MODEL_REGEX);
   */
  const model = modelMatch ? modelMatch[1] : DEFAULT_MODEL;

  /*
   * Extract provider
   * const providerMatch = message.content.match(PROVIDER_REGEX);
   */
  const provider = providerMatch ? providerMatch[1] : DEFAULT_PROVIDER.name;

  const cleanedContent = Array.isArray(message.content)
    ? message.content.map((item) => {
        if (item.type === 'text') {
          return {
            type: 'text',
            text: item.text?.replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, ''),
          };
        }

        return item; // Preserve image_url and other types as is
      })
    : textContent.replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, '');

  return { model, provider, content: cleanedContent };
}

export function simplifyBoltActions(input: string): string {
  // Using regex to match boltAction tags that have type="file"
  const regex = /(<boltAction[^>]*type="file"[^>]*>)([\s\S]*?)(<\/boltAction>)/g;

  // Replace each matching occurrence
  return input.replace(regex, (_0, openingTag, _2, closingTag) => {
    return `${openingTag}\n          ...\n        ${closingTag}`;
  });
}
export function simplifyBundledArtifacts(input: string): string {
  // Using regex to match buldled boltArtifact tags
  const regex = /(<boltArtifact[^>]*type="bundled"[^>]*>)([\s\S]*?)(<\/boltArtifact>)/g;

  // Replace each matching occurrence
  return input.replace(regex, (_0, _1, _2, _3) => {
    return `[[Imported Code Files]]`;
  });
}
export function createFilesContext(files: FileMap, useRelativePath?: boolean) {
  const ig = ignore().add(IGNORE_PATTERNS);
  let filePaths = Object.keys(files);
  filePaths = filePaths.filter((x) => {
    const relPath = x.replace('/home/project/', '');
    return !ig.ignores(relPath);
  });

  // Group files by type with priority levels
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

  // Helper function to determine file priority
  const getFilePriority = (path: string): 'high' | 'medium' | 'low' => {
    // High priority files - Core application files
    if (path.includes('main') || 
        path.includes('index') || 
        path.includes('app') ||
        path.includes('core') ||
        path.includes('utils') ||
        path.includes('entry') ||
        path.includes('bootstrap') ||
        path.includes('config') ||
        path.includes('setup')) {
      return 'high';
    }
    
    // Medium priority files - Feature and component files
    if (path.includes('components') || 
        path.includes('services') || 
        path.includes('models') ||
        path.includes('types') ||
        path.includes('hooks') ||
        path.includes('context') ||
        path.includes('providers') ||
        path.includes('layouts') ||
        path.includes('pages')) {
      return 'medium';
    }
    
    // Low priority files - Supporting files
    return 'low';
  };

  // Helper function to analyze file dependencies
  const analyzeFileDependencies = (content: string): string[] => {
    const dependencies: string[] = [];
    
    // Look for import statements
    const importMatches = content.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      importMatches.forEach(match => {
        const importPath = match.match(/['"]([^'"]+)['"]/)?.[1];
        if (importPath) {
          dependencies.push(importPath);
        }
      });
    }
    
    // Look for require statements
    const requireMatches = content.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
    if (requireMatches) {
      requireMatches.forEach(match => {
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
      dependencies: analyzeFileDependencies(content)
    };
  };

  // Categorize files
  filePaths.forEach(path => {
    const dirent = files[path];
    if (!dirent || dirent.type === 'folder') return;

    const relativePath = useRelativePath ? path.replace('/home/project/', '') : path;
    const priority = getFilePriority(relativePath);
    
    if (path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.js') || path.endsWith('.jsx')) {
      if (path.includes('test') || path.includes('spec')) {
        fileGroups.testFiles[priority].push(relativePath);
      } else {
        fileGroups.sourceFiles[priority].push(relativePath);
      }
    } else if (path.includes('config') || path.endsWith('.json') || path.endsWith('.yaml')) {
      fileGroups.configFiles[priority].push(relativePath);
    } else if (path.endsWith('.md') || path.includes('docs')) {
      fileGroups.documentation[priority].push(relativePath);
    } else {
      fileGroups.other[priority].push(relativePath);
    }
  });

  // Create context with sections
  let context = '<boltArtifact id="code-content" title="Code Content">\n';

  // Helper function to safely get file content with line numbers and metadata
  const getFileContent = (path: string): { content: string; metadata: any } | null => {
    const dirent = files[path];
    if (!dirent || dirent.type !== 'file') return null;
    
    const content = dirent.content;
    const metadata = getFileMetadata(path, content);
    
    const formattedContent = content
      .split('\n')
      .map((line, index) => `${String(index + 1).padStart(4, ' ')} | ${line}`)
      .join('\n');
    
    return { content: formattedContent, metadata };
  };

  // Helper function to create section with priorities and metadata
  const createSection = (title: string, files: { high: string[], medium: string[], low: string[] }) => {
    if (files.high.length === 0 && files.medium.length === 0 && files.low.length === 0) return '';

    let section = `<section title="${title}">\n`;
    
    const addPrioritySubsection = (priority: 'high' | 'medium' | 'low', title: string) => {
      if (files[priority].length > 0) {
        section += `<subsection title="${title}">\n`;
        files[priority].forEach(path => {
          const fileInfo = getFileContent(path);
          if (fileInfo) {
            const { content, metadata } = fileInfo;
            section += `<boltAction type="file" filePath="${path}">
  <metadata>
    <lineCount>${metadata.lineCount}</lineCount>
    <type>${metadata.hasTypes ? 'TypeScript' : 'JavaScript'}</type>
    <components>${metadata.hasComponents ? 'Yes' : 'No'}</components>
    <hooks>${metadata.hasHooks ? 'Yes' : 'No'}</hooks>
    <styles>${metadata.hasStyles ? 'Yes' : 'No'}</styles>
    <dependencies>${metadata.dependencies.length}</dependencies>
  </metadata>
  <content>
${content}
  </content>
</boltAction>\n`;
          }
        });
        section += '</subsection>\n';
      }
    };

    addPrioritySubsection('high', 'High Priority');
    addPrioritySubsection('medium', 'Medium Priority');
    addPrioritySubsection('low', 'Low Priority');

    section += '</section>\n';
    return section;
  };

  // Add sections with priorities
  context += createSection('Source Files', fileGroups.sourceFiles);
  context += createSection('Configuration Files', fileGroups.configFiles);
  context += createSection('Test Files', fileGroups.testFiles);
  context += createSection('Documentation', fileGroups.documentation);
  context += createSection('Other Files', fileGroups.other);

  // Add file statistics
  const totalFiles = Object.values(fileGroups).reduce((acc, group) => 
    acc + group.high.length + group.medium.length + group.low.length, 0);
  context += `<section title="Statistics">
  <totalFiles>${totalFiles}</totalFiles>
  <fileTypes>
    <sourceFiles>${Object.values(fileGroups.sourceFiles).reduce((a, b) => a + b.length, 0)}</sourceFiles>
    <configFiles>${Object.values(fileGroups.configFiles).reduce((a, b) => a + b.length, 0)}</configFiles>
    <testFiles>${Object.values(fileGroups.testFiles).reduce((a, b) => a + b.length, 0)}</testFiles>
    <documentation>${Object.values(fileGroups.documentation).reduce((a, b) => a + b.length, 0)}</documentation>
    <other>${Object.values(fileGroups.other).reduce((a, b) => a + b.length, 0)}</other>
  </fileTypes>
</section>\n`;

  context += '</boltArtifact>';
  return context;
}

export function extractCurrentContext(messages: Message[]) {
  const lastAssistantMessage = messages.filter((x) => x.role == 'assistant').slice(-1)[0];

  if (!lastAssistantMessage) {
    return { summary: undefined, codeContext: undefined };
  }

  let summary: ContextAnnotation | undefined;
  let codeContext: ContextAnnotation | undefined;

  if (!lastAssistantMessage.annotations?.length) {
    return { summary: undefined, codeContext: undefined };
  }

  for (let i = 0; i < lastAssistantMessage.annotations.length; i++) {
    const annotation = lastAssistantMessage.annotations[i];

    if (!annotation || typeof annotation !== 'object') {
      continue;
    }

    if (!(annotation as any).type) {
      continue;
    }

    const annotationObject = annotation as any;

    if (annotationObject.type === 'codeContext') {
      codeContext = annotationObject;
      break;
    } else if (annotationObject.type === 'chatSummary') {
      summary = annotationObject;
      break;
    }
  }

  return { summary, codeContext };
}
