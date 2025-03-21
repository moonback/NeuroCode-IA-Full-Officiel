import { atom, map, type MapStore, type ReadableAtom, type WritableAtom, computed } from 'nanostores';
import type { EditorDocument, ScrollPosition } from '~/components/editor/codemirror/CodeMirrorEditor';
import { ActionRunner } from '~/lib/runtime/action-runner';
import type { ActionCallbackData, ArtifactCallbackData } from '~/lib/runtime/message-parser';
import { webcontainer } from '~/lib/webcontainer';
import type { ITerminal } from '~/types/terminal';
import { unreachable } from '~/utils/unreachable';
import { EditorStore } from './editor';
import { FilesStore, type FileMap } from './files';
import { PreviewsStore } from './previews';
import { TerminalStore } from './terminal';
import JSZip from 'jszip';
import pkg from 'file-saver';
const { saveAs } = pkg;
import { Octokit, type RestEndpointMethodTypes } from '@octokit/rest';
import * as nodePath from 'node:path';import { extractRelativePath } from '~/utils/diff';
import { description } from '~/lib/persistence';
import Cookies from 'js-cookie';
import { createSampler } from '~/utils/sampler';
import type { ActionAlert } from '~/types/actions';
import type { SyncSettings, SyncSession, ProjectSyncInfo } from '~/types/sync';
import { toast } from 'react-toastify';
import ignore from 'ignore';
import { ProjectFolderManager } from '~/lib/persistence/project-folders';
import { clearSyncFolderHandle, loadSyncFolderHandle, saveSyncFolderHandle } from '~/lib/persistence/sync-folder';
import { getLocalStorage, setLocalStorage } from '~/lib/persistence';

// Destructure saveAs from the CommonJS module

export interface ArtifactState {
  id: string;
  title: string;
  type?: string;
  closed: boolean;
  runner: ActionRunner;
}

export type ArtifactUpdateState = Pick<ArtifactState, 'title' | 'closed'>;

type Artifacts = MapStore<Record<string, ArtifactState>>;

export type WorkbenchViewType = 'code' | 'diff' | 'preview';

export class WorkbenchStore {
  #previewsStore = new PreviewsStore(webcontainer);
  #filesStore = new FilesStore(webcontainer);
  #editorStore = new EditorStore(this.#filesStore);
  #terminalStore = new TerminalStore(webcontainer);

  #reloadedMessages = new Set<string>();
  #knownFileStates = new Map<string, { content: string; timestamp: number }>();

  artifacts: Artifacts = import.meta.hot?.data.artifacts ?? map({});

  showWorkbench: WritableAtom<boolean> = import.meta.hot?.data.showWorkbench ?? atom(false);
  currentView: WritableAtom<WorkbenchViewType> = import.meta.hot?.data.currentView ?? atom('code');
  unsavedFiles: WritableAtom<Set<string>> = import.meta.hot?.data.unsavedFiles ?? atom(new Set<string>());
  actionAlert: WritableAtom<ActionAlert | undefined> =
    import.meta.hot?.data.unsavedFiles ?? atom<ActionAlert | undefined>(undefined);
  modifiedFiles = new Set<string>();
  artifactIdList: string[] = [];
  #globalExecutionQueue = Promise.resolve();
  syncFolder: WritableAtom<FileSystemDirectoryHandle | null> = import.meta.hot?.data.syncFolder ?? atom(null);
  syncSettings: WritableAtom<SyncSettings> =
    import.meta.hot?.data.syncSettings ??
    atom({
      autoSync: false,
      autoSyncInterval: 5,
      syncOnSave: false,
      excludePatterns: [],
      syncMode: 'ask',
      projectFolders: {},
      defaultSyncEnabled: false,
    });
  currentSession: WritableAtom<SyncSession | null> = import.meta.hot?.data.currentSession ?? atom(null);
  syncIntervalId?: NodeJS.Timeout;

  #isInitializing = false;
  #lastSyncTimestamp = 0;

  isSyncEnabled = computed([this.currentSession, this.syncSettings], (session, settings) => {
    if (!session?.projectName) {
      return settings.defaultSyncEnabled;
    }

    const projectInfo = settings.projectFolders[session.projectName];

    return projectInfo?.syncEnabled ?? settings.defaultSyncEnabled;
  });

  syncStatus = computed(
    [this.currentSession, this.syncFolder, this.syncSettings, this.unsavedFiles],
    (session, folder, settings, unsavedFiles) => ({
      isReady: !!folder && !!session && unsavedFiles.size === 0,
      lastSync: session?.lastSync ? new Date(session.lastSync).toLocaleTimeString() : undefined,
      projectName: session?.projectName,
      folderName: folder?.name,
      totalFiles: session?.files?.size || 0,
      totalSize: this._calculateTotalSize(session),
      autoSync: settings.autoSync,
      syncOnSave: settings.syncOnSave,
      hasUnsavedChanges: unsavedFiles.size > 0,
    }),
  );

