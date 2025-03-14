import { useStore } from '@nanostores/react';
import React, { memo, useEffect, useRef, useState } from 'react';
import { Panel, type ImperativePanelHandle } from 'react-resizable-panels';
import { IconButton } from '~/components/ui/IconButton';
import { shortcutEventEmitter } from '~/lib/hooks';
import { themeStore } from '~/lib/stores/theme';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { Terminal, type TerminalRef } from './Terminal';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('Terminal');

const MAX_TERMINALS = 3;
export const DEFAULT_TERMINAL_SIZE = 25;

export const TerminalTabs = memo(() => {
  const showTerminal = useStore(workbenchStore.showTerminal);
  const theme = useStore(themeStore);

  const terminalRefs = useRef<Array<TerminalRef | null>>([]);
  const terminalPanelRef = useRef<ImperativePanelHandle>(null);
  const terminalToggledByShortcut = useRef(false);

  const [activeTerminal, setActiveTerminal] = useState(0);
  const [terminalCount, setTerminalCount] = useState(1);

  const addTerminal = () => {
    if (terminalCount < MAX_TERMINALS) {
      setTerminalCount(terminalCount + 1);
      setActiveTerminal(terminalCount);
    }
  };

  const removeTerminal = (index: number) => {
    if (terminalCount > 1) {
      // Remove the terminal ref
      terminalRefs.current.splice(index, 1);
      
      // Update terminal count
      setTerminalCount(prev => prev - 1);
      
      // Adjust active terminal if needed
      if (activeTerminal >= index) {
        setActiveTerminal(Math.max(0, activeTerminal - 1));
      }
    }
  };

  const removeAllTerminals = () => {
    if (terminalCount > 1) {
      const confirmClose = window.confirm('Voulez-vous vraiment fermer tous les terminaux ?');
      if (confirmClose) {
        terminalRefs.current = [terminalRefs.current[0]]; // Keep only the first terminal
        setTerminalCount(1);
        setActiveTerminal(0);
      }
    }
  };

  useEffect(() => {
    const { current: terminal } = terminalPanelRef;

    if (!terminal) {
      return;
    }

    const isCollapsed = terminal.isCollapsed();

    if (!showTerminal && !isCollapsed) {
      terminal.collapse();
    } else if (showTerminal && isCollapsed) {
      terminal.resize(DEFAULT_TERMINAL_SIZE);
    }

    terminalToggledByShortcut.current = false;
  }, [showTerminal]);

  useEffect(() => {
    const unsubscribeFromEventEmitter = shortcutEventEmitter.on('toggleTerminal', () => {
      terminalToggledByShortcut.current = true;
    });

    const unsubscribeFromThemeStore = themeStore.subscribe(() => {
      for (const ref of Object.values(terminalRefs.current)) {
        ref?.reloadStyles();
      }
    });

    return () => {
      unsubscribeFromEventEmitter();
      unsubscribeFromThemeStore();
    };
  }, []);

  return (
    <Panel
      ref={terminalPanelRef}
      defaultSize={showTerminal ? DEFAULT_TERMINAL_SIZE : 0}
      minSize={10}
      collapsible
      onExpand={() => {
        if (!terminalToggledByShortcut.current) {
          workbenchStore.toggleTerminal(true);
        }
      }}
      onCollapse={() => {
        if (!terminalToggledByShortcut.current) {
          workbenchStore.toggleTerminal(false);
        }
      }}
    >
      <div className="h-full">
        <div className="bg-bolt-elements-terminals-background h-full flex flex-col">
          <div className="flex items-center bg-bolt-elements-background-depth-2 border-y border-bolt-elements-borderColor gap-1.5 min-h-[34px] p-2">
            {Array.from({ length: terminalCount + 1 }, (_, index) => {
              const isActive = activeTerminal === index;

              return (
                <React.Fragment key={index}>
                  {index == 0 ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        className={classNames(
                          'flex items-center text-sm cursor-pointer gap-1.5 px-3 py-1.5 h-full whitespace-nowrap rounded-md transition-colors duration-200',
                          {
                            'bg-bolt-elements-terminals-buttonBackground text-bolt-elements-textPrimary shadow-sm': isActive,
                            'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-terminals-buttonBackground/50': !isActive,
                          },
                        )}
                        onClick={() => setActiveTerminal(index)}
                      >
                        <div className="i-ph:terminal-window-duotone text-lg" />
                        <span className="ml-1">NeuroCode</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        className={classNames(
                          'flex items-center text-sm cursor-pointer gap-1.5 px-3 py-1.5 h-full whitespace-nowrap rounded-md transition-colors duration-200',
                          {
                            'bg-bolt-elements-terminals-buttonBackground text-bolt-elements-textPrimary shadow-sm': isActive,
                            'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-terminals-buttonBackground/50': !isActive,
                          },
                        )}
                        onClick={() => setActiveTerminal(index)}
                      >
                        <div className="i-ph:terminal-window-duotone text-lg" />
                        <span className="ml-1">Terminal {terminalCount > 1 && index}</span>
                      </button>
                      {index > 0 && (
                        <IconButton
                          icon="i-ph:x"
                          size="sm"
                          className="hover:bg-bolt-elements-terminals-buttonBackground/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTerminal(index);
                          }}
                          title="Close terminal"
                        />
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            
            {terminalCount < MAX_TERMINALS && (
              <IconButton 
                icon="i-ph:plus" 
                size="md"
                className="hover:bg-bolt-elements-terminals-buttonBackground/50"
                onClick={addTerminal}
              />
            )}
            {terminalCount > 1 && (
              <IconButton
                icon="i-ph:trash"
                size="md"
                className="hover:bg-bolt-elements-terminals-buttonBackground/50"
                onClick={removeAllTerminals}
                title="Close all terminals"
              />
            )}
            <IconButton
              className="ml-auto hover:bg-bolt-elements-terminals-buttonBackground/50"
              icon="i-ph:caret-down"
              title="Close"
              size="md"
              onClick={() => workbenchStore.toggleTerminal(false)}
            />
            
          </div>
          {Array.from({ length: terminalCount + 1 }, (_, index) => {
            const isActive = activeTerminal === index;

            logger.debug(`Starting bolt terminal [${index}]`);

            if (index == 0) {
              return (
                <Terminal
                  key={index}
                  id={`terminal_${index}`}
                  className={classNames('h-full overflow-hidden', {
                    hidden: !isActive,
                  })}
                  ref={(ref) => {
                    terminalRefs.current.push(ref);
                  }}
                  onTerminalReady={(terminal) => workbenchStore.attachBoltTerminal(terminal)}
                  onTerminalResize={(cols, rows) => workbenchStore.onTerminalResize(cols, rows)}
                  theme={theme}
                />
              );
            } else {
              return (
                <Terminal
                  key={index}
                  id={`terminal_${index}`}
                  className={classNames('h-full overflow-hidden', {
                    hidden: !isActive,
                  })}
                  ref={(ref) => {
                    terminalRefs.current.push(ref);
                  }}
                  onTerminalReady={(terminal) => workbenchStore.attachTerminal(terminal)}
                  onTerminalResize={(cols, rows) => workbenchStore.onTerminalResize(cols, rows)}
                  theme={theme}
                />
              );
            }
          })}
        </div>
      </div>
    </Panel>
  );
});
