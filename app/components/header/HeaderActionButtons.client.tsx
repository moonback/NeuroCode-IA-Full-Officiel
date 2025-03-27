import { useStore } from '@nanostores/react';
import { toast } from 'react-toastify';
import useViewport from '~/lib/hooks';
import { chatStore } from '~/lib/stores/chat';
import { netlifyConnection } from '~/lib/stores/netlify';
import { vercelConnection } from '~/lib/stores/vercel';
import { workbenchStore } from '~/lib/stores/workbench';
import { webcontainer } from '~/lib/webcontainer';
import { classNames } from '~/utils/classNames';
import { path } from '~/utils/path';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { ActionCallbackData } from '~/lib/runtime/message-parser';
import { chatId } from '~/lib/persistence/useChatHistory';
import { streamingState } from '~/lib/stores/streaming';
import { NetlifyDeploymentLink } from '~/components/chat/NetlifyDeploymentLink.client';
import { VercelDeploymentLink } from '~/components/chat/chat/VercelDeploymentLink.client';
import { SyncSidebar } from '~/components/sync/SyncSidebar';
import Tooltip from '~/components/ui/Tooltip';
import { Dialog, Transition } from '@headlessui/react';

// Types
interface HeaderActionButtonsProps {}

interface ButtonProps {
  active?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  onClick?: VoidFunction;
  className?: string;
  tooltip?: string;
}

