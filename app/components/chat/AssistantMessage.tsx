import { memo, useEffect, useState } from 'react';
import { Markdown } from './Markdown';
import type { JSONValue } from 'ai';
import Popover from '~/components/ui/Popover';
import { workbenchStore } from '~/lib/stores/workbench';
import { WORK_DIR } from '~/utils/constants';
import { Modal } from '../ui/Modal';
import { classNames } from '~/utils/classNames';
import { motion, AnimatePresence } from 'framer-motion';

interface AssistantMessageProps {
  content: string;
  annotations?: JSONValue[];
  isLast?: boolean;
  isStreaming?: boolean;
  onSuggestionClick?: (task: string) => void;
}

interface FileContext {
  path: string;
  type: string;
  metadata?: {
    lineCount: number;
    hasTypes: boolean;
    hasComponents: boolean;
    hasHooks: boolean;
    hasStyles: boolean;
    dependencies: number;
  };
}

function openArtifactInWorkbench(filePath: string) {
  filePath = normalizedFilePath(filePath);

  if (workbenchStore.currentView.get() !== 'code') {
    workbenchStore.currentView.set('code');
  }

  workbenchStore.setSelectedFile(`${WORK_DIR}/${filePath}`);
}

function normalizedFilePath(path: string) {
  let normalizedPath = path;

  if (normalizedPath.startsWith(WORK_DIR)) {
    normalizedPath = path.replace(WORK_DIR, '');
  }

  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.slice(1);
  }

  return normalizedPath;
}