  syncHistory = computed([this.currentSession], (session) => {
    if (!session?.history) {
      return [];
    }

    return [...session.history].sort((a, b) => b.timestamp - a.timestamp);
  });

  constructor() {
    if (import.meta.hot) {
      import.meta.hot.data.artifacts = this.artifacts;
      import.meta.hot.data.unsavedFiles = this.unsavedFiles;
      import.meta.hot.data.showWorkbench = this.showWorkbench;
      import.meta.hot.data.currentView = this.currentView;
      import.meta.hot.data.actionAlert = this.actionAlert;
      import.meta.hot.data.syncSettings = this.syncSettings;
      import.meta.hot.data.syncFolder = this.syncFolder;
      import.meta.hot.data.currentSession = this.currentSession;
    }

    // Load saved sync settings
    this.loadSyncSettings();

    // Subscribe to sync settings changes to persist them and update sync interval
    this.syncSettings.subscribe((settings) => {
      setLocalStorage('syncSettings', settings);

      // Clear existing interval if any
      if (this.syncIntervalId) {
        clearInterval(this.syncIntervalId);
      }

      // Set up new interval if auto-sync is enabled
      if (settings.autoSync) {
        const intervalMs = settings.autoSyncInterval * 60 * 1000;
        this.syncIntervalId = setInterval(() => {
          const session = this.currentSession.get();
          const folder = this.syncFolder.get();

          if (folder && session) {
            this.syncFiles().catch(console.error);
          }
        }, intervalMs);
      }
    });

    // Set up auto-sync interval
    const settings = this.syncSettings.get();
    const session = this.currentSession.get();
    const folder = this.syncFolder.get();

    if (settings.autoSync && folder && session) {
      const now = Date.now();
      const timeSinceLastSync = now - session.lastSync;
      const intervalMs = settings.autoSyncInterval * 60 * 1000;

      if (timeSinceLastSync >= intervalMs) {
        this.syncFiles().catch(console.error);
      }
    }
  }

  addToExecutionQueue(callback: () => Promise<void>) {
    this.#globalExecutionQueue = this.#globalExecutionQueue.then(() => callback());
  }

  get previews() {
    return this.#previewsStore.previews;
  }

  get files() {
    return this.#filesStore.files;
  }

  get currentDocument(): ReadableAtom<EditorDocument | undefined> {
    return this.#editorStore.currentDocument;
  }

  get selectedFile(): ReadableAtom<string | undefined> {
    return this.#editorStore.selectedFile;
  }

  get firstArtifact(): ArtifactState | undefined {
    return this.#getArtifact(this.artifactIdList[0]);
  }

  get filesCount(): number {
    return this.#filesStore.filesCount;
  }

  get showTerminal() {
    return this.#terminalStore.showTerminal;
  }
  get boltTerminal() {
    return this.#terminalStore.boltTerminal;
  }
  get alert() {
    return this.actionAlert;
  }
  clearAlert() {
    this.actionAlert.set(undefined);
  }

  toggleTerminal(value?: boolean) {
    this.#terminalStore.toggleTerminal(value);
  }

  attachTerminal(terminal: ITerminal) {
    this.#terminalStore.attachTerminal(terminal);
  }
  attachBoltTerminal(terminal: ITerminal) {
    this.#terminalStore.attachBoltTerminal(terminal);
  }

  onTerminalResize(cols: number, rows: number) {
    this.#terminalStore.onTerminalResize(cols, rows);
  }

  setDocuments(files: FileMap) {
    this.#editorStore.setDocuments(files);

    if (this.#filesStore.filesCount > 0 && this.currentDocument.get() === undefined) {
      // we find the first file and select it
      for (const [filePath, dirent] of Object.entries(files)) {
        if (dirent?.type === 'file') {
          this.setSelectedFile(filePath);
          break;
        }
      }
    }
  }

  setShowWorkbench(show: boolean) {
    this.showWorkbench.set(show);
  }

  setCurrentDocumentContent(newContent: string) {
    const filePath = this.currentDocument.get()?.filePath;

    if (!filePath) {
      return;
    }

    const originalContent = this.#filesStore.getFile(filePath)?.content;
    const unsavedChanges = originalContent !== undefined && originalContent !== newContent;

    this.#editorStore.updateFile(filePath, newContent);

    const currentDocument = this.currentDocument.get();

    if (currentDocument) {
      const previousUnsavedFiles = this.unsavedFiles.get();

      if (unsavedChanges && previousUnsavedFiles.has(currentDocument.filePath)) {
        return;
      }

      const newUnsavedFiles = new Set(previousUnsavedFiles);

      if (unsavedChanges) {
        newUnsavedFiles.add(currentDocument.filePath);
      } else {
        newUnsavedFiles.delete(currentDocument.filePath);
      }

      this.unsavedFiles.set(newUnsavedFiles);
    }
  }

  setCurrentDocumentScrollPosition(position: ScrollPosition) {
    const editorDocument = this.currentDocument.get();

    if (!editorDocument) {
      return;
    }

    const { filePath } = editorDocument;

    this.#editorStore.updateScrollPosition(filePath, position);
  }

