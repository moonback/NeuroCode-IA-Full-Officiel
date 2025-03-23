import type { PathWatcherEvent, WebContainer } from '@webcontainer/api';
import { getEncoding } from 'istextorbinary';
import { map, type MapStore } from 'nanostores';
import { Buffer } from 'node:buffer';
import { path } from '~/utils/path';
import { bufferWatchEvents } from '~/utils/buffer';
import { WORK_DIR } from '~/utils/constants';
import { computeFileModifications } from '~/utils/diff';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';

const logger = createScopedLogger('FilesStore');

const utf8TextDecoder = new TextDecoder('utf8', { fatal: true });

export interface File {
  type: 'file';
  content: string;
  isBinary: boolean;
}

export interface Folder {
  type: 'folder';
}

type Dirent = File | Folder;

export type FileMap = Record<string, Dirent | undefined>;

export class FilesStore {
  #webcontainer: Promise<WebContainer>;

  /**
   * Tracks the number of files without folders.
   */
  #size = 0;

  /**
   * @note Keeps track all modified files with their original content since the last user message.
   * Needs to be reset when the user sends another message and all changes have to be submitted
   * for the model to be aware of the changes.
   */
  #modifiedFiles: Map<string, string> = import.meta.hot?.data.modifiedFiles ?? new Map();

  /**
   * Map of files that matches the state of WebContainer.
   */
  files: MapStore<FileMap> = import.meta.hot?.data.files ?? map({});

  get filesCount() {
    return this.#size;
  }

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;

    if (import.meta.hot) {
      import.meta.hot.data.files = this.files;
      import.meta.hot.data.modifiedFiles = this.#modifiedFiles;
    }

