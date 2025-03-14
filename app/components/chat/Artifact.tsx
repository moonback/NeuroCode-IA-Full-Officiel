import { useStore } from '@nanostores/react';
import { AnimatePresence, motion } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useEffect, useRef, useState } from 'react';
import { createHighlighter, type BundledLanguage, type BundledTheme, type HighlighterGeneric } from 'shiki';
import type { ActionState } from '~/lib/runtime/action-runner';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { WORK_DIR } from '~/utils/constants';
import { cn } from '~/utils/cn';

const highlighterOptions = {
  langs: ['shell'],
  themes: ['light-plus', 'dark-plus'],
};

const shellHighlighter: HighlighterGeneric<BundledLanguage, BundledTheme> =
  import.meta.hot?.data.shellHighlighter ?? (await createHighlighter(highlighterOptions));

if (import.meta.hot) {
  import.meta.hot.data.shellHighlighter = shellHighlighter;
}

interface ArtifactProps {
  messageId: string;
}

export const Artifact = memo(({ messageId }: ArtifactProps) => {
  const userToggledActions = useRef(false);
  const [showActions, setShowActions] = useState(false);
  const [allActionFinished, setAllActionFinished] = useState(false);

  const artifacts = useStore(workbenchStore.artifacts);
  const artifact = artifacts[messageId];

  const actions = useStore(
    computed(artifact.runner.actions, (actions) => {
      return Object.values(actions);
    }),
  );

  const completedCount = actions.filter(action => 
    action.status === 'complete' || 
    (action.type === 'start' && action.status === 'running')
  ).length;
  
  const totalCount = actions.length;

  const toggleActions = () => {
    userToggledActions.current = true;
    setShowActions(!showActions);
  };

  useEffect(() => {
    if (actions.length && !showActions && !userToggledActions.current) {
      setShowActions(true);
    }

    if (actions.length !== 0 && artifact.type === 'bundled') {
      const finished = !actions.find((action) => action.status !== 'complete');

      if (allActionFinished !== finished) {
        setAllActionFinished(finished);
      }
    }
  }, [actions]);

  return (
    <div className="artifact border border-bolt-elements-borderColor flex flex-col overflow-hidden rounded-lg w-full transition-border duration-150">
      <div className="flex">
        <button
          className="flex items-stretch bg-bolt-elements-artifacts-background hover:bg-bolt-elements-artifacts-backgroundHover w-full overflow-hidden"
          // onClick={() => {
          //   const showWorkbench = workbenchStore.showWorkbench.get();
          //   workbenchStore.showWorkbench.set(!showWorkbench);
          // }}
        >
          {artifact.type == 'bundled' && (
            <>
              <div className="p-4">
                {allActionFinished ? (
                  <div className={'i-ph:files-light'} style={{ fontSize: '2rem' }}></div>
                ) : (
                  <div className={'i-svg-spinners:90-ring-with-bg'} style={{ fontSize: '2rem' }}></div>
                )}
              </div>
              <div className="bg-bolt-elements-artifacts-borderColor w-[1px]" />
            </>
          )}
          <div className="px-5 p-3.5 w-full text-left">
            <div className="flex justify-between items-center">
              <div className="w-full text-bolt-elements-textPrimary font-medium leading-5 text-sm">
                {artifact?.title}
              </div>
              {actions.length > 0 && artifact.type !== 'bundled' && (
                <div className="flex items-center gap-2 pl-4">
                  <span className="text-xs font-medium text-bolt-elements-textSecondary">
                    {completedCount}/{totalCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        </button>
        <div className="bg-bolt-elements-artifacts-borderColor w-[1px]" />
        <AnimatePresence>
          {actions.length && artifact.type !== 'bundled' && (
            <motion.button
              initial={{ width: 0 }}
              animate={{ width: 'auto' }}
              exit={{ width: 0 }}
              transition={{ duration: 0.15, ease: cubicEasingFn }}
              className="bg-bolt-elements-artifacts-background hover:bg-bolt-elements-artifacts-backgroundHover"
              onClick={toggleActions}
            >
              <div className="p-4">
                <div className={showActions ? 'i-ph:caret-up-bold' : 'i-ph:caret-down-bold'}></div>
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {artifact.type !== 'bundled' && showActions && actions.length > 0 && (
          <motion.div
            className="actions"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: '0px' }}
            transition={{ duration: 0.15 }}
          >
            <div className="bg-bolt-elements-artifacts-borderColor h-[1px]" />

            <div className="p-5 text-left bg-bolt-elements-actions-background">
              <ActionList actions={actions} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

interface ShellCodeBlockProps {
  classsName?: string;
  code: string;
}

function ShellCodeBlock({ classsName, code }: ShellCodeBlockProps) {
  return (
    <div
      className={classNames('text-xs', classsName)}
      dangerouslySetInnerHTML={{
        __html: shellHighlighter.codeToHtml(code, {
          lang: 'shell',
          theme: 'dark-plus',
        }),
      }}
    ></div>
  );
}

interface ActionListProps {
  actions: ActionState[];
}

const actionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function openArtifactInWorkbench(filePath: any) {
  if (workbenchStore.currentView.get() !== 'code') {
    workbenchStore.currentView.set('code');
  }

  workbenchStore.setSelectedFile(`${WORK_DIR}/${filePath}`);
}

interface ProgressTrackerProps {
  total: number;
  completed: number;
  className?: string;
}

const ProgressTracker = ({ total, completed, className }: ProgressTrackerProps) => {
  const percentage = Math.round((completed / total) * 100);
  const isComplete = percentage === 100;

  return (
    <div className={cn('flex flex-col gap-3.5 w-full', className)}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-6 w-6">
            {isComplete ? (
              <div className="i-ph:check-circle-fill text-bolt-elements-icon-success text-xl transition-colors" />
            ) : (
              <div className="text-bolt-elements-loader-progress i-ph:circle-notch-fill text-xl animate-spin" />
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-bolt-elements-textPrimary">
                {completed}/{total} actions
              </span>
              <span className="text-xs font-medium text-bolt-elements-textSecondary">
                {!isComplete && `${percentage}%`}
              </span>
            </div>
            <div className="relative h-1.5 w-32 bg-bolt-elements-progress-tracker rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-bolt-elements-progress-fill-start transition-all duration-500 ease-out-expo"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
        
        {isComplete && (
          <div className="flex items-center gap-1.5 pl-2">
            <span className="text-xs font-medium text-bolt-elements-icon-success">Terminé</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ActionList = memo(({ actions }: ActionListProps) => {
  const completedCount = actions.filter(action => 
    action.status === 'complete' || 
    (action.type === 'start' && action.status === 'running')
  ).length;
  
  const totalCount = actions.length;

  // Si l'action de type 'start' est en cours, considérer comme complétée
  const isStartRunning = actions.some(action => 
    action.type === 'start' && action.status === 'running'
  );

  const effectiveCompleted = isStartRunning ? totalCount : completedCount;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
      <div className="mb-4">
        <ProgressTracker total={totalCount} completed={effectiveCompleted} />
      </div>
      <ul className="list-none space-y-2.5">
        {actions.map((action, index) => {
          const { status, type, content } = action;
          const isLast = index === actions.length - 1;

          // Modifier l'affichage pour l'action 'start'
          if (type === 'start' && status === 'running') {
            return (
              <motion.li
                key={index}
                variants={actionVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.2, ease: cubicEasingFn }}
              >
                <div className="flex items-center gap-1.5 text-sm">
                  <div className="text-bolt-elements-icon-success">
                    <div className="i-ph:check"></div>
                  </div>
                  <div className="flex items-center w-full min-h-[28px]">
                    <span className="flex-1">Application en cours d'exécution</span>
                  </div>
                </div>
              </motion.li>
            );
          }

          return (
            <motion.li
              key={index}
              variants={actionVariants}
              initial="hidden"
              animate="visible"
              transition={{
                duration: 0.2,
                ease: cubicEasingFn,
              }}
            >
              <div className="flex items-center gap-1.5 text-sm">
                <div className={classNames('text-lg', getIconColor(action.status))}>
                  {status === 'running' ? (
                    <>
                      {type !== 'start' ? (
                        <div className="text-yellow-500 i-ph:spinner-bold"></div>
                      ) : (
                        <div className="i-ph:terminal-window-duotone"></div>
                      )}
                    </>
                  ) : status === 'pending' ? (
                    <div className="i-ph:circle-duotone"></div>
                  ) : status === 'complete' ? (
                    <div className="i-ph:check"></div>
                  ) : status === 'failed' || status === 'aborted' ? (
                    <div className="i-ph:x"></div>
                  ) : null}
                </div>
                {type === 'file' ? (
                  <div>
                    Créer{' '}
                    <code
                      className="text-green-500 bg-bolt-elements-artifacts-inlineCode-background text-bolt-elements-artifacts-inlineCode-text px-1.5 py-1 rounded-md text-bolt-elements-item-contentAccent hover:underline cursor-pointer"
                      onClick={() => openArtifactInWorkbench(action.filePath)}
                    >
                      {action.filePath}
                    </code>
                  </div>
                ) : type === 'shell' ? (
                  <div className="flex items-center w-full min-h-[28px]">
                    <span className="flex-1">Exécuter la commande</span>
                  </div>
                ) : type === 'start' ? (
                  <a
                    onClick={(e) => {
                      e.preventDefault();
                      workbenchStore.currentView.set('preview');
                    }}
                    className="flex items-center w-full min-h-[28px]"
                  >
                    <span className="flex-1">Démarrer l'application</span>
                  </a>
                ) : null}
              </div>
              {(type === 'shell' || type === 'start') && (
                <ShellCodeBlock
                  classsName={classNames('mt-1', {
                    'mb-3.5': !isLast,
                  })}
                  code={content}
                />
              )}
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
});

function getIconColor(status: ActionState['status']) {
  switch (status) {
    case 'pending': {
      return 'text-bolt-elements-textTertiary';
    }
    case 'running': {
      return 'text-bolt-elements-loader-progress';
    }
    case 'complete': {
      return 'text-bolt-elements-icon-success';
    }
    case 'aborted': {
      return 'text-bolt-elements-textSecondary';
    }
    case 'failed': {
      return 'text-bolt-elements-icon-error';
    }
    default: {
      return undefined;
    }
  }
}