  setSelectedFile(filePath: string | undefined) {
    this.#editorStore.setSelectedFile(filePath);
  }

  async saveFile(filePath: string) {
    const documents = this.#editorStore.documents.get();
    const document = documents[filePath];

    if (document === undefined) {
      return;
    }

    await this.#filesStore.saveFile(filePath, document.value);

    const newUnsavedFiles = new Set(this.unsavedFiles.get());
    newUnsavedFiles.delete(filePath);

    this.unsavedFiles.set(newUnsavedFiles);
  }

  async saveCurrentDocument() {
    const currentDocument = this.currentDocument.get();

    if (currentDocument === undefined) {
      return;
    }

    await this.saveFile(currentDocument.filePath);
  }

  resetCurrentDocument() {
    const currentDocument = this.currentDocument.get();

    if (currentDocument === undefined) {
      return;
    }

    const { filePath } = currentDocument;
    const file = this.#filesStore.getFile(filePath);

    if (!file) {
      return;
    }

    this.setCurrentDocumentContent(file.content);
  }

  async saveAllFiles() {
    for (const filePath of this.unsavedFiles.get()) {
      await this.saveFile(filePath);
    }
  }

  getFileModifcations() {
    return this.#filesStore.getFileModifications();
  }
  getModifiedFiles() {
    return this.#filesStore.getModifiedFiles();
  }

  resetAllFileModifications() {
    this.#filesStore.resetFileModifications();
  }

  abortAllActions() {
    // TODO: what do we wanna do and how do we wanna recover from this?
  }

  setReloadedMessages(messages: string[]) {
    this.#reloadedMessages = new Set(messages);
  }

  addArtifact({ messageId, title, id, type }: ArtifactCallbackData) {
    const artifact = this.#getArtifact(messageId);

    if (artifact) {
      return;
    }

    if (!this.artifactIdList.includes(messageId)) {
      this.artifactIdList.push(messageId);
    }

    this.artifacts.setKey(messageId, {
      id,
      title,
      closed: false,
      type,
      runner: new ActionRunner(
        webcontainer,
        () => this.boltTerminal,
        (alert) => {
          if (this.#reloadedMessages.has(messageId)) {
            return;
          }

          this.actionAlert.set(alert);
        },
      ),
    });
  }

  updateArtifact({ messageId }: ArtifactCallbackData, state: Partial<ArtifactUpdateState>) {
    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      return;
    }

