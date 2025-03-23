import React, { useState } from 'react';
import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { MAX_FILES, isBinaryFile, shouldIncludeFile } from '~/utils/fileUtils';
import { createChatFromFolder } from '~/utils/folderImport';
import { logStore } from '~/lib/stores/logs'; 
import { Button } from '~/components/ui/Button';
import { classNames } from '~/utils/classNames';

interface ImportFolderButtonProps {
  className?: string;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
}

export const ImportFolderButton: React.FC<ImportFolderButtonProps> = ({ className, importChat }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const allFiles = Array.from(e.target.files || []);

    const filteredFiles = allFiles.filter((file) => {
      const path = file.webkitRelativePath.split('/').slice(1).join('/');
      const include = shouldIncludeFile(path);

      return include;
    });

    if (filteredFiles.length === 0) {
      const error = new Error('Aucun fichier valide trouvé');
      logStore.logError('Importation de fichiers impossible - aucun fichier valide', error, { folderName: 'Dossier invalide' });
      toast('Aucun fichier valide trouvé dans le dossier sélectionné');

      return;
    }

    if (filteredFiles.length > MAX_FILES) {
      const error = new Error(`Trop de fichiers: ${filteredFiles.length}`);
      logStore.logError('Importation de fichiers impossible - trop de fichiers', error, {
        fileCount: filteredFiles.length,
        maxFiles: MAX_FILES,
      });
      toast(
        `Ce dossier contient ${filteredFiles.length.toLocaleString()} fichiers. Ce produit n\'est pas encore optimisé pour les projets très importants. Veuillez sélectionner un dossier avec moins de ${MAX_FILES.toLocaleString()} fichiers.`,
      );

      return;
    }

    const folderName = filteredFiles[0]?.webkitRelativePath.split('/')[0] || 'Unknown Folder';
    setIsLoading(true);

    const loadingToast = toast.loading(`Importation de ${folderName}...`);

    try {
      const fileChecks = await Promise.all(
        filteredFiles.map(async (file) => ({
          file,
          isBinary: await isBinaryFile(file),
        })),
      );

      const textFiles = fileChecks.filter((f) => !f.isBinary).map((f) => f.file);
      const binaryFilePaths = fileChecks
        .filter((f) => f.isBinary)
        .map((f) => f.file.webkitRelativePath.split('/').slice(1).join('/'));

      if (textFiles.length === 0) {
        const error = new Error('Aucun fichier texte trouvé');
        logStore.logError('Importation de fichiers impossible - aucun fichier texte', error, { folderName });
        toast('Aucun fichier texte trouvé dans le dossier sélectionné');

        return;
      }

      if (binaryFilePaths.length > 0) {
        logStore.logWarning(`Omission des fichiers binaires lors de l'importation`, {
          folderName,
          binaryCount: binaryFilePaths.length,
        });
        toast.info(`Omission de ${binaryFilePaths.length} fichiers binaires`);
      }

      const messages = await createChatFromFolder(textFiles, binaryFilePaths, folderName);

      if (importChat) {
        await importChat(folderName, [...messages]);
      }

      logStore.logSystem('Dossier importé avec succès', {
        folderName,
        textFileCount: textFiles.length,
        binaryFileCount: binaryFilePaths.length,
      });
      toast('Dossier importé avec succès');
    } catch (error) {
      logStore.logError('Échec de l\'importation du dossier', error, { folderName });
      console.error('Échec de l\'importation du dossier:', error);
      toast('Échec de l\'importation du dossier');
    } finally {
      setIsLoading(false);
      toast.dismiss(loadingToast);
      e.target.value = ''; // Reset file input
    }
  };

  return (
    <>
      <input
        type="file"
        id="folder-import"
        className="hidden"
        webkitdirectory=""
        directory=""
        onChange={handleFileChange}
        {...({} as any)}
      />
      <Button
        onClick={() => {
          const input = document.getElementById('folder-import');
          input?.click();
        }}
        title="Importer un dossier"
        variant="ghost"
        size="icon"
        className="p-0 hover:bg-bolt-elements-background-depth-3 -mx-1 bg-transparent border-none text-white hover:text-white bg-bolt-elements-background-depth-2"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="i-svg-spinners:90-ring-with-bg w-5 h-5 text-bolt-elements-loader-progress animate-spin" />
        ) : (
          <span className="i-ph:folder-open w-5 h-5 text-bolt-elements-textPrimary dark:text-gray-500 hover:text-white" />
        )}
      </Button>
    </>
  );
};