    this.#init();
  }

  getFile(filePath: string) {
    const dirent = this.files.get()[filePath];

    if (dirent?.type !== 'file') {
      return undefined;
    }

    return dirent;
  }

  getFileModifications() {
    return computeFileModifications(this.files.get(), this.#modifiedFiles);
  }
  getModifiedFiles() {
    let modifiedFiles: { [path: string]: File } | undefined = undefined;

    for (const [filePath, originalContent] of this.#modifiedFiles) {
      const file = this.files.get()[filePath];

      if (file?.type !== 'file') {
        continue;
      }

      if (file.content === originalContent) {
        continue;
      }

      if (!modifiedFiles) {
        modifiedFiles = {};
      }

      modifiedFiles[filePath] = file;
    }

    return modifiedFiles;
  }

  resetFileModifications() {
    this.#modifiedFiles.clear();
  }

  async saveFile(filePath: string, content: string) {
    const webcontainer = await this.#webcontainer;

    try {
      const relativePath = path.relative(webcontainer.workdir, filePath);

      if (!relativePath) {
        throw new Error(`EINVAL: invalid file path, write '${relativePath}'`);
      }

      const oldContent = this.getFile(filePath)?.content;

      if (!oldContent && oldContent !== '') {
        unreachable('Expected content to be defined');
      }

      await webcontainer.fs.writeFile(relativePath, content);

      if (!this.#modifiedFiles.has(filePath)) {
        this.#modifiedFiles.set(filePath, oldContent);
      }

      // we immediately update the file and don't rely on the `change` event coming from the watcher
      this.files.setKey(filePath, { type: 'file', content, isBinary: false });

      logger.info('File updated');
    } catch (error) {
      logger.error('Failed to update file content\n\n', error);

      throw error;
    }
  }

  async createFile(filePath: string, content: string = '') {
    const webcontainer = await this.#webcontainer;

    try {
      const relativePath = path.relative(webcontainer.workdir, filePath);

      if (!relativePath) {
        throw new Error(`EINVAL: invalid file path, create '${relativePath}'`);
      }

      // Vérifier si le fichier existe déjà
      const existingFile = this.files.get()[filePath];
      if (existingFile) {
        throw new Error(`File already exists: ${filePath}`);
      }

      // Créer les dossiers parents si nécessaire
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
      if (dirPath) {
        await this.createFolder(dirPath);
      }

      await webcontainer.fs.writeFile(relativePath, content);
      this.files.setKey(filePath, { type: 'file', content, isBinary: false });
      logger.info(`File created: ${filePath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to create file ${filePath}\n\n`, error);
      throw error;
    }
  }

  async createFolder(folderPath: string) {
    const webcontainer = await this.#webcontainer;

    try {
      const relativePath = path.relative(webcontainer.workdir, folderPath);

      if (!relativePath) {
        throw new Error(`EINVAL: invalid folder path, create '${relativePath}'`);
      }

      // Vérifier si l'opération est autorisée
      if (await this.#isOperationBlocked('create', folderPath)) {
        throw new Error(`Operation blocked: Cannot create folder at ${folderPath}`);
      }

      // Vérifier si le dossier existe déjà
      const dirent = this.files.get()[folderPath];
      if (dirent) {
        return true; // Le dossier existe déjà, pas d'erreur
      }

      // Créer les dossiers parents récursivement
      const segments = folderPath.split('/');
      let currentPath = '';

      for (let i = 1; i < segments.length; i++) {
        currentPath += '/' + segments[i];
        const relativeDirPath = path.relative(webcontainer.workdir, currentPath);
        
        try {
          await webcontainer.fs.mkdir(relativeDirPath, { recursive: false });
        } catch (error) {
          // Ignorer l'erreur si le dossier existe déjà
          if (!String(error).includes('EEXIST')) {
            throw error;
          }
        }
      }

      logger.info(`Folder created: ${folderPath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to create folder ${folderPath}\n\n`, error);
      throw error;
    }
  }

  async deleteFile(filePath: string) {
    const webcontainer = await this.#webcontainer;

    try {
      const relativePath = path.relative(webcontainer.workdir, filePath);

      if (!relativePath) {
        throw new Error(`EINVAL: invalid file path, delete '${relativePath}'`);
      }

      // Vérifier si l'opération est autorisée
      if (await this.#isOperationBlocked('delete', filePath)) {
        throw new Error(`Operation blocked: Cannot delete file at ${filePath}`);
      }

      const dirent = this.files.get()[filePath];
      if (!dirent || dirent.type !== 'file') {
        throw new Error(`File not found: ${filePath}`);
      }

      await webcontainer.fs.rm(relativePath);
      logger.info(`File deleted: ${filePath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete file ${filePath}\n\n`, error);
      throw error;
    }
  }

  async deleteFolder(folderPath: string, recursive: boolean = true) {
    const webcontainer = await this.#webcontainer;

    try {
      const relativePath = path.relative(webcontainer.workdir, folderPath);

      if (!relativePath) {
        throw new Error(`EINVAL: invalid folder path, delete '${relativePath}'`);
      }

      // Vérifier si l'opération est autorisée
      if (await this.#isOperationBlocked('delete', folderPath)) {
        throw new Error(`Operation blocked: Cannot delete folder at ${folderPath}`);
      }

      const dirent = this.files.get()[folderPath];
      if (!dirent || dirent.type !== 'folder') {
        throw new Error(`Folder not found: ${folderPath}`);
      }

      await webcontainer.fs.rm(relativePath, { recursive });
      logger.info(`Folder deleted: ${folderPath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete folder ${folderPath}\n\n`, error);
      throw error;
    }
  }

  async renameFile(oldPath: string, newPath: string) {
    const webcontainer = await this.#webcontainer;

    try {
      const relativeOldPath = path.relative(webcontainer.workdir, oldPath);
      const relativeNewPath = path.relative(webcontainer.workdir, newPath);

      if (!relativeOldPath || !relativeNewPath) {
        throw new Error(`EINVAL: invalid file path, rename '${relativeOldPath}' to '${relativeNewPath}'`);
      }

      // Check if source file exists
      const sourceFile = this.files.get()[oldPath];
      if (!sourceFile) {
        throw new Error(`Source file not found: ${oldPath}`);
      }

      // Check if destination file already exists
      const destFile = this.files.get()[newPath];
      if (destFile) {
        throw new Error(`Destination file already exists: ${newPath}`);
      }

      // Create parent directories if needed
      const dirPath = newPath.substring(0, newPath.lastIndexOf('/'));
      if (dirPath) {
        await this.createFolder(dirPath);
      }

      // Copy content from source to destination
      if (sourceFile.type === 'file') {
        await webcontainer.fs.writeFile(relativeNewPath, sourceFile.content);
        await webcontainer.fs.rm(relativeOldPath);
        
        // Update store
        this.files.setKey(newPath, sourceFile);
        this.files.setKey(oldPath, undefined);
        
        // Track modification
        if (this.#modifiedFiles.has(oldPath)) {
          this.#modifiedFiles.set(newPath, this.#modifiedFiles.get(oldPath)!);
          this.#modifiedFiles.delete(oldPath);
        }
      } else {
        await webcontainer.fs.rename(relativeOldPath, relativeNewPath);
        
        // Update store for folder
        this.files.setKey(newPath, sourceFile);
        this.files.setKey(oldPath, undefined);
      }

      logger.info(`File renamed from ${oldPath} to ${newPath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to rename file from ${oldPath} to ${newPath}\n\n`, error);
      throw error;
    }
  }

  async saveBase64Image(filePath: string, base64Data: string) {
    try {
      // Extraire les données base64 (supprimer le préfixe data:image/...)
      const base64Content = base64Data.split(',')[1] || base64Data;
      
      // Convertir en Uint8Array
      const binaryData = Buffer.from(base64Content, 'base64');
      
      const webcontainer = await this.#webcontainer;
      const relativePath = path.relative(webcontainer.workdir, filePath);

      if (!relativePath) {
        throw new Error(`EINVAL: invalid file path, write '${relativePath}'`);
      }

      // Créer les dossiers parents si nécessaire
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
      if (dirPath) {
        await this.createFolder(dirPath);
      }

      // Écrire le fichier binaire
      await webcontainer.fs.writeFile(relativePath, binaryData);
      
      // Mettre à jour le store (marquer comme binaire)
      this.files.setKey(filePath, { type: 'file', content: '', isBinary: true });
      
      logger.info(`Image saved: ${filePath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to save base64 image to ${filePath}\n\n`, error);
      throw error;
    }
  }

  async #init() {
    const webcontainer = await this.#webcontainer;

    webcontainer.internal.watchPaths(
      { include: [`${WORK_DIR}/**`], exclude: ['**/node_modules', '.git'], includeContent: true },
      bufferWatchEvents(100, this.#processEventBuffer.bind(this)),
    );
  }

  #processEventBuffer(events: Array<[events: PathWatcherEvent[]]>) {
    const watchEvents = events.flat(2);

    for (const { type, path, buffer } of watchEvents) {
      // remove any trailing slashes
      const sanitizedPath = path.replace(/\/+$/g, '');

      switch (type) {
        case 'add_dir': {
          // we intentionally add a trailing slash so we can distinguish files from folders in the file tree
          this.files.setKey(sanitizedPath, { type: 'folder' });
          break;
        }
        case 'remove_dir': {
          this.files.setKey(sanitizedPath, undefined);

          for (const [direntPath] of Object.entries(this.files)) {
            if (direntPath.startsWith(sanitizedPath)) {
              this.files.setKey(direntPath, undefined);
            }
          }

          break;
        }
        case 'add_file':
        case 'change': {
          if (type === 'add_file') {
            this.#size++;
          }

          let content = '';

          /**
           * @note This check is purely for the editor. The way we detect this is not
           * bullet-proof and it's a best guess so there might be false-positives.
           * The reason we do this is because we don't want to display binary files
           * in the editor nor allow to edit them.
           */
          const isBinary = isBinaryFile(buffer);

          if (!isBinary) {
            content = this.#decodeFileContent(buffer);
          }

          this.files.setKey(sanitizedPath, { type: 'file', content, isBinary });

          break;
        }
        case 'remove_file': {
          this.#size--;
          this.files.setKey(sanitizedPath, undefined);
          break;
        }
        case 'update_directory': {
          // we don't care about these events
          break;
        }
      }
    }
  }

  #decodeFileContent(buffer?: Uint8Array) {
    if (!buffer || buffer.byteLength === 0) {
      return '';
    }

    try {
      return utf8TextDecoder.decode(buffer);
    } catch (error) {
      console.log(error);
      return '';
    }
  }

  // Nouvelle méthode pour vérifier si une opération est bloquée
  async #isOperationBlocked(operation: 'create' | 'delete', path: string): Promise<boolean> {
    // Implémentez ici votre logique de vérification
    // Par exemple, vérifier avec une API externe ou des règles internes
    // Retourne true si l'opération doit être bloquée
    
    // Exemple simple : bloquer la création/suppression dans certains dossiers
    const blockedPaths = [
      '/node_modules/',
      '/.git/',
      '/.next/',
      '/.astro/'
    ];

    return blockedPaths.some(blockedPath => path.includes(blockedPath));
  }
}

function isBinaryFile(buffer: Uint8Array | undefined) {
  if (buffer === undefined) {
    return false;
  }

  return getEncoding(convertToBuffer(buffer), { chunkLength: 100 }) === 'binary';
}

/**
 * Converts a `Uint8Array` into a Node.js `Buffer` by copying the prototype.
 * The goal is to  avoid expensive copies. It does create a new typed array
 * but that's generally cheap as long as it uses the same underlying
 * array buffer.
 */
function convertToBuffer(view: Uint8Array): Buffer {
  return Buffer.from(view.buffer, view.byteOffset, view.byteLength);
}