    this.artifacts.setKey(messageId, { ...artifact, ...state });
  }
  addAction(data: ActionCallbackData) {
    // this._addAction(data);

    this.addToExecutionQueue(() => this._addAction(data));
  }
  async _addAction(data: ActionCallbackData) {
    const { messageId } = data;

    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      unreachable('Artifact not found');
    }

    return artifact.runner.addAction(data);
  }

  runAction(data: ActionCallbackData, isStreaming: boolean = false) {
    if (isStreaming) {
      this.actionStreamSampler(data, isStreaming);
    } else {
      this.addToExecutionQueue(() => this._runAction(data, isStreaming));
    }
  }
  async _runAction(data: ActionCallbackData, isStreaming: boolean = false) {
    const { messageId } = data;

    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      unreachable('Artifact not found');
    }

    const action = artifact.runner.actions.get()[data.actionId];

    if (!action || action.executed) {
      return;
    }

    if (data.action.type === 'file') {
      const wc = await webcontainer;
      const fullPath = nodePath.join(wc.workdir, data.action.filePath);
      if (this.selectedFile.value !== fullPath) {
        this.setSelectedFile(fullPath);
      }

      if (this.currentView.value !== 'code') {
        this.currentView.set('code');
      }

      const doc = this.#editorStore.documents.get()[fullPath];

      if (!doc) {
        await artifact.runner.runAction(data, isStreaming);
      }

      this.#editorStore.updateFile(fullPath, data.action.content);

      if (!isStreaming) {
        await artifact.runner.runAction(data);
        this.resetAllFileModifications();
      }
    } else {
      await artifact.runner.runAction(data);
    }
  }

  actionStreamSampler = createSampler(async (data: ActionCallbackData, isStreaming: boolean = false) => {
    return await this._runAction(data, isStreaming);
  }, 100); // TODO: remove this magic number to have it configurable

  #getArtifact(id: string) {
    const artifacts = this.artifacts.get();
    return artifacts[id];
  }

  async downloadZip() {
    const zip = new JSZip();
    const files = this.files.get();

    // Get the project name from the description input, or use a default name
    const projectName = (description.value ?? 'project').toLocaleLowerCase().split(' ').join('_');

    // Generate a simple 6-character hash based on the current timestamp
    const timestampHash = Date.now().toString(36).slice(-6);
    const uniqueProjectName = `${projectName}_${timestampHash}`;

    for (const [filePath, dirent] of Object.entries(files)) {
      if (dirent?.type === 'file' && !dirent.isBinary) {
        const relativePath = extractRelativePath(filePath);

        // split the path into segments
        const pathSegments = relativePath.split('/');

        // if there's more than one segment, we need to create folders
        if (pathSegments.length > 1) {
          let currentFolder = zip;

          for (let i = 0; i < pathSegments.length - 1; i++) {
            currentFolder = currentFolder.folder(pathSegments[i])!;
          }
          currentFolder.file(pathSegments[pathSegments.length - 1], dirent.content);
        } else {
          // if there's only one segment, it's a file in the root
          zip.file(relativePath, dirent.content);
        }
      }
    }

    // Generate the zip file and save it
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${uniqueProjectName}.zip`);
  }

  async syncFiles(): Promise<void> {
    const now = Date.now();

    // Prevent syncs that are too close together (within 500ms)
    if (now - this.#lastSyncTimestamp < 500) {
      return;
    }

    this.#lastSyncTimestamp = now;

    const status = this.syncStatus.get();
    const isSyncEnabled = this.isSyncEnabled.get();

    // Skip sync if disabled for this project
    if (!isSyncEnabled) {
      console.log('Synchronisation ignorée - désactivée pour ce projet');
      return;
    }

    if (!status.isReady) {
      if (!this.syncFolder.get()) {
        // Don't show error if we're in initial setup
        if (this.currentSession.get()) {
          toast('Aucun dossier de synchronisation sélectionné. Veuillez sélectionner un dossier d\'abord.');
        }

        return;
      }

      if (status.hasUnsavedChanges) {
        toast.info('Enregistrement des modifications non enregistrées avant la synchronisation...');
        await this.saveAllFiles();
      }
    }

    const folder = this.syncFolder.get();
    const session = this.currentSession.get();

    if (!folder || !session) {
      return;
    }

    try {
      const syncedFiles = new Set<string>();
      const changedFiles = new Set<string>();
      const newFiles = new Set<string>();
      let totalSize = 0;
      const startTime = Date.now();

      // Get project name from description or session
      const rawProjectName = description.value ?? 'project';
      const folderManager = ProjectFolderManager.getInstance();

      try {
        // This will only create a new folder if the project is truly new
        const { folderHandle: projectFolder, projectInfo } = await folderManager.getOrCreateProjectFolder(
          folder,
          rawProjectName,
          true, // Allow creation only for new projects
        );

        // Update session with current project folder and name
        const updatedSession = { ...session };
        updatedSession.projectFolder = projectFolder.name;
        updatedSession.projectName = projectInfo.projectName;
        this.currentSession.set(updatedSession);

        // Create ignore instance with exclude patterns
        const ig = ignore().add(this.syncSettings.get().excludePatterns);

        // Show progress toast
        const progressToastId = toast.loading('Starting sync...', { autoClose: false });
        let processedFiles = 0;

        const filesToProcess = Object.entries(this.files.get()).filter(([_, dirent]) => {
          if (!dirent || dirent.type !== 'file' || dirent.isBinary) {
            return false;
          }

          return true;
        });

        const totalFiles = filesToProcess.length;

        for (const [filePath, dirent] of filesToProcess) {
          if (!dirent || dirent.type !== 'file' || typeof dirent.content !== 'string') {
            console.log(`Sauter le fichier invalide: ${filePath}`);
            continue;
          }

          processedFiles++;
          toast.update(progressToastId, {
            render: `Analyse des fichiers en cours... ${processedFiles}/${totalFiles}`,
          });

          const relativePath = extractRelativePath(filePath);

          // Skip files that match exclude patterns
          if (ig.ignores(relativePath)) {
            console.log(`Sauter le fichier exclu: ${relativePath}`);
            continue;
          }

          const pathSegments = relativePath.split('/');
          let currentHandle = projectFolder;

          // Navigate to the correct directory
          for (let i = 0; i < pathSegments.length - 1; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(pathSegments[i], { create: true });
          }

          const fileName = pathSegments[pathSegments.length - 1];
          let shouldWrite = true;

          // Check if file exists and compare content
          try {
            const existingFile = await currentHandle.getFileHandle(fileName);
            const existingContent = await existingFile.getFile().then((file) => file.text());
            const knownState = this.#knownFileStates.get(relativePath);

            if (existingContent !== dirent.content) {
              // Check if this is a new file or if we've seen it before
              const isInitialSync = !updatedSession.lastSync;
              const isKnownFile = knownState !== undefined;
              const hasLocalChanges = knownState?.content !== dirent.content;
              const hasRemoteChanges = knownState?.content !== existingContent;

              // Only prompt if we have a genuine conflict
              if (!isInitialSync && isKnownFile && hasLocalChanges && hasRemoteChanges) {
                if (this.syncSettings.get().syncMode === 'ask') {
                  const userChoice = confirm(
                    `Le fichier "${relativePath}" a été modifié localement et dans le dossier de synchronisation.\n\n` +
                      'Voulez-vous mettre à jour avec vos modifications locales ?\n\n' +
                      'Cliquez sur OK pour mettre à jour, Annuler pour conserver la version du dossier de synchronisation.',
                  );

                  if (!userChoice) {
                    shouldWrite = false;
                    console.log(`L'utilisateur a choisi de conserver la version du dossier de synchronisation: ${relativePath}`);
                  } else {
                    changedFiles.add(relativePath);
                    console.log(`L'utilisateur a choisi de mettre à jour avec les modifications locales: ${relativePath}`);
                  }
                } else if (this.syncSettings.get().syncMode === 'skip') {
                  shouldWrite = false;
                  console.log(`Sauter le fichier modifié: ${relativePath}`);
                } else {
                  changedFiles.add(relativePath);
                }
              } else {
                // For initial sync or non-conflicting changes, just update
                changedFiles.add(relativePath);
              }
            }

            // Update known state after handling the file
            this.#knownFileStates.set(relativePath, {
              content: shouldWrite ? dirent.content : existingContent,
              timestamp: Date.now(),
            });
          } catch {
            // File doesn't exist
            newFiles.add(relativePath);
            console.log(`Nouveau fichier à synchroniser: ${relativePath}`);

            // Track new file state
            this.#knownFileStates.set(relativePath, {
              content: dirent.content,
              timestamp: Date.now(),
            });
          }

          if (shouldWrite) {
            const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            const fileContent = new Blob([dirent.content]);
            totalSize += fileContent.size;
            await writable.write(fileContent);
            await writable.close();
            syncedFiles.add(relativePath);
            updatedSession.files.add(relativePath);
          }
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Create statistics entry
        const statistics = {
          totalFiles: syncedFiles.size,
          totalSize,
          duration,
          timestamp: endTime,
          syncedFiles: syncedFiles.size
        };

        // Create history entry
        const historyEntry = {
          id: crypto.randomUUID(),
          projectName: updatedSession.projectName || description.value || 'Untitled Project',
          timestamp: endTime,
          statistics,
          files: Array.from(syncedFiles),
          status: 'success' as const,
        };

        // Update session with new history and statistics
        updatedSession.lastSync = endTime;
        updatedSession.history = [...(updatedSession.history || []), historyEntry];
        updatedSession.statistics = [...(updatedSession.statistics || []), statistics];

        // Force a store update to trigger UI reactivity
        this.currentSession.set({ ...updatedSession });

        // Close progress toast
        toast.dismiss(progressToastId);

        // Provide detailed summary feedback
        if (syncedFiles.size > 0) {
          const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
          const durationSec = (duration / 1000).toFixed(1);
          const newCount = newFiles.size;
          const changedCount = changedFiles.size;

          let message =
            `Synchronisé ${syncedFiles.size} fichier${syncedFiles.size !== 1 ? 's' : ''} ` +
            `(${sizeMB} MB) en ${durationSec}s\n`;

          if (newCount > 0) {
            message += `\n• ${newCount} nouveau fichier${newCount !== 1 ? 's' : ''}`;
          }

          if (changedCount > 0) {
            message += `\n• ${changedCount} fichier${changedCount !== 1 ? 's' : ''} modifié${changedCount !== 1 ? 's' : ''}`;
          }

          toast(message);
        } else {
          toast('Tous les fichiers sont à jour');
        }
      } catch (error) {
        console.error('Erreur lors de la synchronisation du projet:', error);
        toast.dismiss();
        throw error;
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation du projet:', error);
      toast('Erreur lors de la synchronisation des fichiers');
      throw error;
    }
  }

  async pushToGitHub(repoName: string, commitMessage?: string, githubUsername?: string, ghToken?: string) {
    try {
      // Use cookies if username and token are not provided
      const githubToken = ghToken || Cookies.get('githubToken');
      const owner = githubUsername || Cookies.get('githubUsername');

      if (!githubToken || !owner) {
        throw new Error('GitHub token or username is not set in cookies or provided.');
      }

      // Initialize Octokit with the auth token
      const octokit = new Octokit({ auth: githubToken });

      // Check if the repository already exists before creating it
      let repo: RestEndpointMethodTypes['repos']['get']['response']['data'];

      try {
        const resp = await octokit.repos.get({ owner, repo: repoName });
        repo = resp.data;
      } catch (error) {
        if (error instanceof Error && 'status' in error && error.status === 404) {
          // Repository doesn't exist, so create a new one
          const { data: newRepo } = await octokit.repos.createForAuthenticatedUser({
            name: repoName,
            private: false,
            auto_init: true,
          });
          repo = newRepo;
        } else {
          console.log('cannot create repo!');
          throw error; // Some other error occurred
        }
      }

      // Get all files
      const files = this.files.get();

      if (!files || Object.keys(files).length === 0) {
        throw new Error('No files found to push');
      }

      // Create blobs for each file
      const blobs = await Promise.all(
        Object.entries(files).map(async ([filePath, dirent]) => {
          if (dirent?.type === 'file' && dirent.content) {
            const { data: blob } = await octokit.git.createBlob({
              owner: repo.owner.login,
              repo: repo.name,
              content: Buffer.from(dirent.content).toString('base64'),
              encoding: 'base64',
            });
            return { path: extractRelativePath(filePath), sha: blob.sha };
          }

          return null;
        }),
      );

      const validBlobs = blobs.filter(Boolean); // Filter out any undefined blobs

      if (validBlobs.length === 0) {
        throw new Error('No valid files to push');
      }

      // Get the latest commit SHA (assuming main branch, update dynamically if needed)
      const { data: ref } = await octokit.git.getRef({
        owner: repo.owner.login,
        repo: repo.name,
        ref: `heads/${repo.default_branch || 'main'}`, // Handle dynamic branch
      });
      const latestCommitSha = ref.object.sha;

      // Create a new tree
      const { data: newTree } = await octokit.git.createTree({
        owner: repo.owner.login,
        repo: repo.name,
        base_tree: latestCommitSha,
        tree: validBlobs.map((blob) => ({
          path: blob!.path,
          mode: '100644',
          type: 'blob',
          sha: blob!.sha,
        })),
      });

      // Create a new commit
      const { data: newCommit } = await octokit.git.createCommit({
        owner: repo.owner.login,
        repo: repo.name,
        message: commitMessage || 'Initial commit from your app',
        tree: newTree.sha,
        parents: [latestCommitSha],
      });

      // Update the reference
      await octokit.git.updateRef({
        owner: repo.owner.login,
        repo: repo.name,
        ref: `heads/${repo.default_branch || 'main'}`, // Handle dynamic branch
        sha: newCommit.sha,
      });

      alert(`Dépôt créé et code publié: ${repo.html_url}`);
    } catch (error) {
      console.error('Erreur lors de la publication sur GitHub:', error);
      throw error; // Rethrow the error for further handling
    }
  }

  async setSyncFolder(handle: FileSystemDirectoryHandle | null) {
    this.syncFolder.set(handle);

    if (handle) {
      try {
        const testDirName = '.bolt_test_' + Date.now();

        // Verify we have write permission by attempting to create a test directory
        await handle.getDirectoryHandle(testDirName, { create: true });

        // Clean up test directory
        await handle.removeEntry(testDirName);

        // Save the handle to IndexedDB for persistence
        await saveSyncFolderHandle(handle);

        // Dismiss any existing sync folder notifications
        toast.dismiss('sync-folder-not-set');

        // Show success message
        // toast(`Synchronisation vers: ${handle.name}`);

        console.log('Autorisation d\'écriture du dossier de synchronisation vérifiée');
      } catch (error) {
        console.error('Échec de la vérification des permissions du dossier de synchronisation:', error);
        toast('Impossible d\'écrire dans le dossier sélectionné. Veuillez choisir un autre dossier.');
        this.syncFolder.set(null);
        await clearSyncFolderHandle();
      }
    } else {
      await clearSyncFolderHandle();
    }
  }

  async showSimpleSyncDialog(_projectName: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const dialog = document.createElement('dialog');
      dialog.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50';

      const content = document.createElement('div');
      content.className = 'bg-bolt-elements-background-depth-2 p-6 rounded-lg shadow-lg max-w-md w-full space-y-4';

      const title = document.createElement('h3');
      title.className = 'text-lg font-medium text-bolt-elements-textPrimary';
      title.textContent = 'Configurer les paramètres de synchronisation';

      const description = document.createElement('p');
      description.className = 'text-sm text-bolt-elements-textSecondary mb-4';
      description.textContent =
        'Configurez les paramètres de synchronisation de base pour votre projet. Vous pouvez les modifier ultérieurement dans les paramètres.';

      const form = document.createElement('div');
      form.className = 'space-y-4';

      // Main Sync Folder Section
      const folderSection = document.createElement('div');
      folderSection.className = 'p-4 rounded-lg bg-bolt-elements-background-depth-4';

      const folderTitle = document.createElement('div');
      folderTitle.className = 'text-sm font-medium text-bolt-elements-textPrimary mb-2';
      folderTitle.textContent = 'Dossier de synchronisation principal';

      const folderButton = document.createElement('button');
      folderButton.className =
        'px-3 py-1.5 text-sm rounded-md bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text transition-colors flex items-center gap-2';
      folderButton.innerHTML = '<div class="i-ph:folder-simple-plus"></div>Définir le dossier principal';

      folderButton.onclick = async () => {
        try {
          const handle = await window.showDirectoryPicker();
          await this.setSyncFolder(handle);
          folderButton.innerHTML = '<div class="i-ph:folder"></div>' + handle.name;
          folderButton.classList.add('bg-green-500/10', 'text-green-400');
        } catch (error) {
          console.error('Failed to set sync folder:', error);
        }
      };

      folderSection.appendChild(folderTitle);
      folderSection.appendChild(folderButton);

      // Auto-sync Section with Interval
      const autoSyncSection = document.createElement('div');
      autoSyncSection.className = 'p-4 rounded-lg bg-bolt-elements-background-depth-4';

      const autoSyncCheckbox = document.createElement('label');
      autoSyncCheckbox.className = 'flex items-center gap-2 text-sm text-bolt-elements-textPrimary cursor-pointer';
      autoSyncCheckbox.innerHTML = `
        <input type="checkbox" class="form-checkbox rounded border-bolt-elements-borderColor bg-transparent h-4 w-4">
        <span>Activer la synchronisation automatique</span>
      `;

      // Add sync interval input
      const syncIntervalContainer = document.createElement('div');
      syncIntervalContainer.className = 'mt-2 ml-6 flex items-center gap-2';
      syncIntervalContainer.innerHTML = `
        <label class="text-sm text-bolt-elements-textSecondary">Synchroniser toutes les</label>
        <input type="number" min="1" max="60" value="5" class="w-16 px-2 py-1 text-sm rounded bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor text-bolt-elements-textPrimary">
        <label class="text-sm text-bolt-elements-textSecondary">minutes</label>
      `;

      // Show/hide interval based on checkbox
      const intervalInput = syncIntervalContainer.querySelector('input') as HTMLInputElement;
      const autoSyncInput = autoSyncCheckbox.querySelector('input') as HTMLInputElement;

      autoSyncInput.onchange = () => {
        syncIntervalContainer.style.display = autoSyncInput.checked ? 'flex' : 'none';
      };
      syncIntervalContainer.style.display = 'none'; // Initially hidden

      // Sync on Save Section
      const syncOnSaveCheckbox = document.createElement('label');
      syncOnSaveCheckbox.className =
        'flex items-center gap-2 text-sm text-bolt-elements-textPrimary cursor-pointer mt-3';
      syncOnSaveCheckbox.innerHTML = `
        <input type="checkbox" class="form-checkbox rounded border-bolt-elements-borderColor bg-transparent h-4 w-4">
        <span>Sync on save</span>
      `;

      autoSyncSection.appendChild(autoSyncCheckbox);
      autoSyncSection.appendChild(syncIntervalContainer);
      autoSyncSection.appendChild(syncOnSaveCheckbox);

      // Add sections to form
      form.appendChild(folderSection);
      form.appendChild(autoSyncSection);

      // Buttons
      const buttons = document.createElement('div');
      buttons.className = 'flex justify-end gap-3 mt-6';

      const saveButton = document.createElement('button');
      saveButton.className =
        'px-4 py-2 text-sm rounded-md bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text transition-colors';
      saveButton.textContent = 'Save Settings';

      saveButton.onclick = async () => {
        const settings = this.syncSettings.get();
        const newSettings = {
          ...settings,
          autoSync: autoSyncInput.checked,
          syncOnSave: (syncOnSaveCheckbox.querySelector('input') as HTMLInputElement).checked,
          autoSyncInterval: autoSyncInput.checked ? parseInt(intervalInput.value, 10) : settings.autoSyncInterval,
        };
        await this.saveSyncSettings(newSettings);
        dialog.remove();
        resolve();
      };

      buttons.appendChild(saveButton);

      // Assemble dialog
      content.appendChild(title);
      content.appendChild(description);
      content.appendChild(form);
      content.appendChild(buttons);
      dialog.appendChild(content);

      document.body.appendChild(dialog);
      dialog.showModal();
    });
  }

  async initializeSession() {
    // Prevent concurrent initializations
    if (this.#isInitializing) {
      return;
    }

    this.#isInitializing = true;

    try {
      // Try to restore sync folder from IndexedDB
      const savedHandle = await loadSyncFolderHandle();

      if (savedHandle) {
        this.syncFolder.set(savedHandle);
      }

      // Get project name and settings
      const rawProjectName = description.value ?? 'project';
      const settings = this.syncSettings.get();

      const session: SyncSession = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        lastSync: Date.now(),
        files: new Set(),
        history: [],
        statistics: [],
      };

      // Find existing project by name
      const existingProject = Object.values(settings.projectFolders).find((p) => p.projectName === rawProjectName);

      let shouldSync: boolean;
      let projectId: string;

      // Handle existing projects
      if (existingProject) {
        // Use existing sync settings without showing dialog
        shouldSync = existingProject.syncEnabled;
        projectId = Object.entries(settings.projectFolders).find(([_, p]) => p.projectName === rawProjectName)?.[0] || rawProjectName;
      } else {
        // Generate new project ID for new projects
        projectId = `${rawProjectName}_${Date.now().toString(36)}`;
        
        // Use default sync settings for new projects
        shouldSync = settings.defaultSyncEnabled;
      }

      // Update settings with current state
      const newSettings = {
        ...settings,
        projectFolders: {
          ...settings.projectFolders,
          [projectId]: {
            projectName: rawProjectName,
            folderName: '',
            lastSync: Date.now(),
            syncEnabled: shouldSync,
          },
        },
      };
      await this.saveSyncSettings(newSettings);

      // Update session with the project ID
      session.projectName = projectId;

      // If sync is disabled, set session but skip further sync setup
      if (!shouldSync) {
        this.currentSession.set(session);
        return;
      }

      const folder = this.syncFolder.get();

      if (!folder) {
        const toastId = 'sync-folder-not-set';
        // toast.info('Configu  rez vos paramètres de synchronisation pour commencer à synchroniser les fichiers.', {
        //   toastId,
        //   autoClose: false,
        //   closeOnClick: true,
        // });
      }

      this.currentSession.set(session);

      if (this.syncSettings.get().autoSync && folder) {
        await this.syncFiles();
      }
    } finally {
      this.#isInitializing = false;
    }
  }

  // Helper method to open sync settings
  openSyncSettings() {
    // Try to find settings button with multiple selectors
    const settingsButton =
      document.querySelector('[data-settings-button]') ||
      document.querySelector('.settings-button') ||
      Array.from(document.querySelectorAll('button')).find((btn) =>
        btn.textContent?.toLowerCase().includes('settings'),
      );

    if (settingsButton) {
      // Click the settings button
      (settingsButton as HTMLButtonElement).click();

      // After settings dialog opens, try to find and click the Sync tab
      setTimeout(() => {
        const syncTab =
          document.querySelector('[data-sync-settings-tab]') ||
          document.querySelector('.sync-settings-tab') ||
          Array.from(document.querySelectorAll('button')).find((btn) =>
            btn.textContent?.toLowerCase().includes('sync'),
          );

        if (syncTab) {
          (syncTab as HTMLButtonElement).click();
        } else {
          console.warn('Could not find sync settings tab');
        }
      }, 200); // Increased timeout to ensure dialog is fully open
    } else {
      console.warn('Could not find settings button');

      // Show a more helpful message to the user
      toast.info('Cliquez sur le bouton Paramètres et allez dans les paramètres de synchronisation pour configurer la synchronisation', {
        autoClose: 5000,
      });
    }
  }

  async loadSyncSettings() {
    const savedSettings = getLocalStorage('syncSettings');

    if (savedSettings) {
      this.syncSettings.set({
        ...this.syncSettings.get(),
        ...savedSettings,

        // Ensure new fields have default values
        autoSyncInterval: savedSettings.autoSyncInterval ?? 5, // Default to 5 minutes
        projectFolders: savedSettings.projectFolders ?? {},
      });
    } else {
      // Initialize with default values
      this.syncSettings.set({
        ...this.syncSettings.get(),
        autoSyncInterval: 5,
        projectFolders: {},
      });
    }
  }

  async saveSyncSettings(settings: SyncSettings) {
    this.syncSettings.set(settings);
    setLocalStorage('syncSettings', settings);
  }

  private _normalizeProjectName(name: string): string {
    // First, remove any timestamp suffix if it exists
    const baseNameWithoutTimestamp = name.replace(/_[a-z0-9]{6}$/, '');

    // Then normalize the remaining string
    return baseNameWithoutTimestamp
      .toLowerCase()
      .replace(/[^a-z0-9_\s-]/g, '')
      .replace(/[\s-]+/g, '_')
      .trim();
  }

  private _findExistingProject(projectName: string): { projectInfo: ProjectSyncInfo | null; baseProjectName: string } {
    const settings = this.syncSettings.get();
    const normalizedName = this._normalizeProjectName(projectName);

    // First try exact match without timestamp
    for (const [, info] of Object.entries(settings.projectFolders)) {
      const normalizedInfoName = this._normalizeProjectName(info.projectName);

      if (normalizedInfoName === normalizedName) {
        return { projectInfo: info, baseProjectName: normalizedName };
      }
    }

    return { projectInfo: null, baseProjectName: normalizedName };
  }

  private _calculateTotalSize(session: SyncSession | null): string {
    if (!session?.statistics?.length) {
      return '0 B';
    }

    const lastStats = session.statistics[session.statistics.length - 1];
    const bytes = lastStats.totalSize;

    if (bytes === 0) {
      return '0 B';
    }

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  async toggleProjectSync(enabled: boolean) {
    const session = this.currentSession.get();

    if (!session?.projectName) {
      return;
    }

    const settings = this.syncSettings.get();
    const projectInfo = settings.projectFolders[session.projectName] || {
      projectName: session.projectName,
      folderName: session.projectFolder || '',
      lastSync: Date.now(),
      syncEnabled: settings.defaultSyncEnabled,
    };

    projectInfo.syncEnabled = enabled;

    const newSettings = {
      ...settings,
      projectFolders: {
        ...settings.projectFolders,
        [session.projectName]: projectInfo,
      },
    };

    await this.saveSyncSettings(newSettings);

    // Show feedback to user
    // toast(`Sync ${enabled ? 'enabled' : 'disabled'} for ${session.projectName}`);
  }

  async setDefaultSyncEnabled(enabled: boolean) {
    const settings = this.syncSettings.get();
    await this.saveSyncSettings({
      ...settings,
      defaultSyncEnabled: enabled,
    });

    toast(`Les nouveaux projets seront ${enabled ? 'synchronisés' : 'non synchronisés'} par défaut`);
  }
}

export const workbenchStore = new WorkbenchStore();