// Components
const ActionButton = ({ active = false, disabled = false, children, onClick, className, tooltip }: ButtonProps) => {
  const button = (
    <button
      className={classNames(
        'flex items-center justify-center p-2 min-w-[2.5rem] transition-all duration-200 ease-in-out',
        {
          'bg-bolt-elements-item-backgroundDefault hover:bg-bolt-elements-item-backgroundActive/80 text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary':
            !active,
          'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent shadow-sm':
            active && !disabled,
          'bg-bolt-elements-item-backgroundDefault text-alpha-gray-20 dark:text-alpha-white-20 cursor-not-allowed opacity-50':
            disabled,
        },
        className,
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );

  return tooltip ? <Tooltip content={tooltip}>{button}</Tooltip> : button;
};

const DeployButton = ({ isDeploying, netlifyConn, vercelConn, activePreview, isStreaming, onNetlifyDeploy, onVercelDeploy, deployingTo }: {
  isDeploying: boolean;
  netlifyConn: any;
  vercelConn: any;
  activePreview: any;
  isStreaming: boolean;
  onNetlifyDeploy: () => void;
  onVercelDeploy: () => void;
  deployingTo: 'netlify' | 'vercel' | null;
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex border border-bolt-elements-borderColor rounded-md overflow-hidden mr-2 text-sm">
        <ActionButton
          active
          disabled={isDeploying || !activePreview || isStreaming}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={classNames(
            'px-4 flex items-center gap-2 transition-all',
            'bg-green-500/20 hover:bg-bolt-elements-background-depth-2',
            'text-white hover:text-bolt-elements-textPrimary',
            'focus:outline-none focus:ring-2 focus:ring-[#00AD9F]',
            {
              'opacity-50 cursor-not-allowed': isDeploying || !activePreview || isStreaming
            }
          )}
          tooltip="Déployer votre projet"
        >
          <div className="i-ph:rocket-launch-duotone w-4 h-4 text-[#00AD9F]" />
          {isDeploying ? `Déploiement en cours sur ${deployingTo}...` : (netlifyConn.user || vercelConn.user) ? 'Déployer' : 'Non connecter'}
          <div
            className={classNames('i-ph:caret-down w-4 h-4 transition-transform', isDropdownOpen ? 'rotate-180' : '')}
          />
        </ActionButton>
      </div>

      {isDropdownOpen && (
        <div className="absolute right-2 flex flex-col gap-1 z-50 p-1 mt-1 min-w-[13.5rem] bg-bolt-elements-background-depth-2 rounded-md shadow-lg bg-bolt-elements-backgroundDefault border border-bolt-elements-borderColor">
          <ActionButton
            active
            onClick={() => {
              onNetlifyDeploy();
              setIsDropdownOpen(false);
            }}
            disabled={isDeploying || !activePreview || !netlifyConn.user}
            className="flex items-center w-full px-4 py-2 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive gap-2 rounded-md group relative"
            tooltip="Déployer sur Netlify"
          >
            <img
              className="w-4 h-4"
              height="24"
              width="24"
              crossOrigin="anonymous"
              src="https://cdn.simpleicons.org/netlify"
              alt="Netlify"
            />
            <span className="mx-auto">{!netlifyConn.user ? 'Aucun compte connecté' : 'Déployer sur Netlify'}</span>
            {netlifyConn.user && <NetlifyDeploymentLink />}
          </ActionButton>
          <ActionButton
            active
            onClick={() => {
              onVercelDeploy();
              setIsDropdownOpen(false);
            }}
            disabled={isDeploying || !activePreview || !vercelConn.user}
            className="flex items-center w-full px-4 py-2 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive gap-2 rounded-md group relative"
            tooltip="Déployer sur Vercel"
          >
            <img
              className="w-4 h-4 bg-black p-1 rounded"
              height="24"
              width="24"
              crossOrigin="anonymous"
              src="https://cdn.simpleicons.org/vercel/white"
              alt="Vercel"
            />
            <span className="mx-auto">{!vercelConn.user ? 'Aucun compte connecté' : 'Déployer sur Vercel'}</span>
            {vercelConn.user && <VercelDeploymentLink />}
          </ActionButton>
          <ActionButton
            active={false}
            disabled
            className="flex items-center w-full rounded-md px-4 py-2 text-sm text-bolt-elements-textTertiary gap-2"
            tooltip="Bientôt disponible"
          >
            <img
              className="w-4 h-4"
              height="24"
              width="24"
              crossOrigin="anonymous"
              src="https://cdn.simpleicons.org/cloudflare"
              alt="Cloudflare"
            />
            <span className="mx-auto">Déployer sur Cloudflare (Bientôt disponible)</span>
          </ActionButton>
        </div>
      )}
    </div>
  );
};

export function HeaderActionButtons({}: HeaderActionButtonsProps) {
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const { showChat } = useStore(chatStore);
  const netlifyConn = useStore(netlifyConnection);
  const vercelConn = useStore(vercelConnection);
  const [activePreviewIndex] = useState(0);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployingTo, setDeployingTo] = useState<'netlify' | 'vercel' | null>(null);
  const isSmallViewport = useViewport(1024);
  const canHideChat = showWorkbench || !showChat;
  const isStreaming = useStore(streamingState);
  const [isSyncSidebarOpen, setIsSyncSidebarOpen] = useState(false);
  const currentChatId = useStore(chatId);
  const [isNetlifyModalOpen, setIsNetlifyModalOpen] = useState(false);

  const handleNetlifyDeploy = useCallback(async () => {
    if (!netlifyConn.user || !netlifyConn.token) {
      toast.error("Veuillez d'abord vous connecter à Netlify dans l'onglet Paramètres !");
      return;
    }

    if (!currentChatId) {
      toast.error('Aucun chat actif trouvé');
      return;
    }

    try {
      setIsDeploying(true);

      const artifact = workbenchStore.firstArtifact;

      if (!artifact) {
        throw new Error('Aucun projet actif trouvé');
      }

      const actionId = 'build-' + Date.now();
      const actionData: ActionCallbackData = {
        messageId: 'netlify build',
        artifactId: artifact.id,
        actionId,
        action: {
          type: 'build' as const,
          content: 'npm run build',
        },
      };

      // Add the action first
      artifact.runner.addAction(actionData);

      // Then run it
      await artifact.runner.runAction(actionData);

      if (!artifact.runner.buildOutput) {
        throw new Error('Build failed');
      }

      // Get the build files
      const container = await webcontainer;

      // Remove /home/project from buildPath if it exists
      const buildPath = artifact.runner.buildOutput.path.replace('/home/project', '');

      // Get all files recursively
      async function getAllFiles(dirPath: string): Promise<Record<string, string>> {
        const files: Record<string, string> = {};
        const entries = await container.fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isFile()) {
            const content = await container.fs.readFile(fullPath, 'utf-8');

            // Remove /dist prefix from the path
            const deployPath = fullPath.replace(buildPath, '');
            files[deployPath] = content;
          } else if (entry.isDirectory()) {
            const subFiles = await getAllFiles(fullPath);
            Object.assign(files, subFiles);
          }
        }

        return files;
      }

      const fileContents = await getAllFiles(buildPath);

      // Use chatId instead of artifact.id
      const existingSiteId = localStorage.getItem(`netlify-site-${currentChatId}`);

      // Deploy using the API route with file contents
      const response = await fetch('/api/netlify-deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: existingSiteId || undefined,
          files: fileContents,
          token: netlifyConn.token,
          chatId: currentChatId, // Use chatId instead of artifact.id
        }),
      });

      const data = (await response.json()) as any;

      if (!response.ok || !data.deploy || !data.site) {
        console.error('Réponse de déploiement invalide:', data);
        throw new Error(data.error || 'Réponse de déploiement invalide');
      }

      // Poll for deployment status
      const maxAttempts = 20; // 2 minutes timeout
      let attempts = 0;
      let deploymentStatus;

      while (attempts < maxAttempts) {
        try {
          const statusResponse = await fetch(
            `https://api.netlify.com/api/v1/sites/${data.site.id}/deploys/${data.deploy.id}`,
            {
              headers: {
                Authorization: `Bearer ${netlifyConn.token}`,
              },
            },
          );

          deploymentStatus = (await statusResponse.json()) as any;

          if (deploymentStatus.state === 'ready' || deploymentStatus.state === 'uploaded') {
            break;
          }

          if (deploymentStatus.state === 'error') {
            throw new Error('Déploiement échoué: ' + (deploymentStatus.error_message || 'Erreur inconnue'));
          }

          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Status check error:', error);
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      if (attempts >= maxAttempts) {
        throw new Error('Deployment timed out');
      }

      // Store the site ID if it's a new site
      if (data.site) {
        localStorage.setItem(`netlify-site-${currentChatId}`, data.site.id);
      }

      toast.success(
        <div>
          Déploiement réussi !{' '}
          <a
            href={deploymentStatus.ssl_url || deploymentStatus.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Voir le site
          </a>
        </div>,
      );
    } catch (error) {
      console.error('Deploy error:', error);
      toast.error(error instanceof Error ? error.message : 'Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  }, [netlifyConn, currentChatId]);

  const handleVercelDeploy = useCallback(async () => {
    if (!vercelConn.user || !vercelConn.token) {
      toast.error("Veuillez d'abord vous connecter à Vercel dans l'onglet Paramètres !");
      return;
    }

    if (!currentChatId) {
      toast.error('Aucun chat actif trouvé');
      return;
    }

    try {
      setIsDeploying(true);
      setDeployingTo('vercel');

      const artifact = workbenchStore.firstArtifact;

      if (!artifact) {
        throw new Error('Aucun projet actif trouvé');
      }

      const actionId = 'build-' + Date.now();
      const actionData: ActionCallbackData = {
        messageId: 'vercel build',
        artifactId: artifact.id,
        actionId,
        action: {
          type: 'build' as const,
          content: 'npm run build',
        },
      };

      artifact.runner.addAction(actionData);
      await artifact.runner.runAction(actionData);

      if (!artifact.runner.buildOutput) {
        throw new Error('Build failed');
      }

      const container = await webcontainer;
      const buildPath = artifact.runner.buildOutput.path.replace('/home/project', '');

      async function getAllFiles(dirPath: string): Promise<Record<string, string>> {
        const files: Record<string, string> = {};
        const entries = await container.fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isFile()) {
            const content = await container.fs.readFile(fullPath, 'utf-8');
            const deployPath = fullPath.replace(buildPath, '');
            files[deployPath] = content;
          } else if (entry.isDirectory()) {
            const subFiles = await getAllFiles(fullPath);
            Object.assign(files, subFiles);
          }
        }

        return files;
      }

      const fileContents = await getAllFiles(buildPath);
      const existingSiteId = localStorage.getItem(`vercel-site-${currentChatId}`);

      const response = await fetch('/api/vercel-deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: existingSiteId || undefined,
          files: fileContents,
          token: vercelConn.token,
          chatId: currentChatId,
        }),
      });

      const data = (await response.json()) as any;

      if (!response.ok || !data.deployment) {
        console.error('Invalid deploy response:', data);
        throw new Error(data.error || 'Invalid deployment response');
      }

      const maxAttempts = 20;
      let attempts = 0;
      let deploymentStatus;

      while (attempts < maxAttempts) {
        try {
          const statusResponse = await fetch(
            `https://api.vercel.com/v6/deployments/${data.deployment.id}`,
            {
              headers: {
                Authorization: `Bearer ${vercelConn.token}`,
              },
            },
          );

          deploymentStatus = (await statusResponse.json()) as any;

          if (deploymentStatus.readyState === 'READY') {
            break;
          }

          if (deploymentStatus.readyState === 'ERROR') {
            throw new Error('Déploiement échoué: ' + (deploymentStatus.errorMessage || 'Erreur inconnue'));
          }

          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Status check error:', error);
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      if (attempts >= maxAttempts) {
        throw new Error('Deployment timed out');
      }

      if (data.deployment.siteId) {
        localStorage.setItem(`vercel-site-${currentChatId}`, data.deployment.siteId);
      }

      toast.success(
        <div>
          Déploiement réussi !{' '}
          <a
            href={deploymentStatus.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Voir le site
          </a>
        </div>,
      );
    } catch (error) {
      console.error('Deploy error:', error);
      toast.error(error instanceof Error ? error.message : 'Deployment failed');
    } finally {
      setIsDeploying(false);
      setDeployingTo(null);
    }
  }, [vercelConn, currentChatId]);

  return (
    <div className="flex items-center gap-2">
        <DeployButton
          isDeploying={isDeploying}
          netlifyConn={netlifyConn}
          vercelConn={vercelConn}
          activePreview={activePreview}
          isStreaming={isStreaming}
          onNetlifyDeploy={handleNetlifyDeploy}
          onVercelDeploy={handleVercelDeploy}
          deployingTo={deployingTo}
        />

      

     
      <ActionButton
        onClick={() => setIsSyncSidebarOpen(!isSyncSidebarOpen)}
        className={classNames(
          'p-1.5 rounded-lg border border-bolt-elements-borderColor transition-all',
          'bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-2',
          'text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary',
          'focus:outline-none',
          isSyncSidebarOpen ? 'bg-green-50 dark:bg-green-900/20' : ''
        )}
        tooltip={isSyncSidebarOpen ? "Fermer la synchronisation" : "Ouvrir la synchronisation"}
      >
        <div className={classNames(
          'i-ph:arrows-clockwise-duotone w-4 h-4',
          isSyncSidebarOpen ? 'text-white' : 'text-gray-400'
        )} />
        {isSyncSidebarOpen && (
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </ActionButton>

      <div className="flex border border-bolt-elements-borderColor rounded-md overflow-hidden">
        <ActionButton
          active={showChat}
          disabled={!canHideChat || isSmallViewport}
          onClick={() => {
            if (canHideChat) {
              chatStore.setKey('showChat', !showChat);
            }
          }}
          tooltip={showChat ? "Fermer le chat" : "Ouvrir le chat"}
          className="bg-green-500/10 text-white hover:bg-green-500/50"
        >
          <div className="i-ph:chat-circle-text-duotone text-base w-4 h-4 transition-transform duration-200 ease-in-out hover:scale-110" />
        </ActionButton>
        <div className="w-[1px] bg-bolt-elements-borderColor/50" />
        <ActionButton
          active={showWorkbench}
          onClick={() => {
            if (showWorkbench && !showChat) {
              chatStore.setKey('showChat', true);
            }
            workbenchStore.showWorkbench.set(!showWorkbench);
          }}
          tooltip={showWorkbench ? "Fermer le workbench" : "Ouvrir le workbench"}
          className="bg-green-500/10 text-white hover:bg-green-500/50"
        >
          <div className="i-ph:code-duotone w-4 h-4 text-base transition-transform duration-200 ease-in-out hover:scale-110" />
        </ActionButton>
      </div>

      <SyncSidebar 
        isOpen={isSyncSidebarOpen} 
        onClose={() => setIsSyncSidebarOpen(false)} 
      />
    </div>
  );
}