const FileContextItem = memo(({ file }: { file: FileContext }) => {
  const normalized = normalizedFilePath(file.path);
  
  return (
    <motion.div
      className={classNames(
        "group flex items-center gap-2 p-2 rounded-lg",
        "bg-bolt-elements-background-depth-1/50",
        "hover:bg-bolt-elements-background-depth-1",
        "transition-colors cursor-pointer"
      )}
      onClick={() => openArtifactInWorkbench(normalized)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono text-bolt-elements-textPrimary truncate">
            {normalized}
          </code>
          {file.metadata && (
            <div className="flex items-center gap-1 text-xs text-bolt-elements-textTertiary">
              <span className="i-ph:lines text-xs" />
              <span>{file.metadata.lineCount}</span>
              {file.metadata.hasTypes && (
                <span className="i-ph:type text-xs" title="TypeScript" />
              )}
              {file.metadata.hasComponents && (
                <span className="i-ph:component text-xs" title="Components" />
              )}
              {file.metadata.hasHooks && (
                <span className="i-ph:hook text-xs" title="Hooks" />
              )}
              {file.metadata.hasStyles && (
                <span className="i-ph:paint-brush text-xs" title="Styles" />
              )}
              <span className="i-ph:link text-xs" title={`${file.metadata.dependencies} dependencies`} />
            </div>
          )}
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="i-ph:arrow-right text-bolt-elements-textTertiary" />
      </div>
    </motion.div>
  );
});

const ContextSection = memo(({ title, files }: { title: string; files: FileContext[] }) => {
  if (!files.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-bolt-elements-textSecondary px-2">
        {title}
      </h3>
      <div className="space-y-1">
        {files.map((file) => (
          <FileContextItem key={file.path} file={file} />
        ))}
      </div>
    </div>
  );
});

export const AssistantMessage = memo(
  ({ content, annotations, isLast, isStreaming, onSuggestionClick }: AssistantMessageProps) => {
    const [summary, setSummary] = useState<string | undefined>(undefined);
    const [pendingTasks, setPendingTasks] = useState<string[]>([]);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [contextFiles, setContextFiles] = useState<FileContext[]>([]);

    useEffect(() => {
      if (!isStreaming && isLast) {
        let tokens = summary?.split('**Pending**:') || [];

        if (tokens.length <= 1) {
          return;
        }

        tokens = tokens[1].split('**Technical Constraints**:') || [];

        if (tokens.length <= 1) {
          return;
        }

        let tasks = tokens[0].split('\n');
        tasks = tasks.map((x) => {
          x = x.trim();
          if (x.startsWith('-')) {
            x = x.slice(1);
            x.trim();
          }
          return x;
        });
        tasks = tasks.filter((x) => x.length > 3 && x.length < 250);
        setPendingTasks(tasks);
      }
    }, [isStreaming, isLast, summary]);

    const filteredAnnotations = (annotations?.filter(
      (annotation: JSONValue) =>
        annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
    ) || []) as { type: string; value: any } & { [key: string]: any }[];

    let chatSummary: string | undefined = undefined;

    if (filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')) {
      chatSummary = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')?.summary;

      if (chatSummary && !summary) {
        setSummary(chatSummary);
      }
    }

    // Process code context
    useEffect(() => {
      const codeContext = filteredAnnotations.find((annotation) => annotation.type === 'codeContext');
      if (codeContext?.files) {
        const files = codeContext.files.map((path: string) => {
          const normalized = normalizedFilePath(path);
          return {
            path: normalized,
            type: path.endsWith('.ts') || path.endsWith('.tsx') ? 'typescript' : 'javascript',
            metadata: {
              lineCount: 0,
              hasTypes: path.endsWith('.ts') || path.endsWith('.tsx'),
              hasComponents: path.includes('components'),
              hasHooks: path.includes('hooks'),
              hasStyles: path.includes('styles') || path.includes('css'),
              dependencies: 0
            }
          };
        });
        // Only update if files have actually changed
        const filesString = JSON.stringify(files);
        const contextFilesString = JSON.stringify(contextFiles);
        if (filesString !== contextFilesString) {
          setContextFiles(files);
        }
      }
    }, [filteredAnnotations, contextFiles]);

    const usage: {
      completionTokens: number;
      promptTokens: number;
      totalTokens: number;
    } = filteredAnnotations.find((annotation) => annotation.type === 'usage')?.value;

    return (
      <div className="overflow-hidden w-full">
        <>
          <div className="flex gap-2 items-center text-sm text-bolt-elements-textSecondary mb-3">
           
            {usage && (
              <div className="flex gap-2 items-center bg-bolt-elements-background-depth-1 px-3.5 py-2 rounded-full text-xs border border-bolt-elements-borderColor/20 hover:bg-bolt-elements-background-depth-2 transition-all duration-300 shadow-sm hover:shadow-md backdrop-blur-sm">
                <div className="flex items-center gap-2 group cursor-help" title="Nombre total de tokens utilisés dans cette interaction">
                  <span className="i-ph:hash text-bolt-elements-textTertiary group-hover:text-bolt-elements-textPrimary transition-colors duration-200"></span>
                  <span className="font-semibold tracking-wider">{usage.totalTokens.toLocaleString()}</span>
                </div>
                <div className="w-[1px] h-4 bg-bolt-elements-borderColor/30 transform scale-y-90"></div>
                <div className="flex items-center gap-2 group cursor-help" title="Tokens utilisés dans la requête">
                  <span className="i-ph:arrow-up text-bolt-elements-textTertiary group-hover:text-green-400 transition-colors duration-200"></span>
                  <span className="font-semibold tracking-wider">{usage.promptTokens.toLocaleString()}</span>
                </div>
                <div className="w-[1px] h-4 bg-bolt-elements-borderColor/30 transform scale-y-90"></div>
                <div className="flex items-center gap-2 group cursor-help" title="Tokens utilisés dans la réponse">
                  <span className="i-ph:arrow-down text-bolt-elements-textTertiary group-hover:text-blue-400 transition-colors duration-200"></span>
                  <span className="font-semibold tracking-wider">{usage.completionTokens.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </>
        <div className="prose prose-sm max-w-full dark:prose-invert">
          <Markdown html>{content}</Markdown>
        </div>
        {isLast && pendingTasks.length > 0 && (
          <div className="flex flex-col gap-2 mt-4">
            <div className="text-gray-600 dark:text-gray-400 text-sm font-medium px-2 py-1">
              Actions suggérées
            </div>
            <AnimatePresence>
              {pendingTasks.map((task, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  onClick={() => onSuggestionClick?.(`let focus on the task: ${task}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSuggestionClick?.(`let focus on the task: ${task}`);
                    }
                  }}
                  className={classNames(
                    "flex gap-2 items-center",
                    "bg-green-50/50 dark:bg-green-500/10",
                    "text-white dark:text-white",
                    "hover:bg-green-100 dark:hover:bg-green-500/20",
                    "focus:ring-2 focus:ring-green-500 focus:outline-none",
                    "rounded-lg px-3 py-2 transition-all",
                    "text-sm w-full text-left",
                    "transform hover:scale-[1.02] active:scale-95"
                  )}
                  aria-label={`Exécuter la tâche : ${task}`}
                  role="button"
                  tabIndex={0}
                >
                  <span className="inline-block i-lucide:message-square h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{task}</span>
                  <span className="i-lucide:arrow-right h-4 w-4 text-green-500/50" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  },
);
