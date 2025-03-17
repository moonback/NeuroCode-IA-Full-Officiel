/*
 * 
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import type { JSONValue, Message } from 'ai';
import React, { type RefCallback, useEffect, useState, useRef } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { Menu } from '~/components/sidebar/Menu.client';
import { IconButton } from '~/components/ui/IconButton';
import { Workbench } from '~/components/workbench/Workbench.client';
import { classNames } from '~/utils/classNames';
import { PROVIDER_LIST } from '~/utils/constants';
import { Messages } from './Messages.client';
import { SendButton } from './SendButton.client';
import { APIKeyManager, getApiKeysFromCookies } from './APIKeyManager';
import Cookies from 'js-cookie';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { profileStore } from '~/lib/stores/profile';
import { SyncSidebar } from '~/components/sync/SyncSidebar';
import styles from './BaseChat.module.scss';
import { ExportChatButton } from '~/components/chat/chatExportAndImport/ExportChatButton';
import { ImportButtons } from '~/components/chat/chatExportAndImport/ImportButtons';
import { ExamplePrompts } from '~/components/chat/ExamplePrompts';
import GitCloneButton from './GitCloneButton';

import FilePreview from './FilePreview';
import { ModelSelector } from '~/components/chat/ModelSelector';
import { SpeechRecognitionButton } from '~/components/chat/SpeechRecognition';
import type { ProviderInfo } from '~/types/model';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { toast } from 'react-toastify';
import StarterTemplates from './StarterTemplates';
import type { ActionAlert } from '~/types/actions';
import ChatAlert from './ChatAlert';
import type { ModelInfo } from '~/lib/modules/llm/types';
import ProgressCompilation from './ProgressCompilation';
import type { ProgressAnnotation } from '~/types/context';
import type { ActionRunner } from '~/lib/runtime/action-runner';
import { LOCAL_PROVIDERS } from '~/lib/stores/settings';
import { TargetedFilesDisplay } from './TargetedFilesDisplay';
import { useSettings } from '~/lib/hooks/useSettings';
const TEXTAREA_MIN_HEIGHT = 76;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  messageRef?: RefCallback<HTMLDivElement> | undefined;
  scrollRef?: RefCallback<HTMLDivElement> | undefined;
  showChat?: boolean;
  chatStarted?: boolean;
  isStreaming?: boolean;
  onStreamingChange?: (streaming: boolean) => void;
  messages?: Message[];
  description?: string;
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  input?: string;
  model?: string;
  setModel?: (model: string) => void;
  provider?: ProviderInfo;
  setProvider?: (provider: ProviderInfo) => void;
  providerList?: ProviderInfo[];
  handleStop?: () => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  enhancePrompt?: () => void;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
  exportChat?: () => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
  actionAlert?: ActionAlert;
  clearAlert?: () => void;
  data?: JSONValue[] | undefined;
  actionRunner?: ActionRunner;
}

const QuickActions = ({ onAction, chatStarted }: { onAction: (action: string) => void, chatStarted: boolean }) => {
  if (!chatStarted) return null;

  const actions = [
    { 
      label: 'Continue', 
      icon: 'i-ph:arrow-right', 
      command: 'Continue with the current conversation'
    },
    { 
      label: 'CSS', 
      icon: 'i-ph:paint-brush', 
      command: 'Optimize and enhance the CSS code for better visual presentation and responsiveness' 
    },
    { 
      label: 'Refactor', 
      icon: 'i-ph:arrows-clockwise', 
      command: 'Refactor and improve the code structure for better maintainability and performance'
    },
    { 
      label: 'Debug', 
      icon: 'i-ph:bug', 
      command: 'Help identify and fix potential issues or bugs in the code'
    },
    {
      label: 'Explain', 
      icon: 'i-ph:book-open',
      command: 'Provide a detailed explanation of how the code works'
    }
  ];

  return (
    <div className="flex gap-1">
      {actions.map((action) => (
        <Tooltip.Root key={action.label}>
          <Tooltip.Trigger asChild>
            <IconButton
              title={action.command}
              className="transition-all hover:bg-bolt-elements-item-backgroundAccent"
              onClick={() => onAction(action.command)}
            >
              <div className={`${action.icon} text-xl`} />
            </IconButton>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary p-2 rounded-md text-xs border border-bolt-elements-borderColor"
              sideOffset={5}
            >
              {action.command}
              <Tooltip.Arrow className="fill-bolt-elements-background-depth-3" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      ))}
    </div>
  );
};

export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      textareaRef,
      messageRef,
      scrollRef,
      showChat = true,
      chatStarted = false,
      isStreaming = false,
      onStreamingChange,
      model,
      setModel,
      provider,
      setProvider,
      providerList,
      input = '',
      enhancingPrompt,
      handleInputChange,

      // promptEnhanced,
      enhancePrompt,
      sendMessage,
      handleStop,
      importChat,
      exportChat,
      uploadedFiles = [],
      setUploadedFiles,
      imageDataList = [],
      setImageDataList,
      messages,
      actionAlert,
      clearAlert,
      data,
      actionRunner,
    },
    ref,
  ) => {
    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;
    const [apiKeys, setApiKeys] = useState<Record<string, string>>(getApiKeysFromCookies());
    const [modelList, setModelList] = useState<ModelInfo[]>([]);
    const [isModelSettingsCollapsed, setIsModelSettingsCollapsed] = useState(true);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
    const [transcript, setTranscript] = useState('');
    const [isModelLoading, setIsModelLoading] = useState<string | undefined>('all');
    const [progressAnnotations, setProgressAnnotations] = useState<ProgressAnnotation[]>([]);
    const syncStatus = useStore(workbenchStore.syncStatus);
    const isSyncEnabled = useStore(workbenchStore.isSyncEnabled);
    const profile = useStore(profileStore);
    const modelSettingsRef = useRef<HTMLDivElement>(null);
    const { contextOptimizationEnabled } = useSettings();

    useEffect(() => {
      if (data) {
        const progressList = data.filter(
          (x) => typeof x === 'object' && (x as any).type === 'progress',
        ) as ProgressAnnotation[];
        setProgressAnnotations(progressList);
      }
    }, [data]);
    useEffect(() => {
      console.log(transcript);
    }, [transcript]);
    useEffect(() => {
      onStreamingChange?.(isStreaming);
    }, [isStreaming, onStreamingChange]);
    useEffect(() => {
      if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join('');

          setTranscript(transcript);

          if (handleInputChange) {
            const syntheticEvent = {
              target: { value: transcript },
            } as React.ChangeEvent<HTMLTextAreaElement>;
            handleInputChange(syntheticEvent);
          }
        };

        recognition.onerror = (event) => {
          console.error('Erreur de reconnaissance vocale :', event.error);
          setIsListening(false);
        };

        setRecognition(recognition);
      }
    }, []);

    useEffect(() => {
      const loadApiKeysAndModels = async () => {
        try {
          const parsedApiKeys = getApiKeysFromCookies();
          setApiKeys(parsedApiKeys);
          
          const response = await fetch('/api/models');
          const data = await response.json() as { modelList: ModelInfo[] };
          setModelList(data.modelList);
        } catch (error) {
          console.error('Erreur lors du chargement des modèles:', error);
          Cookies.remove('apiKeys');
        } finally {
          setIsModelLoading(undefined);
        }
      };

      if (typeof window !== 'undefined') {
        loadApiKeysAndModels();
      }
    }, [providerList, provider]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          modelSettingsRef.current && 
          !modelSettingsRef.current.contains(event.target as Node) &&
          !isModelSettingsCollapsed
        ) {
          setIsModelSettingsCollapsed(true);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isModelSettingsCollapsed]);

    const onApiKeysChange = async (providerName: string, apiKey: string) => {
      const newApiKeys = { ...apiKeys, [providerName]: apiKey };
      setApiKeys(newApiKeys);
      Cookies.set('apiKeys', JSON.stringify(newApiKeys));

      setIsModelLoading(providerName);

      let providerModels: ModelInfo[] = [];

      try {
        const response = await fetch(`/api/models/${encodeURIComponent(providerName)}`);
        const data = await response.json();
        providerModels = (data as { modelList: ModelInfo[] }).modelList;
      } catch (error) {
        console.error('Erreur lors du chargement des modèles dynamiques pour:', providerName, error);
      }

      // Only update models for the specific provider
      setModelList((prevModels) => {
        const otherModels = prevModels.filter((model) => model.provider !== providerName);
        return [...otherModels, ...providerModels];
      });
      setIsModelLoading(undefined);
    };

    const startListening = () => {
      if (recognition) {
        recognition.start();
        setIsListening(true);
      }
    };

    const stopListening = () => {
      if (recognition) {
        recognition.stop();
        setIsListening(false);
      }
    };

    const handleSendMessage = (event: React.UIEvent, messageInput?: string) => {
      // Get targeted files
      const targetedFilesAttr = textareaRef?.current?.getAttribute('data-targeted-files');
      const targetedFiles = targetedFilesAttr ? JSON.parse(targetedFilesAttr) : [];
      
      // Prepare message with targeted files information
      let finalMessage = messageInput || input;
      
      // Add targeted files information to the message in a format that can be processed by the backend
      if (targetedFiles.length > 0) {
        // You can choose how to format this information based on your backend requirements
        // For example, you could add it as metadata or as a special comment format
        finalMessage = `[FILES: ${targetedFiles.join(', ')}]\n\n${finalMessage}`;
      }
      
      // Call the original sendMessage function with the modified message
      sendMessage?.(event, finalMessage);
      
      // Clear targeted files after sending
      if (textareaRef?.current) {
        textareaRef.current.setAttribute('data-targeted-files', JSON.stringify([]));
      }
    };

    const handleFileUpload = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.txt,.md,.docx,.pdf';
      input.multiple = true;

      input.onchange = async (e) => {
        const selectedFiles = Array.from((e.target as HTMLInputElement).files || []);
        processNewFiles(selectedFiles, 'upload');
      };
      input.click();
    };

    const processNewFiles = (filesToProcess: File[], source: 'upload' | 'paste') => {
      const filteredFiles = filesToProcess.filter((file) => {
        if (file.name.match(/\.(sh|bat|ps1)$/i)) {
          toast.error(
            <div>
              <div className="font-bold">Fichiers de script non autorisés</div>
              <div className="text-xs text-gray-200">
                Pour des raisons de sécurité, les fichiers de script (.sh, .bat, .ps1) ne sont pas supportés.
              </div>
            </div>,
            { autoClose: 5000 },
          );
          return false;
        }

        if (file.size > MAX_FILE_SIZE) {
          toast.warning(`Le fichier ${file.name} dépasse la taille maximale de 100MB et a été ignoré.`);
          return false;
        }
        return true;
      });

      if (filteredFiles.length === 0) return;

      const newUploadedFiles = [...uploadedFiles, ...filteredFiles];
      const newImageDataList = [
        ...imageDataList,
        ...filteredFiles.map((file) => (file.type.startsWith('image/') ? 'loading-image' : 'non-image')),
      ];

      setUploadedFiles?.(newUploadedFiles);
      setImageDataList?.(newImageDataList);

      filteredFiles.forEach((file, index) => {
        const actualIndex = uploadedFiles.length + index;
        processIndividualFiles(file, actualIndex, source);
      });
    };

    const processIndividualFiles = (file: File, index: number, _source: 'upload' | 'paste') => {
      if (file.type.startsWith('image/')) {
        processImageFile(file, index);
      } else if (file.type.includes('text') || file.name.match(/\.(txt|md|pdf|docx)$/i)) {
        previewTextFile(file, index);
      }
    };

    const processPastedFiles = (filesToProcess: File[]) => {
      processNewFiles(filesToProcess, 'paste');
    };

    const processImageFile = (file: File, _index: number) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && setImageDataList) {
          setImageDataList([...imageDataList, e.target.result as string]);
        }
      };
      reader.readAsDataURL(file);

      toast.info(
        <div>
          <div className="font-bold">Image jointe:</div>
          <div className="text-xs text-gray-200 bg-gray-800 p-2 mt-1 rounded">
            {file.name} ({Math.round(file.size / 1024)} KB)
          </div>
        </div>,
        { autoClose: 3000 },
      );
    };

    const previewTextFile = (file: File, _index: number) => {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf') ||
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.name.endsWith('.docx')) {
        toast.info(
          <div>
            <div className="font-bold">Fichier joint:</div>
            <div className="text-xs text-gray-200 bg-gray-800 p-2 mt-1 rounded flex items-center">
              <div className={file.name.endsWith('.pdf') ? 'i-ph:file-pdf text-red-500 mr-2' : 'i-ph:file-doc text-blue-500 mr-2'} 
                   style={{ fontSize: '1.25rem' }} />
              <div>
                <div>{file.name}</div>
                <div className="text-xs text-gray-400">
                  {Math.round(file.size / 1024)} KB - Le texte sera extrait lors de l'envoi
                </div>
              </div>
            </div>
          </div>,
          { autoClose: 4000 },
        );
      } else {
        toast.info(
          <div>
            <div className="font-bold">Fichier joint:</div>
            <div className="text-xs text-gray-200 bg-gray-800 p-2 mt-1 rounded">
              {file.name} ({Math.round(file.size / 1024)} KB)
            </div>
          </div>,
          { autoClose: 3000 },
        );
      }
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const clipboardFiles: File[] = [];
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) clipboardFiles.push(file);
        }
      }

      if (clipboardFiles.length > 0) {
        const filteredFiles = clipboardFiles.filter(file => file.size <= MAX_FILE_SIZE);
        if (filteredFiles.length < clipboardFiles.length) {
          toast.warning('Certains fichiers ont été ignorés car ils dépassent la taille maximale de 100MB.');
        }
        processPastedFiles(filteredFiles);
      }
    };

    const handleReply = (messageId: string) => {
      const messageToReply = messages?.find(msg => msg.id === messageId);
      if (messageToReply) {
        // Prendre seulement les 3 premières lignes du message
        const lines = messageToReply.content.split('\n').slice(0, 3);
        const quotedMessage = `> ${lines.join('\n> ')}${lines.length < messageToReply.content.split('\n').length ? '...' : ''}\n\n`;
        handleInputChange?.({ target: { value: quotedMessage } } as React.ChangeEvent<HTMLTextAreaElement>);
        textareaRef?.current?.focus();
      }
    };

    const baseChat = (
      <div
        ref={ref}
        className={classNames(styles.BaseChat, 'relative flex h-full w-full overflow-hidden')}
        data-chat-visible={showChat}
      >
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover opacity-20"
          >
            <source src="/videos/background.mp4" type="video/mp4" />
            Votre navigateur ne supporte pas les vidéos HTML5.
          </video>
        </div>

        <ClientOnly>{() => <Menu />}</ClientOnly>
        <div className="flex flex-col lg:flex-row overflow-y-auto w-full h-full relative z-10">
          <div className={classNames(styles.Chat, 'flex flex-col flex-grow lg:min-w-[var(--chat-min-width)] h-full')}>
            {!chatStarted && (
              <div id="intro" className="mt-[14vh] max-w-chat mx-auto text-center px-4 lg:px-0">
                <div className="space-y-6 animate-[fade-in_0.8s_ease-out]">
                  <h1 className="text-4xl lg:text-5xl font-bold text-bolt-elements-textPrimary">
                    NeuroCode Assistant
                  </h1>
                  <p className="text-lg text-bolt-elements-textSecondary">
                    Votre assistant IA pour le développement web
                  </p>
                </div>
              </div>
            )}
            <div
              className={classNames('pt-6 px-2 sm:px-6', {
                'h-full flex flex-col pb-4 overflow-y-auto': chatStarted,
              })}
              ref={scrollRef}
            >
              <ClientOnly>
                {() => {
                  return chatStarted ? (
                    <div className="flex-1 w-full max-w-chat pb-6 mx-auto z-1">
                      <Messages
                        ref={messageRef}
                        className="flex flex-col "
                        messages={messages}
                        isStreaming={isStreaming}
                        onSuggestionClick={(task) => {
                          sendMessage?.({} as any, task);
                        }}
                        onReplyClick={handleReply}
                      />
                    </div>
                  ) : null;
                }}
              </ClientOnly>
              <div
                className={classNames('flex flex-col w-full max-w-chat mx-auto z-prompt', {                  
                  'sticky bottom-2': chatStarted,
                  'position-absolute': chatStarted,
                })}
              >
                {actionAlert && (
                  <ChatAlert
                    alert={actionAlert}
                    clearAlert={() => clearAlert?.()}
                    postMessage={(message) => {
                      sendMessage?.({} as any, message);
                      clearAlert?.();
                    }}
                  />
                )}
                {progressAnnotations && contextOptimizationEnabled && <ProgressCompilation data={progressAnnotations} />}
                <div
                  className={classNames(
                    'bg-bolt-elements-background-depth-2 p-4 rounded-xl border border-bolt-elements-borderColor/50 relative w-full max-w-chat mx-auto z-prompt',
                    'shadow-lg hover:shadow-xl transition-shadow duration-300 backdrop-blur-sm'
                  )}
                >
                  {/* <svg className={classNames(styles.PromptEffectContainer)}>
                    <defs>
                      <linearGradient
                        id="line-gradient"
                        x1="20%"
                        y1="0%"
                        x2="-14%"
                        y2="10%"
                        gradientUnits="userSpaceOnUse"
                        gradientTransform="rotate(-45)"
                      >
                        <stop offset="0%" stopColor="#4affb4" stopOpacity="0%"></stop>
                        <stop offset="40%" stopColor="#4affb4" stopOpacity="80%"></stop>
                        <stop offset="50%" stopColor="#4affb4" stopOpacity="80%"></stop>
                        <stop offset="100%" stopColor="#4affb4" stopOpacity="0%"></stop>
                      </linearGradient>
                      <linearGradient id="shine-gradient">
                        <stop offset="0%" stopColor="white" stopOpacity="0%"></stop>
                        <stop offset="40%" stopColor="#ffffff" stopOpacity="80%"></stop>
                        <stop offset="50%" stopColor="#ffffff" stopOpacity="80%"></stop>
                        <stop offset="100%" stopColor="white" stopOpacity="0%"></stop>
                      </linearGradient>
                    </defs>
                    <rect className={classNames(styles.PromptEffectLine)} pathLength="100" strokeLinecap="round"></rect>
                    <rect className={classNames(styles.PromptShine)} x="48" y="24" width="70" height="1"></rect>
                  </svg> */}
                  <div>
                    <div ref={modelSettingsRef}>
                      <TargetedFilesDisplay textareaRef={textareaRef} />

                      <ClientOnly>
                        {() => (
                          <div className={isModelSettingsCollapsed ? 'hidden' : ''}>
                            <ModelSelector
                              key={provider?.name + ':' + modelList.length}
                              model={model}
                              setModel={setModel}
                              modelList={modelList}
                              provider={provider}
                              setProvider={setProvider}
                              providerList={providerList || (PROVIDER_LIST as ProviderInfo[])}
                              apiKeys={apiKeys}
                              modelLoading={isModelLoading}
                            />
                            {(providerList || []).length > 0 &&
                              provider &&
                              (!LOCAL_PROVIDERS.includes(provider.name) || 'OpenAILike') && (
                                <APIKeyManager
                                  provider={provider}
                                  apiKey={apiKeys[provider.name] || ''}
                                  setApiKey={(key) => {
                                    onApiKeysChange(provider.name, key);
                                  }}
                                />
                              )}
                          </div>
                        )}
                      </ClientOnly>
                    </div>
                  </div>
                  <FilePreview
                    files={uploadedFiles}
                    imageDataList={imageDataList}
                    onRemove={(index) => {
                      setUploadedFiles?.(uploadedFiles.filter((_, i) => i !== index));
                      setImageDataList?.(imageDataList.filter((_, i) => i !== index));
                    }}
                  />
                  <ClientOnly>
                    {() => (
                      <ScreenshotStateManager
                        setUploadedFiles={setUploadedFiles}
                        setImageDataList={setImageDataList}
                        uploadedFiles={uploadedFiles}
                        imageDataList={imageDataList}
                      />
                    )}
                  </ClientOnly>
                  <div
                    className={classNames(
                      'relative shadow-xs border border-bolt-elements-borderColor backdrop-blur rounded-lg',
                    )}
                  >
                    
                    
                    <textarea
                      ref={textareaRef}
                      className={classNames(
                        'w-full pl-4 pt-4 pr-16 outline-none resize-none text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent text-sm',
                        'transition-all duration-200',
                        'hover:border-bolt-elements-focus focus:ring-1 focus:ring-green-500 focus:ring-opacity-50',
                        'rounded-xl backdrop-blur-sm bg-white/5 border border-gray-800/30'
                      )}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.border = '2px solid #1488fc';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.border = '2px solid #1488fc';
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';

                        const files = Array.from(e.dataTransfer.files);
                        files.forEach((file) => {
                          if (file.type.startsWith('image/')) {
                            handleFileUpload();
                          }
                        });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Tab') {
                          event.preventDefault();
                          const target = event.target as HTMLTextAreaElement;
                          const idx = target.selectionStart;
                          if (idx !== null) {
                            const start = target.value.substring(0, idx);
                            const back = target.value.substring(idx);
                            target.value = `${start}    ${back}`;
                            target.setSelectionRange(idx + 4, idx + 4);
                          }
                          return;
                        }
                        if (event.key === 'Enter') {
                          if (event.shiftKey) {
                            return;
                          }

                          event.preventDefault();

                          if (isStreaming) {
                            handleStop?.();
                            return;
                          }

                          // ignore if using input method engine
                          if (event.nativeEvent.isComposing) {
                            return;
                          }

                          handleSendMessage?.(event);
                        }
                      }}
                      value={input}
                      onChange={(event) => {
                        handleInputChange?.(event);
                      }}
                      onPaste={handlePaste}
                      style={{
                        minHeight: TEXTAREA_MIN_HEIGHT,
                        maxHeight: TEXTAREA_MAX_HEIGHT,
                        resize: 'vertical',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        wordWrap: 'break-word',
                      }}
                      placeholder={`Comment NeuroCode peut vous aider ?`}
                      translate="no"
                    />
                                        
                    <ClientOnly>
                      
                      {() => (
                        
                        <SendButton
                          show={input.length > 0 || isStreaming || uploadedFiles.length > 0}
                          isStreaming={isStreaming}
                          disabled={!providerList || providerList.length === 0}
                          onClick={(event) => {
                            if (isStreaming) {
                              handleStop?.();
                              return;
                            }

                            if (input.length > 0 || uploadedFiles.length > 0) {
                              handleSendMessage?.(event);
                            }
                          }}
                        />
                      )}
                    </ClientOnly>
                    
                    <div className="flex justify-between items-center text-sm p-4 pt-2 bg-gray-900/20 rounded-b-xl border-t border-gray-800/30">
                      <div className="flex gap-2 items-center">
                        
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <IconButton title="Upload file" className="transition-all" onClick={() => handleFileUpload()}>
                              <div className="i-ph:paperclip text-xl"></div>
                            </IconButton>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              className="bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary p-2 rounded-md text-xs border border-bolt-elements-borderColor max-w-xs"
                              sideOffset={5}
                            >
                              <p>Joindre des fichiers</p>
                              <div className="text-bolt-elements-textSecondary mt-1">
                                <p>Formats pris en charge :</p>
                                <p className="mt-1">• Images: png, jpg, jpeg, gif, etc.</p>
                                <p>• Text: txt, md, js, py, html, css, json, etc.</p>
                                <p>• Documents: pdf, docx</p>
                              </div>
                              <Tooltip.Arrow className="fill-bolt-elements-background-depth-3" />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                        
                        <IconButton
                          title="Améliorer le prompt"
                          disabled={input.length === 0 || enhancingPrompt}
                          className={classNames('transition-all', enhancingPrompt ? 'opacity-100' : '')}
                          onClick={() => {
                            enhancePrompt?.();
                            toast('Prompt amélioré!');
                          }}
                        >
                          {enhancingPrompt ? (
                            <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-xl animate-spin"></div>
                          ) : (
                            <div className="i-bolt:stars text-xl"></div>
                          )}
                        </IconButton>

                        {!chatStarted && ImportButtons(importChat)}
                        {!chatStarted && <GitCloneButton importChat={importChat} />}

                        <QuickActions 
                          onAction={(action) => sendMessage?.({} as any, action)} 
                          chatStarted={chatStarted} 
                        />
                        <SpeechRecognitionButton
                          isListening={isListening}
                          onStart={startListening}
                          onStop={stopListening}
                          disabled={isStreaming}
                        />
                        {chatStarted && <ClientOnly>{() => <ExportChatButton exportChat={exportChat} />}</ClientOnly>}
                        <IconButton
                          title="Paramètres du modèle"
                          className={classNames('transition-all flex items-center gap-1', {
                            'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent':
                              isModelSettingsCollapsed,
                            'bg-bolt-elements-item-backgroundDefault text-bolt-elements-item-contentDefault':
                              !isModelSettingsCollapsed,
                          })}
                          onClick={() => setIsModelSettingsCollapsed(!isModelSettingsCollapsed)}
                          disabled={!providerList || providerList.length === 0}
                        >
                          <div className={`i-ph:caret-${isModelSettingsCollapsed ? 'right' : 'down'} text-lg`} />
                          {isModelSettingsCollapsed ? <span className="text-xs">{model}</span> : <span />}
                        </IconButton>
                        
                      </div>
                      {input.length > 3 ? (
                        <div className="text-xs text-bolt-elements-textTertiary">
                          <kbd className="kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">Shift</kbd> + <kbd className="kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">↵</kbd> pour saut de ligne
                        </div>
                      ) : null}
                      {input && (
                      <IconButton
                        title="Effacer le texte"
                        className="transition-colors hover:bg-red-500/10"
                        onClick={() => {
                          handleInputChange?.({
                            target: { value: '' },
                          } as React.ChangeEvent<HTMLTextAreaElement>);
                          textareaRef?.current?.focus();
                        }}
                        aria-label="Effacer le texte saisi"
                      >
                        <div className="i-ph:x-circle bg-red-500/10 text-lg text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary bg-red-500/50 transition-colors duration-200" />
                      </IconButton>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {!chatStarted && (
              <div className="flex flex-col justify-center mt-8 gap-6">
                <div className="flex justify-center gap-2">
                  <div className="flex items-center gap-2">
                  </div>
                </div>
                <ExamplePrompts 
                  sendMessage={sendMessage}
                  // className="bg-gray-900/50 p-6 rounded-xl border border-gray-800/50"
                />
              </div>
            )}
          </div>
          <ClientOnly>
            {() => (
              <Workbench
                actionRunner={actionRunner ?? ({} as ActionRunner)}
                chatStarted={chatStarted}
                isStreaming={isStreaming}
                metadata={{
                  chatSummary: messages?.length ? 
                    (messages[messages.length - 1]?.annotations?.find((annotation: any) => 
                      annotation?.type === 'chatSummary' && typeof annotation === 'object' && 'summary' in annotation
                    ) as { summary: string } | undefined)?.summary : undefined
                }}
              />
            )}
          </ClientOnly>        </div>
      </div>
    );

    return (
      <Tooltip.Provider delayDuration={200}>
        {baseChat}
        <ClientOnly>
          {() => contextOptimizationEnabled && <SyncSidebar />}
        </ClientOnly>
      </Tooltip.Provider>
    );
  },
);


